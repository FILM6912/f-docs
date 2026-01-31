import { useState, useEffect, useCallback } from 'react';
import { SimulationResponse } from '../types';

interface EndpointState {
  paramValues: Record<string, string>;
  bodyValue: string;
  activeTab: "params" | "body" | "auth" | "headers";
  formValues?: Record<string, string | File>;
  headerValues?: Record<string, string>;
  response?: SimulationResponse | null;
  rightPanelTab?: string;
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

  const setActiveTab = useCallback((newValue: "params" | "body" | "auth" | "headers") => {
    setState(prev => ({ ...prev, activeTab: newValue }));
  }, []);

  const setFormValues = useCallback((newValues: Record<string, string | File> | ((prev: Record<string, string | File>) => Record<string, string | File>)) => {
    setState(prev => ({
        ...prev,
        formValues: typeof newValues === 'function' ? newValues(prev.formValues || {}) : newValues
    }));
  }, []);

  const setHeaderValues = useCallback((newValues: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
    setState(prev => ({
        ...prev,
        headerValues: typeof newValues === 'function' ? newValues(prev.headerValues || {}) : newValues
    }));
  }, []);

  const setResponse = useCallback((newResponse: SimulationResponse | null) => {
    setState(prev => ({ ...prev, response: newResponse }));
  }, []);

  const setRightPanelTab = useCallback((newTab: string) => {
    setState(prev => ({ ...prev, rightPanelTab: newTab }));
  }, []);

  // Reset function - clears all data for this endpoint
  const reset = useCallback(() => {
    setState(initialDefaults);
    delete memoryStore[endpointId];
  }, [endpointId, initialDefaults]);

  return {
    paramValues: state.paramValues,
    bodyValue: state.bodyValue,
    activeTab: state.activeTab,
    formValues: state.formValues || {},
    headerValues: state.headerValues || {},
    response: state.response,
    rightPanelTab: state.rightPanelTab,
    setParamValues,
    setBodyValue,
    setActiveTab,
    setFormValues,
    setHeaderValues,
    setResponse,
    setRightPanelTab,
    reset
  };
}
