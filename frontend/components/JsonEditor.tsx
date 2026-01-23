import React, { useState } from 'react';
import Editor from 'react-simple-code-editor';
import { highlightJson } from './JsonDisplay';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({ 
  value, 
  onChange, 
  className = '',
  placeholder
}) => {
  return (
    <div className={`relative w-full h-full flex flex-col font-mono text-xs bg-zinc-50 dark:bg-zinc-900 overflow-hidden ${className}`}>
      <Editor
        value={value}
        onValueChange={onChange}
        highlight={code => highlightJson(code)}
        padding={12}
        placeholder={placeholder}
        className="font-mono text-xs min-h-full"
        textareaClassName="focus:outline-none"
        style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
          fontSize: 12,
          minHeight: '100%',
        }}
      />
    </div>
  );
};
