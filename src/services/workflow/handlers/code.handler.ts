/**
 * CodeStep Handler - Executes synchronous code steps
 */

import type { CodeStep, StepResult } from '@/types/workflow/step';
import type { WorkflowContext } from '@/types/workflow/state';
import type { Ambiguity, AmbiguitySeverity } from '@/types/workflow/state';
import { getSpecService } from '@/services/core/spec.service';
import { getFileService } from '@/services/core/file.service';
import { getLLMService } from '@/services/ai/llm.service';
import { getValidationService } from '@/services/core/validation.service';
import { getPromptService } from '@/services/ai/prompt.service';
import { nanoid } from 'nanoid';
import path from 'path';
import type { Feature } from '@/types';

/**
 * Execute a code step
 */
export async function executeCodeStep(
  step: CodeStep,
  context: WorkflowContext
): Promise<StepResult> {
  const startTime = Date.now();

  try {
    // Get handler function
    const handler = getHandler(step.handler);
    if (!handler) {
      throw new Error(`Handler not found: ${step.handler}`);
    }

    // Prepare input from step definition and context
    const input = {
      ...step.input,
      ...context.state.data,
    };

    // Execute handler
    const output = await handler(input, context);

    const duration = Date.now() - startTime;

    return {
      stepId: step.id,
      status: 'completed',
      output,
      duration,
    };
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    return {
      stepId: step.id,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Code step execution failed',
      duration,
    };
  }
}

/**
 * Handler registry
 */
const handlers: Record<string, CodeStepHandler> = {
  // Workflow initialization
  initCPOWorkflow,
  initCTOWorkflow,
  initClarifyWorkflow,
  initREWorkflow,

  // Project and state loading
  loadProjectState,
  initTopicContext,

  // Answer processing
  saveAnswerToSpec,
  formatAnswerForStorage,
  validateAnswerCompleteness,

  // Phase summaries
  generateCPOSummary,
  generateCTOSummary,

  // Clarify phase
  detectAmbiguities,
  categorizeAmbiguity,
  showClarifyUI,
  resolveAmbiguity,
  applyResolutionToSpec,
  markAsTBD,
  deferToCTO,
  presentAmbiguitySummary,
  deferAmbiguity,
  applyResolution,
  generateClarifySummary,
  markClarifyComplete,
  updateProjectPhase,

  // Reverse engineering
  scanDirectoryStructure,
  loadModuleFiles,
  findSchemaFiles,
  findAPIFiles,
  compileREResults,

  // Drift detection
  loadCurrentSpec,
  computeDiffs,
  compileDriftReport,
  applyNonConflictingChanges,
  applySingleDrift,

  // Validation
  loadAllSpecs,
  validateSchemaReferences,
  validateAPIReferences,
  validateComponentReferences,
  validateNamingConventions,
  detectCircularDependencies,
  findOrphanArtifacts,
  compileValidationReport,

  // Generators
  loadSchemaContext,
  generateDBML,
  validateDBML,
  writeSchemaFile,
  loadAPIContext,
  generateOpenAPI,
  writeOpenAPIFile,
  generateGraphQL,
  writeGraphQLFile,
  loadComponentContext,
  generateComponent,
  writeComponentFile,

  // Finalization
  finalizeProject,
};

/**
 * Get handler by name
 */
function getHandler(name: string): CodeStepHandler | null {
  return handlers[name] || null;
}

/**
 * Register a handler
 */
export function registerHandler(name: string, handler: CodeStepHandler): void {
  handlers[name] = handler;
}

/**
 * Code step handler function type
 */
export type CodeStepHandler = (
  input: Record<string, unknown>,
  context: WorkflowContext
) => Promise<Record<string, unknown>>;

// ============================================================================
// WORKFLOW INITIALIZATION HANDLERS
// ============================================================================

async function initCPOWorkflow(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  // Initialize CPO phase state
  context.state.data.cpoState = {
    phase: 'cpo',
    currentTopic: 0,
    answeredQuestions: [],
    generatedFeatures: [],
    startedAt: new Date().toISOString(),
  };

  return {
    initialized: true,
    phase: 'cpo',
    topics: context.state.data.topics || [],
  };
}

async function initCTOWorkflow(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  // Initialize CTO phase state
  context.state.data.ctoState = {
    phase: 'cto',
    currentTopic: 0,
    answeredQuestions: [],
    techDecisions: {},
    startedAt: new Date().toISOString(),
  };

  return {
    initialized: true,
    phase: 'cto',
    topics: context.state.data.topics || [],
  };
}

async function initClarifyWorkflow(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  // Initialize Clarify phase state
  const clarifyState = {
    ambiguities: [],
    currentIndex: 0,
    resolvedCount: 0,
    deferredCount: 0,
    status: 'scanning' as const,
  };

  context.state.clarifyState = clarifyState;

  return {
    initialized: true,
    phase: 'clarify',
    clarifyState,
  };
}

async function initREWorkflow(
  input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  // Initialize reverse engineering workflow state
  context.state.data.reState = {
    phase: 're',
    targetPath: input.targetPath || '',
    projectType: 'unknown',
    discoveredModules: [],
    discoveredFeatures: [],
    startedAt: new Date().toISOString(),
  };

  return {
    initialized: true,
    phase: 're',
    targetPath: input.targetPath,
  };
}

