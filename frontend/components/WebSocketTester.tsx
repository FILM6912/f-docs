import React, { useState, useEffect, useRef } from 'react';
import { Activity, Radio, X, Send, AlertCircle, Check } from 'lucide-react';
import { PathData, PathItem, WebSocketMessage } from '../hooks/useWebSocket';
import { MessageRenderer } from './MessageRenderer';

interface WebSocketTesterProps {
  baseUrl: string;
  activePaths: PathItem[];
  pathData: Record<string, PathData>;
  sendMessage: (pathId: string, message: string) => boolean;
  clearData: () => void;
  clearPathData: (name: string) => void;
  removePath: (id: string) => void;
  clearPathError: (id: string) => void;
}

export const WebSocketTester: React.FC<WebSocketTesterProps> = ({
  baseUrl,
  activePaths,
  pathData,
  sendMessage,
  clearPathData,
  removePath,
  clearPathError
}) => {
  const connectedPaths = activePaths.filter(p => p.isConnected);

  return (
    <div className="p-6 h-full flex flex-col w-full">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div className="shrink-0">
          <h2 className="text-2xl font-bold text-zinc-800 dark:text-white flex items-center gap-3">
            <Activity className="text-zinc-600 dark:text-zinc-400" /> WebSocket Tester
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400 mt-1">Real-time path-based monitor.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        {connectedPaths.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 opacity-50">
            <Radio size={48} className="mb-4" />
            <p className="text-sm italic">No active connections. Enable paths from the sidebar to connect.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 h-full">
            {connectedPaths.map((path) => (
              <PathCard
                key={path.id}
                path={path}
                baseUrl={baseUrl}
                data={pathData[path.name]}
                removePath={removePath}
                clearPathData={clearPathData}
                clearPathError={clearPathError}
                sendMessage={sendMessage}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

interface PathCardProps {
  path: PathItem;
  baseUrl: string;
  data: PathData | undefined;
  removePath: (id: string) => void;
  clearPathData: (name: string) => void;
  clearPathError: (id: string) => void;
  sendMessage: (pathId: string, message: string) => boolean;
}

const PathCard: React.FC<PathCardProps> = ({
  path,
  baseUrl,
  data,
  removePath,
  clearPathData,
  clearPathError,
  sendMessage,
}) => {
  const [payload, setPayload] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isSystem = ["connect", "disconnect", "error", "system"].includes(path.name);
  const fullUrl = `${baseUrl}${path.name}`;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [data?.history]); // Scroll when history updates

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payload.trim()) return;
    
    if (sendMessage(path.id, payload)) {
      setPayload("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden flex flex-col h-[600px] shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
      {/* Card Header */}
      <div
        className={`px-4 py-3 border-b shrink-0 flex items-center justify-between ${
          isSystem
            ? "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800"
            : "bg-zinc-50/50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
        }`}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div className={`w-2 h-2 rounded-full shrink-0 ${path.isConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
          <span className="font-mono font-bold text-sm text-zinc-700 dark:text-zinc-200 truncate" title={fullUrl}>{path.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => clearPathData(path.name)}
            className="text-[10px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors uppercase font-bold tracking-wider px-1"
          >
            Clear
          </button>
          {!isSystem && (
            <button
              onClick={() => removePath(path.id)}
              className="text-zinc-500 hover:text-red-400 transition-colors p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {path.error && (
        <div className="px-3 py-2 bg-red-500/10 border-b border-red-500/30 text-xs text-red-400 flex items-start gap-2 shrink-0">
          <AlertCircle size={14} className="shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{path.error}</p>
            <button 
              onClick={() => clearPathError(path.id)}
              className="mt-1 text-red-300 hover:text-red-200 underline text-[10px]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Card Body (Chat History) */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar bg-zinc-50/30 dark:bg-black/20">
        {!data || data.history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 opacity-60">
            <Activity size={32} className="mb-2 opacity-20" />
            <p className="text-xs">Waiting for messages...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {data.history.map((msg, idx) => (
              <MessageBubble key={msg.id || idx} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Send Section */}
      <div className="p-3 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
        <form onSubmit={handleSend} className="relative">
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-12 max-h-32 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-3 pr-12 py-3 text-xs font-mono text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-blue-500 resize-none shadow-inner"
            placeholder='Type a message (Markdown supported)...'
          />
          <button
            type="submit"
            disabled={!path.isConnected || !payload.trim()}
            className="absolute right-2 bottom-2 p-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-800 disabled:cursor-not-allowed text-white rounded-md transition-all shadow-sm"
          >
            <Send size={14} />
          </button>
        </form>
        <div className="mt-1 flex justify-between px-1">
             <div className="text-[9px] text-zinc-400 flex items-center gap-1">
                <span>Markdown & JSON supported</span>
             </div>
             <div className="text-[9px] text-zinc-400 font-mono">
                {data ? `${data.count} messages` : '0 messages'}
             </div>
        </div>
      </div>
    </div>
  );
};

const MessageBubble = ({ message }: { message: WebSocketMessage }) => {
  const isSent = message.type === 'sent';
  const isSystem = message.type === 'system';
  
  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
          message.isError 
            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-900/50' 
            : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
        }`}>
          {message.content}
        </span>
      </div>
    );
  }

  // Smart unwrapping for JSON messages
  let displayContent = message.content;
  if (!isSent) {
    try {
        const trimmed = message.content.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
            const parsed = JSON.parse(trimmed);
            // Check for common message fields
            if (parsed.message && typeof parsed.message === 'string') displayContent = parsed.message;
            else if (parsed.msg && typeof parsed.msg === 'string') displayContent = parsed.msg;
            else if (parsed.text && typeof parsed.text === 'string') displayContent = parsed.text;
            else if (parsed.content && typeof parsed.content === 'string') displayContent = parsed.content;
        }
    } catch {
        // Not JSON, use original
    }
  }

  return (
    <div className={`flex flex-col ${isSent ? 'items-end' : 'items-start'} group`}>
      <div className="flex items-end gap-2 max-w-[85%]">
          {/* Sent Tick - Left side of the box for sent messages */}
          {isSent && (
              <div className="mb-1 text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Check size={12} strokeWidth={3} />
              </div>
          )}

          <div 
            className={`rounded-lg px-3 py-2 text-xs shadow-sm ${
              isSent 
                ? 'bg-blue-50 dark:bg-blue-900/20 text-zinc-800 dark:text-zinc-200 border border-blue-100 dark:border-blue-900/30 rounded-br-none' 
                : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 rounded-bl-none'
            }`}
          >
            <MessageRenderer content={displayContent} />
          </div>
      </div>
      <span className="text-[9px] text-zinc-400 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {message.timestamp}
      </span>
    </div>
  );
};