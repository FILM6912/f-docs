import { useState, useEffect, useCallback, useRef } from 'react';

interface EndpointState {
  paramValues: Record<string, string>;
  bodyValue: string;
  activeTab: "params" | "body" | "auth";
  formValues?: Record<string, string>; // We can't easily persist File objects in localStorage, so we might skip or just store text fields
}

export function useEndpointPersistence(endpointId: string, initialDefaults: EndpointState) {
  const storageKey = `f-docs-ep-${endpointId}`;
  
  // Initialize state from localStorage or defaults
  const [state, setState] = useState<EndpointState>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure all fields exist (in case schema changes)
        return { 
            ...initialDefaults, 
            ...parsed,
            // If the default activeTab logic from the component (passed in initialDefaults) 
            // determined "body" should be active (e.g. no params), but saved state says "params",
            // we should probably respect the saved state IF it was explicitly set.
            // However, a simple merge usually respects the saved value (parsed.activeTab).
        };
      }
    } catch (e) {
      console.warn("Failed to load endpoint state", e);
    }
    return initialDefaults;
  });

  // Save to localStorage whenever state changes
  // We use a ref to debounce saves slightly if needed, but for simple text inputs, direct effect is usually fine.
  useEffect(() => {
    try {
        // Exclude formValues (files) from persistence for now to avoid issues, 
        // or filter them to only text. For simplicity, let's persist what we can safely.
        const { formValues, ...persistableState } = state as any;
        localStorage.setItem(storageKey, JSON.stringify(persistableState));
    } catch (e) {
      console.warn("Failed to save endpoint state", e);
    }
  }, [state, storageKey]);

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
