/**
 * Visualizations page - displays DBML, OpenAPI, GraphQL, and dependency diagrams
 */

'use client';

import React, { useEffect, useState } from 'react';
import { Breadcrumbs } from '@/components/layout';
import { SkeletonCard } from '@/components/shared';
import {
  VisualizationTabs,
  DBMLDiagram,
  OpenAPIViewer,
  GraphQLViewer,
  DependencyGraph,
} from '@/components/visualizations';
import { useProjectStore } from '@/store';

interface Feature {
  id: string;
  name: string;
  module?: string;
  status?: 'pending' | 'in_progress' | 'completed';
  description?: string;
  dependencies?: string[];
}

export default function VisualizationsPage() {
  const { project } = useProjectStore();
  const [activeTab, setActiveTab] =
    useState<'dbml' | 'openapi' | 'graphql' | 'dependencies'>('dbml');
  const [loading, setLoading] = useState(false);

  // Schema state
  const [dbmlSchema, setDBMLSchema] = useState<string>('');
  const [dbmlError, setDBMLError] = useState<string>();

  // OpenAPI state
  const [openApiSpec, setOpenApiSpec] = useState<Record<string, any>>({});
  const [openApiError, setOpenApiError] = useState<string>();

  // GraphQL state
  const [graphqlSchema, setGraphqlSchema] = useState<string>('');
  const [graphqlError, setGraphqlError] = useState<string>();

  // Features/dependencies state
  const [features, setFeatures] = useState<Feature[]>([]);
  const [depsError, setDepsError] = useState<string>();

  // Fetch schema data
  useEffect(() => {
    const fetchSchemaData = async () => {
      if (!project) return;

      setLoading(true);
      try {
        // Fetch DBML schema
        const schemaRes = await fetch(
          `/api/artifacts/schema?projectPath=${encodeURIComponent(project.path)}`
        );
        if (schemaRes.ok) {
          const { schema } = await schemaRes.json();
          setDBMLSchema(schema?.dbml || '');
        } else {
          setDBMLError('Failed to load schema');
        }
      } catch (err) {
        setDBMLError(
          err instanceof Error ? err.message : 'Failed to load schema'
        );
      }

      // Fetch OpenAPI spec
      try {
        const openApiRes = await fetch(
          `/api/artifacts/openapi?projectPath=${encodeURIComponent(project.path)}`
        );
        if (openApiRes.ok) {
          const { spec } = await openApiRes.json();
          setOpenApiSpec(spec || {});
        } else {
          setOpenApiError('Failed to load API specification');
        }
      } catch (err) {
        setOpenApiError(
          err instanceof Error ? err.message : 'Failed to load API specification'
        );
      }

      // Fetch GraphQL schema
      try {
        const graphqlRes = await fetch(
          `/api/artifacts/graphql?projectPath=${encodeURIComponent(project.path)}`
        );
        if (graphqlRes.ok) {
          const { schema } = await graphqlRes.json();
          setGraphqlSchema(schema || '');
        } else {
          setGraphqlError('Failed to load GraphQL schema');
        }
      } catch (err) {
        setGraphqlError(
          err instanceof Error ? err.message : 'Failed to load GraphQL schema'
        );
      }

      // Fetch features for dependency graph
      try {
        const featuresRes = await fetch(`/api/features`);
        if (featuresRes.ok) {
          const { features: featuresData } = await featuresRes.json();
          setFeatures(featuresData || []);
        } else {
          setDepsError('Failed to load features');
        }
      } catch (err) {
        setDepsError(
          err instanceof Error ? err.message : 'Failed to load features'
        );
      }

      setLoading(false);
    };

    fetchSchemaData();
  }, [project]);

  if (!project) {
    return (
      <div>
        <Breadcrumbs
          items={[
            { label: 'Visualizations' },
          ]}
        />
        <div className="p-6">
          <p className="text-text-secondary">
            No project loaded. Please create or open a project first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg-primary">
      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { label: 'Visualizations' },
        ]}
      />

      {/* Tab switcher */}
      <VisualizationTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content area */}
      <div className="flex-1 overflow-hidden bg-bg-primary">
        {loading && (
          <div className="p-6 space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && activeTab === 'dbml' && (
          <DBMLDiagram
            dbml={dbmlSchema}
            error={dbmlError ?? undefined}
          />
        )}

        {!loading && activeTab === 'openapi' && (
          <OpenAPIViewer
            spec={openApiSpec}
            error={openApiError ?? undefined}
          />
        )}

        {!loading && activeTab === 'graphql' && (
          <GraphQLViewer
            schema={graphqlSchema}
            error={graphqlError ?? undefined}
          />
        )}

        {!loading && activeTab === 'dependencies' && (
          <DependencyGraph
            features={features}
            error={depsError ?? undefined}
          />
        )}
      </div>
    </div>
  );
}
