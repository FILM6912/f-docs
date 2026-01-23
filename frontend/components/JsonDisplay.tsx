import React from 'react';

interface JsonDisplayProps {
  data: any;
  className?: string;
}

// XML Syntax Highlighter
export const highlightXml = (code: string) => {
  if (!code) return "";
  
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  
  // Match XML tags, attributes, and content
  const xmlRegex = /(<\/?[\w:]+)|(\s+[\w:]+)=(["'][^"']*["'])|([^<>]+)|([<>])/g;
  let match;
  let key = 0;
  
  while ((match = xmlRegex.exec(code))) {
    const [fullMatch, tag, attr, attrValue, content, bracket] = match;
    
    if (tag) {
      // Opening or closing tag
      elements.push(
        <span key={key++} className="text-blue-600 dark:text-blue-400 font-semibold">
          {tag}
        </span>
      );
    } else if (attr) {
      // Attribute name
      elements.push(
        <span key={key++} className="text-purple-600 dark:text-purple-400">
          {attr}
        </span>
      );
      elements.push(
        <span key={key++} className="text-zinc-500 dark:text-zinc-400">
          =
        </span>
      );
    } else if (attrValue) {
      // Attribute value
      elements.push(
        <span key={key++} className="text-emerald-600 dark:text-emerald-400">
          {attrValue}
        </span>
      );
    } else if (content && content.trim()) {
      // Text content
      elements.push(
        <span key={key++} className="text-zinc-700 dark:text-zinc-200">
          {content}
        </span>
      );
    } else if (bracket) {
      // Brackets
      elements.push(
        <span key={key++} className="text-zinc-500 dark:text-zinc-400">
          {bracket}
        </span>
      );
    } else if (fullMatch) {
      // Fallback for any unmatched content
      elements.push(
        <span key={key++} className="text-zinc-600 dark:text-zinc-300">
          {fullMatch}
        </span>
      );
    }
  }
  
  return <>{elements}</>;
};

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
            let styleClass = 'text-zinc-600 dark:text-zinc-300';
            
            if (match[1].startsWith('"')) {
                if (match[1].endsWith(':')) {
                    styleClass = 'text-blue-600 dark:text-blue-400 font-semibold';
                    const key = str.slice(0, -1);
                    elements.push(<span key={matchIndex} className={styleClass}>{key}</span>);
                    elements.push(<span key={`${matchIndex}-colon`} className="text-zinc-400 dark:text-zinc-500">:</span>);
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
            elements.push(<span key="remaining" className="text-zinc-500 dark:text-zinc-400">{code.substring(lastIndex)}</span>);
        }
        return elements;
      })()}
    </>
  );
};

// Detect if content is XML
const isXml = (str: string): boolean => {
  if (typeof str !== 'string') return false;
  const trimmed = str.trim();
  return trimmed.startsWith('<?xml') || (trimmed.startsWith('<') && trimmed.endsWith('>') && trimmed.includes('</'));
};

// Format XML with indentation
const formatXml = (xml: string): string => {
  try {
    const PADDING = '  ';
    let formatted = '';
    let indent = 0;
    
    // Remove extra whitespace between tags
    xml = xml.replace(/>\s+</g, '><').trim();
    
    // Match complete elements: opening tag + content + closing tag, or standalone tags
    const elementRegex = /<([^>?!][^>]*?)>([^<]*)<\/\1>|<[^>]+>/g;
    let match;
    let lastIndex = 0;
    
    while ((match = elementRegex.exec(xml)) !== null) {
      const fullMatch = match[0];
      
      // XML declaration or comment
      if (fullMatch.startsWith('<?') || fullMatch.startsWith('<!--')) {
        formatted += fullMatch + '\n';
      }
      // Self-closing tag
      else if (fullMatch.endsWith('/>')) {
        formatted += PADDING.repeat(indent) + fullMatch + '\n';
      }
      // Complete element with opening and closing tag
      else if (match[1]) {
        formatted += PADDING.repeat(indent) + fullMatch + '\n';
      }
      // Opening tag only (has children)
      else if (fullMatch.startsWith('<') && !fullMatch.startsWith('</')) {
        formatted += PADDING.repeat(indent) + fullMatch + '\n';
        indent++;
      }
      // Closing tag only
      else if (fullMatch.startsWith('</')) {
        indent = Math.max(0, indent - 1);
        formatted += PADDING.repeat(indent) + fullMatch + '\n';
      }
      
      lastIndex = elementRegex.lastIndex;
    }
    
    return formatted.trim();
  } catch (e) {
    console.error('XML formatting error:', e);
    // Fallback: simple line-by-line formatting
    try {
      let result = '';
      let level = 0;
      const lines = xml.replace(/>\s*</g, '>\n<').split('\n');
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        // Closing tag
        if (trimmed.startsWith('</')) {
          level = Math.max(0, level - 1);
        }
        
        result += '  '.repeat(level) + trimmed + '\n';
        
        // Opening tag (not self-closing, not closing, not xml declaration)
        if (trimmed.startsWith('<') && 
            !trimmed.startsWith('</') && 
            !trimmed.endsWith('/>') && 
            !trimmed.startsWith('<?') &&
            !trimmed.includes('</')) {
          level++;
        }
      });
      
      return result.trim();
    } catch (e2) {
      return xml;
    }
  }
};

export const JsonDisplay: React.FC<JsonDisplayProps> = ({ data, className = '' }) => {
  // Check if data is XML string
  if (typeof data === 'string' && isXml(data)) {
    const formatted = formatXml(data);
    return (
      <pre className={`font-mono text-xs whitespace-pre-wrap break-all leading-relaxed ${className}`}>
        {highlightXml(formatted)}
      </pre>
    );
  }

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
