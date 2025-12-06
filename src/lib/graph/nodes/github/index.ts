/**
 * @sys/graph/nodes/github - GitHub Integration Nodes
 *
 * Nodes for integrating with GitHub APIs:
 * - GitHubProjectNode: Update project fields (status, priority, etc.)
 * - GithubCommentsNode: Create and update issue/PR comments
 */

export {
  GitHubProjectNodeRuntime,
  type GitHubProjectNodeConfig,
  type GitHubProjectResult,
  createGitHubProjectNode,
} from './project-node';

export {
  GithubCommentsNodeRuntime,
  type GithubCommentsNodeConfig,
  type CommentAction,
  type CommentResult,
  createGithubCommentsNode,
} from './comments-node';
