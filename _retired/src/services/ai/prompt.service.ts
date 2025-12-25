/**
 * PromptService - Handlebars template compilation for prompts
 */

import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import type {
  PromptContext,
  PromptTemplate,
  HandlebarsTemplateDelegate,
} from '@/types/ai';
import {
  PromptCompilationError,
  PromptNotFoundError,
} from '@/types/ai';

/**
 * PromptService handles loading and compiling Handlebars prompt templates
 */
export class PromptService {
  private promptsDir: string;
  private templateCache: Map<string, HandlebarsTemplateDelegate>;
  private metadataCache: Map<string, PromptTemplate>;

  constructor(projectRoot: string) {
    this.promptsDir = path.join(projectRoot, '.foundry', 'prompts');
    this.templateCache = new Map();
    this.metadataCache = new Map();
    this.registerHelpers();
  }

  /**
   * Compile a prompt template with context
   */
  async compilePrompt(templateName: string, context: PromptContext): Promise<string> {
    try {
      // Get or compile template
      const template = await this.getTemplate(templateName);

      // Compile with context
      const result = template(context);

      return result;
    } catch (error: unknown) {
      if (error instanceof PromptNotFoundError || error instanceof PromptCompilationError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCause = error instanceof Error ? error : undefined;
      throw new PromptCompilationError(
        templateName,
        `Failed to compile template: ${errorMessage}`,
        errorCause
      );
    }
  }

  /**
   * Get compiled template (from cache or file)
   */
  private async getTemplate(templateName: string): Promise<HandlebarsTemplateDelegate> {
    // Check cache first
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    // Load and compile template
    const templatePath = path.join(this.promptsDir, `${templateName}.hbs`);

    try {
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const compiled = Handlebars.compile(templateContent);

      // Cache compiled template
      this.templateCache.set(templateName, compiled);

      // Cache metadata
      this.metadataCache.set(templateName, {
        name: templateName,
        path: templatePath,
        workflow: this.extractWorkflow(templateName),
        operation: this.extractOperation(templateName),
        type: this.extractType(templateName),
        compiled,
        lastModified: new Date(),
      });

      return compiled;
    } catch (error: unknown) {
      const errorObj = error as Record<string, unknown> | null;
      if (errorObj?.code === 'ENOENT') {
        throw new PromptNotFoundError(templateName);
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCause = error instanceof Error ? error : undefined;
      throw new PromptCompilationError(
        templateName,
        `Failed to load template: ${errorMessage}`,
        errorCause
      );
    }
  }

  /**
   * Extract workflow from template name
   * Example: "cpo-generate-question-system" -> "cpo"
   */
  private extractWorkflow(templateName: string): string {
    const parts = templateName.split('-');
    return parts[0] || 'unknown';
  }

  /**
   * Extract operation from template name
   * Example: "cpo-generate-question-system" -> "generate-question"
   */
  private extractOperation(templateName: string): string {
    const parts = templateName.split('-');
    const typePart = parts[parts.length - 1];
    if (typePart === 'system' || typePart === 'user') {
      return parts.slice(1, -1).join('-');
    }
    return parts.slice(1).join('-');
  }

  /**
   * Extract type from template name
   * Example: "cpo-generate-question-system" -> "system"
   */
  private extractType(templateName: string): 'system' | 'user' {
    const parts = templateName.split('-');
    const lastPart = parts[parts.length - 1];
    return lastPart === 'user' ? 'user' : 'system';
  }

  /**
   * List all available prompt templates
   */
  async listPrompts(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.promptsDir);
      return files
        .filter((file) => file.endsWith('.hbs'))
        .map((file) => file.replace('.hbs', ''));
    } catch (error: unknown) {
      const errorObj = error as Record<string, unknown> | null;
      if (errorObj?.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Clear template cache (useful for hot reload)
   */
  clearCache(): void {
    this.templateCache.clear();
    this.metadataCache.clear();
  }

  /**
   * Invalidate specific template in cache
   */
  invalidateTemplate(templateName: string): void {
    this.templateCache.delete(templateName);
    this.metadataCache.delete(templateName);
  }

  /**
   * Get template metadata
   */
  getMetadata(templateName: string): PromptTemplate | undefined {
    return this.metadataCache.get(templateName);
  }

  /**
   * Register Handlebars helpers
   */
  private registerHelpers(): void {
    // Conditional helper
    Handlebars.registerHelper('if', function (this: unknown, conditional: unknown, options: Handlebars.HelperOptions) {
      if (conditional) {
        return options.fn(this);
      } else {
        return options.inverse(this);
      }
    });

    // Each helper
    Handlebars.registerHelper('each', function (context, options) {
      let ret = '';
      if (Array.isArray(context)) {
        for (let i = 0; i < context.length; i++) {
          ret += options.fn(context[i]);
        }
      } else if (typeof context === 'object' && context !== null) {
        for (const key in context) {
          if (Object.prototype.hasOwnProperty.call(context, key)) {
            ret += options.fn({ key, value: context[key] });
          }
        }
      }
      return ret;
    });

    // Format JSON helper
    Handlebars.registerHelper('json', function (context) {
      return JSON.stringify(context, null, 2);
    });

    // Uppercase helper
    Handlebars.registerHelper('uppercase', function (str: string) {
      return str ? str.toUpperCase() : '';
    });

    // Lowercase helper
    Handlebars.registerHelper('lowercase', function (str: string) {
      return str ? str.toLowerCase() : '';
    });

    // Capitalize helper
    Handlebars.registerHelper('capitalize', function (str: string) {
      return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
    });

    // Default value helper
    Handlebars.registerHelper('default', function (value, defaultValue) {
      return value !== undefined && value !== null ? value : defaultValue;
    });

    // Join array helper
    Handlebars.registerHelper('join', function (array: unknown[], separator: string) {
      return Array.isArray(array) ? array.join(separator) : '';
    });

    // Length helper
    Handlebars.registerHelper('length', function (array: unknown[]) {
      return Array.isArray(array) ? array.length : 0;
    });

    // Comparison helpers
    Handlebars.registerHelper('eq', function (a, b) {
      return a === b;
    });

    Handlebars.registerHelper('ne', function (a, b) {
      return a !== b;
    });

    Handlebars.registerHelper('gt', function (a, b) {
      return a > b;
    });

    Handlebars.registerHelper('lt', function (a, b) {
      return a < b;
    });

    Handlebars.registerHelper('gte', function (a, b) {
      return a >= b;
    });

    Handlebars.registerHelper('lte', function (a, b) {
      return a <= b;
    });

    // Logical helpers
    Handlebars.registerHelper('and', function (...args) {
      // Last arg is options object
      const values = args.slice(0, -1);
      return values.every((v) => !!v);
    });

    Handlebars.registerHelper('or', function (...args) {
      // Last arg is options object
      const values = args.slice(0, -1);
      return values.some((v) => !!v);
    });

    Handlebars.registerHelper('not', function (value) {
      return !value;
    });

    // Format date helper
    Handlebars.registerHelper('formatDate', function (date: string) {
      if (!date) return '';
      return new Date(date).toLocaleDateString();
    });

    // Truncate helper
    Handlebars.registerHelper('truncate', function (str: string, length: number) {
      if (!str) return '';
      return str.length > length ? str.substring(0, length) + '...' : str;
    });

    // Markdown list helper
    Handlebars.registerHelper('markdownList', function (items: string[]) {
      if (!Array.isArray(items)) return '';
      return items.map((item) => `- ${item}`).join('\n');
    });

    // Number format helper
    Handlebars.registerHelper('number', function (value: number) {
      return typeof value === 'number' ? value.toLocaleString() : value;
    });
  }

  /**
   * Preload commonly used templates
   */
  async preloadTemplates(templateNames: string[]): Promise<void> {
    await Promise.all(templateNames.map((name) => this.getTemplate(name)));
  }

  /**
   * Check if template exists
   */
  async templateExists(templateName: string): Promise<boolean> {
    const templatePath = path.join(this.promptsDir, `${templateName}.hbs`);
    try {
      await fs.access(templatePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get prompts directory path
   */
  getPromptsDir(): string {
    return this.promptsDir;
  }

  /**
   * Validate template syntax
   */
  async validateTemplate(templateName: string): Promise<TemplateValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const templatePath = path.join(this.promptsDir, `${templateName}.hbs`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');

      // Try to compile template
      try {
        Handlebars.compile(templateContent);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Template compilation failed: ${errorMessage}`);
        return { valid: false, errors, warnings };
      }

      // Check for unclosed tags
      const closeTags = templateContent.match(/\{\{#[^\/]/g)?.length || 0;
      const endTags = templateContent.match(/\{\{\/[^}]+\}\}/g)?.length || 0;

      if (closeTags !== endTags) {
        errors.push(`Mismatched block helpers: ${closeTags} opening tags, ${endTags} closing tags`);
      }

      // Check for common mistakes
      if (templateContent.includes('{{#if}}')) {
        warnings.push('Empty #if block detected');
      }

      if (templateContent.includes('{{#each}}')) {
        warnings.push('Empty #each block detected');
      }

      // Check for undefined helpers
      const helperPattern = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\s/g;
      let match;
      const registeredHelpers = [
        'if', 'each', 'json', 'uppercase', 'lowercase', 'capitalize',
        'default', 'join', 'length', 'eq', 'ne', 'gt', 'lt', 'gte', 'lte',
        'and', 'or', 'not', 'formatDate', 'truncate', 'markdownList', 'number'
      ];

      while ((match = helperPattern.exec(templateContent)) !== null) {
        const helperName = match[1];
        if (helperName && !registeredHelpers.includes(helperName)) {
          warnings.push(`Potentially undefined helper: ${helperName}`);
        }
      }

      // Check for syntax issues
      if (templateContent.includes('{{{{')) {
        warnings.push('Quadruple braces detected - this may cause issues');
      }

      if (templateContent.includes('{{{') && !templateContent.includes('}}}')) {
        errors.push('Triple brace syntax not properly closed');
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error: unknown) {
      const errorObj = error as Record<string, unknown> | null;
      if (errorObj?.code === 'ENOENT') {
        errors.push(`Template not found: ${templateName}`);
      } else {
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Validation error: ${errorMessage}`);
      }

      return { valid: false, errors, warnings };
    }
  }

  /**
   * Validate all templates in prompts directory
   */
  async validateAllTemplates(): Promise<Map<string, TemplateValidationResult>> {
    const results = new Map<string, TemplateValidationResult>();

    try {
      const templates = await this.listPrompts();

      for (const templateName of templates) {
        const result = await this.validateTemplate(templateName);
        results.set(templateName, result);
      }
    } catch (error) {
      // Ignore errors in directory listing
    }

    return results;
  }
}

/**
 * Template validation result
 */
export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Singleton instance per project
 */
const promptServiceInstances = new Map<string, PromptService>();

/**
 * Get or create PromptService instance for a project
 */
export function getPromptService(projectRoot: string): PromptService {
  if (!promptServiceInstances.has(projectRoot)) {
    promptServiceInstances.set(projectRoot, new PromptService(projectRoot));
  }
  return promptServiceInstances.get(projectRoot)!;
}