// ============================================================================
// PROJECT AND STATE LOADING HANDLERS
// ============================================================================

async function loadProjectState(
  input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);

  try {
    const project = await specService.getProject(context.projectId);

    return {
      projectId: context.projectId,
      project,
      mode: input.mode || 'new',
    };
  } catch (error) {
    // Project doesn't exist yet - that's okay for new projects
    return {
      projectId: context.projectId,
      mode: 'new',
      project: null,
    };
  }
}

async function initTopicContext(
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<Record<string, unknown>> {
  const currentTopic = input.currentTopic as { id: string; name: string; description?: string; questionCount?: number } | undefined;
  return {
    currentTopic,
    topicContext: {
      id: currentTopic?.id,
      name: currentTopic?.name,
      description: currentTopic?.description,
      questionCount: currentTopic?.questionCount || 0,
    },
  };
}

// ============================================================================
// ANSWER PROCESSING HANDLERS
// ============================================================================

async function saveAnswerToSpec(
  input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);

  const questionId = input.questionId as string;
  const answer = input.answer as string | number | boolean | string[];
  const phase = input.phase || context.state.data.phase || 'cpo';

  // Store answer in context
  context.state.answers[questionId] = answer;

  // Determine target feature/module based on question context
  const featureSlug = (input.featureSlug || context.state.data.currentFeatureSlug) as string | undefined;
  const moduleSlug = (input.moduleSlug || context.state.data.currentModuleSlug) as string | undefined;

  if (featureSlug && moduleSlug) {
    try {
      // Load existing feature
      const feature = await specService.getFeature(context.projectId, moduleSlug, featureSlug);

      // Update feature based on phase
      const updates: Partial<Feature> = {};

      if (phase === 'cpo') {
        updates.business = {
          userStory: feature.business?.userStory || '',
          acceptanceCriteria: feature.business?.acceptanceCriteria || [],
          priority: feature.business?.priority || 'medium',
          // Add answer to appropriate field based on question type
          ...feature.business,
          [questionId]: answer,
        };
      } else if (phase === 'cto') {
        updates.technical = {
          schemaRefs: feature.technical?.schemaRefs || [],
          apiRefs: feature.technical?.apiRefs || [],
          componentRefs: feature.technical?.componentRefs || [],
          ...feature.technical,
          // Add answer to appropriate field
          [questionId]: answer,
        };
      }

      // Save updated feature
      await specService.updateFeature(context.projectId, moduleSlug, featureSlug, updates);
    } catch (error) {
      // Feature doesn't exist yet - store in context for later
      console.warn(`Feature not found, storing answer in context: ${error}`);
    }
  }

  return {
    saved: true,
    questionId,
    answer,
    phase,
  };
}

async function formatAnswerForStorage(
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<Record<string, unknown>> {
  const answer = input.answer;
  const questionType = input.questionType;

  let formatted: unknown = answer;

  // Format based on question type
  switch (questionType) {
    case 'multiple_choice':
      formatted = Array.isArray(answer) ? answer : [answer];
      break;
    case 'number':
      formatted = typeof answer === 'number' ? answer : parseInt(String(answer), 10);
      break;
    case 'boolean':
      formatted = Boolean(answer);
      break;
    case 'text':
    case 'long_text':
    default:
      formatted = String(answer);
      break;
  }

  return {
    formatted,
    original: answer,
    questionType,
  };
}

async function validateAnswerCompleteness(
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<Record<string, unknown>> {
  const answer = input.answer;
  const required = input.required !== false;

  let isComplete = false;
  const errors: string[] = [];

  if (required && (answer === null || answer === undefined || answer === '')) {
    errors.push('Answer is required');
  } else if (answer !== null && answer !== undefined) {
    // Check for minimum length if text
    if (typeof answer === 'string') {
      if (answer.trim().length < 3) {
        errors.push('Answer is too short (minimum 3 characters)');
      } else {
        isComplete = true;
      }
    } else {
      isComplete = true;
    }
  }

  return {
    isComplete,
    errors,
    valid: errors.length === 0,
  };
}

// ============================================================================
// PHASE SUMMARY HANDLERS
// ============================================================================

async function generateCPOSummary(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);

  // Load all features created during CPO phase
  const features = await specService.listFeatures(context.projectId);
  const cpoFeatures = features.filter(f => f.phase === 'cpo');

  const summary = {
    phase: 'cpo',
    completedAt: new Date().toISOString(),
    answeredQuestions: Object.keys(context.state.answers).length,
    featuresCreated: cpoFeatures.length,
    features: cpoFeatures.map(f => ({
      id: f.id,
      name: f.name,
      description: f.description,
      userStory: f.business?.userStory,
    })),
    answers: context.state.answers,
  };

  return { summary };
}

async function generateCTOSummary(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);

  // Load all features updated during CTO phase
  const features = await specService.listFeatures(context.projectId);
  const ctoFeatures = features.filter(f => f.technical);

  const ctoState = context.state.data.ctoState as { techDecisions?: Record<string, unknown> } | undefined;
  const summary = {
    phase: 'cto',
    completedAt: new Date().toISOString(),
    answeredQuestions: Object.keys(context.state.answers).length,
    featuresEnhanced: ctoFeatures.length,
    techDecisions: ctoState?.techDecisions || {},
    schemasGenerated: await specService.getSchema(context.projectId) ? 1 : 0,
    apisGenerated: Object.keys((await specService.getOpenAPI(context.projectId)).paths || {}).length,
  };

  return { summary };
}

