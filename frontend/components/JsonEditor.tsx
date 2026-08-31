import React from 'react';
import Editor from 'react-simple-code-editor';
import { highlightJson } from './JsonDisplay';
import {
  jsonEditorFrameClass,
  jsonEditorInnerClass,
  jsonEditorShellClass,
} from '../utils/layoutClasses';

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
  placeholder,
}) => {
  return (
    <div className={`${jsonEditorFrameClass} bg-zinc-50 dark:bg-zinc-900 ${className}`}>
      <div className={jsonEditorShellClass} data-testid="json-editor-scroll">
        <Editor
          value={value}
          onValueChange={onChange}
          highlight={(code) => highlightJson(code)}
          padding={12}
          placeholder={placeholder}
          className={jsonEditorInnerClass}
          textareaClassName="focus:outline-none"
          style={{
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 12,
          }}
        />
      </div>
    </div>
  );
};
