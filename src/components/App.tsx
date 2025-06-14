import React from 'react';
import CopiableArea from './CopiableArea';
import { useMCPClient } from '../hooks/useMCPClient';
import GitHubButton from 'react-github-btn';

const App: React.FC = () => {
  const {
    transportType,
    setTransportType,
    customUrl,
    setCustomUrl,
    serverUrl,
    setServerUrl,
    tools,
    selectedToolIdx,
    toolParams,
    result,
    connecting,
    connected,
    callInProgress,
    listToolsLoading,
    handleConnect,
    handleListTools,
    handleToolSelect,
    handleParamChange,
    handleCallTool,
  } = useMCPClient();

  return (
    <div className='inspector-root'>
      <header className='inspector-header'>
        <h1
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5em' }}
        >
          <div className='github-button-container'>
            <GitHubButton
              href='https://github.com/loia5tqd001/mcp-inspect'
              data-color-scheme='no-preference: light; light: light; dark: dark;'
              data-icon='octicon-star'
              data-size='large'
              data-show-count='true'
              aria-label='Star loia5tqd001/mcp-inspect on GitHub'
            >
              Star
            </GitHubButton>
          </div>
          MCP Remote Inspector
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
          placeholder={serverUrl[transportType]}
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
                customUrl[transportType] || serverUrl[transportType],
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
