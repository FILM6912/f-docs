
import { useState, useCallback, useRef, useEffect } from 'react';

export interface WebSocketMessage {
  id: string;
  type: 'sent' | 'received' | 'system';
  content: string;
  timestamp: string;
  isError?: boolean;
}

export interface PathItem {
  id: string;
  name: string;
  isEnabled: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export interface PathData {
  history: WebSocketMessage[];
  count: number;
  lastActivity: string;
}

export const useWebSocket = () => {
  const [baseUrl, setBaseUrl] = useState(() => {
    // Always derive URL from current browser location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname || 'localhost';
    const port = window.location.port;
    return port ? `${protocol}//${host}:${port}` : `${protocol}//${host}`;
  });
  
  const [activePaths, setActivePaths] = useState<PathItem[]>(() => {
    const saved = localStorage.getItem('ws_paths');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((p: any) => ({
        id: p.id,
        name: p.name,
        isEnabled: false,
        isConnected: false,
        isConnecting: false,
        error: null
      }));
    }
    return [
      { id: '1', name: '/ws/chat', isEnabled: false, isConnected: false, isConnecting: false, error: null }
    ];
  });
  
  const [pathData, setPathData] = useState<Record<string, PathData>>({});
  
  const socketsRef = useRef<Record<string, WebSocket>>({});
  
  // Track recently sent messages for echo cancellation
  // Map of pathName -> Set of message contents
  const sentMessagesRef = useRef<Record<string, Set<string>>>({});

  // Persistence Effects
  useEffect(() => {
    const toSave = activePaths.map(p => ({ id: p.id, name: p.name }));
    localStorage.setItem('ws_paths', JSON.stringify(toSave));
  }, [activePaths]);

  const addMessage = useCallback((pathName: string, type: 'sent' | 'received' | 'system', content: string, isError = false) => {
    setPathData(prev => {
      const currentData = prev[pathName] || { history: [], count: 0, lastActivity: '' };
      
      const newMessage: WebSocketMessage = {
        id: Math.random().toString(36).substring(7),
        type,
        content,
        timestamp: new Date().toLocaleTimeString(),
        isError
      };
      
      // Keep last 50 messages
      const newHistory = [...currentData.history, newMessage].slice(-50);
      
      return {
        ...prev,
        [pathName]: {
          history: newHistory,
          count: currentData.count + 1,
          lastActivity: newMessage.timestamp
        }
      };
    });
  }, []);

  const updatePathState = useCallback((id: string, updates: Partial<PathItem>) => {
    setActivePaths(prev => prev.map(p => 
      p.id === id ? { ...p, ...updates } : p
    ));
  }, []);

  const connectPath = useCallback((pathId: string) => {
    const path = activePaths.find(p => p.id === pathId);
    if (!path || socketsRef.current[pathId]) return;

    const fullUrl = `${baseUrl}${path.name}`;
    
    updatePathState(pathId, { isConnecting: true, error: null });
    addMessage(path.name, 'system', `Connecting to ${fullUrl}...`);
    
    // Initialize sent messages set for this path
    if (!sentMessagesRef.current[path.name]) {
      sentMessagesRef.current[path.name] = new Set();
    }

    try {
      const ws = new WebSocket(fullUrl);

      ws.onopen = () => {
        updatePathState(pathId, { 
          isConnected: true, 
          isConnecting: false, 
          isEnabled: true,
          error: null 
        });
        addMessage(path.name, 'system', 'Connected');
      };

      ws.onmessage = (event) => {
        const receivedContent = event.data;
        
        // Echo Cancellation Logic
        let isEcho = false;
        const sentSet = sentMessagesRef.current[path.name];
        
        if (sentSet && sentSet.size > 0) {
          // Check if exact match (rare for JSON APIs)
          if (sentSet.has(receivedContent)) {
             isEcho = true;
             sentSet.delete(receivedContent);
          } else {
             // Check if JSON wrapped echo
             try {
                const parsed = JSON.parse(receivedContent);
                // Check common fields
                const possibleContent = parsed.message || parsed.msg || parsed.text || parsed.content;
                if (possibleContent && sentSet.has(possibleContent)) {
                    isEcho = true;
                    // sentSet.delete(possibleContent); // Keep it for a bit? No, consume it.
                    // Actually, if we delete it, and the server sends it twice? 
                    // Assume strict 1-1 echo for now.
                    sentSet.delete(possibleContent);
                }
             } catch {}
          }
        }
        
        if (!isEcho) {
            addMessage(path.name, 'received', receivedContent);
        } else {
            // Optional: Mark the sent message as "delivered" or similar if we were tracking IDs
            console.log("Echo suppressed:", receivedContent);
        }
      };

      ws.onclose = (event) => {
        delete socketsRef.current[pathId];
        // Clear pending sent messages on close
        if (sentMessagesRef.current[path.name]) {
            sentMessagesRef.current[path.name].clear();
        }
        
        const errorMsg = !event.wasClean 
          ? `Connection closed (code: ${event.code})` 
          : null;
        
        updatePathState(pathId, { 
          isConnected: false, 
          isConnecting: false,
          isEnabled: false,
          error: errorMsg
        });
        
        if (errorMsg) {
          addMessage(path.name, 'system', errorMsg, true);
        } else {
          addMessage(path.name, 'system', 'Disconnected');
        }
      };

      ws.onerror = () => {
        delete socketsRef.current[pathId];
        updatePathState(pathId, { 
          isConnecting: false,
          isConnected: false,
          isEnabled: false,
          error: `Failed to connect to ${fullUrl}`
        });
        addMessage(path.name, 'system', 'Connection failed', true);
      };

      socketsRef.current[pathId] = ws;
    } catch (err: any) {
      updatePathState(pathId, { 
        isConnecting: false,
        isEnabled: false,
        error: `Error: ${err.message}`
      });
      addMessage(path.name, 'system', `Error: ${err.message}`, true);
    }
  }, [baseUrl, activePaths, addMessage, updatePathState]);

