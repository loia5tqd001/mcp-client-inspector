import { useState, useRef } from 'react';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Tool, TransportType } from '../utils/types';
import { getDefaultServerUrl, isToolArray } from '../utils/mcpHelpers';

export function useMCPClient() {
  // UI State
  const [transportType, setTransportType] = useState<TransportType>('sse');
  const [customUrl, setCustomUrl] = useState<Record<TransportType, string>>({
    sse: getDefaultServerUrl('sse'),
    streamable_http: getDefaultServerUrl('streamable_http'),
  });
  const [serverUrl, setServerUrl] = useState<Record<TransportType, string>>({
    sse: getDefaultServerUrl('sse'),
    streamable_http: getDefaultServerUrl('streamable_http'),
  });
  const [tools, setTools] = useState<Record<TransportType, Tool[]>>({
    sse: [],
    streamable_http: [],
  });
  const [selectedToolIdx, setSelectedToolIdx] = useState<
    Record<TransportType, number>
  >({
    sse: -1,
    streamable_http: -1,
  });
  const [toolParams, setToolParams] = useState<
    Record<TransportType, Record<string, string>>
  >({
    sse: {},
    streamable_http: {},
  });
  const [result, setResult] = useState<Record<TransportType, string>>({
    sse: '',
    streamable_http: '',
  });
  const [connecting, setConnecting] = useState<Record<TransportType, boolean>>({
    sse: false,
    streamable_http: false,
  });
  const [connected, setConnected] = useState<Record<TransportType, boolean>>({
    sse: false,
    streamable_http: false,
  });
  const [callInProgress, setCallInProgress] = useState<
    Record<TransportType, boolean>
  >({
    sse: false,
    streamable_http: false,
  });
  const [listToolsLoading, setListToolsLoading] = useState<
    Record<TransportType, boolean>
  >({
    sse: false,
    streamable_http: false,
  });

  // MCP Client refs (partitioned by transport)
  const clientRef = useRef<Record<TransportType, Client | null>>({
    sse: null,
    streamable_http: null,
  });
  const transportRef = useRef<Record<TransportType, unknown>>({
    sse: null,
    streamable_http: null,
  });

  // Connect to MCP server when serverUrl changes
  const handleConnect = async () => {
    const t = transportType;
    if (!serverUrl[t]) return;
    setConnecting((prev) => ({ ...prev, [t]: true }));
    setConnected((prev) => ({ ...prev, [t]: false }));
    setTools((prev) => ({ ...prev, [t]: [] }));
    setSelectedToolIdx((prev) => ({ ...prev, [t]: -1 }));
    setToolParams((prev) => ({ ...prev, [t]: {} }));
    setResult((prev) => ({ ...prev, [t]: '' }));

    // Create client and transport
    const client = new Client({ name: 'browser-client', version: '1.0.0' });
    let transport;
    try {
      transport =
        t === 'sse'
          ? new SSEClientTransport(new URL(serverUrl[t]))
          : new StreamableHTTPClientTransport(new URL(serverUrl[t]));
    } catch {
      setConnecting((prev) => ({ ...prev, [t]: false }));
      setConnected((prev) => ({ ...prev, [t]: false }));
      return;
    }
    clientRef.current[t] = client;
    transportRef.current[t] = transport;

    // Connect
    try {
      await client.connect(transport, { timeout: 10000 });
      setConnected((prev) => ({ ...prev, [t]: true }));
      await handleListTools();
    } catch {
      setConnected((prev) => ({ ...prev, [t]: false }));
    } finally {
      setConnecting((prev) => ({ ...prev, [t]: false }));
    }
  };

  // List tools
  const handleListTools = async () => {
    const t = transportType;
    if (!clientRef.current[t]) return;
    setListToolsLoading((prev) => ({ ...prev, [t]: true }));
    try {
      const resultObj: unknown = await clientRef.current[t]!.listTools();
      const toolsArr = (resultObj as { tools?: unknown }).tools;
      const toolsArrTyped = (toolsArr ?? []) as unknown;
      if (isToolArray(toolsArrTyped)) {
        const toolsArrCasted = toolsArrTyped as Tool[];
        setTools((prev) => ({ ...prev, [t]: toolsArrCasted }));
        if (toolsArrCasted.length > 0) {
          setSelectedToolIdx((prev) => ({ ...prev, [t]: 0 }));
          // Pre-fill params with empty strings
          const firstTool = toolsArrCasted[0];
          if (firstTool.inputSchema && firstTool.inputSchema.properties) {
            const params: Record<string, string> = {};
            for (const key in firstTool.inputSchema.properties) {
              params[key] = '';
            }
            setToolParams((prev) => ({ ...prev, [t]: params }));
          } else {
            setToolParams((prev) => ({ ...prev, [t]: {} }));
          }
        } else {
          setSelectedToolIdx((prev) => ({ ...prev, [t]: -1 }));
          setToolParams((prev) => ({ ...prev, [t]: {} }));
        }
      } else {
        setTools((prev) => ({ ...prev, [t]: [] }));
        setSelectedToolIdx((prev) => ({ ...prev, [t]: -1 }));
        setToolParams((prev) => ({ ...prev, [t]: {} }));
      }
    } finally {
      setListToolsLoading((prev) => ({ ...prev, [t]: false }));
    }
  };

  // Handle tool selection
  const handleToolSelect = (idx: number) => {
    const t = transportType;
    setSelectedToolIdx((prev) => ({ ...prev, [t]: idx }));
    const tool = tools[t][idx];
    if (tool && tool.inputSchema && tool.inputSchema.properties) {
      const params: Record<string, string> = {};
      for (const key in tool.inputSchema.properties) {
        params[key] = '';
      }
      setToolParams((prev) => ({ ...prev, [t]: params }));
    } else {
      setToolParams((prev) => ({ ...prev, [t]: {} }));
    }
  };

  // Handle param input change
  const handleParamChange = (key: string, value: string) => {
    const t = transportType;
    setToolParams((prev) => ({ ...prev, [t]: { ...prev[t], [key]: value } }));
  };

  // Call tool
  const handleCallTool = async () => {
    const t = transportType;
    if (
      !clientRef.current[t] ||
      selectedToolIdx[t] < 0 ||
      !tools[t][selectedToolIdx[t]]
    ) {
      setResult((prev) => ({ ...prev, [t]: 'No tool selected' }));
      return;
    }
    const tool = tools[t][selectedToolIdx[t]];
    const args: Record<string, unknown> = { ...toolParams[t] };
    setCallInProgress((prev) => ({ ...prev, [t]: true }));
    try {
      const resultObj: unknown = await clientRef.current[t]!.callTool({
        name: tool.name,
        arguments: args,
      });
      let text = '';
      try {
        const content = (resultObj as { content: Array<{ text: string }> })
          .content;
        text = JSON.stringify(JSON.parse(content[0].text), null, 2);
      } catch {
        const content = (resultObj as { content: Array<{ text: string }> })
          .content;
        text = content[0].text;
      }
      setResult((prev) => ({ ...prev, [t]: text }));
    } catch (err) {
      try {
        setResult((prev) => ({ ...prev, [t]: JSON.stringify(err, null, 2) }));
      } catch {
        setResult((prev) => ({ ...prev, [t]: String(err) }));
      }
    } finally {
      setCallInProgress((prev) => ({ ...prev, [t]: false }));
    }
  };

  return {
    transportType,
    setTransportType,
    customUrl,
    setCustomUrl,
    serverUrl,
    setServerUrl,
    tools,
    setTools,
    selectedToolIdx,
    setSelectedToolIdx,
    toolParams,
    setToolParams,
    result,
    setResult,
    connecting,
    setConnecting,
    connected,
    setConnected,
    callInProgress,
    setCallInProgress,
    listToolsLoading,
    setListToolsLoading,
    handleConnect,
    handleListTools,
    handleToolSelect,
    handleParamChange,
    handleCallTool,
  };
}
