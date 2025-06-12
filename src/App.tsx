import React, { useState, useRef } from 'react';
import './App.css';
import { CopiableArea } from './CopiableArea';

// MCP SDK imports
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

function getDefaultServerUrl(transportType: string) {
  return transportType === 'sse'
    ? 'https://mcp.deepwiki.com/sse'
    : 'https://mcp.context7.com/mcp';
}

// Types for tool and inputSchema
interface ToolInputSchema {
  properties: Record<string, { description?: string }>;
  required?: string[];
}
interface Tool {
  name: string;
  description?: string;
  inputSchema?: ToolInputSchema;
}

function isToolArray(tools: unknown): tools is Tool[] {
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

// 1. Define a type for transportType
type TransportType = 'sse' | 'streamable_http';

const App: React.FC = () => {
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
    } catch (err) {
      console.error('Invalid server URL:', err);
      setConnecting((prev) => ({ ...prev, [t]: false }));
      setConnected((prev) => ({ ...prev, [t]: false }));
      return;
    }
    clientRef.current[t] = client;
    transportRef.current[t] = transport;

    // Connect
    try {
      await client.connect(transport, { timeout: 10000 });
      console.log('Connected to MCP server:', serverUrl[t]);
      setConnected((prev) => ({ ...prev, [t]: true }));
      await handleListTools();
    } catch (err) {
      console.error('Failed to connect to MCP server:', err);
      setConnected((prev) => ({ ...prev, [t]: false }));
    } finally {
      setConnecting((prev) => ({ ...prev, [t]: false }));
    }
  };

  // List tools
  const handleListTools = async () => {
    const t = transportType;
    if (!clientRef.current[t]) return;
    console.log('Request: listTools');
    setListToolsLoading((prev) => ({ ...prev, [t]: true }));
    try {
      const resultObj: unknown = await clientRef.current[t]!.listTools();
      console.log('Response: listTools', resultObj);
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
    } catch (err) {
      console.error('Error: listTools', err as unknown);
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
      console.log('No tool selected');
      setResult((prev) => ({ ...prev, [t]: 'No tool selected' }));
      return;
    }
    const tool = tools[t][selectedToolIdx[t]];
    const args: Record<string, unknown> = { ...toolParams[t] };
    console.log('Request: callTool', { name: tool.name, arguments: args });
    setCallInProgress((prev) => ({ ...prev, [t]: true }));
    try {
      const resultObj: unknown = await clientRef.current[t]!.callTool({
        name: tool.name,
        arguments: args,
      });
      console.log('Response: callTool', resultObj);
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
      console.error('Error: callTool', err);
      try {
        setResult((prev) => ({ ...prev, [t]: JSON.stringify(err, null, 2) }));
      } catch {
        setResult((prev) => ({ ...prev, [t]: String(err) }));
      }
    } finally {
      setCallInProgress((prev) => ({ ...prev, [t]: false }));
    }
  };

  // UI rendering
  return (
    <div className='inspector-root'>
      <header className='inspector-header'>
        <h1
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5em' }}
        >
          MCP Inspector
          <span
            className={`connection-dot ${
              connected[transportType] ? 'connected' : 'disconnected'
            }`}
            aria-label={
              connected[transportType] ? 'Connected' : 'Not connected'
            }
            title={connected[transportType] ? 'Connected' : 'Not connected'}
          />
        </h1>
      </header>
      <section className='inspector-controls'>
        {/* Transport Selector */}
        <div className='transport-selector'>
          <label>
            <input
              type='radio'
              name='transport'
              value='sse'
              checked={transportType === 'sse'}
              onChange={() => setTransportType('sse')}
            />{' '}
            SSE
          </label>
          <label>
            <input
              type='radio'
              name='transport'
              value='streamable_http'
              checked={transportType === 'streamable_http'}
              onChange={() => setTransportType('streamable_http')}
            />{' '}
            Streamable HTTP
          </label>
        </div>
        {/* Server URL Input */}
        <input
          className='server-url-input'
          type='text'
          placeholder={getDefaultServerUrl(transportType)}
          value={customUrl[transportType] || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setCustomUrl((prev) => ({
              ...prev,
              [transportType]: e.target.value,
            }))
          }
        />
        <button
          className='set-url-btn'
          onClick={() => {
            setServerUrl((prev) => ({
              ...prev,
              [transportType]:
                customUrl[transportType] || getDefaultServerUrl(transportType),
            }));
            handleConnect();
          }}
          disabled={connecting[transportType]}
        >
          Connect
        </button>
      </section>
      <section className='inspector-tool-controls'>
        {/* Tool Controls */}
        <button
          className='list-tools-btn'
          onClick={handleListTools}
          disabled={
            !connected[transportType] ||
            connecting[transportType] ||
            listToolsLoading[transportType]
          }
        >
          List Tools
        </button>
        <select
          className='tool-select'
          value={selectedToolIdx[transportType]}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            handleToolSelect(Number(e.target.value))
          }
          disabled={tools[transportType].length === 0}
        >
          <option value={-1}>Select a tool</option>
          {tools[transportType].map((tool, idx) => (
            <option key={tool.name} value={idx}>
              {tool.name}
            </option>
          ))}
        </select>
        <div>
          {tools[transportType].length > 0 && (
            <div className='tool-description'>
              {
                tools[transportType][selectedToolIdx[transportType]]
                  ?.description
              }
            </div>
          )}
        </div>
        <div className='tool-params'>
          {selectedToolIdx[transportType] >= 0 &&
            tools[transportType][selectedToolIdx[transportType]] &&
            tools[transportType][selectedToolIdx[transportType]].inputSchema &&
            tools[transportType][selectedToolIdx[transportType]].inputSchema!
              .properties &&
            Object.entries(
              tools[transportType][selectedToolIdx[transportType]].inputSchema!
                .properties
            ).map(([key, prop]) => (
              <label key={key} title={prop.description || key}>
                <b>{key}</b>{' '}
                {prop.description && (
                  <i>
                    <small>{prop.description}</small>
                  </i>
                )}
                {tools[transportType][selectedToolIdx[transportType]]
                  .inputSchema?.required &&
                tools[transportType][
                  selectedToolIdx[transportType]
                ].inputSchema?.required!.includes(key) ? (
                  <span className='required-param'>*</span>
                ) : (
                  ''
                )}
                :
                <input
                  type='text'
                  name={key}
                  value={toolParams[transportType][key] || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleParamChange(key, e.target.value)
                  }
                />
              </label>
            ))}
        </div>
      </section>
      {selectedToolIdx[transportType] >= 0 && (
        <button
          className='call-tool-btn'
          onClick={handleCallTool}
          disabled={
            selectedToolIdx[transportType] < 0 ||
            !connected[transportType] ||
            callInProgress[transportType]
          }
        >
          Call Tool
        </button>
      )}
      <section className='inspector-result-area'>
        {/* Result Area */}
        <CopiableArea className='result-area' ariaLabel='Tool call result area'>
          {result[transportType]
            ? result[transportType]
            : '[Tool call result will appear here]'}
        </CopiableArea>
      </section>
    </div>
  );
};

export default App;
