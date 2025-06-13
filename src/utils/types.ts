export interface ToolInputSchema {
  properties: Record<string, { description?: string }>;
  required?: string[];
}

export interface Tool {
  name: string;
  description?: string;
  inputSchema?: ToolInputSchema;
}

export type TransportType = 'sse' | 'streamable_http';
