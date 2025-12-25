/**
 * SpecService - Core CRUD operations for projects, modules, features, and artifacts
 * Handles all file-based spec operations using FileService
 */

import path from 'path';
import { nanoid } from 'nanoid';
import {
  Project,
  Module,
  Feature,
  UIComponent,
} from '@/types';
import { FileService } from './file.service';

/**
 * SpecService interface
 */
export interface ISpecService {
  // Project operations
  getProject(projectPath: string): Promise<Project>;
  updateProject(projectPath: string, updates: Partial<Project>): Promise<Project>;

  // Module operations
  listModules(projectPath: string): Promise<Module[]>;
  getModule(projectPath: string, moduleSlug: string): Promise<Module>;
  createModule(projectPath: string, data: CreateModuleInput): Promise<Module>;
  updateModule(projectPath: string, moduleSlug: string, updates: Partial<Module>): Promise<Module>;
  deleteModule(projectPath: string, moduleSlug: string): Promise<void>;

  // Feature operations
  listFeatures(projectPath: string, moduleSlug?: string): Promise<Feature[]>;
  getFeature(projectPath: string, moduleSlug: string, featureSlug: string): Promise<Feature>;
  createFeature(projectPath: string, moduleSlug: string, data: CreateFeatureInput): Promise<Feature>;
  updateFeature(projectPath: string, moduleSlug: string, featureSlug: string, updates: Partial<Feature>): Promise<Feature>;
  deleteFeature(projectPath: string, moduleSlug: string, featureSlug: string): Promise<void>;

  // Schema operations
  getSchema(projectPath: string): Promise<string>;
  updateSchema(projectPath: string, dbml: string): Promise<void>;

  // OpenAPI operations
  getOpenAPI(projectPath: string): Promise<Record<string, unknown>>;
  updateOpenAPI(projectPath: string, spec: Record<string, unknown>): Promise<void>;

  // GraphQL operations
  getGraphQL(projectPath: string): Promise<string>;
  updateGraphQL(projectPath: string, schema: string): Promise<void>;

  // Component operations
  listComponents(projectPath: string, type?: 'page' | 'component'): Promise<UIComponent[]>;
  getComponent(projectPath: string, componentId: string): Promise<UIComponent>;
  createComponent(projectPath: string, data: CreateComponentInput): Promise<UIComponent>;
  updateComponent(projectPath: string, componentId: string, updates: Partial<UIComponent>): Promise<UIComponent>;
  deleteComponent(projectPath: string, componentId: string): Promise<void>;
}

/**
 * Input types for creation operations
 */
export interface CreateModuleInput {
  slug: string;
  name: string;
  description: string;
  order?: number;
}

export interface CreateFeatureInput {
  slug: string;
  name: string;
  description: string;
  status?: Feature['status'];
  phase?: Feature['phase'];
}

export interface CreateComponentInput {
  id: string;
  name: string;
  type: 'page' | 'component';
  html: string;
  description: string;
}

/**
 * SpecService implementation
 */
export class SpecService implements ISpecService {
  private readonly FOUNDRY_DIR = '.foundry';

  constructor(private fileService: FileService) {}

  /**
   * Get paths for various spec files
   */
  private getPaths(projectPath: string) {
    const foundryPath = path.join(projectPath, this.FOUNDRY_DIR);
    return {
      foundryPath,
      projectFile: path.join(foundryPath, 'project.yaml'),
      modulesDir: path.join(foundryPath, 'modules'),
      schemasDir: path.join(foundryPath, 'schemas'),
      apisDir: path.join(foundryPath, 'apis'),
      componentsDir: path.join(foundryPath, 'components'),
      schemaFile: path.join(foundryPath, 'schemas', 'schema.dbml'),
      openApiFile: path.join(foundryPath, 'apis', 'openapi.yaml'),
      graphqlFile: path.join(foundryPath, 'apis', 'schema.graphql'),
    };
  }

