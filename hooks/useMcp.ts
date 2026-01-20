import { useState, useRef, useCallback, useEffect } from 'react';
import { mcpSdkService } from '../services/mcpSdkService';

// --- Types ---

export interface McpResource {
  uri: string;
  name: string;
  mimeType?: string;
  description?: string;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface McpPrompt {
  name: string;
  description?: string;
}

export interface HeaderEntry {
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

export const useMcp = () => {
  // Connection State
  const [url, setUrl] = useState('/mcp');
  const [includeCredentials, setIncludeCredentials] = useState(false);
  const [customHeaders, setCustomHeaders] = useState<HeaderEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Auth State
  const [authToken, setAuthToken] = useState('');
  const [authUsername, setAuthUsername] = useState('admin');
  const [authPassword, setAuthPassword] = useState('admin');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  
  // Internal State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Data State
  const [resources, setResources] = useState<McpResource[]>([]);
  const [tools, setTools] = useState<McpTool[]>([]);
  const [prompts, setPrompts] = useState<McpPrompt[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  
  // Filter State (can be managed here or in UI)
  const [filter, setFilter] = useState('');

  // NOTE: Removed auto-connect. The user must explicitly click "Connect" first.


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

  const handleLogin = async () => {
      setIsAuthenticating(true);
      try {
          const baseUrl = url.includes('://') ? url.split('/').slice(0, 3).join('/') : 'http://localhost:8000';
          const tokenUrl = `${baseUrl}/token`;
          
          addLog(`Attempting login at ${tokenUrl}...`);
          
          const formData = new URLSearchParams();
          formData.append('username', authUsername);
          formData.append('password', authPassword);
          
          const res = await fetch(tokenUrl, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: formData
          });
          
          if (!res.ok) {
              const error = await res.text();
              throw new Error(`Login failed: ${error}`);
          }
          
          const data = await res.json();
          setAuthToken(data.access_token);
          addLog(`✅ Login successful! Token received.`);
          return true;
      } catch (e: any) {
          addLog(`❌ Login failed: ${getErrorMessage(e)}`, 'error');
          return false;
      } finally {
          setIsAuthenticating(false);
      }
  };

  const discover = async () => {
      try {
          addLog("Discovering tools, resources, and prompts...");
          
          // List tools
          try {
              const toolsList = await mcpSdkService.listTools();
              setTools(toolsList);
              if (toolsList.length > 0) {
                  addLog(`✅ Found ${toolsList.length} tools.`);
              } else {
                  addLog("No tools available.", 'info');
              }
          } catch (e) {
              addLog("Server does not support tools/list", 'info');
          }

          // List resources
          try {
              const resourcesList = await mcpSdkService.listResources();
              setResources(resourcesList);
              if (resourcesList.length > 0) {
                  addLog(`✅ Found ${resourcesList.length} resources.`);
              }
          } catch (e) {
              addLog("Server does not support resources/list", 'info');
          }

          // List prompts
          try {
              const promptsList = await mcpSdkService.listPrompts();
              setPrompts(promptsList);
              if (promptsList.length > 0) {
                  addLog(`✅ Found ${promptsList.length} prompts.`);
              }
          } catch (e) {
              addLog("Server does not support prompts/list", 'info');
          }

      } catch (e: any) {
          addLog(`Discovery error: ${getErrorMessage(e)}`, 'error');
      }
  };

  const normalizeUrl = (input: string): string => {
    if (!input) return '';
    if (input.startsWith('http://') || input.startsWith('https://')) return input;
    if (input.startsWith('/')) {
        return window.location.origin + input;
    }
    // Default to http:// if no protocol
    if (input.includes(':') || input.includes('.')) {
        return `http://${input}`;
    }
    return input;
  };

  const connect = async (manualUrl?: string): Promise<boolean> => {
      // url to use
      const targetUrl = normalizeUrl(manualUrl || url);
      
      if (isConnected || isConnecting) return true;
      
      setIsConnecting(true);
      setError(null);
      setResources([]);
      setTools([]);
      setPrompts([]);
      setLogs([]);

      const trySingleConnect = async (probeUrl: string, silent: boolean = false): Promise<boolean> => {
          if (!silent) addLog(`Connecting to ${probeUrl}...`);
          try {
              const headers: Record<string, string> = {};
              customHeaders.forEach(h => {
                  if (h.key.trim()) headers[h.key.trim()] = h.value;
              });

              await mcpSdkService.connect({
                  url: probeUrl,
                  authToken,
                  customHeaders: headers,
                  includeCredentials,
              });

              if (!silent) addLog('✅ Connected successfully!');
              setIsConnected(true);
              setIsConnecting(false);
              await discover();
              return true;
          } catch (err: any) {
              if (!silent) {
                  const msg = getErrorMessage(err);
                  addLog(`❌ Connection failed: ${msg}`, 'error');
              }
              return false;
          }
      };
      
      // 1. Try Target URL
      const success = await trySingleConnect(targetUrl);
      if (success) return true;

      // 2. If initial connection failed and it was a default/relative attempt, try fallbacks
      const fallbacks = [
        window.location.origin + '/mcp',
        window.location.origin + '/sse'
      ];

      for (const fallback of fallbacks) {
          if (fallback === targetUrl) continue; // Already tried
          const fbSuccess = await trySingleConnect(fallback, true);
          if (fbSuccess) {
              setUrl(fallback); // Update UI to show what worked
              return true;
          }
      }

      // 3. Fallback failed
      setIsConnecting(false);
      setIsConnected(false);
      setError(`Failed to connect to MCP server at ${targetUrl}. Please check the URL and ensure the server is running and supports SSE.`);
      return false;
  };

  const disconnect = async () => {
      await mcpSdkService.disconnect();
      setIsConnected(false);
      setIsConnecting(false);
      addLog("Disconnected.");
  };

  const runTool = async (name: string, args: any): Promise<any> => {
      if (!mcpSdkService.isConnected()) {
          throw new Error("Not connected to MCP server");
      }
      
      const result = await mcpSdkService.callTool(name, args);
      return result;
  };

  const filteredResources = resources.filter(r => r.name.toLowerCase().includes(filter.toLowerCase()));
  const filteredTools = tools.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()));
  const filteredPrompts = prompts.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

  return {
    // State
    url, setUrl,
    includeCredentials, setIncludeCredentials,
    customHeaders, setCustomHeaders,
    authToken, setAuthToken,
    authUsername, setAuthUsername,
    authPassword, setAuthPassword,
    isAuthenticating,
    isConnected,
    isConnecting,
    error, setError,
    resources, 
    tools,
    prompts,
    logs, setLogs,
    filter, setFilter,
    filteredResources,
    filteredTools,
    filteredPrompts,

    // Actions
    connect,
    disconnect,
    addLog,
    addHeader,
    updateHeader,
    removeHeader,
    handleLogin,
    runTool,
    getErrorMessage, 
  };
};
