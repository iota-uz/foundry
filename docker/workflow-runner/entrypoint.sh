#!/bin/bash
#
# Foundry Workflow Runner Entrypoint
#
# This script:
# 1. Validates required environment variables
# 2. Downloads the workflow definition from Foundry API
# 3. Fetches and exports secrets as environment variables
# 4. Executes the workflow using the graph engine
#

set -e

echo "[entrypoint] Starting Foundry Workflow Runner"

# Validate required environment variables
if [ -z "$FOUNDRY_API_URL" ]; then
    echo "[entrypoint] Error: FOUNDRY_API_URL is required"
    exit 1
fi

if [ -z "$FOUNDRY_EXECUTION_ID" ]; then
    echo "[entrypoint] Error: FOUNDRY_EXECUTION_ID is required"
    exit 1
fi

if [ -z "$FOUNDRY_API_TOKEN" ]; then
    echo "[entrypoint] Error: FOUNDRY_API_TOKEN is required"
    exit 1
fi

# Create temp directory for workflow files
mkdir -p /tmp/workflow

# Setup working directory for agents and commands
export FOUNDRY_WORKING_DIR="${FOUNDRY_WORKING_DIR:-/tmp/workflow/workspace}"
mkdir -p "$FOUNDRY_WORKING_DIR"
echo "[entrypoint] Working directory: $FOUNDRY_WORKING_DIR"

# Notify Foundry that execution has started
echo "[entrypoint] Notifying Foundry of execution start..."
curl -sf -X POST \
    -H "Authorization: Bearer $FOUNDRY_API_TOKEN" \
    -H "Content-Type: application/json" \
    "$FOUNDRY_API_URL/api/webhooks/execution/$FOUNDRY_EXECUTION_ID/started" \
    -d '{}' || echo "[entrypoint] Warning: Failed to notify execution start"

# Download workflow definition
echo "[entrypoint] Downloading workflow definition..."
if ! curl -sf \
    -H "Authorization: Bearer $FOUNDRY_API_TOKEN" \
    "$FOUNDRY_API_URL/api/internal/executions/$FOUNDRY_EXECUTION_ID/workflow" \
    -o /tmp/workflow/workflow.json; then
    echo "[entrypoint] Error: Failed to download workflow definition"

    # Notify Foundry of failure
    curl -sf -X POST \
        -H "Authorization: Bearer $FOUNDRY_API_TOKEN" \
        -H "Content-Type: application/json" \
        "$FOUNDRY_API_URL/api/webhooks/execution/$FOUNDRY_EXECUTION_ID/failed" \
        -d '{"error": "Failed to download workflow definition"}' || true

    exit 1
fi

echo "[entrypoint] Workflow definition downloaded"

# Fetch and export secrets
echo "[entrypoint] Fetching secrets..."
if curl -sf \
    -H "Authorization: Bearer $FOUNDRY_API_TOKEN" \
    "$FOUNDRY_API_URL/api/internal/executions/$FOUNDRY_EXECUTION_ID/secrets" \
    -o /tmp/workflow/secrets.json; then

    # Export secrets as environment variables
    if [ -s /tmp/workflow/secrets.json ] && [ "$(cat /tmp/workflow/secrets.json)" != "{}" ]; then
        echo "[entrypoint] Exporting secrets as environment variables..."
        eval "$(jq -r 'to_entries | .[] | "export \(.key)=\"\(.value)\""' /tmp/workflow/secrets.json)"
    else
        echo "[entrypoint] No secrets to export"
    fi

    # Remove secrets file for security
    rm -f /tmp/workflow/secrets.json
else
    echo "[entrypoint] Warning: Failed to fetch secrets, continuing without them"
fi

# Execute the workflow
echo "[entrypoint] Executing workflow..."
cd /app

# Run the executor script
if bun run src/execute.ts; then
    echo "[entrypoint] Workflow execution completed successfully"
    exit 0
else
    exit_code=$?
    echo "[entrypoint] Workflow execution failed with exit code: $exit_code"
    exit $exit_code
fi
