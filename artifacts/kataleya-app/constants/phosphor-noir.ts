// constants/phosphor-noir.ts
// ─────────────────────────────────────────────────────────────────────────────
// Phosphor Noir — CRT terminal aesthetic layer
// Green phosphor on true black. Scanlines. Cursor blink. Command palette nav.
// ─────────────────────────────────────────────────────────────────────────────

export const PHOSPHOR = {
  bg:           '#000000',
  green:        '#33ff00',
  greenDim:     '#1a8000',
  greenGhost:   '#0a3d00',
  amber:        '#ffb000',
  amberDim:     '#7a5500',
  scanline:     'rgba(0,0,0,0.45)',
  cursor:       '#33ff00',
  decay:        0.92,        // phosphor persistence multiplier per trail frame
  blinkMs:      530,         // classic terminal cursor blink
  typeMs:       45,          // ms per character
  refreshHz:    60,          // simulated CRT refresh rate
};

// Terminal commands → screen routes
// Special values: '__help__' and '__clear__' are handled in TerminalNav directly.
export const COMMANDS: Record<string, string> = {
  'garden':    '/(tabs)/index',
  'cycles':    '/(tabs)/growth',
  'journal':   '/(tabs)/journal',
  'vault':     '/(tabs)/vault',
  'signal':    '/(tabs)/sponsor',
  'breathe':   '/breathe',
  'ground':    '/ground',
  'burn':      '/burn',
  'cover':     '/cover',
  'help':      '__help__',
  'clear':     '__clear__',
};

export const HELP_LINES = [
  'available commands:',
  '  garden   — sanctuary home',
  '  cycles   — growth + progress',
  '  journal  — mood + check in',
  '  vault    — privacy + burn',
  '  signal   — sponsor channel',
  '  breathe  — 4-7-8 exercise',
  '  ground   — 5-4-3-2-1 sense',
  '  burn     — rewrite ritual',
  '  cover    — 2am space',
  '  clear    — clear terminal',
];
