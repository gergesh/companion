import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ContainerConfig, ContainerInfo } from "./container-manager.js";

export interface CloudEnvironmentManifest {
  version: 1;
  environmentId: string;
  sessionId: string;
  backend: "claude" | "codex";
  createdAt: string;
  cwd: string;
  image: string;
  container: {
    id: string;
    name: string;
    cwd: string;
    portMappings: Array<{
      containerPort: number;
      hostPort: number;
    }>;
  };
  requested: {
    ports: number[];
    volumes: string[];
    env: string[];
  };
}

function toEnvKeyList(env: Record<string, string> | undefined): string[] {
  if (!env) return [];
  return Object.keys(env).sort();
}

export function buildCloudEnvironmentManifest(args: {
  sessionId: string;
  backend: "claude" | "codex";
  cwd: string;
  config: ContainerConfig;
  info: ContainerInfo;
  now?: Date;
}): CloudEnvironmentManifest {
  const now = args.now ?? new Date();
  return {
    version: 1,
    environmentId: args.sessionId,
    sessionId: args.sessionId,
    backend: args.backend,
    createdAt: now.toISOString(),
    cwd: args.cwd,
    image: args.config.image,
    container: {
      id: args.info.containerId,
      name: args.info.name,
      cwd: args.info.containerCwd,
      portMappings: args.info.portMappings.map((m) => ({
        containerPort: m.containerPort,
        hostPort: m.hostPort,
      })),
    },
    requested: {
      ports: [...args.config.ports],
      volumes: [...(args.config.volumes ?? [])],
      env: toEnvKeyList(args.config.env),
    },
  };
}

export async function writeCloudEnvironmentManifest(
  projectCwd: string,
  manifest: CloudEnvironmentManifest,
): Promise<string> {
  const outDir = join(projectCwd, ".companion", "cloud", "environments");
  await mkdir(outDir, { recursive: true });
  const outFile = join(outDir, `${manifest.environmentId}.json`);
  await writeFile(outFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf-8");
  return outFile;
}
