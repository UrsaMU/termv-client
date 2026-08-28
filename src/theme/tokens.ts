/** termv-template colors. Flip to `'goon'` for the old street pack. */
export const PALETTE = 'termv' as const;

export const goon = {
  bg: '#04090A',
  panel: '#08191A',
  line: '#14514C',
  dimLine: '#0E3230',
  phosphor: '#31DED2',
  text: '#C9FFFA',
  mid: '#5FC9C2',
  dim: '#2F9C95',
  ink: '#04090A',
  alert: '#FF4D7D',
  key: '#1D7D76',
  keyPress: '#1D9A92',
  glow: '#7FE9E0',
} as const;

/** termv-template (`../termv-template`): indigo field, cyan primary `#5FDAFF`, JACK_IN teal `#39869D`. */
export const termv = {
  bg: '#0F0C23',
  panel: '#12102A',
  line: '#61689E',
  dimLine: '#2F366C',
  phosphor: '#5FDAFF',
  text: '#FFFFFF',
  mid: '#8AE8FF',
  dim: '#61689E',
  ink: '#0F0C23',
  alert: '#FF8A8F',
  key: '#39869D',
  keyPress: '#5FDAFF',
  glow: '#8AE8FF',
} as const;

export const palettes = { goon, termv } as const;

export const colors = palettes[PALETTE];

export const fonts = {
  mono: '"Share Tech Mono", "Courier New", monospace',
} as const;

export const space = {
  row: 12,
  tap: 44,
} as const;
