import { useState, useEffect, useCallback } from 'react';

interface EndpointState {
  paramValues: Record<string, string>;
  bodyValue: string;
  activeTab: "params" | "body" | "auth";
  formValues?: Record<string, string>;
}

// In-memory store: persists as long as the page is not refreshed
const memoryStore: Record<string, EndpointState> = {};

export function useEndpointPersistence(endpointId: string, initialDefaults: EndpointState) {
  
  // Initialize state from memoryStore or defaults
  const [state, setState] = useState<EndpointState>(() => {
    try {
      const saved = memoryStore[endpointId];
      if (saved) {
        // Merge with defaults to ensure all fields exist
        return { 
            ...initialDefaults, 
            ...saved,
        };
      }
    } catch (e) {
      console.warn("Failed to load endpoint state from memory", e);
    }
    return initialDefaults;
  });

  // Save to memoryStore whenever state changes
  useEffect(() => {
    try {
        memoryStore[endpointId] = state;
    } catch (e) {
      console.warn("Failed to save endpoint state to memory", e);
    }
  }, [state, endpointId]);

  // Setters
  const setParamValues = useCallback((newValues: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
      setState(prev => ({
          ...prev,
          paramValues: typeof newValues === 'function' ? newValues(prev.paramValues) : newValues
      }));
  }, []);

  const setBodyValue = useCallback((newValue: string) => {
    setState(prev => ({ ...prev, bodyValue: newValue }));
  }, []);

  const setActiveTab = useCallback((newValue: "params" | "body" | "auth") => {
    setState(prev => ({ ...prev, activeTab: newValue }));
  }, []);

  return {
    paramValues: state.paramValues,
    bodyValue: state.bodyValue,
    activeTab: state.activeTab,
    setParamValues,
    setBodyValue,
    setActiveTab
  };
}