// ============================================================================
// CLARIFY PHASE HANDLERS
// ============================================================================

async function detectAmbiguities(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);

  const detectedIssues: Ambiguity[] = [];
  const features = await specService.listFeatures(context.projectId);

  // Regex patterns for detecting ambiguities
  const vaguePatterns = /\b(fast|slow|easy|simple|secure|better|good|bad|nice|clean)\b/gi;
  const conflictPatterns = /\b(maybe|possibly|might|could|should)\b/gi;

  for (const feature of features) {
    // Check description for vague language
    if (feature.description) {
      const vagueMatches = feature.description.match(vaguePatterns);
      if (vagueMatches) {
        detectedIssues.push({
          id: nanoid(),
          featureId: feature.id,
          type: 'vague_language',
          severity: 'medium',
          text: vagueMatches.join(', '),
          context: `Feature description: "${feature.description}"`,
          question: `The description contains vague terms (${vagueMatches.join(', ')}). Can you be more specific?`,
          status: 'pending',
        });
      }

      // Check for conflict indicators
      const conflictMatches = feature.description.match(conflictPatterns);
      if (conflictMatches) {
        detectedIssues.push({
          id: nanoid(),
          featureId: feature.id,
          type: 'conflict',
          severity: 'low',
          text: conflictMatches.join(', '),
          context: `Feature description: "${feature.description}"`,
          question: `The description uses uncertain language (${conflictMatches.join(', ')}). What is the definite requirement?`,
          status: 'pending',
        });
      }
    }

    // Check user story
    if (feature.business?.userStory) {
      const storyVague = feature.business.userStory.match(vaguePatterns);
      if (storyVague) {
        detectedIssues.push({
          id: nanoid(),
          featureId: feature.id,
          type: 'vague_language',
          severity: 'high',
          text: storyVague.join(', '),
          context: `User story: "${feature.business.userStory}"`,
          question: `The user story contains vague terms (${storyVague.join(', ')}). Can you quantify or clarify?`,
          status: 'pending',
        });
      }
    }

    // Check for missing edge cases
    if (feature.business?.acceptanceCriteria && feature.business.acceptanceCriteria.length < 2) {
      detectedIssues.push({
        id: nanoid(),
        featureId: feature.id,
        type: 'missing_edge_case',
        severity: 'medium',
        text: 'Insufficient acceptance criteria',
        context: `Feature has only ${feature.business.acceptanceCriteria.length} acceptance criteria`,
        question: 'What edge cases or error scenarios should be handled?',
        options: ['Add error handling criteria', 'Add validation criteria', 'Add boundary conditions'],
        status: 'pending',
      });
    }
  }

  return {
    detectedIssues,
    count: detectedIssues.length,
  };
}

