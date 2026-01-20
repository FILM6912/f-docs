import React from 'react';

interface JsonDisplayProps {
  data: any;
  className?: string;
}

export const JsonDisplay: React.FC<JsonDisplayProps> = ({ data, className = '' }) => {
  // Helper to assume nested JSON strings should be expanded for readability
  // Helper to assume nested JSON strings should be expanded for readability
  // Using useCallback to prevent re-creation but recursion inside needs careful handling
  // Since it's pure logic, we can define it inside or outside. 
  
  const tryParseJson = (value: any): any => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      // Try parsing if it looks like JSON structure
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
           const parsed = JSON.parse(value);
           if (typeof parsed === 'object' && parsed !== null) {
             return tryParseJson(parsed);
           }
        } catch (e) { /* ignore */ }
      }
      return value;
    }
    
    if (Array.isArray(value)) {
      return value.map(item => tryParseJson(item));
    }
    
    if (typeof value === 'object' && value !== null) {
      const next: Record<string, any> = {};
      Object.keys(value).forEach(key => {
        next[key] = tryParseJson(value[key]);
      });
      return next;
    }
    
    return value;
  };

  const processedData = tryParseJson(data);
  const json = JSON.stringify(processedData, null, 2);

  const highlight = (jsonStr: string) => {
    if (!jsonStr) return null;
    
    // Regex to match JSON tokens
    const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;

    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(jsonStr))) {
      const matchIndex = match.index;
      // Add non-matching text (whitespace, brackets, etc.)
      if (matchIndex > lastIndex) {
        elements.push(jsonStr.substring(lastIndex, matchIndex));
      }

      const str = match[0];
      let styleClass = 'text-slate-600 dark:text-slate-300'; // Default
      
      if (match[1].startsWith('"')) {
        if (match[1].endsWith(':')) {
           // Key
           styleClass = 'text-blue-600 dark:text-blue-400 font-semibold'; // Blue for keys
           const key = str.slice(0, -1);
           elements.push(<span key={matchIndex} className={styleClass}>{key}</span>);
           elements.push(<span key={matchIndex + '_colon'} className="text-slate-400 dark:text-slate-500">:</span>);
           lastIndex = regex.lastIndex;
           continue; 
        } else {
           // String Value
           styleClass = 'text-emerald-600 dark:text-emerald-400'; // Green for strings
        }
      } else if (/true|false/.test(str)) {
        styleClass = 'text-amber-600 dark:text-amber-400 font-bold'; // Amber for booleans
      } else if (/null/.test(str)) {
        styleClass = 'text-red-500 dark:text-red-400 font-bold'; // Red for null
      } else {
        styleClass = 'text-purple-600 dark:text-purple-400'; // Purple for numbers
      }

      elements.push(<span key={matchIndex} className={styleClass}>{str}</span>);
      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < jsonStr.length) {
      elements.push(<span key="remaining" className="text-slate-500 dark:text-slate-400">{jsonStr.substring(lastIndex)}</span>);
    }

    return elements;
  };

  return (
    <pre className={`font-mono text-xs whitespace-pre-wrap break-all leading-relaxed ${className}`}>
      {highlight(json)}
    </pre>
  );
};
