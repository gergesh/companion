import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { CloudEnvironmentManifest } from "./cloud-env.js";

export type CloudProvider = "modal";

export interface CloudProviderPlan {
  provider: CloudProvider;
  sessionId: string;
  image: string;
  cwd: string;
  mappedPorts: Array<{ containerPort: number; hostPort: number }>;
  commandPreview: string;
}

async function readManifest(
  projectCwd: string,
  sessionId: string,
): Promise<{ manifest: CloudEnvironmentManifest; path: string }> {
  const path = join(
    projectCwd,
    ".companion",
    "cloud",
    "environments",
    `${sessionId}.json`,
  );
  const raw = await readFile(path, "utf-8");
  return { manifest: JSON.parse(raw) as CloudEnvironmentManifest, path };
}

function buildModalPreview(manifest: CloudEnvironmentManifest, manifestPath: string): string {
  const ports =
    manifest.container.portMappings.length > 0
      ? manifest.container.portMappings
          .map((p) => `${p.containerPort}:${p.hostPort}`)
          .join(",")
      : "";
  const portsArg = ports ? ` --ports ${ports}` : "";
  return `modal run companion_cloud.py --manifest ${manifestPath} --image ${manifest.image}${portsArg}`;
}

export async function buildCloudProviderPlan(args: {
  provider: CloudProvider;
  projectCwd: string;
  sessionId: string;
}): Promise<CloudProviderPlan> {
  const { manifest, path } = await readManifest(args.projectCwd, args.sessionId);

  if (args.provider === "modal") {
    return {
      provider: "modal",
      sessionId: manifest.sessionId,
      image: manifest.image,
      cwd: manifest.cwd,
      mappedPorts: manifest.container.portMappings.map((p) => ({
        containerPort: p.containerPort,
        hostPort: p.hostPort,
      })),
      commandPreview: buildModalPreview(manifest, path),
    };
  }

  // Exhaustiveness guard for future providers.
  throw new Error(`Unsupported cloud provider: ${String(args.provider)}`);
}
