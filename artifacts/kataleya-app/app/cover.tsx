import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';

function useClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function CoverScreen() {
  const router = useRouter();
  const time = useClock();
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hours = time.getHours();
  const minutes = time.getMinutes();
  const seconds = time.getSeconds();
  const isAM = hours < 12;
  const h12 = hours % 12 || 12;
  const day = time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const handleTap = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);

    if (tapCount.current >= 3) {
      tapCount.current = 0;
      router.back();
      return;
    }

    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 800);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.clockArea}
        onPress={handleTap}
        activeOpacity={1}
        accessible={false}
      >
        <Text style={styles.dayText}>{day}</Text>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>
            {pad(h12)}:{pad(minutes)}
          </Text>
          <View style={styles.ampmCol}>
            <Text style={[styles.ampm, { opacity: isAM ? 1 : 0.25 }]}>AM</Text>
            <Text style={[styles.ampm, { opacity: !isAM ? 1 : 0.25 }]}>PM</Text>
          </View>
        </View>

        <Text style={styles.seconds}>{pad(seconds)}</Text>

        <View style={styles.divider} />

        <Text style={styles.label}>Focus Timer</Text>
        <Text style={styles.sublabel}>Tap three times to return</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clockArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  dayText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 13,
    color: '#666666',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  timeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 72,
    color: '#e0e0e0',
    fontWeight: '100',
    letterSpacing: -2,
    lineHeight: 80,
  },
  ampmCol: {
    paddingTop: 14,
    gap: 2,
  },
  ampm: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 11,
    color: '#888888',
    letterSpacing: 1,
  },
  seconds: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 18,
    color: '#444444',
    letterSpacing: 3,
  },
  divider: {
    width: 40,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#333333',
    marginVertical: 8,
  },
  label: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 12,
    color: '#555555',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  sublabel: {
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    fontSize: 9,
    color: '#333333',
    letterSpacing: 1,
    marginTop: 4,
  },
});
