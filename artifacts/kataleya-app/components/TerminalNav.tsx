// components/TerminalNav.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Command palette navigation. Replaces the tab bar in Phosphor Noir mode.
// User types commands; the terminal responds and routes. Cursor blinks at
// classic 530ms. History scrolls up as commands accumulate.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  Pressable, Keyboard,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { PHOSPHOR, COMMANDS, HELP_LINES } from '@/constants/phosphor-noir';

interface HistoryLine {
  text: string;
  type: 'input' | 'response' | 'error' | 'system';
}

const BOOT_LINES: HistoryLine[] = [
  { text: 'kataleya_os v2.5', type: 'system' },
  { text: 'privacy engine: online', type: 'system' },
  { text: 'type "help" for commands', type: 'system' },
];

export function TerminalNav() {
  const [history, setHistory]   = useState<HistoryLine[]>(BOOT_LINES);
  const [input, setInput]       = useState('');
  const [inputActive, setInputActive] = useState(false);
  const scrollRef  = useRef<ScrollView>(null);
  const inputRef   = useRef<TextInput>(null);
  const router     = useRouter();
  const cursorAnim = useSharedValue(1);

  // Cursor blink
  useEffect(() => {
    cursorAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: PHOSPHOR.blinkMs }),
        withTiming(0, { duration: PHOSPHOR.blinkMs }),
      ),
      -1,
      false,
    );
  }, []);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorAnim.value,
  }));

  const addLine = useCallback((line: HistoryLine) => {
    setHistory(prev => [...prev, line]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, []);

  const handleSubmit = useCallback(() => {
    const cmd = input.trim().toLowerCase();
    if (!cmd) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addLine({ text: `> ${input.trim()}`, type: 'input' });
    setInput('');

    if (cmd === '__clear__' || cmd === 'clear') {
      setHistory([{ text: 'terminal cleared', type: 'system' }]);
      return;
    }

    if (cmd === '__help__' || cmd === 'help') {
      HELP_LINES.forEach((l, i) => {
        setTimeout(() => addLine({ text: l, type: 'response' }), i * 60);
      });
      return;
    }

    const target = COMMANDS[cmd];
    if (target) {
      addLine({ text: `navigating to ${cmd}...`, type: 'response' });
      setTimeout(() => router.push(target as any), 300);
    } else {
      addLine({ text: `unknown command: "${cmd}"`, type: 'error' });
      addLine({ text: 'type "help" for commands', type: 'system' });
    }
  }, [input, addLine, router]);

  const lineColor = (type: HistoryLine['type']) => {
    switch (type) {
      case 'input':    return PHOSPHOR.green;
      case 'response': return PHOSPHOR.greenDim;
      case 'error':    return PHOSPHOR.amber;
      case 'system':   return PHOSPHOR.greenGhost;
    }
  };

  return (
    <Pressable style={styles.container} onPress={() => inputRef.current?.focus()}>
      {/* History */}
      <ScrollView
        ref={scrollRef}
        style={styles.history}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {history.map((line, i) => (
          <Text
            key={i}
            style={[
              styles.line,
              {
                color: lineColor(line.type),
                textShadowColor: lineColor(line.type),
                textShadowRadius: line.type === 'input' ? 3 : 1,
                opacity: line.type === 'system' ? 0.5 : 1,
              },
            ]}
          >
            {line.text}
          </Text>
        ))}
      </ScrollView>

      {/* Input row */}
      <View style={styles.inputRow}>
        <Text style={[styles.prompt, { color: PHOSPHOR.green, textShadowColor: PHOSPHOR.green }]}>
          {'> '}
        </Text>
        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSubmit}
          onFocus={() => setInputActive(true)}
          onBlur={() => setInputActive(false)}
          style={[styles.input, { color: PHOSPHOR.green }]}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="go"
          caretHidden
          placeholderTextColor={PHOSPHOR.greenGhost}
        />
        {/* Block cursor */}
        <Animated.View style={[styles.cursor, cursorStyle, { backgroundColor: PHOSPHOR.cursor }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 12,
    justifyContent: 'flex-end',
  },
  history: {
    flex: 1,
    marginBottom: 12,
  },
  line: {
    fontFamily: 'CourierPrime',
    fontSize: 13,
    letterSpacing: 0.4,
    lineHeight: 20,
    textShadowOffset: { width: 0, height: 0 },
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: PHOSPHOR.greenGhost,
    paddingTop: 10,
  },
  prompt: {
    fontFamily: 'CourierPrime',
    fontSize: 14,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  input: {
    flex: 1,
    fontFamily: 'CourierPrime',
    fontSize: 14,
    letterSpacing: 0.5,
    padding: 0,
    textShadowColor: PHOSPHOR.green,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
  cursor: {
    width: 9,
    height: 16,
    marginLeft: 1,
  },
});
