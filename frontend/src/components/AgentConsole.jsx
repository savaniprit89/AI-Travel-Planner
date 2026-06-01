import React, { useEffect, useRef } from 'react';
import { Terminal, ShieldAlert } from 'lucide-react';

export default function AgentConsole({ logs, error, isRunning }) {
  const containerRef = useRef(null);

  // Auto-scroll terminal to bottom when new logs stream in
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, error]);

  return (
    <div className="glass-panel console-card" style={{ padding: '20px' }}>
      {/* Terminal Title Bar */}
      <div className="console-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={14} style={{ color: '#94a3b8' }} />
          <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#cbd5e1', fontFamily: 'monospace' }}>
            LangChain Agent Reasoning Console
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isRunning && (
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 8px #10b981' }} className="animate-pulse" />
          )}
          <span style={{ fontSize: '0.65rem', color: '#64748b', fontFamily: 'monospace', fontWeight: 600 }}>
            {isRunning ? "PROCESSING_AGENT_LOOP" : "IDLE"}
          </span>
        </div>
      </div>

      {/* Terminal Content */}
      <div 
        ref={containerRef}
        className="console-body"
      >
        {logs.length === 0 && !error && (
          <div style={{ color: '#475569', fontStyle: 'italic', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '4px' }}>
            <Terminal size={24} style={{ opacity: 0.25, marginBottom: '6px' }} />
            <p style={{ margin: 0, fontSize: '0.75rem' }}>Awaiting planning commands...</p>
            <p style={{ margin: 0, fontSize: '0.65rem', opacity: 0.7 }}>Initialize the agent to stream real-time tool calls & reasoning logs.</p>
          </div>
        )}

        {logs.map((log, index) => {
          let lineClass = "";
          let prefix = "";

          if (log.step === "thought") {
            lineClass = "console-thought";
            prefix = "⚡ [THOUGHT]";
          } else if (log.step === "tool_call") {
            lineClass = "console-tool-call";
            prefix = "⚙️ [TOOL CALL]";
          } else if (log.step === "tool_result") {
            lineClass = "console-tool-result";
            prefix = "📥 [TOOL RESULT]";
          } else if (log.step === "start") {
            lineClass = "text-white font-bold";
            prefix = "🚀 [AGENT START]";
          } else if (log.step === "result") {
            lineClass = "text-purple-400 font-bold";
            prefix = "🏆 [PLAN GENERATED]";
          }

          return (
            <div key={index} className={`console-line ${lineClass}`}>
              <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.6rem', marginBottom: '2px' }}>
                {new Date().toLocaleTimeString()}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                <span style={{ flexShrink: 0 }}>{prefix}</span>
                <span>{log.message}</span>
              </div>
              {log.data && (
                <pre style={{ marginTop: '6px', marginLeft: '24px', padding: '10px', background: '#020306', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.03)', overflowX: 'auto', fontSize: '0.65rem', color: '#94a3b8', maxWidth: '100%' }}>
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          );
        })}

        {error && (
          <div className="status-banner status-error" style={{ padding: '10px', display: 'flex', gap: '8px' }}>
            <ShieldAlert size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ margin: 0, fontWeight: 700 }}>Execution Error Encountered</p>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.7rem', opacity: 0.9 }}>{error}</p>
            </div>
          </div>
        )}

        {isRunning && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#818cf8', fontWeight: 600, marginTop: '6px' }}>
            <span>▶</span>
            <span>Thinking...</span>
            <span className="animate-pulse">_</span>
          </div>
        )}
      </div>
    </div>
  );
}
