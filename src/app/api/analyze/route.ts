/**
 * Analyzer API routes
 * POST /api/analyze - Run consistency analyzer
 * GET /api/analyze - Get latest analysis results
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAnalyzerService } from '@/services/support/analyzer.service';
import { AnalyzeRequestSchema } from '@/schemas/api';
import type { AnalysisResults } from '@/types/api/responses';

/**
 * GET /api/analyze - Get latest analysis results
 */
export async function GET(request: NextRequest) {
  try {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    if (!projectPath) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing projectPath query parameter',
          },
        },
        { status: 400 }
      );
    }

    const analyzerService = getAnalyzerService();
    const results = await analyzerService.analyze(projectPath);

    // Convert to API response format
    const response: AnalysisResults = {
      id: `analysis_${Date.now()}`,
      scope: 'project',
      ranAt: results.analyzedAt,
      duration: 0, // TODO: Track duration
      summary: {
        errors: results.summary.errors,
        warnings: results.summary.warnings,
        info: results.summary.info,
      },
      issues: results.issues.map((issue) => ({
        id: issue.id,
        severity: issue.severity,
        category: issue.ruleId as any,
        message: issue.message,
        location: {
          file: issue.location.file,
          ...(issue.location.line !== undefined && { line: issue.location.line }),
        },
        ...(issue.suggestion && { suggestion: issue.suggestion }),
        autoFixable: issue.autoFixable,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'ANALYSIS_ERROR',
          message: `Failed to get analysis results: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/analyze - Run consistency analyzer
 */
export async function POST(request: NextRequest) {
  try {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    if (!projectPath) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing projectPath query parameter',
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = AnalyzeRequestSchema.parse(body);

    // For now, only support project-wide analysis
    if (parsed.scope !== 'project') {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Only project-wide analysis is currently supported',
          },
        },
        { status: 400 }
      );
    }

    const analyzerService = getAnalyzerService();
    const results = await analyzerService.analyze(projectPath);

    // Convert to API response format
    const response: AnalysisResults = {
      id: `analysis_${Date.now()}`,
      scope: parsed.scope,
      ...(parsed.targetId && { targetId: parsed.targetId }),
      ranAt: results.analyzedAt,
      duration: 0, // TODO: Track duration
      summary: {
        errors: results.summary.errors,
        warnings: results.summary.warnings,
        info: results.summary.info,
      },
      issues: results.issues.map((issue) => ({
        id: issue.id,
        severity: issue.severity,
        category: issue.ruleId as any,
        message: issue.message,
        location: {
          file: issue.location.file,
          ...(issue.location.line !== undefined && { line: issue.location.line }),
        },
        ...(issue.suggestion && { suggestion: issue.suggestion }),
        autoFixable: issue.autoFixable,
      })),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'ANALYSIS_ERROR',
          message: `Failed to run analysis: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
