// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

const apiMock = vi.hoisted(() => ({
  listPlugins: vi.fn(),
  enablePlugin: vi.fn(),
  disablePlugin: vi.fn(),
  updatePluginConfig: vi.fn(),
  updatePluginGrants: vi.fn(),
  dryRunPlugin: vi.fn(),
}));

vi.mock("../api.js", () => ({
  api: apiMock,
}));

import { PluginsPage } from "./PluginsPage.js";
import { useStore } from "../store.js";

const basePluginMeta = {
  capabilitiesRequested: [],
  capabilitiesGranted: [],
  riskLevel: "low" as const,
  apiVersion: 2 as const,
  health: { status: "healthy" as const, updatedAt: Date.now() },
  stats: {
    invocations: 0,
    successes: 0,
    errors: 0,
    timeouts: 0,
    aborted: 0,
    lastDurationMs: 0,
    avgDurationMs: 0,
    p95DurationMs: 0,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  useStore.getState().reset();
  apiMock.listPlugins.mockResolvedValue([
    {
      id: "notifications",
      name: "Session Notifications",
      version: "1.0.0",
      description: "Generates plugin notifications",
      events: ["result.received"],
      priority: 50,
      blocking: true,
      timeoutMs: 1000,
      failPolicy: "continue",
      enabled: true,
      config: { onResultError: true },
      ...basePluginMeta,
    },
  ]);
  apiMock.disablePlugin.mockResolvedValue({
    id: "notifications",
    name: "Session Notifications",
    version: "1.0.0",
    description: "Generates plugin notifications",
    events: ["result.received"],
    priority: 50,
    blocking: true,
    timeoutMs: 1000,
    failPolicy: "continue",
    enabled: false,
    config: { onResultError: true },
    ...basePluginMeta,
  });
  apiMock.enablePlugin.mockResolvedValue({
    id: "notifications",
    name: "Session Notifications",
    version: "1.0.0",
    description: "Generates plugin notifications",
    events: ["result.received"],
    priority: 50,
    blocking: true,
    timeoutMs: 1000,
    failPolicy: "continue",
    enabled: true,
    config: { onResultError: true },
    ...basePluginMeta,
  });
  apiMock.updatePluginConfig.mockResolvedValue({
    id: "notifications",
    name: "Session Notifications",
    version: "1.0.0",
    description: "Generates plugin notifications",
    events: ["result.received"],
    priority: 50,
    blocking: true,
    timeoutMs: 1000,
    failPolicy: "continue",
    enabled: true,
    config: { onResultError: false },
    ...basePluginMeta,
  });
  apiMock.updatePluginGrants.mockResolvedValue({});
  apiMock.dryRunPlugin.mockResolvedValue({ applied: false, result: { insights: [], aborted: false } });
});

describe("PluginsPage", () => {
  it("loads and renders plugins", async () => {
    render(<PluginsPage embedded />);
    expect(await screen.findByText("Session Notifications")).toBeInTheDocument();
    expect(apiMock.listPlugins).toHaveBeenCalledTimes(1);
  });

  it("toggles plugin enabled state", async () => {
    render(<PluginsPage embedded />);
    const button = await screen.findByRole("button", { name: "Enabled" });
    fireEvent.click(button);

    await waitFor(() => {
      expect(apiMock.disablePlugin).toHaveBeenCalledWith("notifications");
    });
  });

  it("pins plugin to taskbar", async () => {
    render(<PluginsPage embedded />);
    const pinButton = await screen.findByRole("button", { name: "Pin to taskbar" });
    fireEvent.click(pinButton);

    await waitFor(() => {
      expect(useStore.getState().taskbarPluginPins.has("notifications")).toBe(true);
    });
  });

  it("preserves unsaved config draft when toggling another plugin", async () => {
    apiMock.listPlugins
      .mockResolvedValueOnce([
        {
          id: "notifications",
          name: "Session Notifications",
          version: "1.0.0",
          description: "Generates plugin notifications",
          events: ["result.received"],
          priority: 50,
          blocking: true,
          timeoutMs: 1000,
          failPolicy: "continue",
          enabled: true,
          config: { onResultError: true },
          ...basePluginMeta,
        },
        {
          id: "permission-automation",
          name: "Permission Automation",
          version: "1.0.0",
          description: "Automates permission requests",
          events: ["permission.requested"],
          priority: 1000,
          blocking: true,
          timeoutMs: 1000,
          failPolicy: "abort_current_action",
          enabled: true,
          config: { rules: [] },
          ...basePluginMeta,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "notifications",
          name: "Session Notifications",
          version: "1.0.0",
          description: "Generates plugin notifications",
          events: ["result.received"],
          priority: 50,
          blocking: true,
          timeoutMs: 1000,
          failPolicy: "continue",
          enabled: true,
          config: { onResultError: true },
          ...basePluginMeta,
        },
        {
          id: "permission-automation",
          name: "Permission Automation",
          version: "1.0.0",
          description: "Automates permission requests",
          events: ["permission.requested"],
          priority: 1000,
          blocking: true,
          timeoutMs: 1000,
          failPolicy: "abort_current_action",
          enabled: false,
          config: { rules: [] },
          ...basePluginMeta,
        },
      ]);
    apiMock.disablePlugin.mockResolvedValueOnce({
      id: "permission-automation",
      name: "Permission Automation",
      version: "1.0.0",
      description: "Automates permission requests",
      events: ["permission.requested"],
      priority: 1000,
      blocking: true,
      timeoutMs: 1000,
      failPolicy: "abort_current_action",
      enabled: false,
      config: { rules: [] },
      ...basePluginMeta,
    });

    render(<PluginsPage embedded />);
    await screen.findByText("Permission Automation");

    const editors = screen.getAllByRole("textbox");
    fireEvent.change(editors[0], { target: { value: '{\n  "onResultError": false\n}' } });

    const toggles = screen.getAllByRole("button", { name: "Enabled" });
    fireEvent.click(toggles[1]);

    // Editing one plugin must survive refreshes triggered by a different plugin action.
    await waitFor(() => {
      expect(editors[0]).toHaveValue('{\n  "onResultError": false\n}');
    });
  });
});
