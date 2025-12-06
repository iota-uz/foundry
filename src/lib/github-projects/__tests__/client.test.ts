/**
 * Tests for the GitHub Projects client
 */

import { describe, expect, it, mock, beforeEach, afterEach } from 'bun:test';
import { ProjectsClient } from '../client';
import { ProjectsError } from '../types';
import type { ProjectsConfig } from '../types';

// Mock fetch globally
const mockFetch = mock(() => Promise.resolve(new Response()));

describe('ProjectsClient', () => {
  const defaultConfig: ProjectsConfig = {
    token: 'test-token',
    projectOwner: 'test-owner',
    projectNumber: 1,
    verbose: false,
  };

  beforeEach(() => {
    // Reset mock before each test
    mockFetch.mockReset();
    // @ts-expect-error - mocking global fetch
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  describe('constructor', () => {
    it('should create client with config', () => {
      const client = new ProjectsClient(defaultConfig);
      expect(client).toBeDefined();
    });

    it('should default verbose to false', () => {
      const config = { ...defaultConfig };
      delete (config as Partial<ProjectsConfig>).verbose;
      const client = new ProjectsClient(config);
      expect(client).toBeDefined();
    });
  });

  describe('validate', () => {
    it('should validate project successfully', async () => {
      // Mock project query response
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              user: null,
              organization: {
                projectV2: {
                  id: 'project-id',
                  title: 'Test Project',
                  number: 1,
                  url: 'https://github.com/orgs/test-owner/projects/1',
                  closed: false,
                },
              },
            },
          })
        )
      );

      // Mock fields query response
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              node: {
                fields: {
                  nodes: [
                    {
                      id: 'status-field-id',
                      name: 'Status',
                      dataType: 'SINGLE_SELECT',
                      options: [
                        { id: 'opt-1', name: 'Todo', color: 'gray' },
                        { id: 'opt-2', name: 'In Progress', color: 'yellow' },
                        { id: 'opt-3', name: 'Done', color: 'green' },
                      ],
                    },
                  ],
                },
              },
            },
          })
        )
      );

      const client = new ProjectsClient(defaultConfig);
      const validation = await client.validate();

      expect(validation.valid).toBe(true);
      expect(validation.project?.title).toBe('Test Project');
      expect(validation.statusField?.name).toBe('Status');
      expect(validation.statusOptions).toHaveLength(3);
      expect(validation.errors).toHaveLength(0);
    });

    it('should return error if project not found', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              user: null,
              organization: null,
            },
          })
        )
      );

      const client = new ProjectsClient(defaultConfig);
      const validation = await client.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Project not found');
    });

    it('should return error if status field not found', async () => {
      // Mock project found
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              user: {
                projectV2: {
                  id: 'project-id',
                  title: 'Test Project',
                  number: 1,
                  url: 'https://github.com/users/test-owner/projects/1',
                  closed: false,
                },
              },
              organization: null,
            },
          })
        )
      );

      // Mock no status field
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              node: {
                fields: {
                  nodes: [
                    {
                      id: 'text-field-id',
                      name: 'Notes',
                      dataType: 'TEXT',
                    },
                  ],
                },
              },
            },
          })
        )
      );

      const client = new ProjectsClient(defaultConfig);
      const validation = await client.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Status field not found');
    });

    it('should warn if project is closed', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              user: null,
              organization: {
                projectV2: {
                  id: 'project-id',
                  title: 'Closed Project',
                  number: 1,
                  url: 'https://github.com/orgs/test-owner/projects/1',
                  closed: true,
                },
              },
            },
          })
        )
      );

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              node: {
                fields: {
                  nodes: [
                    {
                      id: 'status-field-id',
                      name: 'Status',
                      dataType: 'SINGLE_SELECT',
                      options: [{ id: 'opt-1', name: 'Done' }],
                    },
                  ],
                },
              },
            },
          })
        )
      );

      const client = new ProjectsClient(defaultConfig);
      const validation = await client.validate();

      expect(validation.valid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0]).toContain('closed');
    });

    it('should handle authentication error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('Unauthorized', { status: 401 })
      );

      const client = new ProjectsClient(defaultConfig);
      const validation = await client.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('authentication failed');
    });

    it('should handle rate limit error', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('rate limit exceeded', { status: 403 })
      );

      const client = new ProjectsClient(defaultConfig);
      const validation = await client.validate();

      expect(validation.valid).toBe(false);
      expect(validation.errors[0]).toContain('rate limit');
    });
  });

  describe('getAvailableStatuses', () => {
    it('should return available status options after validation', async () => {
      // Setup validated client
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              user: null,
              organization: {
                projectV2: {
                  id: 'project-id',
                  title: 'Test Project',
                  number: 1,
                  url: 'url',
                  closed: false,
                },
              },
            },
          })
        )
      );

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              node: {
                fields: {
                  nodes: [
                    {
                      id: 'status-field-id',
                      name: 'Status',
                      dataType: 'SINGLE_SELECT',
                      options: [
                        { id: 'opt-1', name: 'Backlog' },
                        { id: 'opt-2', name: 'In Progress' },
                        { id: 'opt-3', name: 'Review' },
                        { id: 'opt-4', name: 'Done' },
                      ],
                    },
                  ],
                },
              },
            },
          })
        )
      );

      const client = new ProjectsClient(defaultConfig);
      await client.validate();

      const statuses = client.getAvailableStatuses();
      expect(statuses).toEqual(['Backlog', 'In Progress', 'Review', 'Done']);
    });

    it('should return empty array before validation', () => {
      const client = new ProjectsClient(defaultConfig);
      const statuses = client.getAvailableStatuses();
      expect(statuses).toEqual([]);
    });
  });

  describe('isValidStatus', () => {
    it('should return true for valid status (case-insensitive)', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              user: null,
              organization: {
                projectV2: { id: 'id', title: 'P', number: 1, url: 'u', closed: false },
              },
            },
          })
        )
      );

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              node: {
                fields: {
                  nodes: [
                    {
                      id: 'sf',
                      name: 'Status',
                      dataType: 'SINGLE_SELECT',
                      options: [{ id: 'o1', name: 'Done' }],
                    },
                  ],
                },
              },
            },
          })
        )
      );

      const client = new ProjectsClient(defaultConfig);
      await client.validate();

      expect(client.isValidStatus('Done')).toBe(true);
      expect(client.isValidStatus('done')).toBe(true);
      expect(client.isValidStatus('DONE')).toBe(true);
    });

    it('should return false for invalid status', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              user: null,
              organization: {
                projectV2: { id: 'id', title: 'P', number: 1, url: 'u', closed: false },
              },
            },
          })
        )
      );

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              node: {
                fields: {
                  nodes: [
                    {
                      id: 'sf',
                      name: 'Status',
                      dataType: 'SINGLE_SELECT',
                      options: [{ id: 'o1', name: 'Done' }],
                    },
                  ],
                },
              },
            },
          })
        )
      );

      const client = new ProjectsClient(defaultConfig);
      await client.validate();

      expect(client.isValidStatus('Completed')).toBe(false);
      expect(client.isValidStatus('Invalid')).toBe(false);
    });
  });

  describe('updateStatus', () => {
    it('should throw if not validated', async () => {
      const client = new ProjectsClient(defaultConfig);

      await expect(
        client.updateStatus({
          owner: 'owner',
          repo: 'repo',
          issueNumber: 1,
          status: 'Done',
        })
      ).rejects.toThrow(ProjectsError);
    });

    it('should throw for invalid status', async () => {
      // Setup validated client
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              user: null,
              organization: {
                projectV2: { id: 'id', title: 'P', number: 1, url: 'u', closed: false },
              },
            },
          })
        )
      );

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              node: {
                fields: {
                  nodes: [
                    {
                      id: 'sf',
                      name: 'Status',
                      dataType: 'SINGLE_SELECT',
                      options: [
                        { id: 'o1', name: 'Todo' },
                        { id: 'o2', name: 'Done' },
                      ],
                    },
                  ],
                },
              },
            },
          })
        )
      );

      const client = new ProjectsClient(defaultConfig);
      await client.validate();

      await expect(
        client.updateStatus({
          owner: 'owner',
          repo: 'repo',
          issueNumber: 1,
          status: 'InvalidStatus',
        })
      ).rejects.toThrow(ProjectsError);

      try {
        await client.updateStatus({
          owner: 'owner',
          repo: 'repo',
          issueNumber: 1,
          status: 'InvalidStatus',
        });
      } catch (err) {
        expect(err).toBeInstanceOf(ProjectsError);
        expect((err as ProjectsError).code).toBe('STATUS_NOT_FOUND');
      }
    });
  });

  describe('findProjectItem', () => {
    it('should throw if not validated', async () => {
      const client = new ProjectsClient(defaultConfig);

      await expect(client.findProjectItem('owner', 'repo', 1)).rejects.toThrow(
        ProjectsError
      );
    });
  });

  describe('addIssueToProject', () => {
    it('should throw if not validated', async () => {
      const client = new ProjectsClient(defaultConfig);

      await expect(client.addIssueToProject('owner', 'repo', 1)).rejects.toThrow(
        ProjectsError
      );
    });
  });

  describe('getIssueStatus', () => {
    it('should throw if not validated', async () => {
      const client = new ProjectsClient(defaultConfig);

      await expect(client.getIssueStatus('owner', 'repo', 1)).rejects.toThrow(
        ProjectsError
      );
    });
  });
});

describe('ProjectsError', () => {
  it('should create error with code and details', () => {
    const error = new ProjectsError('Test error', 'AUTH_ERROR', { foo: 'bar' });

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('AUTH_ERROR');
    expect(error.details).toEqual({ foo: 'bar' });
    expect(error.name).toBe('ProjectsError');
  });

  it('should work without details', () => {
    const error = new ProjectsError('Test error', 'RATE_LIMIT');

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('RATE_LIMIT');
    expect(error.details).toBeUndefined();
  });
});