  /**
   * Get module directory and file paths
   */
  private getModulePaths(projectPath: string, moduleSlug: string) {
    const paths = this.getPaths(projectPath);
    const moduleDir = path.join(paths.modulesDir, moduleSlug);
    const moduleFile = path.join(moduleDir, 'module.yaml');
    const featuresDir = path.join(moduleDir, 'features');
    return { moduleDir, moduleFile, featuresDir };
  }

  /**
   * Get feature file path
   */
  private getFeaturePath(projectPath: string, moduleSlug: string, featureSlug: string): string {
    const { featuresDir } = this.getModulePaths(projectPath, moduleSlug);
    return path.join(featuresDir, `${featureSlug}.yaml`);
  }

  /**
   * Generate ID with prefix
   */
  private generateId(prefix: string): string {
    return `${prefix}_${nanoid(10)}`;
  }

  /**
   * Get timestamp in ISO format
   */
  private now(): string {
    return new Date().toISOString();
  }

  // ==================== PROJECT OPERATIONS ====================

  async getProject(projectPath: string): Promise<Project> {
    const { projectFile } = this.getPaths(projectPath);

    if (!(await this.fileService.exists(projectFile))) {
      throw new Error(`Project file not found: ${projectFile}`);
    }

    const data = await this.fileService.readYaml<Project>(projectFile);
    return { ...data, path: projectPath };
  }

  async updateProject(projectPath: string, updates: Partial<Project>): Promise<Project> {
    const project = await this.getProject(projectPath);

    const updated: Project = {
      ...project,
      ...updates,
      updatedAt: this.now(),
    };

    const { projectFile } = this.getPaths(projectPath);
    await this.fileService.writeYaml(projectFile, updated);

    return updated;
  }

  // ==================== MODULE OPERATIONS ====================

  async listModules(projectPath: string): Promise<Module[]> {
    const { modulesDir } = this.getPaths(projectPath);

    if (!(await this.fileService.exists(modulesDir))) {
      return [];
    }

    // Find all module.yaml files
    const files = await this.fileService.list(modulesDir, '*/module.yaml');

    const modules = await Promise.all(
      files.map(async (file) => {
        const moduleSlug = path.basename(path.dirname(file));
        return this.getModule(projectPath, moduleSlug);
      })
    );

    return modules.sort((a, b) => a.order - b.order);
  }

  async getModule(projectPath: string, moduleSlug: string): Promise<Module> {
    const { moduleFile } = this.getModulePaths(projectPath, moduleSlug);

    if (!(await this.fileService.exists(moduleFile))) {
      throw new Error(`Module not found: ${moduleSlug}`);
    }

    return await this.fileService.readYaml<Module>(moduleFile);
  }

  async createModule(projectPath: string, data: CreateModuleInput): Promise<Module> {
    const project = await this.getProject(projectPath);
    const { moduleDir, moduleFile } = this.getModulePaths(projectPath, data.slug);

    // Check if module already exists
    if (await this.fileService.exists(moduleFile)) {
      throw new Error(`Module already exists: ${data.slug}`);
    }

    // Get next order number
    const modules = await this.listModules(projectPath);
    const maxOrder = modules.reduce((max, m) => Math.max(max, m.order), 0);

    const newModule: Module = {
      id: this.generateId('mod'),
      slug: data.slug,
      projectId: project.id,
      name: data.name,
      description: data.description,
      order: data.order ?? maxOrder + 1,
      features: [],
      createdAt: this.now(),
      updatedAt: this.now(),
    };

    // Create module directory and file
    await this.fileService.ensureDir(moduleDir);
    await this.fileService.writeYaml(moduleFile, newModule);

    return newModule;
  }

  async updateModule(projectPath: string, moduleSlug: string, updates: Partial<Module>): Promise<Module> {
    const existingModule = await this.getModule(projectPath, moduleSlug);

    const updated: Module = {
      ...existingModule,
      ...updates,
      updatedAt: this.now(),
    };

    const { moduleFile } = this.getModulePaths(projectPath, moduleSlug);
    await this.fileService.writeYaml(moduleFile, updated);

    return updated;
  }

