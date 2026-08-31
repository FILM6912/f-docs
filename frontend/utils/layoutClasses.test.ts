import { describe, expect, it } from 'vitest';
import { jsonEditorInnerClass, jsonEditorShellClass } from './layoutClasses';

describe('jsonEditorShellClass', () => {
  it('is a bounded absolute scrollport so tall content overflows the pane', () => {
    expect(jsonEditorShellClass).toMatch(/absolute/);
    expect(jsonEditorShellClass).toMatch(/inset-0/);
    expect(jsonEditorShellClass).toMatch(/overflow-y-auto/);
  });

  it('does not clip overflowing editor content', () => {
    expect(jsonEditorShellClass).not.toMatch(/overflow-hidden/);
  });
});

describe('jsonEditorInnerClass', () => {
  it('lets react-simple-code-editor grow with the JSON instead of locking to 100% height', () => {
    expect(jsonEditorInnerClass).not.toMatch(/min-h-full/);
    expect(jsonEditorInnerClass).not.toMatch(/(?:^|\s)h-full(?:\s|$)/);
  });
});
