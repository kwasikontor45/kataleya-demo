export type CircadianPhase = 'dawn' | 'day' | 'goldenHour' | 'night';

export interface PhaseConfig {
  name: CircadianPhase;
  displayName: string;
  description: string;
}

export const CIRCADIAN_PHASES: Record<CircadianPhase, PhaseConfig> = {
  dawn: {
    name: 'dawn',
    displayName: 'dawn is breaking',
    description: 'Gentle activation. The world wakes, so do you.',
  },
  day: {
    name: 'day',
    displayName: 'morning bloom',
    description: 'Full presence. You have the light you need.',
  },
  goldenHour: {
    name: 'goldenHour',
    displayName: 'golden hour',
    description: 'The threshold. Stay with me as the light changes.',
  },
  night: {
    name: 'night',
    displayName: 'midnight garden',
    description: 'Rest now. The orchid glows in darkness.',
  },
};

export const TRANSITION_WINDOW = 30;
export const TAB_BAR_HEIGHT = 60;

export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

export function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

export function msUntilNextMinute(): number {
  const now = new Date();
  return (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
}

export function calculateBlendRatio(minutes: number): number {
  const DAWN_START = timeToMinutes('05:00');
  const DAY_START = timeToMinutes('08:00');
  const GOLDEN_START = timeToMinutes('17:00');
  const NIGHT_START = timeToMinutes('20:00');
  const NIGHT_END = timeToMinutes('24:00');
  const DAWN_PRE = timeToMinutes('04:30');

  const ease = (t: number) => t * t * (3 - 2 * t);

  if (minutes >= DAWN_PRE && minutes < DAWN_START) {
    const t = (minutes - DAWN_PRE) / TRANSITION_WINDOW;
    return ease(1 - Math.min(1, t));
  }

  if (minutes >= DAWN_START && minutes < DAY_START) {
    return 0;
  }

  if (minutes >= DAY_START && minutes < GOLDEN_START) {
    return 0;
  }

  if (minutes >= GOLDEN_START && minutes < NIGHT_START) {
    const t = (minutes - GOLDEN_START) / (NIGHT_START - GOLDEN_START);
    return ease(Math.min(1, t));
  }

  if (minutes >= NIGHT_START) {
    return 1;
  }

  if (minutes < DAWN_PRE) {
    return 1;
  }

  return 1;
}

export function getCurrentPhase(minutes: number): CircadianPhase {
  const DAWN_START = timeToMinutes('05:00');
  const DAY_START = timeToMinutes('08:00');
  const GOLDEN_START = timeToMinutes('17:00');
  const NIGHT_START = timeToMinutes('20:00');

  if (minutes >= DAWN_START && minutes < DAY_START) return 'dawn';
  if (minutes >= DAY_START && minutes < GOLDEN_START) return 'day';
  if (minutes >= GOLDEN_START && minutes < NIGHT_START) return 'goldenHour';
  return 'night';
}

export function isInTransition(minutes: number): boolean {
  const DAWN_PRE = timeToMinutes('04:30');
  const DAWN_START = timeToMinutes('05:00');
  const GOLDEN_START = timeToMinutes('17:00');
  const NIGHT_START = timeToMinutes('20:00');

  if (minutes >= DAWN_PRE && minutes < DAWN_START) return true;
  if (minutes >= GOLDEN_START && minutes < NIGHT_START) return true;
  return false;
}