  async deleteModule(projectPath: string, moduleSlug: string): Promise<void> {
    const { moduleDir } = this.getModulePaths(projectPath, moduleSlug);

    if (!(await this.fileService.exists(moduleDir))) {
      throw new Error(`Module not found: ${moduleSlug}`);
    }

    // Check if module has features
    const features = await this.listFeatures(projectPath, moduleSlug);
    if (features.length > 0) {
      throw new Error(`Cannot delete module with features: ${moduleSlug}`);
    }

    // Delete module directory
    await this.fileService.delete(moduleDir);
  }

  // ==================== FEATURE OPERATIONS ====================

  async listFeatures(projectPath: string, moduleSlug?: string): Promise<Feature[]> {
    if (moduleSlug) {
      // List features for a specific module
      const { featuresDir } = this.getModulePaths(projectPath, moduleSlug);

      if (!(await this.fileService.exists(featuresDir))) {
        return [];
      }

      const files = await this.fileService.list(featuresDir, '*.yaml');

      return await Promise.all(
        files.map(async (file) => {
          const featureSlug = path.basename(file, '.yaml');
          return this.getFeature(projectPath, moduleSlug, featureSlug);
        })
      );
    } else {
      // List all features across all modules
      const modules = await this.listModules(projectPath);
      const featureLists = await Promise.all(
        modules.map((m) => {
          const slug = path.basename(path.dirname(m.id));
          return this.listFeatures(projectPath, slug);
        })
      );
      return featureLists.flat();
    }
  }

  async getFeature(projectPath: string, moduleSlug: string, featureSlug: string): Promise<Feature> {
    const featurePath = this.getFeaturePath(projectPath, moduleSlug, featureSlug);

    if (!(await this.fileService.exists(featurePath))) {
      throw new Error(`Feature not found: ${moduleSlug}/${featureSlug}`);
    }

    return await this.fileService.readYaml<Feature>(featurePath);
  }

  async createFeature(projectPath: string, moduleSlug: string, data: CreateFeatureInput): Promise<Feature> {
    const parentModule = await this.getModule(projectPath, moduleSlug);
    const { featuresDir } = this.getModulePaths(projectPath, moduleSlug);
    const featurePath = this.getFeaturePath(projectPath, moduleSlug, data.slug);

    // Check if feature already exists
    if (await this.fileService.exists(featurePath)) {
      throw new Error(`Feature already exists: ${moduleSlug}/${data.slug}`);
    }

    const feature: Feature = {
      id: this.generateId('feat'),
      slug: data.slug,
      moduleId: parentModule.id,
      moduleSlug: moduleSlug,
      name: data.name,
      description: data.description,
      status: data.status ?? 'draft',
      phase: data.phase ?? 'cpo',
      implemented: false,
      source: 'new',
      implementationFiles: [],
      dependencies: [],
      implementationPlan: [],
      tasks: [],
      taskProgress: {
        total: 0,
        completed: 0,
        inProgress: 0,
        pending: 0,
        percentComplete: 0,
      },
      checklist: [],
      checklistProgress: {
        total: 0,
        verified: 0,
        percentComplete: 0,
      },
      createdAt: this.now(),
      updatedAt: this.now(),
    };

    // Ensure features directory exists
    await this.fileService.ensureDir(featuresDir);

    // Write feature file
    await this.fileService.writeYaml(featurePath, feature);

    // Update module's feature list
    const updatedFeatures = [...parentModule.features, feature.id];
    await this.updateModule(projectPath, moduleSlug, { features: updatedFeatures });

    return feature;
  }

  async updateFeature(
    projectPath: string,
    moduleSlug: string,
    featureSlug: string,
    updates: Partial<Feature>
  ): Promise<Feature> {
    const feature = await this.getFeature(projectPath, moduleSlug, featureSlug);

    const updated: Feature = {
      ...feature,
      ...updates,
      updatedAt: this.now(),
    };

    const featurePath = this.getFeaturePath(projectPath, moduleSlug, featureSlug);
    await this.fileService.writeYaml(featurePath, updated);

    return updated;
  }

