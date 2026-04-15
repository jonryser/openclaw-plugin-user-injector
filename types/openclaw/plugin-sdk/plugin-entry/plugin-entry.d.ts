// Type stubs for openclaw/plugin-sdk/plugin-entry
// Used by tsc --noEmit for type checking.
// Runtime stub is in index.js (used by Vite/esbuild).

export interface OpenClawPluginApi {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerTool(options: any): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerHook(name: string, handler: (...args: any[]) => Promise<void>, opts?: Record<string, unknown>): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerCommand?(definition: any): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registerService?(definition: any): void;
}

export interface OpenClawPluginDefinition {
  id: string;
  name: string;
  description: string;
  kind?: string;
  configSchema?: Record<string, unknown>;
  register: (api: OpenClawPluginApi) => void;
}

export type DefinePluginEntryOptions = Omit<OpenClawPluginDefinition, "configSchema"> & {
  configSchema?: Record<string, unknown> | (() => Record<string, unknown>);
};

declare function definePluginEntry(options: DefinePluginEntryOptions): OpenClawPluginDefinition;

// Named export (used by: import { definePluginEntry } from "...")
export { definePluginEntry };
// Default export (used by: import definePluginEntry from "...")
export default definePluginEntry;