async function categorizeAmbiguity(
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<Record<string, unknown>> {
  const ambiguity = input.ambiguity as Ambiguity;

  // Determine severity based on type and context
  let severity: AmbiguitySeverity = ambiguity.severity || 'medium';

  // Upgrade severity if in critical fields
  if (ambiguity.context.includes('user story') || ambiguity.context.includes('acceptance criteria')) {
    if (severity === 'low') severity = 'medium';
    if (severity === 'medium' && ambiguity.type === 'vague_language') severity = 'high';
  }

  return {
    categorized: true,
    ambiguity: {
      ...ambiguity,
      severity,
    },
  };
}

async function resolveAmbiguity(
  input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const ambiguityId = input.ambiguityId as string;
  const resolution = input.resolution as string;

  if (!context.state.clarifyState) {
    throw new Error('Clarify state not initialized');
  }

  // Find ambiguity and update it
  const ambiguity = context.state.clarifyState.ambiguities.find(a => a.id === ambiguityId);
  if (!ambiguity) {
    throw new Error(`Ambiguity not found: ${ambiguityId}`);
  }

  ambiguity.resolution = resolution;
  ambiguity.status = 'resolved';
  context.state.clarifyState.resolvedCount++;

  return {
    resolved: true,
    ambiguityId,
    resolution,
  };
}

async function showClarifyUI(
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<Record<string, unknown>> {
  // This is a UI-side operation, no-op in handler
  const ambiguities = input.ambiguities as unknown[] | undefined;
  return {
    ambiguitiesShown: true,
    count: ambiguities?.length || 0,
  };
}

async function applyResolutionToSpec(
  input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);

  const ambiguity = input.ambiguity as Ambiguity;
  const resolution = ambiguity.resolution;

  if (!resolution) {
    throw new Error('Resolution is required');
  }

  // Load feature and update based on ambiguity context
  const features = await specService.listFeatures(context.projectId);
  const feature = features.find(f => f.id === ambiguity.featureId);

  if (!feature) {
    throw new Error(`Feature not found: ${ambiguity.featureId}`);
  }

  // Parse module slug from feature path
  const moduleSlug = (context.state.data.currentModuleSlug as string | undefined) || 'core';
  const featureSlug = (context.state.data.currentFeatureSlug as string | undefined) || 'default';

  // Apply resolution based on ambiguity type
  const updates: Partial<Feature> = {};

  if (ambiguity.context.includes('description')) {
    updates.description = resolution;
  } else if (ambiguity.context.includes('user story')) {
    updates.business = {
      userStory: resolution,
      acceptanceCriteria: feature.business?.acceptanceCriteria || [],
      priority: feature.business?.priority || 'medium',
      ...feature.business,
    };
  }

  await specService.updateFeature(context.projectId, moduleSlug, featureSlug, updates);

  return {
    applied: true,
    ambiguityId: ambiguity.id,
    featureId: feature.id,
  };
}

async function markAsTBD(
  input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const ambiguityId = input.ambiguityId;

  if (!context.state.clarifyState) {
    throw new Error('Clarify state not initialized');
  }

  const ambiguity = context.state.clarifyState.ambiguities.find(a => a.id === ambiguityId);
  if (!ambiguity) {
    throw new Error(`Ambiguity not found: ${ambiguityId}`);
  }

  ambiguity.status = 'deferred';
  ambiguity.resolution = '[TBD - Deferred to CTO phase]';
  context.state.clarifyState.deferredCount++;

  return {
    deferred: true,
    ambiguityId,
  };
}

async function deferToCTO(
  input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const ambiguity = input.ambiguity as Ambiguity;

  // Store deferred ambiguity for CTO phase
  if (!context.state.data.deferredAmbiguities) {
    context.state.data.deferredAmbiguities = [] as Ambiguity[];
  }

  const deferredAmbiguities = context.state.data.deferredAmbiguities as Ambiguity[];
  deferredAmbiguities.push(ambiguity);

  return {
    deferred: true,
    ambiguityId: ambiguity.id,
    deferredCount: deferredAmbiguities.length,
  };
}

async function presentAmbiguitySummary(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  if (!context.state.clarifyState) {
    throw new Error('Clarify state not initialized');
  }

  const { ambiguities } = context.state.clarifyState;

  // Group by severity
  const highSeverity = ambiguities.filter(a => a.severity === 'high');
  const mediumSeverity = ambiguities.filter(a => a.severity === 'medium');
  const lowSeverity = ambiguities.filter(a => a.severity === 'low');

  return {
    summary: {
      total: ambiguities.length,
      high: highSeverity.length,
      medium: mediumSeverity.length,
      low: lowSeverity.length,
    },
    ambiguities,
  };
}

async function deferAmbiguity(
  input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const currentAmbiguity = input.currentAmbiguity as { id?: string } | undefined;
  const ambiguityId = currentAmbiguity?.id;

  if (!context.state.clarifyState || !ambiguityId) {
    throw new Error('Clarify state or ambiguity ID not provided');
  }

  const ambiguity = context.state.clarifyState.ambiguities.find(a => a.id === ambiguityId);
  if (!ambiguity) {
    throw new Error(`Ambiguity not found: ${ambiguityId}`);
  }

  ambiguity.status = 'deferred';
  ambiguity.resolution = '[TBD - Deferred to CTO phase]';
  context.state.clarifyState.deferredCount++;

  // Also store in deferredAmbiguities array for CTO phase
  if (!context.state.data.deferredAmbiguities) {
    context.state.data.deferredAmbiguities = [] as Ambiguity[];
  }
  const deferredAmbiguities = context.state.data.deferredAmbiguities as Ambiguity[];
  deferredAmbiguities.push(ambiguity);

  return {
    deferred: true,
    ambiguityId,
  };
}

async function applyResolution(
  input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);

  const currentAmbiguity = input.currentAmbiguity as Ambiguity;
  const userAnswer = input.userAnswer as string;

  if (!userAnswer || !currentAmbiguity) {
    throw new Error('User answer and ambiguity are required');
  }

  // Update ambiguity with resolution
  currentAmbiguity.resolution = userAnswer;
  currentAmbiguity.status = 'resolved';

  if (context.state.clarifyState) {
    context.state.clarifyState.resolvedCount++;
  }

  // Load feature and update based on ambiguity context
  const features = await specService.listFeatures(context.projectId);
  const feature = features.find(f => f.id === currentAmbiguity.featureId);

  if (!feature) {
    console.warn(`Feature not found for ambiguity: ${currentAmbiguity.featureId}`);
    return {
      applied: false,
      ambiguityId: currentAmbiguity.id,
    };
  }

  const [moduleSlug, featureSlug] = feature.id.split('/');

  if (!moduleSlug || !featureSlug) {
    console.warn(`Invalid feature id format: ${feature.id}`);
    return { applied: false, ambiguityId: currentAmbiguity.id };
  }
  const updates: Partial<Feature> = {};

  // Apply resolution to appropriate field
  if (currentAmbiguity.context.includes('description')) {
    updates.description = userAnswer;
  } else if (currentAmbiguity.context.includes('user story')) {
    updates.business = {
      userStory: userAnswer,
      acceptanceCriteria: feature.business?.acceptanceCriteria || [],
      priority: feature.business?.priority || 'medium',
      ...feature.business,
    };
  }

  if (Object.keys(updates).length > 0) {
    await specService.updateFeature(context.projectId, moduleSlug, featureSlug, updates);
  }

  return {
    applied: true,
    ambiguityId: currentAmbiguity.id,
    featureId: feature.id,
  };
}