  async deleteFeature(projectPath: string, moduleSlug: string, featureSlug: string): Promise<void> {
    const feature = await this.getFeature(projectPath, moduleSlug, featureSlug);
    const featurePath = this.getFeaturePath(projectPath, moduleSlug, featureSlug);

    // Check for dependent features
    const allFeatures = await this.listFeatures(projectPath);
    const dependents = allFeatures.filter((f) => f.dependencies.includes(feature.id));

    if (dependents.length > 0) {
      throw new Error(
        `Cannot delete feature with dependencies: ${dependents.map((f) => f.name).join(', ')}`
      );
    }

    // Delete feature file
    await this.fileService.delete(featurePath);

    // Update module's feature list
    const parentModule = await this.getModule(projectPath, moduleSlug);
    const updatedFeatures = parentModule.features.filter((id) => id !== feature.id);
    await this.updateModule(projectPath, moduleSlug, { features: updatedFeatures });
  }

  // ==================== SCHEMA OPERATIONS ====================

  async getSchema(projectPath: string): Promise<string> {
    const { schemaFile } = this.getPaths(projectPath);

    if (!(await this.fileService.exists(schemaFile))) {
      return '';
    }

    return await this.fileService.readText(schemaFile);
  }

  async updateSchema(projectPath: string, dbml: string): Promise<void> {
    const { schemaFile } = this.getPaths(projectPath);
    await this.fileService.writeText(schemaFile, dbml);
  }

  // ==================== OPENAPI OPERATIONS ====================

  async getOpenAPI(projectPath: string): Promise<Record<string, unknown>> {
    const { openApiFile } = this.getPaths(projectPath);

    if (!(await this.fileService.exists(openApiFile))) {
      return {
        openapi: '3.0.0',
        info: {
          title: 'API',
          version: '1.0.0',
        },
        paths: {},
      };
    }

    return await this.fileService.readYaml<Record<string, unknown>>(openApiFile);
  }

  async updateOpenAPI(projectPath: string, spec: Record<string, unknown>): Promise<void> {
    const { openApiFile } = this.getPaths(projectPath);
    await this.fileService.writeYaml(openApiFile, spec);
  }

  // ==================== GRAPHQL OPERATIONS ====================

  async getGraphQL(projectPath: string): Promise<string> {
    const { graphqlFile } = this.getPaths(projectPath);

    if (!(await this.fileService.exists(graphqlFile))) {
      return '';
    }

    return await this.fileService.readText(graphqlFile);
  }

  async updateGraphQL(projectPath: string, schema: string): Promise<void> {
    const { graphqlFile } = this.getPaths(projectPath);
    await this.fileService.writeText(graphqlFile, schema);
  }

  // ==================== COMPONENT OPERATIONS ====================

  async listComponents(projectPath: string, type?: 'page' | 'component'): Promise<UIComponent[]> {
    const { componentsDir } = this.getPaths(projectPath);

    if (!(await this.fileService.exists(componentsDir))) {
      return [];
    }

    const pattern = type ? `${type}s/*.html` : '*/*.html';
    const files = await this.fileService.list(componentsDir, pattern);

    const components = await Promise.all(
      files.map(async (file) => {
        const content = await this.fileService.readText(file);
        return this.parseComponent(file, content);
      })
    );

    return components;
  }

  async getComponent(projectPath: string, componentId: string): Promise<UIComponent> {
    const components = await this.listComponents(projectPath);
    const component = components.find((c) => c.id === componentId);

    if (!component) {
      throw new Error(`Component not found: ${componentId}`);
    }

    return component;
  }

