// utils/mood-event.ts
// Minimal pub/sub for the mood-logged signal.
// When journal.tsx saves a mood, it emits here.
// useResponsiveHeart subscribes and recalculates immediately.
// No external dependencies. Module-level singleton — safe in RN.

type Listener = () => void;

const listeners = new Set<Listener>();

export const moodEvents = {
  emit(): void {
    listeners.forEach(fn => fn());
  },

  subscribe(fn: Listener): () => void {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
