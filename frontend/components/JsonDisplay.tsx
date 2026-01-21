import React from 'react';

interface JsonDisplayProps {
  data: any;
  className?: string;
}

// Standalone highlighter for reuse
export const highlightJson = (code: string) => {
  if (!code) return "";
  
  // Regex to match JSON tokens
  const regex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;

  return (
    <>
      {(() => {
        const elements: React.ReactNode[] = [];
        let lastIndex = 0;
        let match;
        // Re-create regex for execution
        const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;

        while ((match = tokenRegex.exec(code))) {
            const matchIndex = match.index;
            if (matchIndex > lastIndex) {
                elements.push(<span key={`text-${lastIndex}`}>{code.substring(lastIndex, matchIndex)}</span>);
            }
            const str = match[0];
            let styleClass = 'text-slate-600 dark:text-slate-300';
            
            if (match[1].startsWith('"')) {
                if (match[1].endsWith(':')) {
                    styleClass = 'text-blue-600 dark:text-blue-400 font-semibold';
                    const key = str.slice(0, -1);
                    elements.push(<span key={matchIndex} className={styleClass}>{key}</span>);
                    elements.push(<span key={`${matchIndex}-colon`} className="text-slate-400 dark:text-slate-500">:</span>);
                    lastIndex = tokenRegex.lastIndex;
                    continue;
                } else {
                    styleClass = 'text-emerald-600 dark:text-emerald-400';
                }
            } else if (/true|false/.test(str)) {
                styleClass = 'text-amber-600 dark:text-amber-400 font-bold';
            } else if (/null/.test(str)) {
                styleClass = 'text-red-500 dark:text-red-400 font-bold';
            } else {
                styleClass = 'text-purple-600 dark:text-purple-400';
            }
            elements.push(<span key={matchIndex} className={styleClass}>{str}</span>);
            lastIndex = tokenRegex.lastIndex;
        }
        if (lastIndex < code.length) {
            elements.push(<span key="remaining" className="text-slate-500 dark:text-slate-400">{code.substring(lastIndex)}</span>);
        }
        return elements;
      })()}
    </>
  );
};



export const JsonDisplay: React.FC<JsonDisplayProps> = ({ data, className = '' }) => {
  // Helper to assume nested JSON strings should be expanded for readability
  const tryParseJson = (value: any): any => {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
           const parsed = JSON.parse(value);
           if (typeof parsed === 'object' && parsed !== null) return tryParseJson(parsed);
        } catch (e) { /* ignore */ }
      }
      return value;
    }
    if (Array.isArray(value)) return value.map(item => tryParseJson(item));
    if (typeof value === 'object' && value !== null) {
      const next: Record<string, any> = {};
      Object.keys(value).forEach(key => { next[key] = tryParseJson(value[key]); });
      return next;
    }
    return value;
  };

  const processedData = tryParseJson(data);
  const json = JSON.stringify(processedData, null, 2);

  return (
    <pre className={`font-mono text-xs whitespace-pre-wrap break-all leading-relaxed ${className}`}>
      {highlightJson(json)}
    </pre>
  );
};
