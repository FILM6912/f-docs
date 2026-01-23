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
      <div className="bg-zinc-50 dark:bg-zinc-950 rounded p-2 border border-zinc-200 dark:border-zinc-800">
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
            <div className="not-prose bg-zinc-100 dark:bg-zinc-800 rounded p-2 my-2 overflow-x-auto">
              <pre {...props} className="text-xs font-mono" />
            </div>
          ),
          code: ({ node, ...props }) => (
            <code {...props} className="bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded text-xs font-mono text-blue-600 dark:text-blue-400" />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
