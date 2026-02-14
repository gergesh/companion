import { beforeEach, describe, expect, it, vi } from "vitest";

const mockExecSync = vi.hoisted(() => vi.fn());
const mockExistsSync = vi.hoisted(() => vi.fn(() => false));

vi.mock("node:child_process", () => ({
  execSync: mockExecSync,
}));

vi.mock("node:fs", () => ({
  existsSync: mockExistsSync,
}));

import { ContainerManager } from "./container-manager.js";

describe("ContainerManager.createContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.HOME = "/home/tester";
  });

  it("mounts ~/.codex only when it exists", () => {
    const manager = new ContainerManager();
    mockExistsSync.mockReturnValueOnce(true);

    mockExecSync
      .mockReturnValueOnce("cid-1") // docker create
      .mockReturnValueOnce("") // docker start
      .mockReturnValueOnce("0.0.0.0:49152"); // docker port

    manager.createContainer("session-1", "/repo", {
      image: "companion-core:latest",
      ports: [3000],
    });

    const firstCall = String(mockExecSync.mock.calls[0][0]);
    expect(firstCall).toContain("/home/tester/.claude:/root/.claude:ro");
    expect(firstCall).toContain("/home/tester/.codex:/root/.codex:ro");
  });

  it("does not mount ~/.codex when missing", () => {
    const manager = new ContainerManager();
    mockExistsSync.mockReturnValueOnce(false);

    mockExecSync
      .mockReturnValueOnce("cid-2") // docker create
      .mockReturnValueOnce("") // docker start
      .mockReturnValueOnce("0.0.0.0:49153"); // docker port

    manager.createContainer("session-2", "/repo", {
      image: "companion-core:latest",
      ports: [3000],
    });

    const firstCall = String(mockExecSync.mock.calls[0][0]);
    expect(firstCall).toContain("/home/tester/.claude:/root/.claude:ro");
    expect(firstCall).not.toContain("/home/tester/.codex:/root/.codex:ro");
  });
});
