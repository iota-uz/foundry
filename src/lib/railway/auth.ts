/**
 * Railway Webhook Authentication
 *
 * JWT-based authentication for container-to-Foundry communication.
 * Tokens are short-lived and scoped to specific execution IDs.
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { getEnvVar } from '@/lib/utils/env';

// ============================================================================
// Types
// ============================================================================

export interface ExecutionTokenPayload extends JWTPayload {
  /** Execution ID this token is valid for */
  executionId: string;
  /** Workflow ID for reference */
  workflowId: string;
  /** Token type */
  type: 'execution';
}

// ============================================================================
// Token Generation
// ============================================================================

/**
 * Get the secret key for signing/verifying tokens
 */
function getSecretKey(): Uint8Array {
  const secret = getEnvVar('INTERNAL_API_SECRET');
  return new TextEncoder().encode(secret);
}

/**
 * Generate a JWT token for container authentication
 *
 * @param executionId - The execution ID this token is valid for
 * @param workflowId - The workflow ID for reference
 * @param expiresIn - Token expiration time (default: 1 hour)
 * @returns Signed JWT token
 */
export async function generateExecutionToken(
  executionId: string,
  workflowId: string,
  expiresIn: string = '1h'
): Promise<string> {
  const secret = getSecretKey();

  const token = await new SignJWT({
    executionId,
    workflowId,
    type: 'execution',
  } satisfies Omit<ExecutionTokenPayload, keyof JWTPayload>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .setIssuer('foundry')
    .setAudience('foundry-container')
    .sign(secret);

  return token;
}

// ============================================================================
// Token Verification
// ============================================================================

/**
 * Verify a JWT token from a container webhook request
 *
 * @param authHeader - The Authorization header value (e.g., "Bearer <token>")
 * @param expectedExecutionId - The execution ID this request should be for
 * @returns The verified token payload, or null if invalid
 */
export async function verifyExecutionToken(
  authHeader: string | null,
  expectedExecutionId: string
): Promise<ExecutionTokenPayload | null> {
  if (!authHeader) {
    return null;
  }

  // Extract token from "Bearer <token>" format
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  const token = parts[1];
  if (!token) {
    return null;
  }

  try {
    const secret = getSecretKey();

    const { payload } = await jwtVerify(token, secret, {
      issuer: 'foundry',
      audience: 'foundry-container',
    });

    const typedPayload = payload as ExecutionTokenPayload;

    // Verify execution ID matches
    if (typedPayload.executionId !== expectedExecutionId) {
      return null;
    }

    // Verify token type
    if (typedPayload.type !== 'execution') {
      return null;
    }

    return typedPayload;
  } catch {
    // Token is invalid (expired, malformed, wrong signature, etc.)
    return null;
  }
}

/**
 * Middleware helper to verify webhook requests
 * Returns the payload if valid, throws if invalid
 */
export async function requireValidToken(
  authHeader: string | null,
  expectedExecutionId: string
): Promise<ExecutionTokenPayload> {
  const payload = await verifyExecutionToken(authHeader, expectedExecutionId);

  if (!payload) {
    throw new Error('Unauthorized: Invalid or expired token');
  }

  return payload;
}