async function generateClarifySummary(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  if (!context.state.clarifyState) {
    throw new Error('Clarify state not initialized');
  }

  const { ambiguities, resolvedCount, deferredCount } = context.state.clarifyState;

  return {
    summary: {
      phase: 'clarify',
      completedAt: new Date().toISOString(),
      totalAmbiguities: ambiguities.length,
      resolved: resolvedCount,
      deferred: deferredCount,
      highSeverityResolved: ambiguities.filter(a => a.severity === 'high' && a.status === 'resolved').length,
    },
  };
}

async function markClarifyComplete(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  if (context.state.clarifyState) {
    context.state.clarifyState.status = 'complete';
  }

  return {
    complete: true,
    message: 'No ambiguities detected - proceeding to CTO phase',
  };
}

async function updateProjectPhase(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const projectFile = path.join(context.projectId, 'project.yaml');

  try {
    const content = await fileService.readText(projectFile);
    const lines = content.split('\n');

    // Update currentPhase line
    const updatedLines = lines.map(line => {
      if (line.trim().startsWith('currentPhase:')) {
        return 'currentPhase: clarify_complete';
      }
      return line;
    });

    await fileService.writeText(projectFile, updatedLines.join('\n'));

    return {
      updated: true,
      phase: 'clarify_complete',
    };
  } catch (error) {
    console.warn('Failed to update project phase:', error);
    return {
      updated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ============================================================================
// REVERSE ENGINEERING HANDLERS
// ============================================================================

async function scanDirectoryStructure(
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const targetPath = input.targetPath as string | undefined;

  if (!targetPath) {
    throw new Error('Target path is required');
  }

  // Scan directory for common config files
  const configFiles = await fileService.list(targetPath, '{package.json,tsconfig.json,Cargo.toml,go.mod,requirements.txt,pom.xml}');

  // Detect project type
  let projectType = 'unknown';
  if (configFiles.some(f => f.includes('package.json'))) {
    projectType = 'nodejs';
  } else if (configFiles.some(f => f.includes('Cargo.toml'))) {
    projectType = 'rust';
  } else if (configFiles.some(f => f.includes('go.mod'))) {
    projectType = 'go';
  } else if (configFiles.some(f => f.includes('requirements.txt'))) {
    projectType = 'python';
  } else if (configFiles.some(f => f.includes('pom.xml'))) {
    projectType = 'java';
  }

  // Find common entry points
  const entryPoints = await fileService.list(targetPath, '{src/**/*.{ts,js,rs,go,py,java},lib/**/*.{ts,js,rs,go,py}}');

  return {
    directories: [targetPath],
    configFiles,
    entryPoints: entryPoints.slice(0, 10), // Limit to first 10
    projectType,
  };
}

async function loadModuleFiles(
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const modulePath = input.modulePath as string | undefined;

  if (!modulePath) {
    throw new Error('Module path is required');
  }

  // Load source files (limit size to avoid huge reads)
  const files = await fileService.list(modulePath, '*.{ts,js,rs,go,py,java}');
  let totalContent = '';
  let fileCount = 0;

  for (const file of files.slice(0, 5)) { // Limit to 5 files
    try {
      const content = await fileService.readText(file);
      if (content.length < 10000) { // Skip huge files
        totalContent += `\n\n// File: ${file}\n${content}`;
        fileCount++;
      }
    } catch {
      // Skip files we can't read
    }
  }

  return {
    moduleFilesContent: totalContent,
    fileCount,
  };
}

async function findSchemaFiles(
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const targetPath = input.targetPath as string;

  // Common schema file patterns
  const schemaFiles = await fileService.list(
    targetPath,
    '{**/*.dbml,**/migrations/**/*.sql,**/schema.prisma,**/models/**/*.{ts,js,py}}'
  );

  return {
    schemaFiles,
  };
}

async function findAPIFiles(
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const targetPath = input.targetPath as string;

  // Common API file patterns
  const apiFiles = await fileService.list(
    targetPath,
    '{**/routes/**/*.{ts,js},**/controllers/**/*.{ts,js},**/api/**/*.{ts,js,py},**/*_handler.go,**/openapi.{yaml,yml,json}}'
  );

  return {
    apiFiles,
  };
}

async function compileREResults(
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<Record<string, unknown>> {
  const schemaFiles = input.schemaFiles as unknown[] | undefined;
  const apiFiles = input.apiFiles as unknown[] | undefined;
  const report = {
    projectType: input.projectType || 'unknown',
    modulesFound: input.discoveredModules || [],
    featuresExtracted: input.discoveredFeatures || [],
    schemasFound: schemaFiles?.length || 0,
    apisFound: apiFiles?.length || 0,
    completedAt: new Date().toISOString(),
  };

  return { report };
}

// ============================================================================
// DRIFT DETECTION HANDLERS
// ============================================================================

async function loadCurrentSpec(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);

  const features = await specService.listFeatures(context.projectId);
  const schema = await specService.getSchema(context.projectId);
  const api = await specService.getOpenAPI(context.projectId);

  return {
    specFeatures: features,
    specSchema: schema,
    specAPI: api,
  };
}

async function computeDiffs(
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<Record<string, unknown>> {
  const currentSpec = (input.specFeatures || []) as Array<{ name?: string; implemented?: boolean }>;
  const implementedFeatures = (input.implementedFeatures || []) as Array<{ name?: string }>;

  const diffs: unknown[] = [];

  // Simple diff: compare feature counts and names
  for (const implFeature of implementedFeatures) {
    const specMatch = currentSpec.find((f) => f.name === implFeature.name);
    if (!specMatch) {
      diffs.push({
        type: 'added_in_code',
        feature: implFeature.name,
        message: `Feature "${implFeature.name}" exists in code but not in spec`,
      });
    }
  }

  for (const specFeature of currentSpec) {
    const implMatch = implementedFeatures.find((f) => f.name === specFeature.name);
    if (!implMatch && specFeature.implemented) {
      diffs.push({
        type: 'removed_from_code',
        feature: specFeature.name,
        message: `Feature "${specFeature.name}" marked as implemented but not found in code`,
      });
    }
  }

  return {
    structuralDiffs: diffs,
  };
}

async function compileDriftReport(
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<Record<string, unknown>> {
  const diffs = (input.structuralDiffs || []) as Array<{ type?: string }>;

  const report = {
    totalDrifts: diffs.length,
    addedInCode: diffs.filter((d) => d.type === 'added_in_code').length,
    removedFromCode: diffs.filter((d) => d.type === 'removed_from_code').length,
    modified: diffs.filter((d) => d.type === 'modified').length,
    diffs,
    generatedAt: new Date().toISOString(),
  };

  return { driftReport: report };
}

async function applyNonConflictingChanges(
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<Record<string, unknown>> {
  const diffs = (input.structuralDiffs || []) as Array<{ type?: string }>;

  // Filter for safe changes (additions only)
  const safeChanges = diffs.filter((d) => d.type === 'added_in_code');

  // TODO: Actually apply these changes to specs

  return {
    appliedChanges: safeChanges,
    count: safeChanges.length,
  };
}

async function applySingleDrift(
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<Record<string, unknown>> {
  const drift = input.drift as { id?: string } | undefined;

  // TODO: Apply specific drift change to spec

  return {
    applied: true,
    driftId: drift?.id,
  };
}

// ============================================================================
// VALIDATION HANDLERS
// ============================================================================

async function loadAllSpecs(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);

  const project = await specService.getProject(context.projectId);
  const modules = await specService.listModules(context.projectId);
  const features = await specService.listFeatures(context.projectId);
  const schema = await specService.getSchema(context.projectId);
  const api = await specService.getOpenAPI(context.projectId);
  const components = await specService.listComponents(context.projectId);

  return {
    project,
    modules,
    features,
    schema,
    api,
    components,
    specs: { project, modules, features, schema, api, components },
  };
}

async function validateSchemaReferences(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);
  const validationService = getValidationService(specService);

  const result = await validationService.validateReferences(context.projectId);

  const schemaRefIssues = result.brokenReferences.filter(r => r.targetType === 'schema');

  return {
    schemaRefIssues,
    valid: schemaRefIssues.length === 0,
  };
}

async function validateAPIReferences(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);
  const validationService = getValidationService(specService);

  const result = await validationService.validateReferences(context.projectId);

  const apiRefIssues = result.brokenReferences.filter(r => r.targetType === 'api');

  return {
    apiRefIssues,
    valid: apiRefIssues.length === 0,
  };
}

async function validateComponentReferences(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);
  const validationService = getValidationService(specService);

  const result = await validationService.validateReferences(context.projectId);

  const componentRefIssues = result.brokenReferences.filter(r => r.targetType === 'component');

  return {
    componentRefIssues,
    valid: componentRefIssues.length === 0,
  };
}

async function validateNamingConventions(
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<Record<string, unknown>> {
  const features = (input.features || []) as Array<{ id?: string; name?: string }>;
  const namingIssues: unknown[] = [];

  // Check feature naming conventions
  for (const feature of features) {
    // Feature names should not contain special characters
    if (feature.name && !/^[a-zA-Z0-9\s-]+$/.test(feature.name)) {
      namingIssues.push({
        type: 'feature_name',
        id: feature.id,
        name: feature.name,
        message: `Feature name contains invalid characters: "${feature.name}"`,
      });
    }

    // Feature IDs should follow pattern
    if (feature.id && !feature.id.startsWith('feat_')) {
      namingIssues.push({
        type: 'feature_id',
        id: feature.id,
        message: `Feature ID should start with 'feat_': "${feature.id}"`,
      });
    }
  }

  return {
    namingIssues,
    valid: namingIssues.length === 0,
  };
}

async function detectCircularDependencies(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);
  const validationService = getValidationService(specService);

  const result = await validationService.validateReferences(context.projectId);

  return {
    circularDepIssues: result.circularDependencies,
    valid: result.circularDependencies.length === 0,
  };
}

async function findOrphanArtifacts(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);
  const validationService = getValidationService(specService);

  const result = await validationService.validateReferences(context.projectId);

  return {
    orphanIssues: result.orphanedArtifacts,
    valid: result.orphanedArtifacts.length === 0,
  };
}

async function compileValidationReport(
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<Record<string, unknown>> {
  const schemaRefIssues = (input.schemaRefIssues || []) as unknown[];
  const apiRefIssues = (input.apiRefIssues || []) as unknown[];
  const componentRefIssues = (input.componentRefIssues || []) as unknown[];
  const namingIssues = (input.namingIssues || []) as unknown[];
  const circularDepIssues = (input.circularDepIssues || []) as unknown[];
  const orphanIssues = (input.orphanIssues || []) as unknown[];

  const allIssues = [
    ...schemaRefIssues,
    ...apiRefIssues,
    ...componentRefIssues,
    ...namingIssues,
    ...circularDepIssues,
    ...orphanIssues,
  ];

  const passed = allIssues.length === 0;

  return {
    passed,
    results: allIssues,
    summary: {
      total: allIssues.length,
      passed: passed ? allIssues.length : 0,
      failed: passed ? 0 : allIssues.length,
      warnings: 0,
    },
  };
}

// ============================================================================
// GENERATOR HANDLERS
// ============================================================================

async function loadSchemaContext(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);

  // Load features to extract entities
  const features = await specService.listFeatures(context.projectId);

  // Extract entities from feature business/technical requirements
  const entities: Array<{ name: string; fields: unknown[] }> = [];
  const relationships: unknown[] = [];

  for (const feature of features) {
    if (feature.technical?.schemaRefs) {
      for (const ref of feature.technical.schemaRefs) {
        if (!entities.find(e => e.name === ref.entity)) {
          entities.push({
            name: ref.entity,
            fields: [],
          });
        }
      }
    }
  }

  // Load existing schema if any
  const existingSchema = await specService.getSchema(context.projectId);

  return {
    entities,
    relationships,
    existingSchema: existingSchema || null,
  };
}

async function generateDBML(
  input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const llmService = getLLMService();
  const promptService = getPromptService(context.projectId);

  const entities = input.entities || [];
  const existingSchema = input.existingSchema || '';

  // Generate DBML using LLM
  const systemPrompt = await promptService.compilePrompt('cto-generate-schema-system', {
    entities,
    existingSchema,
  });

  const userPrompt = await promptService.compilePrompt('cto-generate-schema-user', {
    entities,
    context: context.state.answers,
  });

  const response = await llmService.call({
    model: 'sonnet',
    systemPrompt,
    userPrompt,
    maxTokens: 4000,
  });

  // Extract DBML from response (might be in code block)
  let dbml = response.content;
  const dbmlMatch = dbml.match(/```(?:dbml)?\s*\n?([\s\S]*?)\n?```/);
  if (dbmlMatch) {
    dbml = dbmlMatch[1] || '';
  }

  return {
    dbml: dbml.trim(),
    generated: true,
  };
}

async function validateDBML(
  input: Record<string, unknown>,
  _context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);
  const validationService = getValidationService(specService);

  const dbml = input.dbml as string;

  const result = validationService.validateDBML(dbml);

  return {
    valid: result.valid,
    errors: result.errors,
    warnings: result.warnings,
  };
}

async function writeSchemaFile(
  input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);

  const dbml = input.dbml as string;

  if (!dbml) {
    throw new Error('DBML content is required');
  }

  await specService.updateSchema(context.projectId, dbml);

  const schemaPath = path.join(context.projectId, '.foundry', 'schemas', 'schema.dbml');

  return {
    written: true,
    filePath: schemaPath,
  };
}

