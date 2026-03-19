// Using system fonts to avoid Google Fonts network dependency during build.
// TODO: replace with local font files if custom fonts are needed.

export const fontVariables = [
  '--font-sans: system-ui, -apple-system, sans-serif',
  '--font-mono: ui-monospace, "Cascadia Code", monospace'
].join(';');