  const disconnectPath = useCallback((pathId: string) => {
    const ws = socketsRef.current[pathId];
    if (ws) {
      ws.close();
      delete socketsRef.current[pathId];
    }
    updatePathState(pathId, { 
      isConnected: false, 
      isConnecting: false,
      isEnabled: false,
      error: null
    });
  }, [updatePathState]);

  const togglePath = useCallback((id: string) => {
    const path = activePaths.find(p => p.id === id);
    if (!path) return;

    if (path.isEnabled || path.isConnected) {
      disconnectPath(id);
    } else {
      connectPath(id);
    }
  }, [activePaths, connectPath, disconnectPath]);

  const sendMessage = useCallback((pathId: string, message: string) => {
    const path = activePaths.find(p => p.id === pathId);
    const ws = socketsRef.current[pathId];
    
    if (ws && path && ws.readyState === WebSocket.OPEN && message) {
      ws.send(message);
      addMessage(path.name, 'sent', message);
      
      // Track this message for echo cancellation
      if (!sentMessagesRef.current[path.name]) {
          sentMessagesRef.current[path.name] = new Set();
      }
      sentMessagesRef.current[path.name].add(message);
      
      // Auto-cleanup from set after 5 seconds to prevent memory leaks if no echo
      setTimeout(() => {
          if (sentMessagesRef.current[path.name]) {
              sentMessagesRef.current[path.name].delete(message);
          }
      }, 5000);
      
      return true;
    }
    return false;
  }, [activePaths, addMessage]);

  const addPath = (name: string) => {
    if (!activePaths.find(p => p.name === name)) {
      const newPath: PathItem = {
        id: Math.random().toString(36).substring(7),
        name: name.startsWith('/') ? name : `/${name}`,
        isEnabled: false,
        isConnected: false,
        isConnecting: false,
        error: null
      };
      setActivePaths(prev => [...prev, newPath]);
    }
  };

  const removePath = (id: string) => {
    disconnectPath(id);
    setActivePaths(prev => prev.filter(p => p.id !== id));
  };

  const clearData = () => setPathData({});
  
  const clearPathData = (name: string) => {
    setPathData(prev => {
      const newData = { ...prev };
      delete newData[name];
      return newData;
    });
  };

  const clearPathError = (id: string) => {
    updatePathState(id, { error: null });
  };

  // Cleanup
  useEffect(() => {
    return () => {
      Object.values(socketsRef.current).forEach(ws => ws.close());
    };
  }, []);

  const isAnyConnected = activePaths.some(p => p.isConnected);

  return {
    baseUrl,
    setBaseUrl,
    activePaths,
    pathData,
    isAnyConnected,
    togglePath,
    sendMessage,
    addPath,
    removePath,
    clearData,
    clearPathData,
    clearPathError
  };
};
