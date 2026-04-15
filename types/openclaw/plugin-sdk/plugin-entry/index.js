// JS stub for openclaw/plugin-sdk/plugin-entry
// Used at runtime by Vite/esbuild when running tests.
// Type declarations are in plugin-entry.d.ts (used by tsc --noEmit).

function definePluginEntry(options) {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    configSchema: options.configSchema ?? { type: "object", properties: {} },
    register: options.register,
  };
}

export default definePluginEntry;
export { definePluginEntry };
