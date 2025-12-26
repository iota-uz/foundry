/**
 * Railway Integration
 *
 * Client for Railway's GraphQL API and authentication utilities
 * for container-to-Foundry communication.
 */

export {
  RailwayClient,
  getRailwayClient,
  type RailwayConfig,
  type CreateServiceOptions,
  type CreateServiceResult,
  type DeploymentStatus,
} from './client';

export {
  generateExecutionToken,
  verifyExecutionToken,
  requireValidToken,
  type ExecutionTokenPayload,
} from './auth';
