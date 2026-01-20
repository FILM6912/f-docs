import React, { useState, useEffect, useRef } from "react";
import {
  Zap,
  ZapOff,
  Radio,
  ArrowUp,
  Plus,
  X,
  Activity,
  Clock,
  Hash,
} from "lucide-react";
import { io, Socket } from "socket.io-client";

interface ListenerData {
  lastEvent: string;
  timestamp: string;
  count: number;
}

export const SocketIoTester: React.FC = () => {
  const [url, setUrl] = useState("http://localhost:3000");
  const [isConnected, setIsConnected] = useState(false);

  // Emit state
  const [eventName, setEventName] = useState("message");
  const [messageData, setMessageData] = useState("{}");

  // Listener state
  const [activeListeners, setActiveListeners] = useState<string[]>([]);
  const [newListener, setNewListener] = useState("");
  const [showEmitPanel, setShowEmitPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data state
  const [listenerData, setListenerData] = useState<
    Record<string, ListenerData>
  >({});
  const socketRef = useRef<Socket | null>(null);

  const connect = () => {
    if (socketRef.current) return;
    setError(null);

    try {
      const socket = io(url, {
        transports: ["websocket", "polling"],
        autoConnect: true,
      });

      socket.on("connect", () => {
        setIsConnected(true);
        setError(null);
        updateListenerData("system", "Connected", "connect");
      });

      socket.on("disconnect", () => {
        setIsConnected(false);
        updateListenerData("system", "Disconnected", "disconnect");
      });

      socket.on("connect_error", (err) => {
        setIsConnected(false);
        setError(`Connection Error: ${err.message}`);
        updateListenerData("system", `Error: ${err.message}`, "error");
      });

      // Bind dynamic listeners
      activeListeners.forEach((event) => {
        if (!["connect", "disconnect", "error"].includes(event)) {
          socket.on(event, (data) => {
            updateListenerData(
              event,
              typeof data === "object"
                ? JSON.stringify(data, null, 2)
                : String(data),
            );
          });
        }
      });

      socketRef.current = socket;
    } catch (err: any) {
      updateListenerData("system", `Error: ${err.message}`, "error");
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      updateListenerData("system", "Disconnected manually", "disconnect");
    }
  };

  const emitEvent = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (socketRef.current && isConnected && eventName) {
      try {
        const payload = JSON.parse(messageData);
        socketRef.current.emit(eventName, payload);
        // Optional: you might want to track emitted events too, but user asked for listeners
      } catch (err) {
        updateListenerData("system", "Invalid JSON payload for emit", "error");
      }
    }
  };

  const addListener = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListener && !activeListeners.includes(newListener)) {
      setActiveListeners([...activeListeners, newListener]);
      // If already connected, bind it immediately
      if (socketRef.current) {
        socketRef.current.on(newListener, (data) => {
          updateListenerData(
            newListener,
            typeof data === "object"
              ? JSON.stringify(data, null, 2)
              : String(data),
          );
        });
      }
      setNewListener("");
    }
  };

  const removeListener = (eventToRemove: string) => {
    setActiveListeners(activeListeners.filter((l) => l !== eventToRemove));
    if (socketRef.current) {
      socketRef.current.off(eventToRemove);
    }
    // Also clear data for this listener
    setListenerData((prev) => {
      const next = { ...prev };
      delete next[eventToRemove];
      return next;
    });
  };

  const updateListenerData = (
    event: string,
    data: string,
    keyOverride?: string,
  ) => {
    const key = keyOverride || event;
    const now = new Date().toLocaleTimeString();

    setListenerData((prev) => ({
      ...prev,
      [key]: {
        lastEvent: data,
        timestamp: now,
        count: (prev[key]?.count || 0) + 1,
      },
    }));
  };

  const clearData = () => setListenerData({});

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
          {/* Connection Group */}
          <div className="flex-1 max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 flex gap-2 items-center shadow-sm">
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700/50 rounded px-3 py-1.5 text-slate-800 dark:text-white focus:outline-none focus:border-blue-500 font-mono text-sm"
              placeholder="http://localhost:3000"
              disabled={isConnected}
            />
            <button
              onClick={isConnected ? disconnect : connect}
              className={`px-4 py-1.5 rounded text-sm font-bold flex items-center gap-2 transition-all ${
                isConnected
                  ? "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20"
              }`}
            >
              {isConnected ? (
                <>
                  <ZapOff size={16} /> Disconnect
                </>
              ) : (
                <>
                  <Zap size={16} /> Connect
                </>
              )}
            </button>
          </div>

          <div className="h-8 w-px bg-slate-800 hidden xl:block" />

          {/* Action Group */}
          <div className="flex gap-3 items-center">
            <button
              onClick={() => setShowEmitPanel(!showEmitPanel)}
              className={`h-[42px] px-4 rounded-lg font-medium flex items-center gap-2 transition-all border ${
                showEmitPanel
                  ? "bg-blue-600/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                  : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700"
              }`}
            >
              <ArrowUp
                size={16}
                className={
                  showEmitPanel
                    ? "rotate-0 transition-transform"
                    : "rotate-180 transition-transform"
                }
              />
              <span className="text-sm">Emit</span>
            </button>

            <form
              onSubmit={addListener}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 flex gap-2 items-center shadow-sm"
            >
              <div className="pl-2">
                <Plus size={16} className="text-slate-500" />
              </div>
              <input
                type="text"
                placeholder="Listener..."
                value={newListener}
                onChange={(e) => setNewListener(e.target.value)}
                className="w-32 xl:w-40 bg-transparent border-none text-slate-800 dark:text-white focus:outline-none text-sm placeholder:text-slate-400 dark:placeholder:text-slate-600"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-colors"
              >
                Add
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
        {/* Controls Panel */}
        {showEmitPanel && (
            <div className="lg:col-span-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
            {/* Emitter */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-3 flex items-center gap-2">
                <ArrowUp size={14} /> Emit Event
                </h3>
                <div className="space-y-3">
                <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                    Event Name
                    </label>
                    <input
                    type="text"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm text-slate-800 dark:text-white focus:border-blue-500 focus:outline-none"
                    />
                </div>
                <div>
                    <label className="text-xs text-slate-400 mb-1 block">
                    JSON Data
                    </label>
                    <textarea
                    value={messageData}
                    onChange={(e) => setMessageData(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-xs font-mono text-slate-700 dark:text-slate-300 h-24 focus:outline-none focus:border-blue-500"
                    />
                </div>
                <button
                    onClick={emitEvent}
                    disabled={!isConnected}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium shadow-md shadow-blue-500/10 transition-colors disabled:opacity-50"
                >
                    Emit
                </button>
                </div>
            </div>
            </div>
        )}

        {/* Listeners Grid */}
        <div className={`${showEmitPanel ? 'lg:col-span-3' : 'lg:col-span-4'} flex flex-col gap-4`}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Activity size={20} className="text-emerald-500 dark:text-green-400" /> Active Listeners
            </h3>
            <button
              onClick={clearData}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Clear Data
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4 flex-1 overflow-y-auto custom-scrollbar p-1">
            {activeListeners.map((listener) => {
              const data = listenerData[listener];
              const isSystem = [
                "connect",
                "disconnect",
                "error",
                "system",
              ].includes(listener);

              return (
                <div
                  key={listener}
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
                        {listener}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isSystem && (
                        <button
                          onClick={() => removeListener(listener)}
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
