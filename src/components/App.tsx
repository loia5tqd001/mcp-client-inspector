import React from 'react';
import CopiableArea from './CopiableArea';
import { useMCPClient } from '../hooks/useMCPClient';
import Select from 'react-select';

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
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5em',
            flexWrap: 'wrap',
          }}
        >
          MCP Remote Inspect
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5em' }}>
            <a
              className='github-star-btn'
              href='https://github.com/loia5tqd001/mcp-inspect'
              rel='noopener'
              target='_blank'
              aria-label='Star loia5tqd001/mcp-inspect on GitHub'
              title='Star loia5tqd001/mcp-inspect on GitHub'
            >
              <svg
                viewBox='0 0 16 16'
                width='16'
                height='16'
                className='octicon octicon-mark-github'
                aria-hidden='true'
              >
                <path d='M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z'></path>
              </svg>
              <span>Star</span>
            </a>
            <span
              className={`connection-dot ${
                connected[transportType] ? 'connected' : 'disconnected'
              }`}
              aria-label={
                connected[transportType] ? 'Connected' : 'Not connected'
              }
              title={connected[transportType] ? 'Connected' : 'Not connected'}
            />
          </div>
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
        <Select
          className='tool-select'
          classNamePrefix='react-select'
          value={
            tools[transportType].length > 0 &&
            selectedToolIdx[transportType] !== -1
              ? {
                  value: selectedToolIdx[transportType],
                  label:
                    tools[transportType][selectedToolIdx[transportType]].name,
                }
              : null
          }
          placeholder='Select a tool'
          onChange={(option) => handleToolSelect(option ? option.value : -1)}
          options={tools[transportType].map((tool, idx) => ({
            value: idx,
            label: tool.name,
          }))}
          isDisabled={tools[transportType].length === 0}
        />
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
