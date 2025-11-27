/**
 * CostService implementation
 * Tracks token usage and enforces budget limits
 */

import type { Database } from 'better-sqlite3';
import { getDatabase } from '@/lib/db/client';

export type BudgetTier = 'development' | 'professional' | 'enterprise' | 'custom';

export interface TokenUsage {
  operationId: string;
  operationType: string; // 'cpo_workflow', 'cto_workflow', 'schema_gen', etc.
  projectId: string;
  sessionId?: string;
  model: string; // 'sonnet', 'opus', 'haiku'
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  timestamp: string;
}

export interface BudgetConfig {
  tier: BudgetTier;
  monthlyLimit: number; // in tokens
  warningThreshold: number; // percentage (e.g., 80)
  disableLimits: boolean;
}

export interface UsageStats {
  currentPeriodTokens: number;
  monthlyLimit: number;
  percentageUsed: number;
  estimatedCost: number;
  tokensRemaining: number;
  resetDate: string;
  isWarning: boolean; // >= 80%
  isCritical: boolean; // >= 95%
  isBlocked: boolean; // >= 100%
}

const TIER_CONFIGS: Record<BudgetTier, { limit: number; warning: number }> = {
  development: { limit: 500_000, warning: 80 },
  professional: { limit: 2_000_000, warning: 80 },
  enterprise: { limit: 10_000_000, warning: 80 },
  custom: { limit: 0, warning: 80 },
};

// Token pricing (USD per token)
const TOKEN_PRICING = {
  sonnet: { input: 0.003 / 1000, output: 0.015 / 1000 },
  opus: { input: 0.015 / 1000, output: 0.075 / 1000 },
  haiku: { input: 0.00025 / 1000, output: 0.00125 / 1000 },
};

/**
 * CostService interface
 */
export interface ICostService {
  trackUsage(usage: Omit<TokenUsage, 'estimatedCost'>): Promise<void>;
  getUsageStats(projectId: string): Promise<UsageStats>;
  getBudgetConfig(projectId: string): Promise<BudgetConfig>;
  updateBudgetConfig(projectId: string, config: Partial<BudgetConfig>): Promise<void>;
  checkBudgetLimit(projectId: string, estimatedTokens: number): Promise<boolean>;
  resetMonthlyUsage(projectId: string): Promise<void>;
  getUsageHistory(
    projectId: string,
    limit?: number
  ): Promise<TokenUsage[]>;
}

/**
 * CostService implementation
 */
export class CostService implements ICostService {
  private db: Database;

  constructor(dbPath?: string) {
    this.db = getDatabase(dbPath);
  }

