import { useState, useEffect, useCallback } from 'react';
import { Surface } from '@/utils/storage';

export interface Milestone {
  days: number;
  label: string;
  achieved: boolean;
}

export interface SobrietyState {
  startDate: string | null;
  daysSober: number;
  hoursSober: number;
  minutesSober: number;
  secondsSober: number;
  totalSeconds: number;
  milestones: Milestone[];
  nextMilestone: Milestone | null;
  progressToNext: number;
  loaded: boolean;
}

const MILESTONES = [
  { days: 1, label: 'First Day' },
  { days: 7, label: 'One Week' },
  { days: 14, label: 'Two Weeks' },
  { days: 30, label: 'One Month' },
  { days: 60, label: 'Two Months' },
  { days: 90, label: 'Three Months' },
  { days: 180, label: 'Six Months' },
  { days: 365, label: 'One Year' },
  { days: 730, label: 'Two Years' },
  { days: 1826, label: 'Five Years' },
];

function computeState(startDate: string | null): Omit<SobrietyState, 'loaded'> {
  const milestones = MILESTONES.map(m => ({ ...m, achieved: false }));

  if (!startDate) {
    return {
      startDate: null,
      daysSober: 0,
      hoursSober: 0,
      minutesSober: 0,
      secondsSober: 0,
      totalSeconds: 0,
      milestones,
      nextMilestone: milestones[0],
      progressToNext: 0,
    };
  }

  const diffMs = Math.max(0, Date.now() - new Date(startDate).getTime());
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  const achieved = milestones.map(m => ({ ...m, achieved: totalDays >= m.days }));
  const next = achieved.find(m => !m.achieved) ?? null;
  const prevDays = achieved.filter(m => m.achieved).slice(-1)[0]?.days ?? 0;
  const progressToNext = next
    ? Math.min(1, (totalDays - prevDays) / (next.days - prevDays))
    : 1;

  return {
    startDate,
    daysSober: totalDays,
    hoursSober: totalHours % 24,
    minutesSober: totalMinutes % 60,
    secondsSober: totalSeconds % 60,
    totalSeconds,
    milestones: achieved,
    nextMilestone: next,
    progressToNext,
  };
}

export function useSobriety() {
  const [startDate, setStartDateState] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sobriety, setSobriety] = useState<SobrietyState>({ ...computeState(null), loaded: false });

  useEffect(() => {
    Surface.getSobrietyStart().then(date => {
      setStartDateState(date);
      setSobriety({ ...computeState(date), loaded: true });
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSobriety({ ...computeState(startDate), loaded: true });
    }, 1000);
    return () => clearInterval(interval);
  }, [startDate]);

  const setStartDate = useCallback(async (date: string) => {
    await Surface.setSobrietyStart(date);
    setStartDateState(date);
    setSobriety({ ...computeState(date), loaded: true });
  }, []);

  const reset = useCallback(async () => {
    await Surface.clearSobrietyStart();
    setStartDateState(null);
    setSobriety({ ...computeState(null), loaded: true });
  }, []);

  return { sobriety, setStartDate, reset };
}
