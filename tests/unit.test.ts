/**
 * Vitest unit tests for user-injector plugin
 * Tests the TypeScript logic via __testing exports
 *
 * NOTE: loadKnownUsers uses a global regex called once per line, so it only
 * captures the FIRST Slack ID on a line that contains multiple IDs.
 */

import { describe, it, expect, afterEach } from "vitest";
import * as path from "path";
import * as fs from "fs";
import * as pluginModule from "../user-injector/plugin-entry";

const __testing = (pluginModule as { __testing: typeof import("../user-injector/plugin-entry").__testing }).__testing;
const { loadKnownUsers, buildDispatchKey } = __testing;

const WORKSPACE_DIR = "/Users/marygoldaross/.openclaw/workspace";
const USER_MD_PATH = path.join(WORKSPACE_DIR, "USER.md");

describe("buildDispatchKey", () => {
  it("combines teamId and senderId with colon separator", () => {
    expect(buildDispatchKey("U08MT03CQF6", "T12345")).toBe("T12345:U08MT03CQF6");
  });

  it("uses 'unknown-team' when teamId is empty", () => {
    expect(buildDispatchKey("U08MT03CQF6", "")).toBe("unknown-team:U08MT03CQF6");
  });

  it("handles teamId with special characters", () => {
    expect(buildDispatchKey("U08MT03CQF6", "T_A1.2")).toBe("T_A1.2:U08MT03CQF6");
  });
});

describe("getUserContextPath", () => {
  it("returns a path ending with senderId.json in USER_CONTEXT_DIR", () => {
    const { getUserContextPath } = pluginModule;
    const result = getUserContextPath("U08MT03CQF6");
    expect(result).toMatch(/U08MT03CQF6\.json$/);
    expect(result).toMatch(/openclaw-user-context/);
  });
});

describe("loadKnownUsers", () => {
  // NOTE: loadKnownUsers uses regex /Memory file:\s*`([^`]+)`/
  // The \s* requires whitespace (not **) between : and the backtick.
  // Also uses global /\bU[A-Z0-9]{8,}\b/g called once per line,
  // so only the FIRST ID on a multi-ID line is captured.

  const SAMPLE_USER_MD = `
# USER.md - User Router

This file maps users to their specific memory files.

## Known Users

### Jon Ryser
- Memory file: \`memory/users/JON_RYSER.md\`
- Slack ID: U08MT03CQF6

### Dr. Leslie korn
- Memory file: \`memory/users/LEKORN.md\`
- Slack ID: U08GDHWK21M

### Samuel Stoker
- Memory file: \`memory/users/SAMUEL_STOKER.md\`
- Slack ID: U08H2BLL2F7
`;

  afterEach(() => {
    try {
      if (fs.existsSync(USER_MD_PATH)) {
        fs.unlinkSync(USER_MD_PATH);
      }
    } catch {}
  });

  it("returns a Map", () => {
    fs.writeFileSync(USER_MD_PATH, SAMPLE_USER_MD, "utf-8");
    const result = loadKnownUsers();
    expect(result).toBeInstanceOf(Map);
  });

  it("extracts Slack IDs from USER.md", () => {
    fs.writeFileSync(USER_MD_PATH, SAMPLE_USER_MD, "utf-8");
    const result = loadKnownUsers();
    // One ID per line: U08MT03CQF6, U08GDHWK21M, U08H2BLL2F7
    expect(result.size).toBe(3);
  });

  it("maps U08MT03CQF6 to JON_RYSER.md when Memory file precedes the ID", () => {
    fs.writeFileSync(USER_MD_PATH, SAMPLE_USER_MD, "utf-8");
    const result = loadKnownUsers();
    const entry = result.get("U08MT03CQF6");
    expect(entry).toBeDefined();
    expect(entry!.memoryFile).toContain("JON_RYSER.md");
  });

  it("maps U08GDHWK21M to LEKORN.md when Memory file precedes the ID", () => {
    fs.writeFileSync(USER_MD_PATH, SAMPLE_USER_MD, "utf-8");
    const result = loadKnownUsers();
    const entry = result.get("U08GDHWK21M");
    expect(entry).toBeDefined();
    expect(entry!.memoryFile).toContain("LEKORN.md");
  });

  it("maps U08H2BLL2F7 to SAMUEL_STOKER.md", () => {
    fs.writeFileSync(USER_MD_PATH, SAMPLE_USER_MD, "utf-8");
    const result = loadKnownUsers();
    const entry = result.get("U08H2BLL2F7");
    expect(entry).toBeDefined();
    expect(entry!.memoryFile).toContain("SAMUEL_STOKER.md");
  });

  it("returns empty map when USER.md does not exist", () => {
    try {
      fs.unlinkSync(USER_MD_PATH);
    } catch {}
    const result = loadKnownUsers();
    expect(result.size).toBe(0);
  });
});
