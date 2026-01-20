import { useState, useCallback, useRef, useEffect } from 'react';

export interface PathItem {
  id: string;
  name: string;
  isEnabled: boolean;
}

export interface PathData {
  lastEvent: string;
  count: number;
  timestamp: string;
}

export const useWebSocket = () => {
  const [url, setUrl] = useState(() => {
    const saved = localStorage.getItem('ws_url');
    return saved || 'wss://echo.websocket.org';
  });
  const [isConnected, setIsConnected] = useState(false);
  const [activePaths, setActivePaths] = useState<PathItem[]>(() => {
    const saved = localStorage.getItem('ws_paths');
    return saved ? JSON.parse(saved) : [
      { id: '1', name: 'general', isEnabled: true }
    ];
  });
  const [pathData, setPathData] = useState<Record<string, PathData>>({});

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('ws_url', url);
  }, [url]);

  useEffect(() => {
    localStorage.setItem('ws_paths', JSON.stringify(activePaths));
  }, [activePaths]);
  const socketRef = useRef<WebSocket | null>(null);

  const updatePathData = useCallback((pathName: string, data: string) => {
    setPathData(prev => ({
      ...prev,
      [pathName]: {
        lastEvent: data,
        count: (prev[pathName]?.count || 0) + 1,
        timestamp: new Date().toLocaleTimeString()
      }
    }));
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current) return;

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        updatePathData('system', 'Connected');
      };

      ws.onmessage = (event) => {
        // For plain WebSockets, we show the message in all enabled path cards
        // unless there's a specific routing logic.
        setActivePaths(paths => {
          paths.filter(p => p.isEnabled).forEach(p => {
            updatePathData(p.name, `📥 RECEIVED:\n${event.data}`);
          });
          return paths;
        });
      };

      ws.onclose = () => {
        setIsConnected(false);
        socketRef.current = null;
        updatePathData('system', 'Disconnected');
      };

      ws.onerror = (error) => {
        updatePathData('system', 'Connection Error');
        console.error('WebSocket error:', error);
      };

      socketRef.current = ws;
    } catch (err: any) {
      updatePathData('system', `Error: ${err.message}`);
    }
  }, [url, updatePathData]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const sendMessage = useCallback((pathName: string, message: string) => {
    if (socketRef.current && isConnected && message) {
      socketRef.current.send(message);
      updatePathData(pathName, `📤 SENT:\n${message}`);
      return true;
    }
    return false;
  }, [isConnected, updatePathData]);

  const addPath = (name: string) => {
    if (!activePaths.find(p => p.name === name)) {
      setActivePaths(prev => [...prev, { id: Math.random().toString(36).substring(7), name, isEnabled: true }]);
    }
  };

  const removePath = (id: string) => {
    setActivePaths(prev => prev.filter(p => p.id !== id));
  };

  const togglePath = (id: string) => {
    setActivePaths(prev => prev.map(p => p.id === id ? { ...p, isEnabled: !p.isEnabled } : p));
  };

  const clearData = () => setPathData({});
  
  const clearPathData = (name: string) => {
    setPathData(prev => {
      const newData = { ...prev };
      delete newData[name];
      return newData;
    });
  };

  return {
    url,
    setUrl,
    isConnected,
    activePaths,
    pathData,
    connect,
    disconnect,
    sendMessage,
    addPath,
    removePath,
    togglePath,
    clearData,
    clearPathData
  };
};
