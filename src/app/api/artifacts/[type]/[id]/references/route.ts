/**
 * Cross-references API route
 * GET /api/artifacts/[type]/[id]/references - Get all references to/from this artifact
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSpecService } from '@/services/core';
import { getFileService } from '@/services/core/file.service';
import type { ReferencesResponse, Reference } from '@/types/api/responses';

/**
 * GET /api/artifacts/[type]/[id]/references - Compute and return all references
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { type: string; id: string } }
) {
  try {
    const projectPath = request.nextUrl.searchParams.get('projectPath');

    if (!projectPath) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing projectPath query parameter',
          },
        },
        { status: 400 }
      );
    }

    const fileService = getFileService();
    const specService = getSpecService(fileService);

    const incoming: Reference[] = [];
    const outgoing: Reference[] = [];

    // Handle different artifact types
    switch (params.type) {
      case 'features': {
        // For features: find what they reference and what references them
        const moduleSlug = request.nextUrl.searchParams.get('moduleSlug');
        if (!moduleSlug) {
          return NextResponse.json(
            {
              error: {
                code: 'VALIDATION_ERROR',
                message: 'Missing moduleSlug for feature references',
              },
            },
            { status: 400 }
          );
        }

        const feature = await specService.getFeature(projectPath, moduleSlug, params.id);

        // Outgoing: what this feature references
        // Schema references
        if (feature.technical?.schemaRefs) {
          for (const schemaRef of feature.technical.schemaRefs) {
            outgoing.push({
              artifactType: 'entity',
              artifactId: schemaRef.entity,
              artifactName: schemaRef.entity,
              relationshipType: 'uses',
            });
          }
        }

        // API references
        if (feature.technical?.apiRefs) {
          for (const apiRef of feature.technical.apiRefs) {
            const endpointId = apiRef.path || apiRef.operation || 'unknown';
            outgoing.push({
              artifactType: 'endpoint',
              artifactId: endpointId,
              artifactName: endpointId,
              relationshipType: 'uses',
            });
          }
        }

        // Component references
        if (feature.technical?.componentRefs) {
          for (const compRef of feature.technical.componentRefs) {
            outgoing.push({
              artifactType: 'component',
              artifactId: compRef.id,
              artifactName: compRef.id,
              relationshipType: 'renders',
            });
          }
        }

        // Feature dependencies
        for (const depId of feature.dependencies) {
          // Find the dependent feature
          const allFeatures = await specService.listFeatures(projectPath);
          const depFeature = allFeatures.find((f) => f.id === depId);
          if (depFeature) {
            outgoing.push({
              artifactType: 'feature',
              artifactId: depFeature.id,
              artifactName: depFeature.name,
              relationshipType: 'depends_on',
            });
          }
        }

        // Incoming: features that depend on this one
        const allFeatures = await specService.listFeatures(projectPath);
        for (const otherFeature of allFeatures) {
          if (otherFeature.dependencies.includes(feature.id)) {
            incoming.push({
              artifactType: 'feature',
              artifactId: otherFeature.id,
              artifactName: otherFeature.name,
              relationshipType: 'depends_on',
            });
          }
        }

        break;
      }

      case 'schema':
      case 'entities': {
        // For schema entities: find features that reference them
        const allFeatures = await specService.listFeatures(projectPath);

        for (const feature of allFeatures) {
          if (feature.technical?.schemaRefs) {
            for (const schemaRef of feature.technical.schemaRefs) {
              if (schemaRef.entity === params.id) {
                incoming.push({
                  artifactType: 'feature',
                  artifactId: feature.id,
                  artifactName: feature.name,
                  relationshipType: 'uses',
                });
              }
            }
          }
        }

        break;
      }

      case 'openapi':
      case 'graphql':
      case 'endpoints': {
        // For API endpoints: find features that use them
        const allFeatures = await specService.listFeatures(projectPath);

        for (const feature of allFeatures) {
          if (feature.technical?.apiRefs) {
            for (const apiRef of feature.technical.apiRefs) {
              const endpointId = apiRef.path || apiRef.operation || '';
              if (endpointId === params.id) {
                incoming.push({
                  artifactType: 'feature',
                  artifactId: feature.id,
                  artifactName: feature.name,
                  relationshipType: 'uses',
                });
              }
            }
          }
        }

        break;
      }

      case 'components': {
        // For components: find features that use them
        const allFeatures = await specService.listFeatures(projectPath);

        for (const feature of allFeatures) {
          if (feature.technical?.componentRefs) {
            for (const compRef of feature.technical.componentRefs) {
              if (compRef.id === params.id) {
                incoming.push({
                  artifactType: 'feature',
                  artifactId: feature.id,
                  artifactName: feature.name,
                  relationshipType: 'renders',
                });
              }
            }
          }
        }

        break;
      }

      default:
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: `Invalid artifact type: ${params.type}`,
            },
          },
          { status: 400 }
        );
    }

    const artifactType = mapUrlToArtifactType(params.type);
    const response: ReferencesResponse = {
      artifactType,
      artifactId: params.id,
      incoming,
      outgoing,
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('not found')) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Artifact not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to get references: ${message}`,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Map URL type to artifact type
 */
function mapUrlToArtifactType(
  urlType: string
): 'feature' | 'entity' | 'endpoint' | 'component' {
  switch (urlType) {
    case 'features':
      return 'feature';
    case 'schema':
    case 'entities':
      return 'entity';
    case 'openapi':
    case 'graphql':
    case 'endpoints':
      return 'endpoint';
    case 'components':
      return 'component';
    default:
      return 'feature';
  }
}
