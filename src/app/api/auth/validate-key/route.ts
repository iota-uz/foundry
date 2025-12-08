/**
 * API Key validation endpoint
 * POST /api/auth/validate-key - Validate Anthropic API key
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';

const ValidateKeyRequestSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
});

/**
 * POST /api/auth/validate-key - Validate API key by making a test call
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = ValidateKeyRequestSchema.parse(body);

    // Test the API key by making a minimal call
    const client = new Anthropic({ apiKey: parsed.apiKey });

    try {
      // Make a small test call to validate the key
      await client.messages.create({
        model: 'claude-sonnet-4.5',
        max_tokens: 10,
        messages: [
          {
            role: 'user',
            content: 'Hi',
          },
        ],
      });

      return NextResponse.json({
        valid: true,
        message: 'API key is valid',
      });
    } catch (error: unknown) {
      // Check error type - Anthropic SDK errors have a status property
      const apiError = error as { status?: number };
      if (apiError.status === 401 || apiError.status === 403) {
        return NextResponse.json(
          {
            valid: false,
            message: 'Invalid API key or authentication failed',
          },
          { status: 401 }
        );
      }

      if (apiError.status === 429) {
        return NextResponse.json(
          {
            valid: false,
            message: 'Rate limit exceeded. Please try again later.',
          },
          { status: 429 }
        );
      }

      throw error;
    }
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
          code: 'INTERNAL_ERROR',
          message: `Failed to validate API key: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/validate-key - Check API key status (from env or credentials)
 */
export async function GET() {
  try {
    const { getApiKey } = await import('@/lib/utils/credentials');
    const apiKey = await getApiKey();

    if (!apiKey) {
      return NextResponse.json({
        configured: false,
        source: 'not_set',
      });
    }

    // Determine source
    const envKey = process.env.ANTHROPIC_API_KEY;
    const source = envKey ? 'environment' : 'credentials';

    return NextResponse.json({
      configured: true,
      source,
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to check API key status: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}
