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
export const COMMANDS: Record<string, string> = {
  'garden':    '/(tabs)/index',
  'cycles':    '/(tabs)/growth',
  'journal':   '/(tabs)/journal',
  'vault':     '/(tabs)/vault',
  'signal':    '/(tabs)/sponsor',
  'breathe':   '/breathe',
  'burn':      '/burn',
  'cover':     '/cover',
  'help':      '__help__',
  'clear':     '__clear__',
};

export const HELP_LINES = [
  'available commands:',
  '  garden   — sanctuary home',
  '  cycles   — growth + streaks',
  '  journal  — mood + check in',
  '  vault    — privacy + burn',
  '  signal   — sponsor channel',
  '  breathe  — 4-7-8 exercise',
  '  burn     — rewrite ritual',
  '  clear    — clear terminal',
];
