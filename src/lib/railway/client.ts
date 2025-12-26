/**
 * Railway GraphQL API Client
 *
 * Manages ephemeral Railway services for workflow execution.
 * Uses Railway's GraphQL API to create, monitor, and delete services.
 */

import { getEnvVar } from '@/lib/utils/env';

// ============================================================================
// Types
// ============================================================================

export interface RailwayConfig {
  apiToken: string;
  projectId: string;
  environmentId: string;
}

export interface CreateServiceOptions {
  /** Service name (must be unique within project) */
  name: string;
  /** Docker image to deploy (e.g., 'ghcr.io/org/image:tag') */
  image: string;
  /** Environment variables to set */
  variables: Record<string, string>;
}

export interface CreateServiceResult {
  serviceId: string;
}

export type DeploymentStatus =
  | 'BUILDING'
  | 'DEPLOYING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CRASHED'
  | 'REMOVED'
  | 'UNKNOWN';

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

// ============================================================================
// Railway Client
// ============================================================================

const RAILWAY_API_URL = 'https://backboard.railway.com/graphql/v2';

export class RailwayClient {
  private config: RailwayConfig;

  constructor(config?: Partial<RailwayConfig>) {
    this.config = {
      apiToken: config?.apiToken ?? getEnvVar('RAILWAY_API_TOKEN'),
      projectId: config?.projectId ?? getEnvVar('RAILWAY_PROJECT_ID'),
      environmentId: config?.environmentId ?? getEnvVar('RAILWAY_ENVIRONMENT_ID'),
    };
  }

  /**
   * Execute a GraphQL query/mutation against Railway API
   */
  private async query<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(RAILWAY_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`Railway API request failed: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as GraphQLResponse<T>;

    if (result.errors && result.errors.length > 0) {
      const errorMessages = result.errors.map((e) => e.message).join(', ');
      throw new Error(`Railway API error: ${errorMessages}`);
    }

    if (!result.data) {
      throw new Error('Railway API returned no data');
    }

    return result.data;
  }

  /**
   * Create a new service with a Docker image
   */
  async createService(options: CreateServiceOptions): Promise<CreateServiceResult> {
    // Step 1: Create the service
    const createMutation = `
      mutation ServiceCreate($input: ServiceCreateInput!) {
        serviceCreate(input: $input) {
          id
        }
      }
    `;

    const createResult = await this.query<{ serviceCreate: { id: string } }>(
      createMutation,
      {
        input: {
          name: options.name,
          projectId: this.config.projectId,
          source: { image: options.image },
        },
      }
    );

    const serviceId = createResult.serviceCreate.id;

    // Step 2: Set environment variables if provided
    if (Object.keys(options.variables).length > 0) {
      await this.setServiceVariables(serviceId, options.variables);
    }

    // Step 3: Deploy the service to the environment
    const deployMutation = `
      mutation ServiceInstanceDeploy($serviceId: String!, $environmentId: String!) {
        serviceInstanceDeploy(
          serviceId: $serviceId
          environmentId: $environmentId
        )
      }
    `;

    await this.query(deployMutation, {
      serviceId,
      environmentId: this.config.environmentId,
    });

    return { serviceId };
  }

  /**
   * Set environment variables for a service
   */
  private async setServiceVariables(
    serviceId: string,
    variables: Record<string, string>
  ): Promise<void> {
    const mutation = `
      mutation VariablesSetFromObject($input: VariableCollectionUpsertInput!) {
        variableCollectionUpsert(input: $input)
      }
    `;

    await this.query(mutation, {
      input: {
        projectId: this.config.projectId,
        environmentId: this.config.environmentId,
        serviceId,
        variables,
      },
    });
  }

  /**
   * Get the current deployment status for a service
   */
  async getDeploymentStatus(serviceId: string): Promise<DeploymentStatus> {
    const query = `
      query Deployments($input: DeploymentListInput!) {
        deployments(first: 1, input: $input) {
          edges {
            node {
              id
              status
            }
          }
        }
      }
    `;

    const result = await this.query<{
      deployments: {
        edges: Array<{
          node: { id: string; status: string };
        }>;
      };
    }>(query, {
      input: {
        projectId: this.config.projectId,
        environmentId: this.config.environmentId,
        serviceId,
      },
    });

    const deployment = result.deployments.edges[0]?.node;
    if (!deployment) {
      return 'UNKNOWN';
    }

    return deployment.status as DeploymentStatus;
  }

  /**
   * Wait for a service to reach a terminal state (SUCCESS or FAILED)
   */
  async waitForDeployment(
    serviceId: string,
    options?: {
      /** Maximum time to wait in milliseconds (default: 5 minutes) */
      timeout?: number;
      /** Polling interval in milliseconds (default: 5 seconds) */
      interval?: number;
      /** Callback for status updates */
      onStatusChange?: (status: DeploymentStatus) => void;
    }
  ): Promise<DeploymentStatus> {
    const timeout = options?.timeout ?? 5 * 60 * 1000;
    const interval = options?.interval ?? 5000;
    const startTime = Date.now();

    let lastStatus: DeploymentStatus | null = null;

    while (Date.now() - startTime < timeout) {
      const status = await this.getDeploymentStatus(serviceId);

      if (status !== lastStatus) {
        lastStatus = status;
        options?.onStatusChange?.(status);
      }

      // Terminal states
      if (status === 'SUCCESS' || status === 'FAILED' || status === 'CRASHED') {
        return status;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`Deployment timed out after ${timeout}ms`);
  }

  /**
   * Delete a service and all its deployments
   */
  async deleteService(serviceId: string): Promise<void> {
    const mutation = `
      mutation ServiceDelete($id: String!) {
        serviceDelete(id: $id)
      }
    `;

    await this.query(mutation, { id: serviceId });
  }

  /**
   * Get logs from the latest deployment of a service
   */
  async getDeploymentLogs(serviceId: string): Promise<string[]> {
    // First get the latest deployment ID
    const deploymentsQuery = `
      query Deployments($input: DeploymentListInput!) {
        deployments(first: 1, input: $input) {
          edges {
            node {
              id
            }
          }
        }
      }
    `;

    const deploymentsResult = await this.query<{
      deployments: {
        edges: Array<{ node: { id: string } }>;
      };
    }>(deploymentsQuery, {
      input: {
        projectId: this.config.projectId,
        environmentId: this.config.environmentId,
        serviceId,
      },
    });

    const deploymentId = deploymentsResult.deployments.edges[0]?.node?.id;
    if (!deploymentId) {
      return [];
    }

    // Get logs for the deployment
    const logsQuery = `
      query DeploymentLogs($deploymentId: String!) {
        deploymentLogs(deploymentId: $deploymentId, limit: 500) {
          timestamp
          message
        }
      }
    `;

    const logsResult = await this.query<{
      deploymentLogs: Array<{ timestamp: string; message: string }>;
    }>(logsQuery, { deploymentId });

    return logsResult.deploymentLogs.map((log) => log.message);
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

let railwayClient: RailwayClient | null = null;

/**
 * Get the Railway client singleton
 */
export function getRailwayClient(): RailwayClient {
  if (!railwayClient) {
    railwayClient = new RailwayClient();
  }
  return railwayClient;
}
