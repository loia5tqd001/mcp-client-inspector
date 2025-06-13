import type { Tool } from './types';

export function getDefaultServerUrl(transportType: string) {
  return transportType === 'sse'
    ? 'https://mcp.deepwiki.com/sse'
    : 'https://mcp.context7.com/mcp';
}

export function isToolArray(tools: unknown): tools is Tool[] {
  return (
    Array.isArray(tools) &&
    tools.every(
      (t) =>
        typeof t === 'object' &&
        t !== null &&
        typeof (t as Record<string, unknown>).name === 'string'
    )
  );
}
