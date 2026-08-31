/** Outer pin so the pane has a real box; inner editor must grow, not lock to 100%. */
export const jsonEditorFrameClass = 'relative w-full h-full min-h-0';

/** Scrollport: bounded by the frame, not by the JSON height. */
export const jsonEditorShellClass =
  'absolute inset-0 overflow-y-auto custom-scrollbar font-mono text-xs';

/** react-simple-code-editor root — must grow with content, never h-full/min-h-full. */
export const jsonEditorInnerClass = 'font-mono text-xs';
