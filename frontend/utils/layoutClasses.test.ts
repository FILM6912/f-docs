import { describe, expect, it } from 'vitest';
import { jsonEditorShellClass } from './layoutClasses';

describe('jsonEditorShellClass', () => {
  it('allows the editor body to scroll vertically', () => {
    expect(jsonEditorShellClass).toMatch(/overflow-y-auto/);
  });

  it('can shrink inside a flex column so overflow scrolling activates', () => {
    expect(jsonEditorShellClass).toMatch(/min-h-0/);
  });

  it('does not clip overflowing editor content', () => {
    expect(jsonEditorShellClass).not.toMatch(/overflow-hidden/);
  });
});
