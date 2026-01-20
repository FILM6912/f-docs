import React, { useState } from "react";
import {
  Zap,
  ZapOff,
  Radio,
  ArrowUp,
  X,
  Activity,
  Clock,
} from "lucide-react";
import { ListenerData, ListenerItem } from "../hooks/useSocketIO";

interface SocketIoTesterProps {
  url: string;
  setUrl: (url: string) => void;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  activeListeners: ListenerItem[];
  addListener: (listener: string) => void;
  removeListener: (id: string) => void;
  listenerData: Record<string, ListenerData>;
  emitEvent: (eventName: string, messageData: string) => void;
  clearData: () => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export const SocketIoTester: React.FC<SocketIoTesterProps> = ({
  url,
  setUrl,
  isConnected,
  connect,
  disconnect,
  activeListeners,
  addListener,
  removeListener,
  listenerData,
  emitEvent,
  clearData,
  error,
  setError,
}) => {
  // Emit state (Local UI state)
  const [eventName, setEventName] = useState("message");
  const [messageData, setMessageData] = useState("{}");



  const enabledListeners = activeListeners.filter(l => l.isEnabled);

  return (
    <div className="p-6 h-full flex flex-col w-full">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6">
        <div className="shrink-0">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <Radio className="text-blue-600 dark:text-blue-400" /> Socket.IO Tester
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Real-time listener dashboard.</p>
        </div>

        {/* Unified Controls Toolbar */}
        <div className="flex-1 flex flex-wrap gap-4 items-center justify-end">
           {/* Action Group */}
          
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        

        {/* Listeners Grid */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            </h3>
            <button
               onClick={clearData}
               className="text-xs text-slate-400 hover:text-white underline"
            >
               Clear Data
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar p-1">
            {enabledListeners.map((listener) => {
              const data = listenerData[listener.name];
              const isSystem = [
                "connect",
                "disconnect",
                "error",
                "system",
              ].includes(listener.name);

              return (
                <div
                  key={listener.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden flex flex-col h-64 shadow-sm hover:border-blue-200 dark:hover:border-slate-700 transition-colors"
                >
                  {/* Card Header */}
                  <div
                    className={`px-4 py-3 border-b flex items-center justify-between ${
                      isSystem
                        ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800"
                        : "bg-slate-50/50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${data ? "bg-green-500 animate-pulse" : "bg-slate-600"}`}
                      />
                      <span className="font-mono font-bold text-sm text-slate-700 dark:text-slate-200">
                        {listener.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isSystem && (
                        <button
                          onClick={() => removeListener(listener.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors p-1"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="flex-1 p-0 relative group">
                    {data ? (
                      <textarea
                        readOnly
                        className="w-full h-full bg-transparent text-xs font-mono text-slate-600 dark:text-slate-300 p-4 resize-none focus:outline-none custom-scrollbar"
                        value={data.lastEvent}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
                        <Activity size={32} className="mb-2 opacity-20" />
                        <p className="text-xs">Waiting for events...</p>
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  {data && (
                    <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 flex items-center gap-2 font-mono">
                      <Clock size={10} /> Last update: {data.timestamp}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-6 right-6 bg-red-500/10 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <ZapOff size={20} className="text-red-400" />
          <div className="flex-1 text-sm font-medium">{error}</div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
