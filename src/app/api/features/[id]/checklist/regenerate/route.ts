/**
 * Regenerate Checklist API route
 * POST /api/features/[id]/checklist/regenerate - Regenerate checklist from acceptance criteria
 */

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';
import { getLLMService } from '@/services/ai/llm.service';
import type { ChecklistItem } from '@/types/domain/feature';

/**
 * POST /api/features/[id]/checklist/regenerate - Regenerate checklist
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectPath = request.nextUrl.searchParams.get('projectPath');
    const moduleSlug = request.nextUrl.searchParams.get('moduleSlug');

    if (!projectPath || !moduleSlug) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing projectPath or moduleSlug query parameter',
          },
        },
        { status: 400 }
      );
    }

    const fileService = getFileService();
    const specService = getSpecService(fileService);
    const feature = await specService.getFeature(
      projectPath,
      moduleSlug,
      params.id
    );

    // Check if feature has acceptance criteria
    if (!feature.business?.acceptanceCriteria || feature.business.acceptanceCriteria.length === 0) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Feature has no acceptance criteria to generate checklist from',
          },
        },
        { status: 400 }
      );
    }

    // Generate checklist using AI
    const llmService = getLLMService();
    const systemPrompt = `You are a technical QA expert. Generate an implementation checklist from acceptance criteria.
Each checklist item should be:
- Specific and testable
- Directly derived from an acceptance criterion
- Clear about what needs to be verified

Return a JSON array of checklist items with format:
[
  {
    "criterion": "The specific acceptance criterion text",
    "source": "Reference to the acceptance criterion"
  }
]`;

    const userPrompt = `Feature: ${feature.name}

Acceptance Criteria:
${feature.business.acceptanceCriteria.map((ac, i) => `${i + 1}. ${ac}`).join('\n')}

Generate a detailed implementation checklist that covers all acceptance criteria.`;

    const llmResponse = await llmService.call({
      systemPrompt,
      userPrompt,
      model: 'sonnet',
      temperature: 0.3,
      maxTokens: 2000,
    });

    const response = llmResponse.content;

    // Parse AI response
    let generatedItems: Array<{ criterion: string; source: string }>;
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      generatedItems = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      // Fallback: create simple checklist from acceptance criteria
      generatedItems = feature.business.acceptanceCriteria.map((ac, i) => ({
        criterion: `Verify: ${ac}`,
        source: `Acceptance Criterion ${i + 1}`,
      }));
    }

    // Convert to ChecklistItem format
    const checklist: ChecklistItem[] = generatedItems.map((item) => ({
      id: nanoid(),
      criterion: item.criterion,
      source: item.source,
      verified: false,
    }));

    // Calculate progress
    const checklistProgress = {
      total: checklist.length,
      verified: 0,
      percentComplete: 0,
    };

    // Update feature
    await specService.updateFeature(projectPath, moduleSlug, params.id, {
      checklist,
      checklistProgress,
    });

    return NextResponse.json({
      items: checklist,
      progress: checklistProgress,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Feature not found',
          },
        },
        { status: 404 }
      );
    }

    if (message.includes('LLM')) {
      return NextResponse.json(
        {
          error: {
            code: 'LLM_ERROR',
            message: `Failed to generate checklist: ${message}`,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to regenerate checklist: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
