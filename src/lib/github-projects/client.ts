/**
 * GitHub Projects V2 Client
 *
 * Provides GraphQL-based client for managing project item statuses.
 * Validates project configuration at startup to ensure status options exist.
 */

import type {
  ProjectsConfig,
  Project,
  ProjectField,
  FieldOption,
  ProjectItem,
  UpdateStatusRequest,
  UpdateStatusResult,
  ProjectValidation,
} from './types';
import { ProjectsError } from './types';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

/**
 * GitHub Projects V2 Client
 */
export class ProjectsClient {
  private readonly config: ProjectsConfig;
  private readonly verbose: boolean;

  /** Cached project info after validation */
  private project: Project | null = null;
  /** Cached status field info */
  private statusField: ProjectField | null = null;
  /** Map of status name (lowercase) to option */
  private statusOptions: Map<string, FieldOption> = new Map();

  constructor(config: ProjectsConfig) {
    this.config = config;
    this.verbose = config.verbose ?? false;
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.verbose) {
      console.log(`[ProjectsClient] ${message}`);
    }
  }

  /**
   * Execute a GraphQL query
   */
  private async graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'foundry-github-projects',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new ProjectsError('GitHub authentication failed', 'AUTH_ERROR');
      }
      if (response.status === 403) {
        const body = await response.text();
        if (body.includes('rate limit')) {
          throw new ProjectsError('GitHub API rate limit exceeded', 'RATE_LIMIT');
        }
        throw new ProjectsError('GitHub API access forbidden', 'AUTH_ERROR');
      }
      throw new ProjectsError(
        `GitHub API error: ${response.status} ${response.statusText}`,
        'GRAPHQL_ERROR'
      );
    }

    const data = (await response.json()) as { data?: T; errors?: Array<{ message: string }> };

    if (data.errors && data.errors.length > 0) {
      const errorMessages = data.errors.map((e) => e.message).join(', ');
      throw new ProjectsError(`GraphQL error: ${errorMessages}`, 'GRAPHQL_ERROR', {
        errors: data.errors,
      });
    }

    if (!data.data) {
      throw new ProjectsError('No data returned from GraphQL query', 'GRAPHQL_ERROR');
    }

    return data.data;
  }

  /**
   * Validate project configuration at startup
   *
   * Fetches project, status field, and available options.
   * Returns validation result with any errors.
   */
  async validate(): Promise<ProjectValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    this.log(`Validating project: ${this.config.projectOwner}#${this.config.projectNumber}`);

    // Fetch project
    let project: Project | undefined;
    try {
      project = await this.fetchProject();
      this.project = project;
      this.log(`Found project: ${project.title}`);

      if (project.closed) {
        warnings.push(`Project "${project.title}" is closed`);
      }
    } catch (err) {
      if (err instanceof ProjectsError) {
        errors.push(err.message);
      } else {
        errors.push(`Failed to fetch project: ${String(err)}`);
      }
      return { valid: false, errors, warnings };
    }

    // Fetch status field
    let statusField: ProjectField | undefined;
    try {
      statusField = await this.fetchStatusField();
      this.statusField = statusField;
      this.log(`Found status field: ${statusField.name} with ${statusField.options?.length ?? 0} options`);
    } catch (err) {
      if (err instanceof ProjectsError) {
        errors.push(err.message);
      } else {
        errors.push(`Failed to fetch status field: ${String(err)}`);
      }
      return { valid: false, project, errors, warnings };
    }

    // Cache status options (case-insensitive lookup)
    this.statusOptions.clear();
    const options = statusField.options ?? [];
    for (const option of options) {
      this.statusOptions.set(option.name.toLowerCase(), option);
      this.log(`  Status option: "${option.name}"`);
    }

    if (options.length === 0) {
      warnings.push('Status field has no options configured');
    }

    return {
      valid: errors.length === 0,
      project,
      statusField,
      statusOptions: options,
      errors,
      warnings,
    };
  }

  /**
   * Fetch project details by owner and number
   */
  private async fetchProject(): Promise<Project> {
    const query = `
      query($owner: String!, $number: Int!) {
        user(login: $owner) {
          projectV2(number: $number) {
            id
            title
            number
            url
            closed
          }
        }
        organization(login: $owner) {
          projectV2(number: $number) {
            id
            title
            number
            url
            closed
          }
        }
      }
    `;

    interface ProjectResponse {
      user: { projectV2: Project | null } | null;
      organization: { projectV2: Project | null } | null;
    }

    const data = await this.graphql<ProjectResponse>(query, {
      owner: this.config.projectOwner,
      number: this.config.projectNumber,
    });

    // Project can be owned by user or organization
    const project = data.user?.projectV2 ?? data.organization?.projectV2;

    if (!project) {
      throw new ProjectsError(
        `Project not found: ${this.config.projectOwner}#${this.config.projectNumber}`,
        'PROJECT_NOT_FOUND'
      );
    }

    return project;
  }

  /**
   * Fetch the Status field from the project
   */
  private async fetchStatusField(): Promise<ProjectField> {
    if (!this.project) {
      throw new ProjectsError('Project not loaded', 'VALIDATION_ERROR');
    }

    const query = `
      query($projectId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            fields(first: 50) {
              nodes {
                ... on ProjectV2SingleSelectField {
                  id
                  name
                  dataType
                  options {
                    id
                    name
                    color
                    description
                  }
                }
                ... on ProjectV2Field {
                  id
                  name
                  dataType
                }
                ... on ProjectV2IterationField {
                  id
                  name
                  dataType
                }
              }
            }
          }
        }
      }
    `;

    interface FieldsResponse {
      node: {
        fields: {
          nodes: Array<{
            id: string;
            name: string;
            dataType: string;
            options?: FieldOption[];
          }>;
        };
      };
    }

    const data = await this.graphql<FieldsResponse>(query, {
      projectId: this.project.id,
    });

    // Find the Status field (case-insensitive)
    const statusField = data.node.fields.nodes.find(
      (f) => f.name.toLowerCase() === 'status' && f.dataType === 'SINGLE_SELECT'
    );

    if (!statusField) {
      throw new ProjectsError(
        'Status field not found in project. Ensure the project has a "Status" single-select field.',
        'FIELD_NOT_FOUND'
      );
    }

    const field: ProjectField = {
      id: statusField.id,
      name: statusField.name,
      dataType: 'SINGLE_SELECT',
    };

    if (statusField.options !== undefined) {
      field.options = statusField.options;
    }

    return field;
  }

  /**
   * Find project item by issue
   */
  async findProjectItem(owner: string, repo: string, issueNumber: number): Promise<ProjectItem | null> {
    if (!this.project) {
      throw new ProjectsError('Project not validated. Call validate() first.', 'VALIDATION_ERROR');
    }

    // First, get the issue node ID
    const issueQuery = `
      query($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $number) {
            id
            title
            number
          }
        }
      }
    `;

    interface IssueResponse {
      repository: {
        issue: {
          id: string;
          title: string;
          number: number;
        } | null;
      } | null;
    }

    const issueData = await this.graphql<IssueResponse>(issueQuery, {
      owner,
      repo,
      number: issueNumber,
    });

    if (!issueData.repository?.issue) {
      throw new ProjectsError(
        `Issue not found: ${owner}/${repo}#${issueNumber}`,
        'ITEM_NOT_FOUND'
      );
    }

    const issueId = issueData.repository.issue.id;

    // Find the project item for this issue
    const itemQuery = `
      query($projectId: ID!, $issueId: ID!) {
        node(id: $projectId) {
          ... on ProjectV2 {
            items(first: 100) {
              nodes {
                id
                content {
                  ... on Issue {
                    id
                    number
                    title
                    repository {
                      owner {
                        login
                      }
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    interface ItemsResponse {
      node: {
        items: {
          nodes: Array<{
            id: string;
            content: {
              id?: string;
              number?: number;
              title?: string;
              repository?: {
                owner: { login: string };
                name: string;
              };
            } | null;
          }>;
        };
      };
    }

    const itemsData = await this.graphql<ItemsResponse>(itemQuery, {
      projectId: this.project.id,
      issueId,
    });

    // Find the item matching our issue
    const item = itemsData.node.items.nodes.find(
      (i) => i.content?.id === issueId
    );

    if (!item) {
      return null;
    }

    const projectItem: ProjectItem = {
      id: item.id,
      content: {
        type: 'Issue',
        title: item.content?.title ?? '',
      },
    };

    if (item.content?.number !== undefined) {
      projectItem.content.number = item.content.number;
    }

    if (item.content?.repository) {
      projectItem.content.repository = {
        owner: item.content.repository.owner.login,
        name: item.content.repository.name,
      };
    }

    return projectItem;
  }

  /**
   * Add an issue to the project
   */
  async addIssueToProject(owner: string, repo: string, issueNumber: number): Promise<ProjectItem> {
    if (!this.project) {
      throw new ProjectsError('Project not validated. Call validate() first.', 'VALIDATION_ERROR');
    }

    // Get issue node ID
    const issueQuery = `
      query($owner: String!, $repo: String!, $number: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $number) {
            id
            title
            number
          }
        }
      }
    `;

    interface IssueResponse {
      repository: {
        issue: {
          id: string;
          title: string;
          number: number;
        } | null;
      } | null;
    }

    const issueData = await this.graphql<IssueResponse>(issueQuery, {
      owner,
      repo,
      number: issueNumber,
    });

    if (!issueData.repository?.issue) {
      throw new ProjectsError(
        `Issue not found: ${owner}/${repo}#${issueNumber}`,
        'ITEM_NOT_FOUND'
      );
    }

    const issueId = issueData.repository.issue.id;

    // Add to project
    const mutation = `
      mutation($projectId: ID!, $contentId: ID!) {
        addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
          item {
            id
          }
        }
      }
    `;

    interface AddResponse {
      addProjectV2ItemById: {
        item: {
          id: string;
        };
      };
    }

    const addData = await this.graphql<AddResponse>(mutation, {
      projectId: this.project.id,
      contentId: issueId,
    });

    this.log(`Added issue #${issueNumber} to project`);

    return {
      id: addData.addProjectV2ItemById.item.id,
      content: {
        type: 'Issue',
        number: issueNumber,
        title: issueData.repository.issue.title,
        repository: { owner, name: repo },
      },
    };
  }

  /**
   * Update the status of an issue in the project
   */
  async updateStatus(request: UpdateStatusRequest): Promise<UpdateStatusResult> {
    if (!this.project || !this.statusField) {
      throw new ProjectsError('Project not validated. Call validate() first.', 'VALIDATION_ERROR');
    }

    const { owner, repo, issueNumber, status } = request;

    this.log(`Updating status for ${owner}/${repo}#${issueNumber} to "${status}"`);

    // Validate status option exists (exact match, case-insensitive)
    const statusOption = this.statusOptions.get(status.toLowerCase());
    if (!statusOption) {
      const availableOptions = Array.from(this.statusOptions.values())
        .map((o) => o.name)
        .join(', ');
      throw new ProjectsError(
        `Status "${status}" not found. Available options: ${availableOptions}`,
        'STATUS_NOT_FOUND',
        { requestedStatus: status, availableOptions: Array.from(this.statusOptions.keys()) }
      );
    }

    // Find or add issue to project
    let item = await this.findProjectItem(owner, repo, issueNumber);
    if (!item) {
      this.log(`Issue not in project, adding it first...`);
      item = await this.addIssueToProject(owner, repo, issueNumber);
    }

    // Update the status field
    const mutation = `
      mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
        updateProjectV2ItemFieldValue(input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { singleSelectOptionId: $optionId }
        }) {
          projectV2Item {
            id
          }
        }
      }
    `;

    try {
      await this.graphql(mutation, {
        projectId: this.project.id,
        itemId: item.id,
        fieldId: this.statusField.id,
        optionId: statusOption.id,
      });

      this.log(`Successfully updated status to "${statusOption.name}"`);

      return {
        success: true,
        item,
        newStatus: statusOption.name,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        newStatus: status,
        error: errorMessage,
      };
    }
  }

  /**
   * Get current status of an issue in the project
   */
  async getIssueStatus(owner: string, repo: string, issueNumber: number): Promise<string | null> {
    if (!this.project || !this.statusField) {
      throw new ProjectsError('Project not validated. Call validate() first.', 'VALIDATION_ERROR');
    }

    const item = await this.findProjectItem(owner, repo, issueNumber);
    if (!item) {
      return null;
    }

    // Query current status value
    const query = `
      query($itemId: ID!) {
        node(id: $itemId) {
          ... on ProjectV2Item {
            fieldValues(first: 20) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field {
                    ... on ProjectV2SingleSelectField {
                      id
                    }
                  }
                }
              }
            }
          }
        }
      }
    `;

    interface StatusResponse {
      node: {
        fieldValues: {
          nodes: Array<{
            name?: string;
            field?: {
              id: string;
            };
          }>;
        };
      };
    }

    const data = await this.graphql<StatusResponse>(query, {
      itemId: item.id,
    });

    // Find the status field value
    const statusValue = data.node.fieldValues.nodes.find(
      (v) => v.field?.id === this.statusField?.id
    );

    return statusValue?.name ?? null;
  }

  /**
   * Get list of available status options
   */
  getAvailableStatuses(): string[] {
    return Array.from(this.statusOptions.values()).map((o) => o.name);
  }

  /**
   * Check if a status option is valid
   */
  isValidStatus(status: string): boolean {
    return this.statusOptions.has(status.toLowerCase());
  }
}

/**
 * Create a new ProjectsClient instance
 */
export function createProjectsClient(config: ProjectsConfig): ProjectsClient {
  return new ProjectsClient(config);
}
