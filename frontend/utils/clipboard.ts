/**
 * Copies text to the clipboard using the Clipboard API if available,
 * or falls back to execCommand for older browsers/non-secure contexts.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Try the modern Clipboard API first (requires secure context like HTTPS or localhost)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, falling back to textarea method', err);
    }
  }

  // Fallback: Create a temporary textarea element
  const textArea = document.createElement("textarea");
  textArea.value = text;
  
  // Ensure the textarea is not visible but part of the DOM
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  textArea.style.top = "0";
  document.body.appendChild(textArea);
  
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Fallback copy method failed', err);
    document.body.removeChild(textArea);
    return false;
  }
}
