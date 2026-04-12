// constants/palettes.ts
// ─────────────────────────────────────────────────────────────────────────────
// Color palettes — each defines accent colors for all four circadian phases.
// Only the accent layer changes. BASE (bg, text, surface) stays Null Black.
// ─────────────────────────────────────────────────────────────────────────────

export interface PalettePhase {
  accent:     string; // hex
  accentSoft: string; // hex — dimmer variant for soft glow
  phaseRgb:   string; // "r,g,b" — used in rgba() calls throughout
}

export interface Palette {
  id:         string;
  name:       string;
  dawn:       PalettePhase;
  day:        PalettePhase;
  goldenHour: PalettePhase;
  night:      PalettePhase;
}

// ── Ouroboros (original) ──────────────────────────────────────────────────────
// Teal dawn, bright cyan day, craving amber evening, resolve violet night.
// The palette the app was built on.
const ouroboros: Palette = {
  id:   'ouroboros',
  name: 'ouroboros',
  dawn:       { accent: '#00d4aa', accentSoft: '#007a62', phaseRgb: '0,212,170'  },
  day:        { accent: '#00ecc4', accentSoft: '#00d4aa', phaseRgb: '0,236,196'  },
  goldenHour: { accent: '#ff6b35', accentSoft: '#cc4a1a', phaseRgb: '255,107,53' },
  night:      { accent: '#8a5fe0', accentSoft: '#6b48b0', phaseRgb: '138,95,224' },
};

// ── Ocean ─────────────────────────────────────────────────────────────────────
// All-blue palette. Sky blue dawn, cyan-blue day, deep sea evening, ocean night.
// No amber — the whole day reads as open water.
const ocean: Palette = {
  id:   'ocean',
  name: 'ocean',
  dawn:       { accent: '#00b4d8', accentSoft: '#0077a8', phaseRgb: '0,180,216'  },
  day:        { accent: '#48cae4', accentSoft: '#00b4d8', phaseRgb: '72,202,228'  },
  goldenHour: { accent: '#0096c7', accentSoft: '#006d8f', phaseRgb: '0,150,199'  },
  night:      { accent: '#0077b6', accentSoft: '#004d7a', phaseRgb: '0,119,182'  },
};

// ── Turquoise ─────────────────────────────────────────────────────────────────
// Turquoise dawn and day, warm amber evening (contrast), deep navy night.
// The blue-green spectrum with warmth anchoring the threshold.
const turquoise: Palette = {
  id:   'turquoise',
  name: 'turquoise',
  dawn:       { accent: '#00c8c8', accentSoft: '#008f8f', phaseRgb: '0,200,200'   },
  day:        { accent: '#00d4ff', accentSoft: '#00a8cc', phaseRgb: '0,212,255'   },
  goldenHour: { accent: '#ff6b35', accentSoft: '#cc4a1a', phaseRgb: '255,107,53'  },
  night:      { accent: '#1e6091', accentSoft: '#144566', phaseRgb: '30,96,145'   },
};

// ── Arctic ────────────────────────────────────────────────────────────────────
// Sky blue throughout. Pale dawn, bright day, warm amber evening, electric indigo night.
// Cold and clear — the sharpest signal.
const arctic: Palette = {
  id:   'arctic',
  name: 'arctic',
  dawn:       { accent: '#0ea5e9', accentSoft: '#0284c7', phaseRgb: '14,165,233'  },
  day:        { accent: '#38bdf8', accentSoft: '#0ea5e9', phaseRgb: '56,189,248'  },
  goldenHour: { accent: '#ff6b35', accentSoft: '#cc4a1a', phaseRgb: '255,107,53'  },
  night:      { accent: '#4f46e5', accentSoft: '#3730a3', phaseRgb: '79,70,229'   },
};

// ── Registry ──────────────────────────────────────────────────────────────────
export const PALETTES: Record<string, Palette> = {
  ouroboros,
  ocean,
  turquoise,
  arctic,
};

export const PALETTE_ORDER = ['ouroboros', 'ocean', 'turquoise', 'arctic'] as const;
export type PaletteId = typeof PALETTE_ORDER[number];

export const DEFAULT_PALETTE_ID: PaletteId = 'ouroboros';
