// components/typewriter-text.tsx
// ─────────────────────────────────────────────────────────────────────────────
// The app choosing its words. One character at a time.
// Slightly irregular timing — alive, not mechanical.
//
// Props:
//   text        — the string to type
//   speed       — base ms per character (default 45)
//   jitter      — max random ms added per char (default 28)
//   startDelay  — ms before typing begins (default 0)
//   onComplete  — called when typing finishes
//   style       — text style
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react';
import { Text, TextStyle } from 'react-native';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  jitter?: number;
  startDelay?: number;
  onComplete?: () => void;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
}

export function TypewriterText({
  text,
  speed = 45,
  jitter = 28,
  startDelay = 0,
  onComplete,
  style,
  numberOfLines,
}: TypewriterTextProps) {
  const [displayed, setDisplayed] = useState('');
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indexRef  = useRef(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    indexRef.current  = 0;
    setDisplayed('');

    const typeNext = () => {
      if (!isMounted.current) return;
      if (indexRef.current >= text.length) {
        if (onComplete) onComplete();
        return;
      }

      const char = text[indexRef.current];
      indexRef.current += 1;
      setDisplayed(prev => prev + char);

      // Irregular timing — punctuation pauses, spaces breathe
      let delay = speed + Math.random() * jitter;
      if (char === '.' || char === '\n') delay += 140;
      else if (char === ',')             delay += 80;
      else if (char === ' ')             delay += 12;

      timerRef.current = setTimeout(typeNext, delay);
    };

    const startTimer = setTimeout(typeNext, startDelay);

    return () => {
      isMounted.current = false;
      clearTimeout(startTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text]);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {displayed}
    </Text>
  );
}
