/**
 * user-injector - OpenClaw plugin
 *
 * Hooks on Slack message_received and inbound_claim events, checks if the
 * sender is a known user in USER.md, and if so writes their user-specific
 * memory file content to a temp location and registers a lightweight tool
 * so the agent can retrieve it.
 */

import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const WORKSPACE_DIR = "/Users/marygoldaross/.openclaw/workspace";
const USER_MD_PATH = join(WORKSPACE_DIR, "USER.md");
const USER_CONTEXT_DIR = "/tmp/openclaw-user-context";

const SLACK_USER_ID_RE = /\bU[A-Z0-9]{8,}\b/g;

interface UserEntry {
  slackId: string;
  memoryFile: string;
}

const recentDispatches = new Set<string>();
setInterval(() => recentDispatches.clear(), 30_000);

function buildDispatchKey(senderId: string, teamId: string): string {
  return `${teamId || "unknown-team"}:${senderId}`;
}

/**
 * Parse USER.md and return a map of Slack ID -> memory file path.
 * Matches entries like:
 *   - **Slack IDs:** U08MT03CQF6 (GenUI / personal), ...
 *   - **Memory file:** `memory/users/JON_RYSER.md`
 */
function loadKnownUsers(): Map<string, UserEntry> {
  const result = new Map<string, UserEntry>();

  let userMdContent: string;
  try {
    userMdContent = readFileSync(USER_MD_PATH, "utf-8");
  } catch {
    return result;
  }

  // Split into blocks separated by lines starting with ### (top-level users)
  // Each block contains the Slack IDs and Memory file line.
  const lines = userMdContent.split("\n");
  let currentMemoryFile = "";

  for (const line of lines) {
    const idMatch = SLACK_USER_ID_RE.exec(line);
    if (idMatch) {
      // Grab the most recent memory file we've seen
      result.set(idMatch[0], {
        slackId: idMatch[0],
        memoryFile: currentMemoryFile,
      });
    }
    // Track the most recent memory file reference
    const memMatch = /Memory file:\s*`([^`]+)`/.exec(line);
    if (memMatch) {
      currentMemoryFile = join(WORKSPACE_DIR, memMatch[1]);
    }
    // Reset on new user block
    if (line.startsWith("### ")) {
      currentMemoryFile = "";
    }
  }

  return result;
}

/**
 * Write user context to a temp file so the agent can read it.
 * Path: /tmp/openclaw-user-context/<senderId>.json
 */
function writeUserContextFile(senderId: string, context: string): void {
  try {
    mkdirSync(USER_CONTEXT_DIR, { recursive: true });
    const outPath = join(USER_CONTEXT_DIR, `${senderId}.json`);
    writeFileSync(outPath, JSON.stringify({ senderId, context, injectedAt: new Date().toISOString() }), "utf-8");
  } catch {}
}

/**
 * Retrieve the injected context path for a sender (called by the registered tool).
 */
export function getUserContextPath(senderId: string): string {
  return join(USER_CONTEXT_DIR, `${senderId}.json`);
}

export const __testing = {
  loadKnownUsers,
  buildDispatchKey,
  resetRecentDispatches() {
    recentDispatches.clear();
  },
};

export default definePluginEntry({
  id: "user-injector",
  name: "User Context Injector",
  description: "Injects user-specific memory context for known Slack users.",

  register(api: OpenClawPluginApi) {
    // Register a lightweight tool the agent can call to get user context
    api.registerTool({
      name: "get_user_context",
      description: "Returns the injected user-specific memory context for a Slack sender ID.",
      inputSchema: {
        type: "object",
        properties: {
          senderId: { type: "string", description: "The Slack sender ID to look up." },
        },
        required: ["senderId"],
      },
      async invoke(args: { senderId: string }) {
        const { senderId } = args;
        const ctxPath = join(USER_CONTEXT_DIR, `${senderId}.json`);
        try {
          const raw = readFileSync(ctxPath, "utf-8");
          return { content: JSON.parse(raw) };
        } catch {
          return { content: null };
        }
      },
    });

    function handleEvent(senderId: string, teamId: string) {
      if (!senderId) return;
      const dispatchKey = buildDispatchKey(senderId, teamId);
      if (recentDispatches.has(dispatchKey)) return;
      recentDispatches.add(dispatchKey);

      const knownUsers = loadKnownUsers();
      const entry = knownUsers.get(senderId);
      if (!entry || !entry.memoryFile) return;

      try {
        const memoryContent = readFileSync(entry.memoryFile, "utf-8");
        writeUserContextFile(senderId, memoryContent);
      } catch {
        // Memory file may not exist yet; skip silently
      }
    }

    api.registerHook(
      "message_received",
      async (event, ctx) => {
        if ((ctx as Record<string, unknown>)?.channelId !== "slack") return;
        const meta = (event.metadata ?? {}) as Record<string, unknown>;
        const senderId = (event.from ?? meta?.senderId ?? "") as string;
        const teamId = (meta?.teamId as string) ?? "";
        handleEvent(senderId, teamId);
      },
      { name: "user-injector:message_received" }
    );

    api.registerHook(
      "inbound_claim",
      async (event, ctx) => {
        if ((ctx as Record<string, unknown>)?.channel !== "slack") return;
        const meta = (event.metadata ?? {}) as Record<string, unknown>;
        const senderId = event.senderId ?? "";
        const teamId = (event as Record<string, unknown>)?.teamId as string ?? (meta?.teamId as string) ?? "";
        handleEvent(senderId, teamId);
      },
      { name: "user-injector:inbound_claim" }
    );
  },
});
