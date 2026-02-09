import { create } from "zustand";
import type { SessionState, PermissionRequest, ChatMessage, SdkSessionInfo } from "./types.js";

interface AppState {
  // Sessions
  sessions: Map<string, SessionState>;
  sdkSessions: SdkSessionInfo[];
  currentSessionId: string | null;

  // Messages per session
  messages: Map<string, ChatMessage[]>;

  // Streaming partial text per session
  streaming: Map<string, string>;

  // Pending permissions per session (keyed by request_id)
  pendingPermissions: Map<string, PermissionRequest>;

  // Connection state per session
  connectionStatus: Map<string, "connecting" | "connected" | "disconnected">;
  cliConnected: Map<string, boolean>;

  // Session status
  sessionStatus: Map<string, "idle" | "running" | "compacting" | null>;

  // UI
  darkMode: boolean;
  sidebarOpen: boolean;

  // Actions
  setDarkMode: (v: boolean) => void;
  toggleDarkMode: () => void;
  setSidebarOpen: (v: boolean) => void;

  // Session actions
  setCurrentSession: (id: string | null) => void;
  addSession: (session: SessionState) => void;
  updateSession: (sessionId: string, updates: Partial<SessionState>) => void;
  removeSession: (sessionId: string) => void;
  setSdkSessions: (sessions: SdkSessionInfo[]) => void;

  // Message actions
  appendMessage: (sessionId: string, msg: ChatMessage) => void;
  setMessages: (sessionId: string, msgs: ChatMessage[]) => void;
  updateLastAssistantMessage: (sessionId: string, updater: (msg: ChatMessage) => ChatMessage) => void;
  setStreaming: (sessionId: string, text: string | null) => void;

  // Permission actions
  addPermission: (perm: PermissionRequest) => void;
  removePermission: (requestId: string) => void;

  // Connection actions
  setConnectionStatus: (sessionId: string, status: "connecting" | "connected" | "disconnected") => void;
  setCliConnected: (sessionId: string, connected: boolean) => void;
  setSessionStatus: (sessionId: string, status: "idle" | "running" | "compacting" | null) => void;

  reset: () => void;
}

function getInitialDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  const stored = localStorage.getItem("cc-dark-mode");
  if (stored !== null) return stored === "true";
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export const useStore = create<AppState>((set) => ({
  sessions: new Map(),
  sdkSessions: [],
  currentSessionId: null,
  messages: new Map(),
  streaming: new Map(),
  pendingPermissions: new Map(),
  connectionStatus: new Map(),
  cliConnected: new Map(),
  sessionStatus: new Map(),
  darkMode: getInitialDarkMode(),
  sidebarOpen: true,

  setDarkMode: (v) => {
    localStorage.setItem("cc-dark-mode", String(v));
    set({ darkMode: v });
  },
  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode;
      localStorage.setItem("cc-dark-mode", String(next));
      return { darkMode: next };
    }),
  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  setCurrentSession: (id) => set({ currentSessionId: id }),

  addSession: (session) =>
    set((s) => {
      const sessions = new Map(s.sessions);
      sessions.set(session.session_id, session);
      const messages = new Map(s.messages);
      if (!messages.has(session.session_id)) messages.set(session.session_id, []);
      return { sessions, messages };
    }),

  updateSession: (sessionId, updates) =>
    set((s) => {
      const sessions = new Map(s.sessions);
      const existing = sessions.get(sessionId);
      if (existing) sessions.set(sessionId, { ...existing, ...updates });
      return { sessions };
    }),

  removeSession: (sessionId) =>
    set((s) => {
      const sessions = new Map(s.sessions);
      sessions.delete(sessionId);
      const messages = new Map(s.messages);
      messages.delete(sessionId);
      const streaming = new Map(s.streaming);
      streaming.delete(sessionId);
      const connectionStatus = new Map(s.connectionStatus);
      connectionStatus.delete(sessionId);
      const cliConnected = new Map(s.cliConnected);
      cliConnected.delete(sessionId);
      const sessionStatus = new Map(s.sessionStatus);
      sessionStatus.delete(sessionId);
      return {
        sessions,
        messages,
        streaming,
        connectionStatus,
        cliConnected,
        sessionStatus,
        sdkSessions: s.sdkSessions.filter((sdk) => sdk.sessionId !== sessionId),
        currentSessionId: s.currentSessionId === sessionId ? null : s.currentSessionId,
      };
    }),

  setSdkSessions: (sessions) => set({ sdkSessions: sessions }),

  appendMessage: (sessionId, msg) =>
    set((s) => {
      const messages = new Map(s.messages);
      const list = [...(messages.get(sessionId) || []), msg];
      messages.set(sessionId, list);
      return { messages };
    }),

  setMessages: (sessionId, msgs) =>
    set((s) => {
      const messages = new Map(s.messages);
      messages.set(sessionId, msgs);
      return { messages };
    }),

  updateLastAssistantMessage: (sessionId, updater) =>
    set((s) => {
      const messages = new Map(s.messages);
      const list = [...(messages.get(sessionId) || [])];
      for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].role === "assistant") {
          list[i] = updater(list[i]);
          break;
        }
      }
      messages.set(sessionId, list);
      return { messages };
    }),

  setStreaming: (sessionId, text) =>
    set((s) => {
      const streaming = new Map(s.streaming);
      if (text === null) {
        streaming.delete(sessionId);
      } else {
        streaming.set(sessionId, text);
      }
      return { streaming };
    }),

  addPermission: (perm) =>
    set((s) => {
      const pendingPermissions = new Map(s.pendingPermissions);
      pendingPermissions.set(perm.request_id, perm);
      return { pendingPermissions };
    }),

  removePermission: (requestId) =>
    set((s) => {
      const pendingPermissions = new Map(s.pendingPermissions);
      pendingPermissions.delete(requestId);
      return { pendingPermissions };
    }),

  setConnectionStatus: (sessionId, status) =>
    set((s) => {
      const connectionStatus = new Map(s.connectionStatus);
      connectionStatus.set(sessionId, status);
      return { connectionStatus };
    }),

  setCliConnected: (sessionId, connected) =>
    set((s) => {
      const cliConnected = new Map(s.cliConnected);
      cliConnected.set(sessionId, connected);
      return { cliConnected };
    }),

  setSessionStatus: (sessionId, status) =>
    set((s) => {
      const sessionStatus = new Map(s.sessionStatus);
      sessionStatus.set(sessionId, status);
      return { sessionStatus };
    }),

  reset: () =>
    set({
      sessions: new Map(),
      sdkSessions: [],
      currentSessionId: null,
      messages: new Map(),
      streaming: new Map(),
      pendingPermissions: new Map(),
      connectionStatus: new Map(),
      cliConnected: new Map(),
      sessionStatus: new Map(),
    }),
}));