async function loadAPIContext(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);

  const features = await specService.listFeatures(context.projectId);
  const schema = await specService.getSchema(context.projectId);
  const existingAPI = await specService.getOpenAPI(context.projectId);

  // Determine API style from features or constitution
  const constitutionApi = context.constitution?.api as { style?: string } | undefined;
  const apiStyle = constitutionApi?.style || 'rest';

  // Extract endpoints from feature requirements
  const endpoints: unknown[] = [];
  for (const feature of features) {
    if (feature.technical?.apiRefs) {
      endpoints.push(...feature.technical.apiRefs);
    }
  }

  return {
    apiStyle,
    endpoints,
    schema,
    existingAPI,
  };
}

async function generateOpenAPI(
  input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const llmService = getLLMService();
  const promptService = getPromptService(context.projectId);

  const endpoints = input.endpoints || [];
  const schema = input.schema || '';

  const systemPrompt = await promptService.compilePrompt('cto-generate-api-system', {
    apiStyle: 'openapi',
    schema,
  });

  const userPrompt = await promptService.compilePrompt('cto-generate-api-user', {
    endpoints,
    context: context.state.answers,
  });

  const response = await llmService.call({
    model: 'sonnet',
    systemPrompt,
    userPrompt,
    maxTokens: 4000,
  });

  // Extract OpenAPI spec from response
  let apiSpec = response.content;
  const yamlMatch = apiSpec.match(/```(?:yaml|yml)?\s*\n?([\s\S]*?)\n?```/);
  if (yamlMatch) {
    apiSpec = yamlMatch[1] || '';
  }

  return {
    openapi: apiSpec.trim(),
    generated: true,
  };
}