  /**
   * Track token usage for an operation
   */
  async trackUsage(usage: Omit<TokenUsage, 'estimatedCost'>): Promise<void> {
    const estimatedCost = this.calculateCost(
      usage.model,
      usage.inputTokens,
      usage.outputTokens
    );

    const stmt = this.db.prepare(`
      INSERT INTO token_usage (
        operation_id,
        operation_type,
        project_id,
        session_id,
        model,
        input_tokens,
        output_tokens,
        total_tokens,
        estimated_cost,
        timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      usage.operationId,
      usage.operationType,
      usage.projectId,
      usage.sessionId || null,
      usage.model,
      usage.inputTokens,
      usage.outputTokens,
      usage.totalTokens,
      estimatedCost,
      usage.timestamp
    );
  }

  /**
   * Get usage statistics for current billing period
   */
  async getUsageStats(projectId: string): Promise<UsageStats> {
    const config = await this.getBudgetConfig(projectId);
    const resetDate = this.getMonthlyResetDate();

    // Get total tokens used in current period
    const stmt = this.db.prepare(`
      SELECT
        COALESCE(SUM(total_tokens), 0) as total_tokens,
        COALESCE(SUM(estimated_cost), 0) as total_cost
      FROM token_usage
      WHERE project_id = ?
        AND timestamp >= ?
    `);

    const result = stmt.get(projectId, resetDate) as any;
    const currentTokens = result.total_tokens || 0;
    const estimatedCost = result.total_cost || 0;

    const percentageUsed = config.monthlyLimit > 0
      ? (currentTokens / config.monthlyLimit) * 100
      : 0;

    const tokensRemaining = Math.max(0, config.monthlyLimit - currentTokens);

    return {
      currentPeriodTokens: currentTokens,
      monthlyLimit: config.monthlyLimit,
      percentageUsed,
      estimatedCost,
      tokensRemaining,
      resetDate,
      isWarning: percentageUsed >= config.warningThreshold,
      isCritical: percentageUsed >= 95,
      isBlocked: percentageUsed >= 100 && !config.disableLimits,
    };
  }

  /**
   * Get budget configuration for project
   */
  async getBudgetConfig(projectId: string): Promise<BudgetConfig> {
    const stmt = this.db.prepare(`
      SELECT tier, monthly_limit, warning_threshold, disable_limits
      FROM budget_config
      WHERE project_id = ?
    `);

    const result = stmt.get(projectId) as any;

    if (!result) {
      // Return default development tier
      const defaultConfig = TIER_CONFIGS.development;
      return {
        tier: 'development',
        monthlyLimit: defaultConfig.limit,
        warningThreshold: defaultConfig.warning,
        disableLimits: false,
      };
    }

    return {
      tier: result.tier as BudgetTier,
      monthlyLimit: result.monthly_limit,
      warningThreshold: result.warning_threshold,
      disableLimits: Boolean(result.disable_limits),
    };
  }

  /**
   * Update budget configuration
   */
  async updateBudgetConfig(
    projectId: string,
    config: Partial<BudgetConfig>
  ): Promise<void> {
    const existing = await this.getBudgetConfig(projectId);

    const newConfig = { ...existing, ...config };

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO budget_config (
        project_id,
        tier,
        monthly_limit,
        warning_threshold,
        disable_limits,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      projectId,
      newConfig.tier,
      newConfig.monthlyLimit,
      newConfig.warningThreshold,
      newConfig.disableLimits ? 1 : 0,
      new Date().toISOString()
    );
  }

  /**
   * Check if operation is within budget limit
   */
  async checkBudgetLimit(
    projectId: string,
    estimatedTokens: number
  ): Promise<boolean> {
    const stats = await this.getUsageStats(projectId);

    // If limits are disabled, always allow
    const config = await this.getBudgetConfig(projectId);
    if (config.disableLimits) {
      return true;
    }

    // Check if adding estimated tokens would exceed limit
    const projectedTokens = stats.currentPeriodTokens + estimatedTokens;
    return projectedTokens <= config.monthlyLimit;
  }

  /**
   * Reset monthly usage (manual reset)
   */
  async resetMonthlyUsage(projectId: string): Promise<void> {
    // We don't actually delete data, just mark it as archived
    // This preserves historical data for reporting
    const stmt = this.db.prepare(`
      UPDATE token_usage
      SET archived = 1
      WHERE project_id = ?
        AND timestamp >= ?
    `);

    const resetDate = this.getMonthlyResetDate();
    stmt.run(projectId, resetDate);
  }

  /**
   * Get usage history
   */
  async getUsageHistory(
    projectId: string,
    limit: number = 100
  ): Promise<TokenUsage[]> {
    const stmt = this.db.prepare(`
      SELECT *
      FROM token_usage
      WHERE project_id = ?
        AND archived = 0
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(projectId, limit) as any[];

    return rows.map((row) => ({
      operationId: row.operation_id,
      operationType: row.operation_type,
      projectId: row.project_id,
      sessionId: row.session_id,
      model: row.model,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      totalTokens: row.total_tokens,
      estimatedCost: row.estimated_cost,
      timestamp: row.timestamp,
    }));
  }

  /**
   * Calculate cost based on model and token usage
   */
  private calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const pricing = TOKEN_PRICING[model as keyof typeof TOKEN_PRICING] || TOKEN_PRICING.sonnet;
    return inputTokens * pricing.input + outputTokens * pricing.output;
  }

  /**
   * Get the start of the current billing month
   */
  private getMonthlyResetDate(): string {
    const now = new Date();
    const resetDate = new Date(now.getFullYear(), now.getMonth(), 1);
    return resetDate.toISOString();
  }
}

/**
 * Create singleton instance
 */
let costServiceInstance: CostService | null = null;

export function getCostService(dbPath?: string): CostService {
  if (!costServiceInstance) {
    costServiceInstance = new CostService(dbPath);
  }
  return costServiceInstance;
}

/**
 * Reset singleton instance
 */
export function resetCostService(): void {
  costServiceInstance = null;
}
