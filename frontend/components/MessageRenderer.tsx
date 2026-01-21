import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { JsonDisplay } from './JsonDisplay';

interface MessageRendererProps {
  content: string;
}

export const MessageRenderer: React.FC<MessageRendererProps> = React.memo(({ content }) => {
  const parsedJson = useMemo(() => {
    try {
      const trimmed = content.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        return JSON.parse(trimmed);
      }
      return null;
    } catch {
      return null;
    }
  }, [content]);

  if (parsedJson) {
    return (
      <div className="bg-slate-50 dark:bg-slate-950 rounded p-2 border border-slate-200 dark:border-slate-800">
        <JsonDisplay data={parsedJson} />
      </div>
    );
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          pre: ({ node, ...props }) => (
            <div className="not-prose bg-slate-100 dark:bg-slate-800 rounded p-2 my-2 overflow-x-auto">
              <pre {...props} className="text-xs font-mono" />
            </div>
          ),
          code: ({ node, ...props }) => (
            <code {...props} className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-xs font-mono text-purple-600 dark:text-purple-400" />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
