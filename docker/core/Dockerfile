# syntax=docker/dockerfile:1.7
FROM python:3-slim

ARG TARGETARCH

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN set -eux; \
  apt-get update; \
  apt-get install -y --no-install-recommends ca-certificates curl xz-utils git openssh-client; \
  rm -rf /var/lib/apt/lists/*; \
  case "${TARGETARCH:-amd64}" in \
    amd64) node_arch='x64' ;; \
    arm64) node_arch='arm64' ;; \
    *) echo "Unsupported TARGETARCH=${TARGETARCH}"; exit 1 ;; \
  esac; \
  node_version="$(curl -fsSL https://nodejs.org/dist/index.tab | awk 'NR>1 { sub(/^v/, "", $1); print $1; exit }')"; \
  curl -fsSL "https://nodejs.org/dist/v${node_version}/node-v${node_version}-linux-${node_arch}.tar.xz" -o /tmp/node.tar.xz; \
  tar -xJf /tmp/node.tar.xz -C /usr/local --strip-components=1 --no-same-owner; \
  rm -f /tmp/node.tar.xz; \
  npm install -g @anthropic-ai/claude-code @openai/codex; \
  npm cache clean --force

RUN useradd -m -u 1000 -s /bin/bash companion

USER companion
WORKDIR /workspace

CMD ["sleep", "infinity"]
