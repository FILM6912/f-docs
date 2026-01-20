import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Database, Play, StopCircle, Box, Wrench, MessageSquare, Terminal, ChevronRight, ChevronDown, Search, X, Server, Activity, Loader2, Code, AlertTriangle, Settings2, Zap, Check, Copy, ArrowRightLeft, Globe, Plus, Trash2 } from 'lucide-react';

// --- Types for MCP Protocol ---

interface JsonRpcRequest {
    jsonrpc: "2.0";
    id?: number | string;
    method: string;
    params?: any;
}

interface JsonRpcResponse {
    jsonrpc: "2.0";
    id: number | string;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

interface McpResource {
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
}

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

interface McpPrompt {
  name: string;
  description?: string;
}

interface HeaderEntry {
    id: string;
    key: string;
    value: string;
}

// --- Helper ---
const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    if (typeof error === 'object' && error !== null) {
        if ('message' in error) return String((error as any).message);
        // Handle Event objects which serialize poorly
        if ('type' in error) return `Connection failed (Event type: ${(error as any).type})`;
        try {
            const json = JSON.stringify(error);
            return json === '{}' ? 'Unknown Object Error' : json;
        } catch {
            return 'Unknown Object Error';
        }
    }
    return String(error);
};

// --- Components ---

const McpBadge: React.FC<{ type: 'RESOURCE' | 'TOOL' | 'PROMPT'; className?: string }> = ({ type, className = '' }) => {
  const colors = {
    RESOURCE: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    TOOL: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    PROMPT: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  };
  return (
    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wider border ${colors[type]} ${className}`}>
      {type}
    </span>
  );
};

const McpItemCard: React.FC<{
    type: 'RESOURCE' | 'TOOL' | 'PROMPT';
    data: any;
    onRunTool?: (name: string, args: any) => Promise<any>;
    defaultOpen?: boolean;
}> = ({ type, data, onRunTool, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    // Tool Execution State
    const [toolArgs, setToolArgs] = useState<Record<string, any>>({});
    const [isExecuting, setIsExecuting] = useState(false);
    const [executionResult, setExecutionResult] = useState<any | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (type === 'TOOL' && data.inputSchema?.properties) {
            const defaults: Record<string, any> = {};
            Object.keys(data.inputSchema.properties).forEach(key => {
                defaults[key] = '';
            });
            setToolArgs(defaults);
        }
    }, [data, type]);
    
    const theme = {
        RESOURCE: { 
            border: 'border-blue-500/20', 
            bg: 'bg-blue-500/10', 
            hover: 'hover:brightness-110', 
            text: 'text-blue-400',
            button: 'bg-blue-600 hover:bg-blue-500'
        },
        TOOL: { 
            border: 'border-emerald-500/20', 
            bg: 'bg-emerald-500/10', 
            hover: 'hover:brightness-110', 
            text: 'text-emerald-400',
            button: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
        },
        PROMPT: { 
            border: 'border-purple-500/20', 
            bg: 'bg-purple-500/10', 
            hover: 'hover:brightness-110', 
            text: 'text-purple-400',
            button: 'bg-purple-600 hover:bg-purple-500'
        }
    }[type];

    const handleRunClick = async () => {
        if (!onRunTool) return;
        setIsExecuting(true);
        setExecutionResult(null);
        try {
            const result = await onRunTool(data.name, toolArgs);
            setExecutionResult(result);
        } catch (e: any) {
            setExecutionResult({ error: getErrorMessage(e) });
        } finally {
            setIsExecuting(false);
        }
    };

    const handleInputChange = (key: string, value: any, type: string) => {
        setToolArgs(prev => ({
            ...prev,
            [key]: type === 'integer' || type === 'number' ? Number(value) : value
        }));
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const name = data.name;
    const description = data.description || (type === 'RESOURCE' ? data.uri : '');

    return (
        <div className={`mb-4 rounded-lg border transition-all duration-200 ${isOpen ? 'ring-1 ring-opacity-50 shadow-lg' : ''} ${theme.border} bg-slate-950`}>
             <div 
                className={`flex items-center justify-between p-3 px-4 cursor-pointer select-none group ${theme.bg} ${theme.hover} transition-all ${!isOpen ? 'rounded-lg' : 'rounded-t-lg'}`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-4 overflow-hidden min-w-0 flex-1">
                    <div className="w-20 shrink-0">
                        <McpBadge type={type} className="shadow-sm w-full block text-center" />
                    </div>
                    <span className="font-mono text-slate-200 font-medium truncate min-w-0 flex-1 flex items-center gap-3">
                        <span className="opacity-90">{name}</span>
                        <span className="text-slate-400 text-sm hidden sm:block truncate shrink-0 font-sans opacity-60">- {description}</span>
                    </span>
                </div>
                 <div className="text-slate-400 group-hover:text-slate-200 transition-colors ml-4">
                    {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
            </div>

            {isOpen && (
                <div className="bg-slate-900/30 p-4 border-t border-slate-800/50 rounded-b-lg animate-in fade-in slide-in-from-top-1">
                     
                     <div className="mb-6 px-1">
                         <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Description</h4>
                         <p className="text-slate-300 text-sm leading-relaxed">{data.description || "No description provided."}</p>
                     </div>

                     {/* --- RESOURCE VIEW --- */}
                     {type === 'RESOURCE' && (
                         <div className="space-y-4 bg-slate-950 border border-slate-800 rounded-lg p-4">
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div>
                                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">URI</label>
                                     <div className="font-mono text-xs text-blue-300 bg-slate-900 p-2 rounded border border-slate-800 mt-1 select-all break-all flex items-center justify-between group/uri">
                                         <span>{data.uri}</span>
                                         <button onClick={() => handleCopy(data.uri)} className="opacity-0 group-hover/uri:opacity-100 transition-opacity text-slate-500 hover:text-white">
                                             {copied ? <Check size={12}/> : <Copy size={12}/>}
                                         </button>
                                     </div>
                                 </div>
                                 <div>
                                     <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">MIME Type</label>
                                     <div className="text-sm text-slate-300 mt-1 font-mono bg-slate-900 p-2 rounded border border-slate-800">{data.mimeType || 'N/A'}</div>
                                 </div>
                             </div>
                         </div>
                     )}
                     
                     {/* --- TOOL EXECUTION VIEW --- */}
                     {type === 'TOOL' && (
                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column: Inputs */}
                             <div className="space-y-4 flex flex-col">
                                 <div className="space-y-4 flex-1">
                                     <div className="flex items-center gap-2 pb-2 border-b border-slate-800/50">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Input Parameters</span>
                                     </div>
                                     
                                     {data.inputSchema?.properties && Object.keys(data.inputSchema.properties).length > 0 ? (
                                         <div className="space-y-3 bg-slate-950 p-4 rounded-lg border border-slate-800">
                                            {Object.entries(data.inputSchema.properties).map(([key, prop]: [string, any]) => (
                                                <div key={key}>
                                                    <div className="flex items-baseline justify-between mb-1.5">
                                                        <label className="block text-xs font-mono font-medium text-slate-300">
                                                            {key}
                                                            {data.inputSchema?.required?.includes(key) && <span className="text-red-500 ml-0.5">*</span>}
                                                        </label>
                                                        <span className="text-[10px] text-slate-500 font-mono">{prop.type}</span>
                                                    </div>
                                                    
                                                    {prop.type === 'boolean' ? (
                                                        <select
                                                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-colors"
                                                            value={String(toolArgs[key])}
                                                            onChange={(e) => handleInputChange(key, e.target.value === 'true', 'boolean')}
                                                        >
                                                            <option value="true">True</option>
                                                            <option value="false">False</option>
                                                        </select>
                                                    ) : (
                                                        <input 
                                                            type={prop.type === 'integer' || prop.type === 'number' ? 'number' : 'text'}
                                                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600 transition-colors"
                                                            placeholder={prop.description || `Enter ${key}...`}
                                                            value={toolArgs[key]}
                                                            onChange={(e) => handleInputChange(key, e.target.value, prop.type)}
                                                        />
                                                    )}
                                                    {prop.description && <p className="text-[10px] text-slate-500 mt-1">{prop.description}</p>}
                                                </div>
                                            ))}
                                         </div>
                                     ) : (
                                         <div className="text-xs text-slate-500 italic p-6 border border-dashed border-slate-800 rounded-lg text-center bg-slate-950/50">No arguments required.</div>
                                     )}
                                 </div>

                                 <button 
                                    onClick={handleRunClick}
                                    disabled={isExecuting}
                                    className={`w-full py-2.5 text-white rounded font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2 active:scale-[0.98] ${theme.button}`}
                                 >
                                    {isExecuting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="currentColor" />}
                                    Execute Tool
                                 </button>
                             </div>

                             {/* Right Column: Response */}
                             <div className="flex flex-col h-full min-h-[300px] bg-slate-950 rounded-lg border border-slate-800 overflow-hidden shadow-inner">
                                 <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 bg-slate-900/50">
                                     <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                         <Code size={14} /> Result
                                     </span>
                                     <div className="flex items-center gap-2">
                                        {executionResult && !executionResult.error && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                                Success
                                            </span>
                                        )}
                                        {executionResult?.error && (
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                                                Error
                                            </span>
                                        )}
                                     </div>
                                 </div>
                                 <div className="flex-1 p-4 overflow-auto custom-scrollbar relative">
                                     {!executionResult && !isExecuting && (
                                         <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 opacity-30 pointer-events-none">
                                             <Activity size={48} className="mb-3" />
                                             <p className="text-sm font-medium">Ready to execute</p>
                                         </div>
                                     )}
                                     {isExecuting && (
                                         <div className="absolute inset-0 flex items-center justify-center bg-slate-950/50 backdrop-blur-[1px] z-10">
                                             <Loader2 size={32} className="animate-spin text-emerald-500" />
                                         </div>
                                     )}
                                     {executionResult && (
                                         <pre className={`text-xs font-mono whitespace-pre-wrap break-all leading-relaxed ${executionResult.error ? 'text-red-400' : 'text-emerald-300'}`}>
                                             {JSON.stringify(executionResult, null, 2)}
                                         </pre>
                                     )}
                                 </div>
                             </div>
                         </div>
                     )}

                     {/* --- PROMPT VIEW --- */}
                     {type === 'PROMPT' && (
                          <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-8 text-center">
                              <MessageSquare size={32} className="text-slate-700 mx-auto mb-3" />
                              <h5 className="text-slate-400 font-medium mb-1">Prompt Execution</h5>
                              <p className="text-xs text-slate-500">Prompt testing is not yet supported in this interface.</p>
                          </div>
                     )}
                </div>
            )}
        </div>
    )
}

// --- Main Page ---

export const McpTester: React.FC = () => {
  // Transport State
  const [transportMode, setTransportMode] = useState<'sse' | 'http'>('sse');

  // Connection State
  const [url, setUrl] = useState('http://localhost:8000/sse');
  const [manualPostUrl, setManualPostUrl] = useState('');
  const [includeCredentials, setIncludeCredentials] = useState(false);
  const [customHeaders, setCustomHeaders] = useState<HeaderEntry[]>([]);
  
  // Internal State
  const [activePostUrl, setActivePostUrl] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showLogs, setShowLogs] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Data State
  const [resources, setResources] = useState<McpResource[]>([]);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [prompts, setPrompts] = useState<McpPrompt[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Refs
  const eventSourceRef = useRef<EventSource | null>(null);
  const requestIdRef = useRef(1);
  
  // Filter State
  const [filter, setFilter] = useState('');
  
  // Reset URL default when switching modes
  useEffect(() => {
      if (transportMode === 'sse') {
          if (!url.includes('/sse')) setUrl('http://localhost:8000/sse');
      } else {
          // HTTP mode defaults
          if (url.includes('/sse')) setUrl(url.replace('/sse', '')); // Strip SSE for http mode guess
          else if (url === 'http://localhost:8000/sse') setUrl('http://localhost:8000/mcp');
      }
  }, [transportMode]);

  const addLog = useCallback((msg: string, type: 'info' | 'error' | 'traffic' = 'info') => {
      const prefix = type === 'traffic' ? '[RPC]' : `[${new Date().toLocaleTimeString()}]`;
      setLogs(prev => [`${prefix} ${msg}`, ...prev]);
  }, []);

  const addHeader = () => {
      setCustomHeaders(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), key: '', value: '' }]);
  };

  const updateHeader = (id: string, field: 'key' | 'value', val: string) => {
      setCustomHeaders(prev => prev.map(h => h.id === id ? { ...h, [field]: val } : h));
  };

  const removeHeader = (id: string) => {
      setCustomHeaders(prev => prev.filter(h => h.id !== id));
  };

  // --- RPC Methods ---

  const sendJsonRpc = async (targetUrl: string, method: string, params?: any): Promise<any> => {
      const id = requestIdRef.current++;
      const payload: JsonRpcRequest = {
          jsonrpc: "2.0",
          id,
          method,
          params
      };

      addLog(`>> ${method} (ID: ${id})`, 'traffic');

      try {
          // Construct headers
          const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              'Accept': 'application/json' 
          };
          customHeaders.forEach(h => {
              if (h.key.trim()) headers[h.key.trim()] = h.value;
          });

          const res = await fetch(targetUrl, {
              method: 'POST',
              headers,
              credentials: includeCredentials ? 'include' : undefined,
              body: JSON.stringify(payload)
          });

          if (!res.ok) {
               let errorText = res.statusText;
               try { errorText = await res.text() || res.statusText; } catch {}
               
               if (res.status === 400 && errorText.includes("session ID")) {
                   addLog(`HINT: The server requires a session ID. Ensure you have established a session (SSE) or provided the session ID in headers/query.`, 'info');
               }

               throw new Error(`HTTP Error ${res.status}: ${errorText}`);
          }

          const text = await res.text();
          if (!text) return null; 

          const json: JsonRpcResponse = JSON.parse(text);
          if (json.error) {
               addLog(`<< ERROR (ID: ${json.id}): ${json.error.message}`, 'error');
               throw new Error(json.error.message);
          }
          
          addLog(`<< RESULT (ID: ${json.id}): Success`, 'traffic');
          return json.result;

      } catch (e: any) {
          const errMsg = getErrorMessage(e);
          addLog(`!! Network/RPC Error: ${errMsg}`, 'error');
          
          if (errMsg.includes("Failed to fetch")) {
              if (includeCredentials) {
                  addLog(`HINT: 'Failed to fetch' with credentials enabled often implies a CORS error. Ensure the server allows the specific origin (not '*') and allow-credentials=true.`, 'info');
              } else {
                  addLog(`HINT: 'Failed to fetch' often implies a CORS error. Ensure the server enables CORS (Access-Control-Allow-Origin).`, 'info');
              }
          }
          
          throw e;
      }
  };

  const connect = () => {
      if (isConnected || isConnecting) return;
      
      setIsConnecting(true);
      setResources([]);
      setTools([]);
      setPrompts([]);
      setActivePostUrl(null);
      setLogs([]);

      // HTTP Mode (Stateless / Direct POST)
      if (transportMode === 'http') {
           addLog(`Initializing HTTP session at ${url}...`);
           // For HTTP mode, the URL entered IS the POST URL.
           setActivePostUrl(url);
           setIsConnected(true);
           setIsConnecting(false);
           initializeMcp(url);
           return;
      }

      // SSE Mode
      try {
          addLog(`Connecting SSE to ${url}...`);
          // Note: EventSource doesn't support custom headers natively.
          // If the SSE endpoint requires headers, users might need a polyfill or proxy, 
          // or pass query params (which can be done in the URL input).
          const es = new EventSource(url, { withCredentials: includeCredentials });
          
          es.onopen = () => {
              addLog("SSE Connection opened.");
              
              if (manualPostUrl) {
                  addLog(`Using manual POST URL: ${manualPostUrl}`);
                  setActivePostUrl(manualPostUrl);
                  setIsConnected(true);
                  setIsConnecting(false);
                  initializeMcp(manualPostUrl);
              }
          };

          es.onerror = (e) => {
              const errMsg = getErrorMessage(e);
              const state = es.readyState === EventSource.CONNECTING ? "Connecting" : 
                            es.readyState === EventSource.CLOSED ? "Closed" : "Open";
              
              addLog(`SSE connection failed (State: ${state}). Cause: ${errMsg}`, 'error');
              
              if (state === "Closed" && !isConnected) {
                  if (!url.endsWith('/sse')) {
                       addLog(`HINT: Many MCP servers host SSE at "/sse". Did you mean to use SSE mode?`, 'info');
                  }
                  addLog(`HINT: If this is a plain HTTP endpoint (not SSE), try switching Transport to "HTTP".`, 'info');
              }
              
              disconnect();
          };

          // MCP over SSE: Server sends 'endpoint' event with the POST URL
          es.addEventListener('endpoint', async (e: MessageEvent) => {
              if (manualPostUrl) return; 

              const endpointUri = e.data;
              addLog(`Received endpoint URI: ${endpointUri}`);
              
              let resolvedPostUrl = endpointUri;
              try {
                  resolvedPostUrl = new URL(endpointUri, url).toString();
              } catch (e) { }
              
              setActivePostUrl(resolvedPostUrl);
              setIsConnected(true);
              setIsConnecting(false);

              await initializeMcp(resolvedPostUrl);
          });

          es.onmessage = (e) => {
             try {
                const msg = JSON.parse(e.data);
                addLog(`<< NOTIFICATION: ${msg.method}`, 'traffic');
             } catch {}
          };

          eventSourceRef.current = es;

      } catch (e: any) {
          addLog(`Connection Exception: ${getErrorMessage(e)}`, 'error');
          setIsConnecting(false);
      }
  };

  const initializeMcp = async (targetUrl: string) => {
      try {
          addLog("Initializing MCP Client...");
          
          const initResult = await sendJsonRpc(targetUrl, "initialize", {
              protocolVersion: "2024-11-05",
              capabilities: {
                  roots: { listChanged: true },
                  sampling: {}
              },
              clientInfo: {
                  name: "Nexus-Inspector",
                  version: "1.0.0"
              }
          });
          
          addLog(`Server Initialized. Capabilities: ${JSON.stringify(initResult.capabilities)}`);

          await sendJsonRpc(targetUrl, "notifications/initialized");
          discover(targetUrl);

      } catch (e: any) {
          addLog(`Initialization failed: ${getErrorMessage(e)}`, 'error');
          disconnect();
      }
  };

  const discover = async (targetUrl: string) => {
      try {
          addLog("Discovering resources, tools, and prompts...");
          
          try {
              const toolsRes = await sendJsonRpc(targetUrl, "tools/list");
              if (toolsRes && toolsRes.tools) {
                  setTools(toolsRes.tools);
                  addLog(`Found ${toolsRes.tools.length} tools.`);
              }
          } catch (e) { addLog("Failed to list tools", 'error'); }

          try {
              const resRes = await sendJsonRpc(targetUrl, "resources/list");
              if (resRes && resRes.resources) {
                  setResources(resRes.resources);
                  addLog(`Found ${resRes.resources.length} resources.`);
              }
          } catch (e) { addLog("Failed to list resources", 'error'); }

           try {
              const promptRes = await sendJsonRpc(targetUrl, "prompts/list");
              if (promptRes && promptRes.prompts) {
                  setPrompts(promptRes.prompts);
                  addLog(`Found ${promptRes.prompts.length} prompts.`);
              }
          } catch (e) { addLog("Failed to list prompts", 'error'); }

      } catch (e: any) {
           addLog(`Discovery error: ${getErrorMessage(e)}`, 'error');
      }
  };

  const disconnect = () => {
      if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
      }
      setIsConnected(false);
      setIsConnecting(false);
      setActivePostUrl(null);
      addLog("Disconnected.");
  };

  const runTool = async (name: string, args: any): Promise<any> => {
      if (!activePostUrl) throw new Error("Not connected to MCP POST endpoint");
      
      const res = await sendJsonRpc(activePostUrl, "tools/call", {
          name: name,
          arguments: args
      });
      return res;
  };

  const filteredResources = resources.filter(r => r.name.toLowerCase().includes(filter.toLowerCase()));
  const filteredTools = tools.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()));
  const filteredPrompts = prompts.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

  return (
      <div className="flex h-full bg-slate-950 text-slate-200 overflow-hidden relative">
          
          {/* Internal Sidebar for MCP Items */}
          <aside className="w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0 flex flex-col hidden md:flex">
                <div className="p-4 border-b border-slate-800">
                    <h2 className="font-bold text-white flex items-center gap-2">
                        <Database className="text-orange-400" size={20}/>
                        <span>MCP Inspector</span>
                    </h2>
                </div>
                
                {/* Search in Sidebar */}
                <div className="p-2 border-b border-slate-800 bg-slate-900/50">
                     <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <input 
                            type="text" 
                            placeholder="Filter items..." 
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full h-8 bg-slate-950 border border-slate-700 rounded pl-8 pr-2 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
                        />
                     </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
                    {/* Resources Group */}
                    <div>
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                            <span>Resources</span>
                            <span className="bg-slate-800 px-1.5 rounded-full text-slate-400">{resources.length}</span>
                        </div>
                        {resources.map(r => (
                             <div key={r.name} className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded truncate flex items-center gap-2 transition-colors cursor-pointer">
                                <Box size={12} className="text-blue-500/70 shrink-0" /> <span className="truncate">{r.name}</span>
                             </div>
                        ))}
                    </div>

                    {/* Tools Group */}
                    <div>
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                            <span>Tools</span>
                            <span className="bg-slate-800 px-1.5 rounded-full text-slate-400">{tools.length}</span>
                        </div>
                        {tools.map(t => (
                             <div key={t.name} className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded truncate flex items-center gap-2 transition-colors cursor-pointer">
                                <Wrench size={12} className="text-emerald-500/70 shrink-0" /> <span className="truncate">{t.name}</span>
                             </div>
                        ))}
                    </div>

                    {/* Prompts Group */}
                    <div>
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest flex justify-between">
                            <span>Prompts</span>
                            <span className="bg-slate-800 px-1.5 rounded-full text-slate-400">{prompts.length}</span>
                        </div>
                        {prompts.map(p => (
                             <div key={p.name} className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded truncate flex items-center gap-2 transition-colors cursor-pointer">
                                <MessageSquare size={12} className="text-purple-500/70 shrink-0" /> <span className="truncate">{p.name}</span>
                             </div>
                        ))}
                    </div>
                </div>
                
                {/* Logs Toggle */}
                <div className="p-3 border-t border-slate-800">
                    <button 
                        onClick={() => setShowLogs(!showLogs)}
                        className={`w-full py-2 px-3 rounded text-xs font-bold flex items-center justify-center gap-2 transition-all ${showLogs ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'}`}
                    >
                        <Terminal size={14} />
                        {showLogs ? 'Hide Logs' : 'Show Logs'}
                    </button>
                </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-950 relative">
             
             {/* Top Connection Bar */}
             <header className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 shadow-lg px-6 py-4">
                 <div className="max-w-5xl mx-auto space-y-3">
                     <div className="flex items-center gap-3 w-full">
                         
                        {/* Transport Toggle */}
                        <div className="flex bg-slate-900 rounded-md p-1 border border-slate-700 shrink-0">
                             <button
                                 onClick={() => !isConnected && setTransportMode('sse')}
                                 disabled={isConnected}
                                 className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all ${transportMode === 'sse' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                             >
                                 <Activity size={12} /> SSE
                             </button>
                             <button
                                 onClick={() => !isConnected && setTransportMode('http')}
                                 disabled={isConnected}
                                 className={`px-3 py-1.5 text-xs font-bold rounded flex items-center gap-2 transition-all ${transportMode === 'http' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                             >
                                 <Globe size={12} /> HTTP
                             </button>
                        </div>

                        <div className="flex-1 relative group">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 group-focus-within:text-orange-500 transition-colors">
                                {transportMode === 'sse' ? 'SSE URL' : 'POST URL'}
                            </span>
                            <input 
                                type="text" 
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="w-full h-10 bg-slate-900 border border-slate-700 rounded-md pl-24 pr-4 text-sm text-slate-200 focus:outline-none focus:border-orange-500 transition-colors placeholder:text-slate-600 font-mono"
                                placeholder={transportMode === 'sse' ? "http://localhost:8000/sse" : "http://localhost:8000/mcp"}
                                disabled={isConnected || isConnecting}
                            />
                        </div>

                        <button 
                            onClick={() => setShowSettings(!showSettings)}
                            className={`h-10 w-10 flex items-center justify-center rounded-md border transition-all ${showSettings ? 'bg-slate-800 border-slate-600 text-white' : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'}`}
                            title="Connection Settings"
                            disabled={isConnected}
                        >
                            <Settings2 size={18} />
                        </button>
                        
                        <button 
                            onClick={isConnected ? disconnect : connect}
                            disabled={isConnecting}
                            className={`h-10 px-6 rounded-md font-bold flex items-center gap-2 transition-all shadow-lg text-sm whitespace-nowrap min-w-[120px] justify-center ${
                                isConnected 
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
                                : isConnecting 
                                    ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                                    : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-900/20'
                            }`}
                        >
                            {isConnecting ? <Loader2 size={16} className="animate-spin" /> : 
                            isConnected ? <><StopCircle size={16}/> Disconnect</> : <><Play size={16}/> {transportMode === 'http' ? 'Initialize' : 'Connect'}</>}
                        </button>
                     </div>
                     
                     {/* Extended Settings */}
                     {showSettings && !isConnected && (
                         <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-md animate-in fade-in slide-in-from-top-2">
                             <div className="grid gap-4">
                                 {transportMode === 'sse' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Manual POST URL (Optional)</label>
                                        <input 
                                            type="text" 
                                            value={manualPostUrl}
                                            onChange={(e) => setManualPostUrl(e.target.value)}
                                            className="w-full h-9 bg-slate-950 border border-slate-700 rounded px-3 text-xs text-slate-300 focus:outline-none focus:border-orange-500 font-mono"
                                            placeholder="e.g. http://localhost:8000/messages (Overrides auto-discovery)"
                                        />
                                        <p className="text-[10px] text-slate-500 mt-1">If your server doesn't emit the `endpoint` event, specify the JSON-RPC POST endpoint here manually.</p>
                                    </div>
                                 )}

                                 <div className="flex items-center gap-2 pt-1">
                                    <input 
                                        type="checkbox" 
                                        id="includeCredentials" 
                                        checked={includeCredentials} 
                                        onChange={(e) => setIncludeCredentials(e.target.checked)}
                                        className="rounded border-slate-700 bg-slate-950 text-orange-500 focus:ring-orange-500/50"
                                    />
                                    <label htmlFor="includeCredentials" className="text-xs text-slate-300 font-medium select-none cursor-pointer">
                                        Include Credentials (Cookies/Auth)
                                    </label>
                                    <span className="text-[10px] text-slate-500 ml-2">Requires <code>Access-Control-Allow-Credentials: true</code> on server.</span>
                                 </div>

                                 {/* Custom Headers */}
                                 <div>
                                     <div className="flex items-center justify-between mb-2">
                                         <label className="text-xs font-bold text-slate-500 uppercase">Custom Headers</label>
                                         <button onClick={addHeader} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                                             <Plus size={12} /> Add Header
                                         </button>
                                     </div>
                                     <div className="space-y-2">
                                         {customHeaders.map(h => (
                                             <div key={h.id} className="flex gap-2">
                                                 <input 
                                                    type="text" 
                                                    placeholder="Key (e.g. Authorization)" 
                                                    value={h.key}
                                                    onChange={(e) => updateHeader(h.id, 'key', e.target.value)}
                                                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                                                 />
                                                 <input 
                                                    type="text" 
                                                    placeholder="Value" 
                                                    value={h.value}
                                                    onChange={(e) => updateHeader(h.id, 'value', e.target.value)}
                                                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                                                 />
                                                 <button onClick={() => removeHeader(h.id)} className="text-slate-500 hover:text-red-400 p-1">
                                                     <Trash2 size={14} />
                                                 </button>
                                             </div>
                                         ))}
                                         {customHeaders.length === 0 && <p className="text-[10px] text-slate-600 italic">No custom headers</p>}
                                     </div>
                                 </div>
                             </div>
                         </div>
                     )}
                     
                     {/* Connection Hint */}
                     {!isConnected && !isConnecting && !showSettings && (
                         <div className="text-[10px] text-slate-500 flex items-center gap-1.5 justify-center">
                             <AlertTriangle size={10} />
                             <span>Ensure your MCP server allows CORS (Access-Control-Allow-Origin: *) for browser access.</span>
                         </div>
                     )}
                 </div>
             </header>
             
             {/* Content */}
             <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                 <div className="max-w-5xl mx-auto pb-20">
                     
                     {!isConnected ? (
                        <div className="flex flex-col items-center justify-center py-32 border border-slate-800 rounded-lg bg-slate-900/20 border-dashed">
                            <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800 shadow-lg">
                                <Zap className="text-slate-600" size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-300">
                                {isConnecting ? 'Connecting...' : 'Ready to Connect'}
                            </h3>
                            <p className="text-slate-500 mt-2 max-w-sm text-center text-sm">
                                {transportMode === 'sse' 
                                  ? "Enter your MCP Server SSE URL to start inspecting resources, tools, and prompts."
                                  : "Enter your MCP Server JSON-RPC POST URL to initialize a stateless session."
                                }
                            </p>
                        </div>
                     ) : (
                         <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             
                             {/* Resources Section */}
                             {filteredResources.length > 0 && (
                                 <div>
                                     <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider px-1">
                                         <Box size={16} /> Resources
                                     </h3>
                                     <div className="space-y-4">
                                         {filteredResources.map((res, i) => (
                                             <McpItemCard key={i} type="RESOURCE" data={res} />
                                         ))}
                                     </div>
                                 </div>
                             )}

                             {/* Tools Section */}
                             {filteredTools.length > 0 && (
                                 <div>
                                     <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider px-1">
                                         <Wrench size={16} /> Tools
                                     </h3>
                                     <div className="space-y-4">
                                         {filteredTools.map((tool, i) => (
                                             <McpItemCard 
                                                key={i} 
                                                type="TOOL" 
                                                data={tool} 
                                                onRunTool={runTool}
                                                defaultOpen={false}
                                             />
                                         ))}
                                     </div>
                                 </div>
                             )}

                             {/* Prompts Section */}
                             {filteredPrompts.length > 0 && (
                                 <div>
                                     <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider px-1">
                                         <MessageSquare size={16} /> Prompts
                                     </h3>
                                     <div className="space-y-4">
                                         {filteredPrompts.map((prompt, i) => (
                                             <McpItemCard key={i} type="PROMPT" data={prompt} />
                                         ))}
                                     </div>
                                 </div>
                             )}
                             
                             {filteredResources.length === 0 && filteredTools.length === 0 && filteredPrompts.length === 0 && (
                                 <div className="text-center py-20 border border-slate-800 rounded-lg bg-slate-900/20 border-dashed">
                                     <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 mb-3">
                                         <Server size={24} className="text-slate-600" />
                                     </div>
                                     <h4 className="text-slate-300 font-medium">Connected, but no items found.</h4>
                                     <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
                                         The server initialized successfully but returned no capabilities.
                                     </p>
                                 </div>
                             )}
                         </div>
                     )}
                 </div>
             </div>
             
             {/* Logs Drawer (Bottom Sheet style) */}
             {showLogs && (
                 <div className="h-64 border-t border-slate-800 bg-slate-900 flex flex-col shrink-0 animate-in slide-in-from-bottom-10 duration-200 shadow-[0_-5px_15px_rgba(0,0,0,0.3)] z-30">
                     <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950">
                        <div className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <Terminal size={14} /> JSON-RPC Traffic
                        </div>
                        <button onClick={() => setLogs([])} className="text-slate-500 hover:text-white transition-colors" title="Clear Logs">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs custom-scrollbar">
                        {logs.length === 0 && <p className="text-slate-600 italic">No logs yet.</p>}
                        {logs.map((log, i) => (
                            <div key={i} className={`border-b border-slate-800/50 pb-1 break-all ${log.includes('<<') ? 'text-emerald-400/80' : log.includes('>>') ? 'text-blue-400/80' : log.includes('error') ? 'text-red-400' : 'text-slate-400'}`}>
                                {log}
                            </div>
                        ))}
                    </div>
                 </div>
             )}
          </div>
      </div>
  );
};