import { useState, useRef, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface ListenerData {
  lastEvent: string;
  timestamp: string;
  count: number;
}

export interface ListenerItem {
  id: string;
  name: string;
  isEnabled: boolean;
}

export const useSocketIO = () => {
  const [url, setUrl] = useState(typeof window !== 'undefined' ? window.location.origin : "http://localhost:3000");
  const [isConnected, setIsConnected] = useState(false);
  const [activeListeners, setActiveListeners] = useState<ListenerItem[]>([]);
  const [listenerData, setListenerData] = useState<Record<string, ListenerData>>({});
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);

  // Helper to update listener data
  const updateListenerData = useCallback((
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
  }, []);

  const bindListener = useCallback((socket: Socket, eventName: string) => {
      socket.on(eventName, (data) => {
        updateListenerData(
          eventName,
          typeof data === "object"
            ? JSON.stringify(data, null, 2)
            : String(data),
        );
      });
  }, [updateListenerData]);

  const connect = useCallback(() => {
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

      // Bind enabled dynamic listeners
      activeListeners.forEach((listener) => {
        if (listener.isEnabled && !["connect", "disconnect", "error"].includes(listener.name)) {
            bindListener(socket, listener.name);
        }
      });

      socketRef.current = socket;
    } catch (err: any) {
        updateListenerData("system", `Error: ${err.message}`, "error");
    }
  }, [url, activeListeners, updateListenerData, bindListener]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      updateListenerData("system", "Disconnected manually", "disconnect");
    }
  }, [updateListenerData]);

  const emitEvent = useCallback((eventName: string, messageData: string) => {
    if (socketRef.current && isConnected && eventName) {
      try {
        const payload = JSON.parse(messageData);
        socketRef.current.emit(eventName, payload);
      } catch (err) {
        updateListenerData("system", "Invalid JSON payload for emit", "error");
      }
    }
  }, [isConnected, updateListenerData]);

  const addListener = useCallback((newListenerName: string) => {
    // Check if duplicate
    if(!activeListeners.some(l => l.name === newListenerName)) {
        const newItem: ListenerItem = {
            id: Math.random().toString(36).substr(2, 9),
            name: newListenerName,
            isEnabled: true
        };
        
        setActiveListeners(prev => [...prev, newItem]);
        
        // If connected, bind immediately
        if (socketRef.current) {
            bindListener(socketRef.current, newListenerName);
        }
    }
  }, [activeListeners, bindListener]);

  const removeListener = useCallback((idToRemove: string) => {
    const listenerToRemove = activeListeners.find(l => l.id === idToRemove);
    if (!listenerToRemove) return;

    setActiveListeners(prev => prev.filter((l) => l.id !== idToRemove));
    
    if (socketRef.current) {
      socketRef.current.off(listenerToRemove.name);
    }
    // Also clear data for this listener
    setListenerData((prev) => {
      const next = { ...prev };
      delete next[listenerToRemove.name];
      return next;
    });
  }, [activeListeners]);

  const toggleListener = useCallback((id: string) => {
      setActiveListeners(prev => prev.map(listener => {
          if (listener.id === id) {
              const newState = !listener.isEnabled;
              
              if (socketRef.current) {
                  if (newState) {
                      bindListener(socketRef.current, listener.name);
                  } else {
                      socketRef.current.off(listener.name);
                  }
              }
              
              return { ...listener, isEnabled: newState };
          }
          return listener;
      }));
  }, [bindListener]);

  const clearData = useCallback(() => setListenerData({}), []);
  const clearListenerData = useCallback((eventName: string) => {
    setListenerData((prev) => {
        const next = { ...prev };
        delete next[eventName];
        return next;
    });
  }, []);

  return {
    url,
    setUrl,
    isConnected,
    connect,
    disconnect,
    activeListeners,
    addListener,
    removeListener,
    toggleListener,
    listenerData,
    emitEvent,
    clearData,
    clearListenerData,
    error,
    setError
  };
};