async function writeOpenAPIFile(
  input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);
  const yaml = await import('js-yaml');

  const openapi = input.openapi as string | undefined;

  if (!openapi) {
    throw new Error('OpenAPI content is required');
  }

  // Parse YAML to object
  const spec = yaml.load(openapi) as Record<string, unknown>;

  await specService.updateOpenAPI(context.projectId, spec);

  const apiPath = path.join(context.projectId, '.foundry', 'apis', 'openapi.yaml');

  return {
    written: true,
    filePath: apiPath,
  };
}

async function generateGraphQL(
  input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const llmService = getLLMService();
  const promptService = getPromptService(context.projectId);

  const endpoints = input.endpoints || [];
  const schema = input.schema || '';

  const systemPrompt = await promptService.compilePrompt('cto-generate-api-system', {
    apiStyle: 'graphql',
    schema,
  });

  const userPrompt = await promptService.compilePrompt('cto-generate-api-user', {
    endpoints,
    context: context.state.answers,
  });

  const response = await llmService.call({
    model: 'sonnet',
    systemPrompt,
    userPrompt,
    maxTokens: 4000,
  });

  // Extract GraphQL schema from response
  let graphqlSchema = response.content;
  const gqlMatch = graphqlSchema.match(/```(?:graphql)?\s*\n?([\s\S]*?)\n?```/);
  if (gqlMatch) {
    graphqlSchema = gqlMatch[1] || '';
  }

  return {
    graphql: graphqlSchema.trim(),
    generated: true,
  };
}

