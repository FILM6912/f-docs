import React from 'react';
import Editor from 'react-simple-code-editor';
import { highlightJson } from './JsonDisplay';
import { jsonEditorShellClass } from '../utils/layoutClasses';

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
    <div className={`${jsonEditorShellClass} bg-zinc-50 dark:bg-zinc-900 ${className}`}>
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
