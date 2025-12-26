# Foundry Workflow Runner Base Image
#
# This image provides the runtime for executing Foundry workflows
# in isolated containers. Users can extend this image to add custom
# tools and dependencies.
#
# Usage:
#   FROM foundry/workflow-runner:latest
#   RUN apt-get update && apt-get install -y python3
#   COPY scripts/ /app/scripts/

FROM oven/bun:1.1-alpine

LABEL org.opencontainers.image.source="https://github.com/foundry/workflow-runner"
LABEL org.opencontainers.image.description="Foundry Workflow Runner - Execute AI workflows in containers"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Install common utilities
RUN apk add --no-cache \
    git \
    curl \
    jq \
    bash \
    openssh-client \
    ca-certificates

# Create non-root user for security
RUN addgroup -g 1001 foundry && \
    adduser -D -u 1001 -G foundry foundry && \
    chown -R foundry:foundry /app

# Copy workflow execution files
COPY --chown=foundry:foundry package.json bun.lockb* ./
COPY --chown=foundry:foundry src/ ./src/
COPY --chown=foundry:foundry entrypoint.sh ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Switch to non-root user
USER foundry

# Environment variables (set at runtime)
# FOUNDRY_API_URL - Base URL of Foundry API
# FOUNDRY_EXECUTION_ID - Execution ID to run
# FOUNDRY_API_TOKEN - JWT token for authentication

ENTRYPOINT ["/app/entrypoint.sh"]