async function writeGraphQLFile(
  input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);

  const graphql = input.graphql as string | undefined;

  if (!graphql) {
    throw new Error('GraphQL schema is required');
  }

  await specService.updateGraphQL(context.projectId, graphql);

  const gqlPath = path.join(context.projectId, '.foundry', 'apis', 'schema.graphql');

  return {
    written: true,
    filePath: gqlPath,
  };
}

async function loadComponentContext(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);

  const features = await specService.listFeatures(context.projectId);
  const existingComponents = await specService.listComponents(context.projectId);

  // Extract screens from feature requirements
  const screens: unknown[] = [];
  for (const feature of features) {
    if (feature.technical?.componentRefs) {
      screens.push(...feature.technical.componentRefs);
    }
  }

  const constitutionUi = context.constitution?.ui as { framework?: string } | undefined;
  const uiFramework = constitutionUi?.framework || 'react';

  return {
    screens,
    uiFramework,
    existingComponents,
  };
}

async function generateComponent(
  input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const llmService = getLLMService();
  const promptService = getPromptService(context.projectId);

  const componentSpec = (input.componentSpec || {}) as { id?: string };
  const uiFramework = input.uiFramework || 'react';

  const systemPrompt = await promptService.compilePrompt('cto-generate-component-system', {
    framework: uiFramework,
  });

  const userPrompt = await promptService.compilePrompt('cto-generate-component-user', {
    component: componentSpec,
    context: context.state.answers,
  });

  const response = await llmService.call({
    model: 'sonnet',
    systemPrompt,
    userPrompt,
    maxTokens: 3000,
  });

  // Extract HTML from response
  let html = response.content;
  const htmlMatch = html.match(/```(?:html)?\s*\n?([\s\S]*?)\n?```/);
  if (htmlMatch) {
    html = htmlMatch[1] || '';
  }

  return {
    html: html.trim(),
    componentId: componentSpec.id || nanoid(),
    generated: true,
  };
}

async function writeComponentFile(
  input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);

  const html = input.html as string | undefined;
  const componentId = input.componentId as string | undefined;
  const componentName = (input.componentName || componentId) as string | undefined;

  if (!html || !componentId) {
    throw new Error('HTML content and component ID are required');
  }

  await specService.createComponent(context.projectId, {
    id: componentId,
    name: componentName || componentId,
    type: 'component',
    html,
    description: (input.description as string) || '',
  });

  const componentPath = path.join(
    context.projectId,
    '.foundry',
    'components',
    'shared',
    `${componentId}.html`
  );

  return {
    written: true,
    filePath: componentPath,
  };
}

// ============================================================================
// FINALIZATION HANDLER
// ============================================================================

async function finalizeProject(
  _input: Record<string, unknown>,
  context: WorkflowContext
): Promise<Record<string, unknown>> {
  const fileService = getFileService();
  const specService = getSpecService(fileService);

  // Update project metadata
  await specService.updateProject(context.projectId, {
    completedAt: new Date().toISOString(),
  });

  // Generate summary
  const features = await specService.listFeatures(context.projectId);
  const modules = await specService.listModules(context.projectId);

  return {
    finalized: true,
    summary: {
      totalModules: modules.length,
      totalFeatures: features.length,
      completedAt: new Date().toISOString(),
    },
  };
}
