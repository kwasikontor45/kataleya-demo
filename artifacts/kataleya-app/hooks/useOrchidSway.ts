'use no memo';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

export interface SwayState {
  x: number;
  y: number;
  source: 'sensor' | 'breath' | 'idle';
  /**
   * 0.0–1.0 restlessness score derived from accelerometer movement.
   * RMS of raw accel delta magnitudes over a 5-second rolling window,
   * normalized to [0,1] where 2.0 m/s² (≈ 0.204 g) maps to 1.0.
   * Always 0 in breath-fallback mode or when accelerometer is unavailable.
   */
  restlessnessScore: number;
}

const BREATH_INTERVAL = 40;    // ms — ~25fps, light on battery
const WINDOW_SIZE    = 100;    // samples — 5 s at 50 ms interval
const MAX_DELTA      = 0.204;  // 2.0 m/s² ÷ 9.81 m/s²/g ≈ 0.204 g

function breathValue(t: number) {
  // Two overlapping sine waves: primary sway + secondary drift
  const primary   = Math.sin(t / 5800) * 8;         // 5.8s period, ±8 units
  const secondary = Math.sin(t / 9200 + 1.1) * 3;   // 9.2s period, ±3 units
  const yDrift    = Math.sin(t / 7400 + 0.4) * 3;   // vertical gentle bob
  return { x: primary + secondary, y: yDrift };
}

export function useOrchidSway(): SwayState {
  const [sway, setSway] = useState<SwayState>({ x: 0, y: 0, source: 'idle', restlessnessScore: 0 });
  const subRef      = useRef<{ remove: () => void } | null>(null);
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef    = useRef<number>(Date.now());

  // Rolling window for restlessness computation
  const deltaBuffer = useRef<number[]>([]);
  const lastAccel   = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let active = true;

    function startBreathFallback() {
      if (!active) return;
      startRef.current = Date.now();
      timerRef.current = setInterval(() => {
        if (!active) return;
        const elapsed = Date.now() - startRef.current;
        const { x, y } = breathValue(elapsed);
        setSway({ x, y, source: 'breath', restlessnessScore: 0 });
      }, BREATH_INTERVAL);
    }

    const setup = async () => {
      if (Platform.OS === 'web') {
        startBreathFallback();
        return;
      }

      try {
        const { Accelerometer } = await import('expo-sensors');

        const available = await Accelerometer.isAvailableAsync();
        if (!available) {
          startBreathFallback();
          return;
        }

        Accelerometer.setUpdateInterval(50);
        subRef.current = Accelerometer.addListener(({ x, y }) => {
          if (!active) return;
          const clamp = (v: number, lo: number, hi: number) =>
            Math.min(hi, Math.max(lo, v));

          // ── Restlessness: RMS of per-sample delta magnitudes ─────────────
          // Delta = change in raw accelerometer vector between consecutive readings.
          // RMS over the rolling window, then normalized to [0,1] by MAX_DELTA.
          let restlessnessScore = 0;
          if (lastAccel.current) {
            const dx       = x - lastAccel.current.x;
            const dy       = y - lastAccel.current.y;
            const deltaMag = Math.sqrt(dx * dx + dy * dy);
            const buf      = deltaBuffer.current;
            buf.push(deltaMag);
            if (buf.length > WINDOW_SIZE) buf.shift();
            const rms = Math.sqrt(buf.reduce((s, d) => s + d * d, 0) / buf.length);
            restlessnessScore = Math.min(1, rms / MAX_DELTA);
          }
          lastAccel.current = { x, y };

          setSway({
            x: clamp(x * 12, -14, 14),
            y: clamp(y * 5, -7, 7),
            source: 'sensor',
            restlessnessScore,
          });
        });
      } catch {
        // Module load failed or permission denied — breathe instead
        startBreathFallback();
      }
    };

    setup();

    return () => {
      active = false;
      subRef.current?.remove();
      subRef.current = null;
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return sway;
}