  async createComponent(projectPath: string, data: CreateComponentInput): Promise<UIComponent> {
    const { componentsDir } = this.getPaths(projectPath);

    // Check if component already exists
    const existing = await this.listComponents(projectPath);
    if (existing.some((c) => c.id === data.id)) {
      throw new Error(`Component already exists: ${data.id}`);
    }

    const component: UIComponent = {
      id: data.id,
      name: data.name,
      type: data.type,
      html: data.html,
      description: data.description,
      featureRefs: [],
      createdAt: this.now(),
      updatedAt: this.now(),
    };

    // Build component content with metadata
    const content = this.buildComponentContent(component);

    // Determine file path
    const subdir = data.type === 'page' ? 'pages' : 'shared';
    const fileName = `${data.id}.html`;
    const filePath = path.join(componentsDir, subdir, fileName);

    await this.fileService.writeText(filePath, content);

    return component;
  }

  async updateComponent(projectPath: string, componentId: string, updates: Partial<UIComponent>): Promise<UIComponent> {
    const component = await this.getComponent(projectPath, componentId);

    const updated: UIComponent = {
      ...component,
      ...updates,
      updatedAt: this.now(),
    };

    // Find component file
    const { componentsDir } = this.getPaths(projectPath);
    const subdir = component.type === 'page' ? 'pages' : 'shared';
    const filePath = path.join(componentsDir, subdir, `${componentId}.html`);

    const content = this.buildComponentContent(updated);
    await this.fileService.writeText(filePath, content);

    return updated;
  }

  async deleteComponent(projectPath: string, componentId: string): Promise<void> {
    const component = await this.getComponent(projectPath, componentId);

    // Check if component is referenced by features
    if (component.featureRefs.length > 0) {
      throw new Error(
        `Cannot delete component referenced by features: ${component.featureRefs.join(', ')}`
      );
    }

    const { componentsDir } = this.getPaths(projectPath);
    const subdir = component.type === 'page' ? 'pages' : 'shared';
    const filePath = path.join(componentsDir, subdir, `${componentId}.html`);

    await this.fileService.delete(filePath);
  }

  /**
   * Parse component from HTML file with metadata comment
   */
  private parseComponent(filePath: string, content: string): UIComponent {
    const metadataMatch = content.match(/<!--\s*\n([\s\S]*?)\n-->/);

    if (!metadataMatch) {
      throw new Error(`Component missing metadata comment: ${filePath}`);
    }

    const metadataLines = metadataMatch[1]?.trim().split('\n') || [];
    const metadata: Record<string, string> = {};

    for (const line of metadataLines) {
      const [key, ...valueParts] = line.trim().split(':');
      const value = valueParts.join(':').trim();

      if (key) {
        metadata[key] = value;
      }
    }

    // Extract HTML (everything after metadata comment)
    const html = content.substring(metadataMatch[0]?.length || 0).trim();

    // Parse feature refs from JSON string
    let featureRefs: string[] = [];
    if (metadata.features) {
      try {
        featureRefs = JSON.parse(metadata.features);
      } catch {
        // Ignore parse errors
      }
    }

    return {
      id: metadata.id || path.basename(filePath, '.html'),
      name: metadata.name || '',
      type: (metadata.type as 'page' | 'component') || 'component',
      html,
      description: metadata.description || '',
      featureRefs,
      createdAt: metadata.createdAt || this.now(),
      updatedAt: metadata.updatedAt || this.now(),
    };
  }

  /**
   * Build component HTML content with metadata comment
   */
  private buildComponentContent(component: UIComponent): string {
    const metadata = [
      `  id: ${component.id}`,
      `  name: ${component.name}`,
      `  type: ${component.type}`,
      `  features: ${JSON.stringify(component.featureRefs)}`,
    ];

    if (component.description) {
      metadata.push(`  description: ${component.description}`);
    }

    return `<!--
${metadata.join('\n')}
-->
${component.html}`;
  }
}

/**
 * Create singleton instance
 */
let specServiceInstance: SpecService | null = null;

export function getSpecService(fileService: FileService): SpecService {
  if (!specServiceInstance) {
    specServiceInstance = new SpecService(fileService);
  }
  return specServiceInstance;
}
