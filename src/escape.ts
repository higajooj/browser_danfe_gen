const MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/** Escape text coming from the XML before it is placed in the HTML output. */
export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (c) => MAP[c] as string)
}
