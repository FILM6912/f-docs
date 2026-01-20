import React, { useState } from 'react';
import { Activity, Radio, X, Clock, Send } from 'lucide-react';
import { PathData, PathItem } from '../hooks/useWebSocket';
import { JsonDisplay } from "./JsonDisplay";

interface WebSocketTesterProps {
  url: string;
  setUrl: (url: string) => void;
  isConnected: boolean;
  activePaths: PathItem[];
  pathData: Record<string, PathData>;
  connect: () => void;
  disconnect: () => void;
  sendMessage: (path: string, message: string) => boolean;
  clearData: () => void;
  clearPathData: (name: string) => void;
  removePath: (id: string) => void;
}

export const WebSocketTester: React.FC<WebSocketTesterProps> = ({
  isConnected,
  activePaths,
  pathData,
  sendMessage,
  clearPathData,
  removePath
}) => {
  const enabledPaths = activePaths.filter(p => p.isEnabled);

  return (
    <div className="p-6 h-full flex flex-col w-full">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div className="shrink-0">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Activity className="text-purple-600 dark:text-purple-400" /> WebSocket Tester
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Real-time path-based monitor.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
        {enabledPaths.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50">
            <Radio size={48} className="mb-4" />
            <p className="text-sm italic">No active paths enabled. Add or enable paths from the sidebar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6 pb-6">
            {enabledPaths.map((path) => (
              <PathCard
                key={path.id}
                path={path}
                data={pathData[path.name]}
                removePath={removePath}
                clearPathData={clearPathData}
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
  data: PathData | undefined;
  removePath: (id: string) => void;
  clearPathData: (name: string) => void;
  sendMessage: (path: string, message: string) => void;
}

const PathCard: React.FC<PathCardProps> = ({
  path,
  data,
  removePath,
  clearPathData,
  sendMessage,
}) => {
  const [payload, setPayload] = useState("{}");
  const isSystem = ["connect", "disconnect", "error", "system"].includes(path.name);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(path.name, payload);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex flex-col min-h-[350px] shadow-sm hover:border-purple-200 dark:hover:border-slate-700 transition-colors">
      {/* Card Header */}
      <div
        className={`px-4 py-3 border-b flex items-center justify-between ${
          isSystem
            ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800"
            : "bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${data ? "bg-purple-500 animate-pulse" : "bg-slate-600"}`} />
          <span className="font-mono font-bold text-sm text-slate-700 dark:text-slate-200">{path.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => clearPathData(path.name)}
            className="text-[10px] text-slate-500 hover:text-purple-500 transition-colors uppercase font-bold tracking-wider px-1"
          >
            Clear
          </button>
          {!isSystem && (
            <button
              onClick={() => removePath(path.id)}
              className="text-slate-500 hover:text-red-400 transition-colors p-1"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Card Body (Messages) */}
      <div className="flex-1 p-0 relative group min-h-[150px] border-b border-slate-100 dark:border-slate-800 overflow-hidden">
        {data ? (
          <div className="w-full h-full p-4 overflow-y-auto custom-scrollbar">
            <JsonDisplay data={data.lastEvent} />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
            <Activity size={32} className="mb-2 opacity-20" />
            <p className="text-xs">Waiting for stream...</p>
          </div>
        )}
      </div>

      {/* Send Section */}
      <div className="p-3 bg-slate-50/50 dark:bg-slate-950/30">
        <form onSubmit={handleSend} className="flex flex-col gap-2">
          <textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            className="w-full h-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded p-2 text-[10px] font-mono text-slate-700 dark:text-slate-300 focus:outline-none focus:border-purple-500 resize-none shadow-inner"
            placeholder='Message or JSON...'
          />
          <button
            type="submit"
            className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-[10px] font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Send size={10} /> Send via {path.name}
          </button>
        </form>
      </div>

      {/* Card Footer */}
      {data && (
        <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 flex items-center gap-2 font-mono">
          <Clock size={10} /> Last update: {data.timestamp} | Count: {data.count}
        </div>
      )}
    </div>
  );
};