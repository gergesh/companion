// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

vi.mock("../api.js", () => ({
  api: {
    relaunchSession: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

interface MockStoreState {
  currentSessionId: string | null;
  cliConnected: Map<string, boolean>;
  sessionStatus: Map<string, "idle" | "running" | "compacting" | null>;
  sidebarOpen: boolean;
  setSidebarOpen: ReturnType<typeof vi.fn>;
  taskPanelOpen: boolean;
  setTaskPanelOpen: ReturnType<typeof vi.fn>;
  activeTab: "chat" | "diff";
  setActiveTab: ReturnType<typeof vi.fn>;
  sessions: Map<string, { cwd?: string }>;
  sdkSessions: { sessionId: string; cwd?: string }[];
  changedFiles: Map<string, Set<string>>;
  pluginInsights: Map<string, { id: string; plugin_id: string }[]>;
  plugins: Array<{ id: string; name: string; enabled: boolean }>;
  taskbarPluginPins: Set<string>;
  setTaskbarPluginFocus: ReturnType<typeof vi.fn>;
}

let storeState: MockStoreState;

function resetStore(overrides: Partial<MockStoreState> = {}) {
  storeState = {
    currentSessionId: "s1",
    cliConnected: new Map([["s1", true]]),
    sessionStatus: new Map([["s1", "idle"]]),
    sidebarOpen: true,
    setSidebarOpen: vi.fn(),
    taskPanelOpen: false,
    setTaskPanelOpen: vi.fn(),
    activeTab: "chat",
    setActiveTab: vi.fn(),
    sessions: new Map([["s1", { cwd: "/repo" }]]),
    sdkSessions: [],
    changedFiles: new Map(),
    pluginInsights: new Map(),
    plugins: [],
    taskbarPluginPins: new Set(),
    setTaskbarPluginFocus: vi.fn(),
    ...overrides,
  };
}

vi.mock("../store.js", () => ({
  useStore: (selector: (s: MockStoreState) => unknown) => selector(storeState),
}));

import { TopBar } from "./TopBar.js";

beforeEach(() => {
  vi.clearAllMocks();
  resetStore();
});

describe("TopBar", () => {
  it("shows diff badge count only for files within cwd", () => {
    resetStore({
      changedFiles: new Map([
        [
          "s1",
          new Set(["/repo/src/a.ts", "/repo/src/b.ts", "/Users/stan/.claude/plans/plan.md"]),
        ],
      ]),
    });

    render(<TopBar />);
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.queryByText("3")).not.toBeInTheDocument();
  });

  it("hides diff badge when all changed files are out of scope", () => {
    resetStore({
      changedFiles: new Map([["s1", new Set(["/Users/stan/.claude/plans/plan.md"])]]),
    });

    render(<TopBar />);
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });

  it("renders pinned plugin quick action and focuses panel on click", () => {
    resetStore({
      plugins: [{ id: "notifications", name: "Notifications", enabled: true }],
      taskbarPluginPins: new Set(["notifications"]),
    });

    render(<TopBar />);
    const quickAction = screen.getByTitle("Open Notifications insights in session panel");
    quickAction.click();

    expect(storeState.setTaskPanelOpen).toHaveBeenCalledWith(true);
    expect(storeState.setTaskbarPluginFocus).toHaveBeenCalledWith("notifications");
  });
});
