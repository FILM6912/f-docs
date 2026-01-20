import React, { useState, useEffect, useRef } from 'react';
import { Send, Trash2, Wifi, WifiOff, Activity, ArrowDown, ArrowUp } from 'lucide-react';

interface LogMessage {
  id: string;
  type: 'sent' | 'received' | 'system';
  data: string;
  timestamp: string;
}

export const WebSocketTester: React.FC = () => {
  const [url, setUrl] = useState('wss://echo.websocket.org');
  const [isConnected, setIsConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const connect = () => {
    if (socketRef.current) return;

    try {
      addLog('system', `Connecting to ${url}...`);
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        addLog('system', 'Connected');
      };

      ws.onmessage = (event) => {
        addLog('received', event.data);
      };

      ws.onclose = () => {
        setIsConnected(false);
        socketRef.current = null;
        addLog('system', 'Disconnected');
      };

      ws.onerror = (error) => {
        addLog('system', 'Connection Error');
        console.error('WebSocket error:', error);
      };

      socketRef.current = ws;
    } catch (err: any) {
      addLog('system', `Error: ${err.message}`);
    }
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setIsConnected(false);
    }
  };

  const sendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (socketRef.current && isConnected && message) {
      socketRef.current.send(message);
      addLog('sent', message);
      setMessage('');
    }
  };

  const addLog = (type: 'sent' | 'received' | 'system', data: string) => {
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      type,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearLogs = () => setLogs([]);

  return (
    <div className="p-6 h-full flex flex-col max-w-5xl mx-auto w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
          <Activity className="text-purple-600 dark:text-purple-400" /> WebSocket Tester
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mt-1">Test real-time WebSocket connections and messages.</p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4 mb-4 flex gap-3 flex-wrap sm:flex-nowrap shadow-sm">
        <div className="flex-1 relative">
           <input 
             type="text" 
             value={url}
             onChange={(e) => setUrl(e.target.value)}
             className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md px-4 py-2 text-slate-800 dark:text-white focus:outline-none focus:border-purple-500"
             placeholder="wss://example.com/socket"
             disabled={isConnected}
           />
        </div>
        <button 
          onClick={isConnected ? disconnect : connect}
          className={`px-6 py-2 rounded-md font-bold flex items-center gap-2 transition-colors ${
            isConnected 
            ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
          }`}
        >
          {isConnected ? <><WifiOff size={18}/> Disconnect</> : <><Wifi size={18}/> Connect</>}
        </button>
      </div>

      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden relative shadow-sm">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Message Log</div>
          <button onClick={clearLogs} className="text-slate-400 hover:text-red-500 dark:text-slate-500 dark:hover:text-white transition-colors" title="Clear Logs">
            <Trash2 size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600">
               <Activity size={48} className="mb-4 opacity-20" />
               <p>No messages yet</p>
            </div>
          ) : (
            logs.map(log => (
              <div key={log.id} className={`flex ${log.type === 'sent' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                   log.type === 'system' ? 'w-full bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-center font-mono text-xs border border-dashed border-slate-200 dark:border-slate-700' :
                   log.type === 'sent' ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-200 border border-purple-200 dark:border-purple-500/20 shadow-sm' :
                   'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-sm'
                 }`}>
                   {log.type !== 'system' && (
                     <div className="flex items-center gap-2 mb-1 text-[10px] opacity-60 font-mono">
                       {log.type === 'sent' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>}
                       {log.timestamp}
                     </div>
                   )}
                   <pre className="whitespace-pre-wrap break-all font-mono">{log.data}</pre>
                 </div>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input 
              type="text" 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isConnected ? "Type a message..." : "Connect to send messages"}
              className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md px-4 py-2 text-slate-800 dark:text-white focus:outline-none focus:border-purple-500 disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isConnected}
            />
            <button 
              type="submit" 
              disabled={!isConnected || !message}
              className="bg-purple-600 hover:bg-purple-500 text-white p-2.5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-900/10"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};