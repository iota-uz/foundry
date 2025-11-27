/**
 * Module types - logical grouping of features
 */

/**
 * Module groups related features
 */
export interface Module {
  id: string;
  projectId: string;
  name: string;
  description: string;
  order: number;
  features: string[]; // Feature IDs
  createdAt: string;
  updatedAt: string;
}
