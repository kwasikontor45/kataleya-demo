\`\`\`typescript  
// \============================================================  
// KATALEYA v2.1 \- COMPLETE SOURCE CODE  
// Privacy-First Circadian Recovery Companion  
// Generated: 2026-03-27  
// \============================================================

// \------------------------------------------------------------  
// 1\. CONFIGURATION & SETUP  
// \------------------------------------------------------------

// app.json  
const appConfig \= {  
  "expo": {  
    "name": "Kataleya",  
    "slug": "kataleya",  
    "version": "2.1.0",  
    "orientation": "portrait",  
    "userInterfaceStyle": "automatic",  
    "scheme": "kataleya",  
    "plugins": \[  
      "expo-router",  
      "expo-secure-store",  
      "expo-sqlite",  
      \[  
        "expo-sensors",  
        {  
          "motionPermission": "Allow Kataleya to access motion data for the orchid animation."  
        }  
      \],  
      \[  
        "expo-font",  
        {  
          "fonts": \[  
            "./assets/fonts/CourierPrime-Regular.ttf",  
            "./assets/fonts/CourierPrime-Bold.ttf",  
            "./assets/fonts/CourierPrime-Italic.ttf"  
          \]  
        }  
      \]  
    \]  
  }  
};

// package.json dependencies  
const dependencies \= {  
  "expo": "\~52.0.0",  
  "expo-router": "\~4.0.0",  
  "expo-secure-store": "\~14.0.0",  
  "expo-sqlite": "\~15.0.0",  
  "expo-haptics": "\~14.0.0",  
  "expo-notifications": "\~0.29.0",  
  "expo-linear-gradient": "\~14.0.0",  
  "expo-sensors": "\~14.0.0",  
  "expo-crypto": "\~14.0.0",  
  "expo-font": "\~12.0.0",  
  "react": "18.3.2",  
  "react-native": "0.76.5",  
  "react-native-reanimated": "\~3.16.0",  
  "react-native-gesture-handler": "\~2.20.0",  
  "react-native-svg": "15.8.0",  
  "react-native-safe-area-context": "4.12.0",  
  "react-native-screens": "\~4.1.0",  
  "@react-native-async-storage/async-storage": "1.23.1",  
  "date-fns": "^3.6.0",  
  "zustand": "^4.5.0"  
};

// \------------------------------------------------------------  
// 2\. CONSTANTS  
// \------------------------------------------------------------

// constants/circadian.ts  
export type CircadianPhase \= 'dawn' | 'day' | 'goldenHour' | 'night';

export interface PhaseConfig {  
  name: CircadianPhase;  
  startTime: string;  
  endTime: string;  
  displayName: string;  
  description: string;  
}

export const CIRCADIAN\_PHASES: Record\<CircadianPhase, PhaseConfig\> \= {  
  dawn: {  
    name: 'dawn',  
    startTime: '05:00',  
    endTime: '08:00',  
    displayName: 'dawn is breaking',  
    description: 'Gentle activation. The world wakes, so do you.',  
  },  
  day: {  
    name: 'day',  
    startTime: '08:00',  
    endTime: '17:00',  
    displayName: 'morning bloom',  
    description: 'Full presence. You have the light you need.',  
  },  
  goldenHour: {  
    name: 'goldenHour',  
    startTime: '17:00',  
    endTime: '20:00',  
    displayName: 'golden hour',  
    description: 'The threshold. Stay with me as the light changes.',  
  },  
  night: {  
    name: 'night',  
    startTime: '20:00',  
    endTime: '05:00',  
    displayName: 'midnight garden',  
    description: 'Rest now. The orchid glows in darkness.',  
  },  
};

export const TRANSITION\_WINDOW \= 30;  
export const POLLING \= {  
  REST: 60000,  
  TRANSITION: 15000,  
};

export function timeToMinutes(timeStr: string): number {  
  const \[hours, minutes\] \= timeStr.split(':').map(Number);  
  return hours \* 60 \+ minutes;  
}

export function getCurrentMinutes(): number {  
  const now \= new Date();  
  return now.getHours() \* 60 \+ now.getMinutes();  
}

export function calculateBlendRatio(phase: CircadianPhase, minutes: number): number {  
  if (phase \=== 'dawn' || phase \=== 'day') return 0;  
  if (phase \=== 'night') return 1;  
  const goldenStart \= timeToMinutes('17:00');  
  const goldenEnd \= timeToMinutes('20:00');  
  const progress \= (minutes \- goldenStart) / (goldenEnd \- goldenStart);  
  return Math.max(0, Math.min(1, progress));  
}

// constants/theme.ts  
export interface ThemeTokens {  
  bg: string;  
  surface: string;  
  surfaceHighlight: string;  
  gold: string;  
  accent: string;  
  accentSoft: string;  
  text: string;  
  textMuted: string;  
  textInverse: string;  
  success: string;  
  warning: string;  
  danger: string;  
}

export const MorningBloom: ThemeTokens \= {  
  bg: '\#faf8f5',  
  surface: '\#ffffff',  
  surfaceHighlight: '\#f5f0e8',  
  gold: '\#c8860a',  
  accent: '\#f4a261',  
  accentSoft: '\#e9c46a',  
  text: '\#2a1810',  
  textMuted: '\#8b7355',  
  textInverse: '\#faf8f5',  
  success: '\#2a9d8f',  
  warning: '\#e9c46a',  
  danger: '\#e76f51',  
};

export const MidnightGarden: ThemeTokens \= {  
  bg: '\#0e0c14',  
  surface: '\#1a1625',  
  surfaceHighlight: '\#252236',  
  gold: '\#e8c56a',  
  accent: '\#7fc9c9',  
  accentSoft: '\#9b6dff',  
  text: '\#f0e6ff',  
  textMuted: '\#a89bb8',  
  textInverse: '\#0e0c14',  
  success: '\#7fc9c9',  
  warning: '\#e8c56a',  
  danger: '\#ff6b6b',  
};

// \------------------------------------------------------------  
// 3\. STORAGE ARCHITECTURE (Three Vaults)  
// \------------------------------------------------------------

// utils/storage.ts  
import AsyncStorage from '@react-native-async-storage/async-storage';  
import \* as SecureStore from 'expo-secure-store';  
import \* as SQLite from 'expo-sqlite';

export enum DataSensitivity {  
  FORTRESS \= 'fortress',  
  SANCTUARY \= 'sanctuary',  
  SURFACE \= 'surface',  
}

type FortressKey \= 'SPONSOR\_PRIVATE\_KEY' | 'ENCRYPTION\_PASSPHRASE' | 'BACKUP\_SEED';  
type SurfaceKey \= 'HAS\_COMPLETED\_ONBOARDING' | 'LAST\_ACTIVE\_TAB' | 'NOTIFICATIONS\_ENABLED';

export const Fortress \= {  
  async set(key: FortressKey, value: string): Promise\<void\> {  
    await SecureStore.setItemAsync(key, value, {  
      keychainAccessible: SecureStore.WHEN\_UNLOCKED\_THIS\_DEVICE\_ONLY,  
    });  
  },  
  async get(key: FortressKey): Promise\<string | null\> {  
    return await SecureStore.getItemAsync(key);  
  },  
  async delete(key: FortressKey): Promise\<void\> {  
    await SecureStore.deleteItemAsync(key);  
  },  
};

export const Surface \= {  
  async set(key: SurfaceKey, value: string): Promise\<void\> {  
    await AsyncStorage.setItem(key, value);  
  },  
  async get(key: SurfaceKey): Promise\<string | null\> {  
    return await AsyncStorage.getItem(key);  
  },  
  async delete(key: SurfaceKey): Promise\<void\> {  
    await AsyncStorage.removeItem(key);  
  },  
};

let db: SQLite.SQLiteDatabase | null \= null;

export const Sanctuary \= {  
  async init(): Promise\<void\> {  
    if (db) return;  
    db \= await SQLite.openDatabaseAsync('kataleya\_sanctuary.db');  
      
    await db.execAsync(\`  
      PRAGMA journal\_mode \= WAL;  
      PRAGMA foreign\_keys \= ON;  
        
      CREATE TABLE IF NOT EXISTS mood\_logs (  
        id INTEGER PRIMARY KEY AUTOINCREMENT,  
        timestamp DATETIME DEFAULT CURRENT\_TIMESTAMP,  
        mood\_score INTEGER CHECK (mood\_score \>= 1 AND mood\_score \<= 10),  
        context TEXT,  
        circadian\_phase TEXT CHECK (circadian\_phase IN ('dawn', 'day', 'goldenHour', 'night')),  
        blend\_ratio REAL CHECK (blend\_ratio \>= 0 AND blend\_ratio \<= 1),  
        restlessness\_score REAL DEFAULT 0,  
        session\_duration\_s INTEGER DEFAULT 0,  
        is\_deleted BOOLEAN DEFAULT 0  
      );  
        
      CREATE INDEX IF NOT EXISTS idx\_mood\_time ON mood\_logs(timestamp);  
      CREATE INDEX IF NOT EXISTS idx\_mood\_phase ON mood\_logs(circadian\_phase);  
        
      CREATE TABLE IF NOT EXISTS journal\_entries (  
        id INTEGER PRIMARY KEY AUTOINCREMENT,  
        timestamp DATETIME DEFAULT CURRENT\_TIMESTAMP,  
        content TEXT NOT NULL,  
        word\_count INTEGER,  
        mood\_log\_id INTEGER,  
        FOREIGN KEY (mood\_log\_id) REFERENCES mood\_logs(id)  
      );  
        
      CREATE TABLE IF NOT EXISTS circadian\_log (  
        id INTEGER PRIMARY KEY AUTOINCREMENT,  
        timestamp DATETIME DEFAULT CURRENT\_TIMESTAMP,  
        phase TEXT,  
        blend\_ratio REAL,  
        was\_active BOOLEAN  
      );  
    \`);  
  },

  async saveMood(data: {  
    moodScore: number;  
    context?: string;  
    circadianPhase: string;  
    blendRatio: number;  
    restlessnessScore?: number;  
    sessionDuration?: number;  
  }): Promise\<number\> {  
    if (\!db) throw new Error('Sanctuary not initialized');  
      
    const result \= await db.runAsync(  
      \`INSERT INTO mood\_logs   
       (mood\_score, context, circadian\_phase, blend\_ratio, restlessness\_score, session\_duration\_s)  
       VALUES (?, ?, ?, ?, ?, ?)  
       ON CONFLICT DO UPDATE SET  
       session\_duration\_s \= MAX(session\_duration\_s, excluded.session\_duration\_s)\`,  
      \[  
        data.moodScore,  
        data.context || null,  
        data.circadianPhase,  
        data.blendRatio,  
        data.restlessnessScore || 0,  
        data.sessionDuration || 0,  
      \]  
    );  
      
    return result.lastInsertRowId;  
  },

  async getRecentMoodState(): Promise\<{  
    lastScore: number;  
    hoursSince: number;  
    avgRestlessness: number;  
    dominantPhase: string;  
  }\> {  
    if (\!db) throw new Error('Sanctuary not initialized');  
      
    const lastMood \= await db.getFirstAsync\<{  
      mood\_score: number;  
      timestamp: string;  
      restlessness\_score: number;  
      circadian\_phase: string;  
    }\>(  
      \`SELECT mood\_score, timestamp, restlessness\_score, circadian\_phase  
       FROM mood\_logs  
       WHERE is\_deleted \= 0  
       ORDER BY timestamp DESC  
       LIMIT 1\`  
    );  
      
    if (\!lastMood) {  
      return {  
        lastScore: 5,  
        hoursSince: 24,  
        avgRestlessness: 0,  
        dominantPhase: 'day',  
      };  
    }  
      
    const lastTime \= new Date(lastMood.timestamp);  
    const hoursSince \= (Date.now() \- lastTime.getTime()) / (1000 \* 60 \* 60);  
      
    const restlessnessRows \= await db.getAllAsync\<{  
      restlessness\_score: number;  
    }\>(  
      \`SELECT restlessness\_score FROM mood\_logs  
       WHERE is\_deleted \= 0  
       ORDER BY timestamp DESC  
       LIMIT 3\`  
    );  
      
    const avgRestlessness \= restlessnessRows.reduce((sum, r) \=\>   
      sum \+ (r.restlessness\_score || 0), 0  
    ) / restlessnessRows.length;  
      
    return {  
      lastScore: lastMood.mood\_score,  
      hoursSince,  
      avgRestlessness,  
      dominantPhase: lastMood.circadian\_phase,  
    };  
  },

  async exportAll(): Promise\<{  
    mood\_logs: any\[\];  
    journal\_entries: any\[\];  
    circadian\_log: any\[\];  
  }\> {  
    if (\!db) throw new Error('Sanctuary not initialized');  
      
    const \[moods, journals, circadian\] \= await Promise.all(\[  
      db.getAllAsync('SELECT \* FROM mood\_logs WHERE is\_deleted \= 0'),  
      db.getAllAsync('SELECT \* FROM journal\_entries'),  
      db.getAllAsync('SELECT \* FROM circadian\_log'),  
    \]);  
      
    return {  
      mood\_logs: moods,  
      journal\_entries: journals,  
      circadian\_log: circadian,  
    };  
  },

  async deleteAll(): Promise\<void\> {  
    if (\!db) throw new Error('Sanctuary not initialized');  
      
    await db.execAsync(\`  
      DELETE FROM mood\_logs;  
      DELETE FROM journal\_entries;  
      DELETE FROM circadian\_log;  
      VACUUM;  
    \`);  
  },  
};

// \------------------------------------------------------------  
// 4\. CORE HOOKS  
// \------------------------------------------------------------

// hooks/useCircadian.ts  
import { useEffect, useState, useCallback, useRef } from 'react';  
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';  
import { Sanctuary } from '@/utils/storage';  
import {  
  CIRCADIAN\_PHASES,  
  CircadianPhase,  
  getCurrentMinutes,  
  timeToMinutes,  
  calculateBlendRatio,  
  POLLING,  
} from '@/constants/circadian';

export function useCircadian() {  
  const \[state, setState\] \= useState({  
    phase: 'day' as CircadianPhase,  
    blend: 0,  
    nextPhase: null as CircadianPhase | null,  
    msToNextPhase: 0,  
  });  
    
  const blendValue \= useSharedValue(0);  
  const timeoutRef \= useRef\<NodeJS.Timeout | null\>(null);  
  const lastLogRef \= useRef\<number\>(0);

  const computeState \= useCallback(() \=\> {  
    const minutes \= getCurrentMinutes();  
    let phase: CircadianPhase \= 'day';  
      
    if (minutes \>= timeToMinutes('05:00') && minutes \< timeToMinutes('08:00')) {  
      phase \= 'dawn';  
    } else if (minutes \>= timeToMinutes('08:00') && minutes \< timeToMinutes('17:00')) {  
      phase \= 'day';  
    } else if (minutes \>= timeToMinutes('17:00') && minutes \< timeToMinutes('20:00')) {  
      phase \= 'goldenHour';  
    } else {  
      phase \= 'night';  
    }  
      
    const blend \= calculateBlendRatio(phase, minutes);  
      
    const now \= Date.now();  
    if (now \- lastLogRef.current \> 30 \* 60 \* 1000\) {  
      Sanctuary.init().then(() \=\> {  
        // Passive circadian logging  
      });  
      lastLogRef.current \= now;  
    }  
      
    return { phase, blend, nextPhase: null, msToNextPhase: 0 };  
  }, \[\]);

  const scheduleUpdate \= useCallback(() \=\> {  
    const current \= computeState();  
    setState(current);  
      
    blendValue.value \= withTiming(current.blend, {  
      duration: current.phase \=== 'goldenHour' ? 1000 : 500,  
      easing: Easing.inOutSine,  
    });  
      
    if (timeoutRef.current) clearTimeout(timeoutRef.current);  
      
    const isTransition \= current.phase \=== 'goldenHour';  
    const interval \= isTransition ? POLLING.TRANSITION : POLLING.REST;  
    const delay \= isTransition ? interval : 60000 \- (Date.now() % 60000);  
      
    timeoutRef.current \= setTimeout(scheduleUpdate, delay);  
  }, \[computeState, blendValue\]);

  useEffect(() \=\> {  
    Sanctuary.init().then(() \=\> scheduleUpdate());  
    return () \=\> timeoutRef.current && clearTimeout(timeoutRef.current);  
  }, \[scheduleUpdate\]);

  return {  
    phase: state.phase,  
    phaseConfig: CIRCADIAN\_PHASES\[state.phase\],  
    blend: state.blend,  
    blendValue,  
    isGoldenHour: state.phase \=== 'goldenHour',  
  };  
}

// hooks/useAnimatedTheme.ts  
import { useDerivedValue, useAnimatedStyle, interpolateColor } from 'react-native-reanimated';  
import { useCircadian } from './useCircadian';  
import { MorningBloom, MidnightGarden } from '@/constants/theme';

export function useAnimatedTheme() {  
  const { blendValue } \= useCircadian();

  const bg \= useDerivedValue(() \=\> interpolateColor(blendValue.value, \[0, 1\], \[MorningBloom.bg, MidnightGarden.bg\]));  
  const surface \= useDerivedValue(() \=\> interpolateColor(blendValue.value, \[0, 1\], \[MorningBloom.surface, MidnightGarden.surface\]));  
  const gold \= useDerivedValue(() \=\> interpolateColor(blendValue.value, \[0, 1\], \[MorningBloom.gold, MidnightGarden.gold\]));  
  const accent \= useDerivedValue(() \=\> interpolateColor(blendValue.value, \[0, 1\], \[MorningBloom.accent, MidnightGarden.accent\]));  
  const text \= useDerivedValue(() \=\> interpolateColor(blendValue.value, \[0, 1\], \[MorningBloom.text, MidnightGarden.text\]));

  return {  
    colors: { bg, surface, gold, accent, text },  
    styles: {  
      bg: useAnimatedStyle(() \=\> ({ backgroundColor: bg.value })),  
      surface: useAnimatedStyle(() \=\> ({ backgroundColor: surface.value })),  
      goldText: useAnimatedStyle(() \=\> ({ color: gold.value })),  
      accentText: useAnimatedStyle(() \=\> ({ color: accent.value })),  
      text: useAnimatedStyle(() \=\> ({ color: text.value })),  
    },  
  };  
}

// hooks/useResponsiveHeart.ts \- THE RESPONSIVE HEART  
import { useEffect, useState } from 'react';  
import { useSharedValue, withTiming, Easing } from 'react-native-reanimated';  
import { Sanctuary } from '@/utils/storage';  
import { useCircadian } from './useCircadian';

interface HeartBiometrics {  
  bpm: number;  
  inhaleMs: number;  
  holdMs: number;  
  exhaleMs: number;  
  amplitude: number;  
  opacityRange: \[number, number\];  
}

export function useResponsiveHeart() {  
  const { phase } \= useCircadian();  
  const \[biometrics, setBiometrics\] \= useState\<HeartBiometrics\>({  
    bpm: 60,  
    inhaleMs: 2000,  
    holdMs: 500,  
    exhaleMs: 2500,  
    amplitude: 0.15,  
    opacityRange: \[0.4, 0.9\],  
  });

  const opacity \= useSharedValue(0.4);  
  const scale \= useSharedValue(0.95);  
  const letterSpacing \= useSharedValue(4);

  useEffect(() \=\> {  
    let isMounted \= true;

    const calculateBiometrics \= async () \=\> {  
      await Sanctuary.init();  
      const moodState \= await Sanctuary.getRecentMoodState();  
        
      let bpm \= 50 \+ (moodState.lastScore \- 1\) \* 2.5;  
        
      if (moodState.avgRestlessness \> 0.6) bpm \+= 5;  
      if (phase \=== 'night') bpm \-= 10;  
      if (phase \=== 'goldenHour') bpm \+= 5;  
      if (moodState.hoursSince \> 6\) bpm \+= 10;  
        
      bpm \= Math.max(45, Math.min(80, bpm));  
        
      const cycleMs \= 60000 / bpm;  
      let ratios: \[number, number, number\];  
        
      if (moodState.lastScore \<= 3\) {  
        ratios \= \[0.3, 0.2, 0.5\]; // Extended exhale for comfort  
      } else if (moodState.lastScore \>= 8\) {  
        ratios \= \[0.4, 0.1, 0.5\];  
      } else {  
        ratios \= \[0.35, 0.15, 0.5\];  
      }  
        
      const inhaleMs \= cycleMs \* ratios\[0\];  
      const holdMs \= cycleMs \* ratios\[1\];  
      const exhaleMs \= cycleMs \* ratios\[2\];  
        
      let amplitude \= 0.15;  
      if (moodState.avgRestlessness \> 0.7) amplitude \= 0.08;  
      if (moodState.hoursSince \> 12\) amplitude \= 0.2;  
        
      const opacityRange: \[number, number\] \= moodState.lastScore \<= 3   
        ? \[0.3, 0.8\]   
        : \[0.5, 1.0\];  
          
      if (\!isMounted) return;  
        
      setBiometrics({ bpm, inhaleMs, holdMs, exhaleMs, amplitude, opacityRange });  
    };

    calculateBiometrics();  
    const interval \= setInterval(calculateBiometrics, 5 \* 60 \* 1000);  
      
    return () \=\> {  
      isMounted \= false;  
      clearInterval(interval);  
    };  
  }, \[phase\]);

  useEffect(() \=\> {  
    const { inhaleMs, holdMs, exhaleMs, amplitude, opacityRange } \= biometrics;  
      
    const animate \= () \=\> {  
      opacity.value \= withTiming(opacityRange\[1\], {  
        duration: inhaleMs,  
        easing: Easing.out(Easing.sin),  
      });  
      scale.value \= withTiming(1 \+ (amplitude / 2), {  
        duration: inhaleMs,  
        easing: Easing.out(Easing.sin),  
      });  
      letterSpacing.value \= withTiming(6, {  
        duration: inhaleMs,  
        easing: Easing.out(Easing.sin),  
      });  
        
      setTimeout(() \=\> {  
        opacity.value \= withTiming(opacityRange\[0\], {  
          duration: exhaleMs,  
          easing: Easing.inOut(Easing.sin),  
        });  
        scale.value \= withTiming(1 \- (amplitude / 2), {  
          duration: exhaleMs,  
          easing: Easing.inOut(Easing.sin),  
        });  
        letterSpacing.value \= withTiming(4, {  
          duration: exhaleMs,  
          easing: Easing.inOut(Easing.sin),  
        });  
      }, inhaleMs \+ holdMs);  
    };  
      
    animate();  
    const loop \= setInterval(animate, inhaleMs \+ holdMs \+ exhaleMs);  
      
    return () \=\> clearInterval(loop);  
  }, \[biometrics, opacity, scale, letterSpacing\]);

  return { opacity, scale, letterSpacing, biometrics };  
}

// \------------------------------------------------------------  
// 5\. THE KNOWLEDGE BRIDGE COMPONENT (Responsive Heart)  
// \------------------------------------------------------------

// components/KnowledgeBridge.tsx  
import React from 'react';  
import { View, Text, StyleSheet } from 'react-native';  
import Animated from 'react-native-reanimated';  
import { useResponsiveHeart } from '@/hooks/useResponsiveHeart';

export function KnowledgeBridge() {  
  const { opacity, scale, letterSpacing, biometrics } \= useResponsiveHeart();

  const animatedStyle \= {  
    opacity,  
    transform: \[{ scale }\],  
    letterSpacing,  
  };

  return (  
    \<View style={styles.container}\>  
      \<Animated.Text style={\[styles.symbol, animatedStyle\]}\>  
        ..: :..  
      \</Animated.Text\>  
        
      \<Text style={styles.bpmIndicator}\>  
        {Math.round(biometrics.bpm)} bpm · {  
          biometrics.bpm \< 55 ? 'holding' :  
          biometrics.bpm \> 70 ? 'attuned' :  
          'present'  
        }  
      \</Text\>  
    \</View\>  
  );  
}

const styles \= StyleSheet.create({  
  container: {  
    padding: 20,  
    alignItems: 'center',  
    justifyContent: 'center',  
  },  
  symbol: {  
    fontSize: 24,  
    color: '\#7fc9c9',  
    fontFamily: 'CourierPrime',  
    fontWeight: '400',  
  },  
  bpmIndicator: {  
    marginTop: 12,  
    fontFamily: 'CourierPrime',  
    fontSize: 10,  
    color: '\#7fc9c9',  
    opacity: 0.5,  
    textTransform: 'lowercase',  
  },  
});

// \------------------------------------------------------------  
// 6\. THE BURNING RITUAL  
// \------------------------------------------------------------

// components/BurningRitual.tsx  
import React, { useState, useRef } from 'react';  
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';  
import { useAnimatedTheme } from '@/hooks/useAnimatedTheme';  
import { Sanctuary } from '@/utils/storage';

type BurnReason \= 'no\_longer\_serves' | 'begin\_again' | 'not\_this\_way' | 'private' | null;

export function BurningRitual({ onComplete }: { onComplete: () \=\> void }) {  
  const { styles, colors } \= useAnimatedTheme();  
  const \[selectedReason, setSelectedReason\] \= useState\<BurnReason\>(null);  
  const \[isHolding, setIsHolding\] \= useState(false);  
  const \[progress, setProgress\] \= useState(0);  
  const holdTimer \= useRef\<NodeJS.Timeout | null\>(null);  
  const progressInterval \= useRef\<NodeJS.Timeout | null\>(null);

  const reasons \= \[  
    { id: 'no\_longer\_serves', label: 'The data no longer serves me' },  
    { id: 'begin\_again', label: 'I need to begin again' },  
    { id: 'not\_this\_way', label: 'I do not want to be known this way' },  
    { id: 'private', label: '\[No reason / Private\]' },  
  \];

  const startHold \= () \=\> {  
    setIsHolding(true);  
    setProgress(0);  
      
    progressInterval.current \= setInterval(() \=\> {  
      setProgress(p \=\> {  
        if (p \>= 100\) {  
          executeBurn();  
          return 100;  
        }  
        return p \+ 2; // 3 seconds total  
      });  
    }, 60);  
  };

  const endHold \= () \=\> {  
    setIsHolding(false);  
    if (progressInterval.current) clearInterval(progressInterval.current);  
    if (progress \< 100\) setProgress(0);  
  };

  const executeBurn \= async () \=\> {  
    await Sanctuary.deleteAll();  
    onComplete();  
  };

  return (  
    \<View style={styles.surface}\>  
      \<Text style={\[styles.text, { fontFamily: 'CourierPrime', fontSize: 18, marginBottom: 24 }\]}\>  
        Burn the Garden  
      \</Text\>  
        
      \<Text style={\[styles.text, { opacity: 0.8, marginBottom: 24 }\]}\>  
        You are about to destroy all records. This cannot be undone. We cannot recover it. No one can.  
      \</Text\>

      \<Text style={\[styles.textMuted, { marginBottom: 16 }\]}\>  
        Why are you burning?  
      \</Text\>

      {reasons.map((reason) \=\> (  
        \<TouchableOpacity  
          key={reason.id}  
          onPress={() \=\> setSelectedReason(reason.id as BurnReason)}  
          style={\[  
            styles.button,  
            selectedReason \=== reason.id && { borderColor: colors.gold.value }  
          \]}  
        \>  
          \<Text style={styles.text}\>{reason.label}\</Text\>  
        \</TouchableOpacity\>  
      ))}

      \<View style={{ marginTop: 32, alignItems: 'center' }}\>  
        \<Text style={\[styles.textMuted, { marginBottom: 12 }\]}\>  
          Hold to ignite: {Math.round(progress)}%  
        \</Text\>  
          
        \<View style={\[styles.progressBg, { width: 200 }\]}\>  
          \<Animated.View   
            style={\[  
              styles.progressFill,  
              {   
                width: \`${progress}%\`,  
                backgroundColor: isHolding ? '\#ff6b6b' : colors.gold.value  
              }  
            \]}   
          /\>  
        \</View\>

        \<TouchableOpacity  
          onPressIn={startHold}  
          onPressOut={endHold}  
          disabled={\!selectedReason}  
          style={\[  
            styles.igniteButton,  
            \!selectedReason && { opacity: 0.3 },  
            isHolding && { backgroundColor: 'rgba(255, 107, 107, 0.2)' }  
          \]}  
        \>  
          \<Text style={\[styles.text, { color: isHolding ? '\#ff6b6b' : colors.text.value }\]}\>  
            {isHolding ? 'BURNING...' : 'HOLD TO IGNITE'}  
          \</Text\>  
        \</TouchableOpacity\>  
      \</View\>

      {progress \>= 100 && (  
        \<View style={styles.burnComplete}\>  
          \<Text style={\[styles.text, { color: '\#ff6b6b', fontSize: 24 }\]}\>  
            🔥 The garden burns. 🔥  
          \</Text\>  
          \<Text style={\[styles.textMuted, { marginTop: 12 }\]}\>  
            The orchid returns to seed.  
            The soil is fresh.  
            Begin when ready.  
          \</Text\>  
        \</View\>  
      )}  
    \</View\>  
  );  
}

// \------------------------------------------------------------  
// 7\. ONBOARDING FLOW (6 Steps)  
// \------------------------------------------------------------

// app/onboarding/index.tsx  
import React, { useState } from 'react';  
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';  
import { useRouter } from 'expo-router';  
import { useAnimatedTheme } from '@/hooks/useAnimatedTheme';  
import { Surface } from '@/utils/storage';

const steps \= \[  
  'welcome',  
  'name',  
  'substance',  
  'sobriety\_date',  
  'sponsor',  
  'notifications'  
\] as const;

export default function Onboarding() {  
  const router \= useRouter();  
  const { styles, colors } \= useAnimatedTheme();  
  const \[step, setStep\] \= useState(0);  
  const \[data, setData\] \= useState({  
    name: '',  
    substance: '',  
    sobrietyDate: new Date(),  
    sponsorCode: '',  
    notifications: true,  
  });

  const completeOnboarding \= async () \=\> {  
    await Surface.set('HAS\_COMPLETED\_ONBOARDING', 'true');  
    router.replace('/(tabs)');  
  };

  const renderStep \= () \=\> {  
    switch (steps\[step\]) {  
      case 'welcome':  
        return (  
          \<View\>  
            \<Text style={\[styles.text, { fontSize: 24, marginBottom: 16 }\]}\>  
              Welcome to Kataleya  
            \</Text\>  
            \<Text style={\[styles.textMuted, { marginBottom: 24 }\]}\>  
              A sanctuary that breathes with you.  
            \</Text\>  
            \<TouchableOpacity onPress={() \=\> setStep(1)} style={styles.button}\>  
              \<Text style={styles.text}\>Begin\</Text\>  
            \</TouchableOpacity\>  
          \</View\>  
        );  
          
      case 'name':  
        return (  
          \<View\>  
            \<Text style={styles.text}\>What should we call you?\</Text\>  
            \<TextInput  
              value={data.name}  
              onChangeText={(name) \=\> setData({ ...data, name })}  
              placeholder="Name or nickname"  
              placeholderTextColor={colors.textMuted.value}  
              style={\[styles.input, { borderColor: colors.accent.value, color: colors.text.value }\]}  
            /\>  
            \<TouchableOpacity onPress={() \=\> setStep(2)} style={styles.button}\>  
              \<Text style={styles.text}\>Continue\</Text\>  
            \</TouchableOpacity\>  
          \</View\>  
        );  
          
      case 'substance':  
        return (  
          \<View\>  
            \<Text style={styles.text}\>What are you recovering from?\</Text\>  
            {\['Alcohol', 'Substances', 'Behavior', 'Other / Prefer not to say'\].map((s) \=\> (  
              \<TouchableOpacity  
                key={s}  
                onPress={() \=\> {  
                  setData({ ...data, substance: s });  
                  setStep(3);  
                }}  
                style={\[styles.button, data.substance \=== s && { borderColor: colors.gold.value }\]}  
              \>  
                \<Text style={styles.text}\>{s}\</Text\>  
              \</TouchableOpacity\>  
            ))}  
          \</View\>  
        );  
          
      case 'sobriety\_date':  
        return (  
          \<View\>  
            \<Text style={styles.text}\>When did you begin?\</Text\>  
            \<Text style={\[styles.textMuted, { marginBottom: 16 }\]}\>  
              Or select "Today" if you're beginning now.  
            \</Text\>  
            \<TouchableOpacity onPress={() \=\> setStep(4)} style={styles.button}\>  
              \<Text style={styles.text}\>Continue\</Text\>  
            \</TouchableOpacity\>  
          \</View\>  
        );  
          
      case 'sponsor':  
        return (  
          \<View\>  
            \<Text style={styles.text}\>Connect a sponsor?\</Text\>  
            \<Text style={\[styles.textMuted, { marginBottom: 16 }\]}\>  
              Optional. You can do this later.  
            \</Text\>  
            \<TextInput  
              value={data.sponsorCode}  
              onChangeText={(sponsorCode) \=\> setData({ ...data, sponsorCode })}  
              placeholder="Sponsor invite code"  
              placeholderTextColor={colors.textMuted.value}  
              style={\[styles.input, { borderColor: colors.accent.value, color: colors.text.value }\]}  
            /\>  
            \<TouchableOpacity onPress={() \=\> setStep(5)} style={styles.button}\>  
              \<Text style={styles.text}\>Continue\</Text\>  
            \</TouchableOpacity\>  
          \</View\>  
        );  
          
      case 'notifications':  
        return (  
          \<View\>  
            \<Text style={styles.text}\>Gentle reminders?\</Text\>  
            \<Text style={\[styles.textMuted, { marginBottom: 16 }\]}\>  
              Morning and evening check-ins. Never intrusive.  
            \</Text\>  
            \<TouchableOpacity onPress={completeOnboarding} style={styles.button}\>  
              \<Text style={styles.text}\>Enter Sanctuary\</Text\>  
            \</TouchableOpacity\>  
          \</View\>  
        );  
    }  
  };

  return (  
    \<View style={\[styles.bg, { flex: 1, padding: 24, justifyContent: 'center' }\]}\>  
      \<Text style={\[styles.textMuted, { marginBottom: 24 }\]}\>  
        Step {step \+ 1} of {steps.length}  
      \</Text\>  
      {renderStep()}  
    \</View\>  
  );  
}

// \------------------------------------------------------------  
// 8\. ROOT LAYOUT WITH FONT LOADING  
// \------------------------------------------------------------

// app/\_layout.tsx  
import { useEffect, useState } from 'react';  
import { useFonts } from 'expo-font';  
import { SplashScreen, Stack } from 'expo-router';  
import { useAnimatedTheme } from '@/hooks/useAnimatedTheme';

export default function RootLayout() {  
  const \[fontsLoaded\] \= useFonts({  
    'CourierPrime': require('../assets/fonts/CourierPrime-Regular.ttf'),  
    'CourierPrime-Bold': require('../assets/fonts/CourierPrime-Bold.ttf'),  
    'CourierPrime-Italic': require('../assets/fonts/CourierPrime-Italic.ttf'),  
  });

  const { styles } \= useAnimatedTheme();

  useEffect(() \=\> {  
    if (fontsLoaded) {  
      SplashScreen.hideAsync();  
    }  
  }, \[fontsLoaded\]);

  if (\!fontsLoaded) {  
    return null;  
  }

  return (  
    \<Stack  
      screenOptions={{  
        headerStyle: { backgroundColor: styles.bg.backgroundColor },  
        headerTintColor: styles.text.color,  
        contentStyle: { backgroundColor: styles.bg.backgroundColor },  
      }}  
    /\>  
  );  
}

// \------------------------------------------------------------  
// 9\. ERROR BOUNDARY  
// \------------------------------------------------------------

// components/ErrorBoundary.tsx  
import React, { Component, ReactNode } from 'react';  
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {  
  children: ReactNode;  
  fallback?: ReactNode;  
}

interface State {  
  hasError: boolean;  
  error?: Error;  
}

export class ErrorBoundary extends Component\<Props, State\> {  
  constructor(props: Props) {  
    super(props);  
    this.state \= { hasError: false };  
  }

  static getDerivedStateFromError(error: Error): State {  
    return { hasError: true, error };  
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {  
    console.error('Kataleya Error:', error, errorInfo);  
  }

  render() {  
    if (this.state.hasError) {  
      return this.props.fallback || (  
        \<View style={styles.container}\>  
          \<Text style={styles.title}\>The garden needs tending\</Text\>  
          \<Text style={styles.message}\>  
            Something unexpected happened. Your data is safe.  
          \</Text\>  
          \<TouchableOpacity   
            onPress={() \=\> this.setState({ hasError: false })}  
            style={styles.button}  
          \>  
            \<Text style={styles.buttonText}\>Return to Sanctuary\</Text\>  
          \</TouchableOpacity\>  
        \</View\>  
      );  
    }

    return this.props.children;  
  }  
}

const styles \= StyleSheet.create({  
  container: {  
    flex: 1,  
    justifyContent: 'center',  
    alignItems: 'center',  
    padding: 24,  
    backgroundColor: '\#0e0c14',  
  },  
  title: {  
    fontFamily: 'CourierPrime',  
    fontSize: 18,  
    color: '\#e8c56a',  
    marginBottom: 16,  
  },  
  message: {  
    fontFamily: 'CourierPrime',  
    fontSize: 14,  
    color: '\#a89bb8',  
    textAlign: 'center',  
    marginBottom: 24,  
  },  
  button: {  
    padding: 16,  
    borderWidth: 1,  
    borderColor: '\#7fc9c9',  
    borderRadius: 8,  
  },  
  buttonText: {  
    fontFamily: 'CourierPrime',  
    fontSize: 14,  
    color: '\#7fc9c9',  
  },  
});

// \------------------------------------------------------------  
// 10\. FILE STRUCTURE (Final)  
// \------------------------------------------------------------

/\*  
kataleya/  
├── app/  
│   ├── \_layout.tsx              \# Root with fonts \+ ErrorBoundary  
│   ├── index.tsx                \# Entry redirect  
│   ├── loading.tsx              \# Knowledge Bridge (responsive heart)  
│   ├── onboarding/  
│   │   └── index.tsx            \# 6-step flow  
│   └── (tabs)/  
│       ├── \_layout.tsx  
│       └── index.tsx  
├── components/  
│   ├── KnowledgeBridge.tsx      \# Responsive ..: :..  
│   ├── BurningRitual.tsx        \# Data destruction ceremony  
│   ├── OrchidProgress.tsx       \# SVG with sway  
│   ├── CircadianStatus.tsx      \# Phase indicator  
│   ├── SponsorPresence.tsx      \# Water/Light  
│   └── ErrorBoundary.tsx        \# Graceful failure  
├── hooks/  
│   ├── useCircadian.ts          \# Temporal engine  
│   ├── useAnimatedTheme.ts      \# UI-thread colors  
│   ├── useResponsiveHeart.ts    \# Mood-reactive BPM  
│   ├── useOrchidSway.ts         \# Accelerometer  
│   ├── useHapticBloom.ts        \# Haptic patterns  
│   └── useSecureVault.ts        \# Fortress wrapper  
├── utils/  
│   └── storage.ts               \# Three Vaults architecture  
├── constants/  
│   ├── circadian.ts             \# Phase definitions  
│   └── theme.ts                 \# Color tokens  
├── database/  
│   └── migrations/  
│       ├── 001\_initial.sql  
│       └── 002\_add\_restlessness.sql  
└── assets/  
    └── fonts/  
        ├── CourierPrime-Regular.ttf  
        ├── CourierPrime-Bold.ttf  
        └── CourierPrime-Italic.ttf  
\*/

// \============================================================  
// END KATALEYA v2.1 SOURCE CODE  
// \============================================================  
\`\`\`  
