import React from 'react';
import { JsonDisplay } from './JsonDisplay';

interface MarkdownDisplayProps {
  content: string;
  className?: string;
}

export const MarkdownDisplay: React.FC<MarkdownDisplayProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Inline parser: Bold, Italic, Code, Link
  const parseInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*(.*?)\*\*|\*(.*?)\*|`(.*?)`|\[(.*?)\]\((.*?)\))/g;
    
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text))) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      if (match[1].startsWith('**')) { // Bold
        parts.push(<strong key={match.index} className="font-bold text-amber-200">{match[2]}</strong>);
      } else if (match[1].startsWith('`')) { // Code
        parts.push(<code key={match.index} className="bg-slate-800/80 px-1.5 py-0.5 rounded text-xs font-mono text-pink-300 border border-slate-700/50">{match[4]}</code>);
      } else if (match[1].startsWith('[')) { // Link
        parts.push(<a key={match.index} href={match[6]} target="_blank" rel="noreferrer" className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors">{match[5]}</a>);
      } else { // Italic
        parts.push(<em key={match.index} className="italic text-emerald-200/80">{match[3]}</em>);
      }
      
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    if (parts.length === 0) return [text];
    return parts;
  };

  // Block parser
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className={`text-slate-300 text-sm leading-relaxed space-y-3 ${className}`}>
      {parts.map((part, index) => {
        if (part.startsWith('```')) {
          // Render Code Block
          const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
          if (match) {
             const lang = (match[1] || 'text').toLowerCase();
             const code = match[2].trim();
             
             // Special handling for JSON blocks to use syntax highlighting
             if (lang === 'json') {
                 let jsonData = null;
                 try {
                     jsonData = JSON.parse(code);
                 } catch(e) {
                     // If invalid json, just render as text
                 }
                 
                 if (jsonData) {
                     return (
                         <div key={index} className="bg-slate-950 rounded-md border border-slate-800 p-3 overflow-x-auto my-3 shadow-inner relative group">
                             <div className="flex justify-between items-center mb-1 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                <span>{lang}</span>
                             </div>
                             <JsonDisplay data={jsonData} />
                         </div>
                     );
                 }
             }

             return (
               <div key={index} className="bg-slate-950 rounded-md border border-slate-800 p-3 overflow-x-auto my-3 shadow-inner relative group">
                 <div className="flex justify-between items-center mb-1 text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    <span>{lang}</span>
                 </div>
                 <pre className="font-mono text-xs text-blue-100/90 whitespace-pre">{code}</pre>
               </div>
             );
          }
          return null;
        } else {
           // Helper to process lines for lists
           const lines = part.split('\n');
           const nodes: React.ReactNode[] = [];
           let inList = false;
           let listItems: React.ReactNode[] = [];

           lines.forEach((line, i) => {
              const trimmed = line.trim();
              if(!trimmed && !inList) return; 

              // Header
              if (trimmed.startsWith('#')) {
                  if (inList) {
                      nodes.push(<ul key={`list-${index}-${i}`} className="list-disc list-outside ml-4 space-y-1 mb-3 text-slate-300">{listItems}</ul>);
                      inList = false;
                      listItems = [];
                  }
                  const match = trimmed.match(/^(#+)\s+(.*)/);
                  if (match) {
                      const level = match[1].length;
                      const text = match[2];
                      
                      // Colorful Headers
                      let headerClass = '';
                      let Tag: React.ElementType = 'h4';
                      
                      switch(level) {
                          case 1: 
                              Tag = 'h1';
                              headerClass = 'text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 border-b border-slate-700/50 pb-1';
                              break;
                          case 2:
                              Tag = 'h2';
                              headerClass = 'text-base font-bold text-indigo-300';
                              break;
                          case 3:
                              Tag = 'h3'; 
                              headerClass = 'text-sm font-bold text-emerald-300';
                              break;
                          default:
                              Tag = 'h4';
                              headerClass = 'text-xs font-bold text-slate-400 uppercase tracking-wide';
                              break;
                      }

                      nodes.push(<Tag key={`h-${index}-${i}`} className={`${headerClass} mt-5 mb-2 first:mt-0`}>{parseInline(text)}</Tag>);
                      return;
                  }
              }

              // List
              if (trimmed.match(/^(\*|-)\s/)) {
                  if (!inList) inList = true;
                  listItems.push(<li key={`li-${index}-${i}`} className="pl-1 marker:text-slate-600">{parseInline(trimmed.substring(2))}</li>);
                  return;
              }

              // End List if we were in one
              if (inList) {
                  nodes.push(<ul key={`list-${index}-${i}`} className="list-disc list-outside ml-4 space-y-1 mb-3 text-slate-300">{listItems}</ul>);
                  inList = false;
                  listItems = [];
              }

              // Blockquotes
              if (trimmed.startsWith('> ')) {
                  nodes.push(<blockquote key={`bq-${index}-${i}`} className="border-l-4 border-amber-500/50 pl-4 py-2 my-2 text-amber-200/80 italic bg-amber-950/10 rounded-r">{parseInline(trimmed.substring(2))}</blockquote>);
                  return;
              }

              // Normal Paragraph
              if (trimmed) {
                  nodes.push(<p key={`p-${index}-${i}`} className="mb-2 last:mb-0 text-slate-300 leading-relaxed">{parseInline(line)}</p>);
              }
           });
           
           if (inList) {
               nodes.push(<ul key={`list-${index}-end`} className="list-disc list-outside ml-4 space-y-1 mb-3 text-slate-300">{listItems}</ul>);
           }

           return <div key={index}>{nodes}</div>;
        }
      })}
    </div>
  );
};
