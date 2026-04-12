// components/TerminalNav.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { PHOSPHOR, HELP_LINES } from '@/constants/phosphor-noir';

interface HistoryLine {
  text: string;
  type: 'input' | 'response' | 'error' | 'system';
}

// Valid routes in the app
const ROUTES: Record<string, string> = {
  'garden':  '/(tabs)/index',
  'cycles':  '/(tabs)/growth',
  'journal': '/(tabs)/journal',
  'vault':   '/(tabs)/vault',
  'signal':  '/(tabs)/sponsor',
  'burn':    '/burn',
  'cover':   '/cover',
};

const BOOT_LINES: HistoryLine[] = [
  { text: 'kataleya_os v2.5', type: 'system' },
  { text: 'privacy engine: online', type: 'system' },
  { text: 'blind relay: standing by', type: 'system' },
  { text: '', type: 'system' },
  { text: 'type "help" for commands', type: 'system' },
];

export function TerminalNav() {
  const [history, setHistory]   = useState<HistoryLine[]>(BOOT_LINES);
  const [input, setInput]       = useState('');
  const scrollRef  = useRef<ScrollView>(null);
  const inputRef   = useRef<TextInput>(null);
  const router     = useRouter();
  const insets     = useSafeAreaInsets();
  const cursorAnim = useSharedValue(1);

  useEffect(() => {
    cursorAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: PHOSPHOR.blinkMs }),
        withTiming(0, { duration: PHOSPHOR.blinkMs }),
      ),
      -1,
      false,
    );
    // Auto-focus on mount
    setTimeout(() => inputRef.current?.focus(), 400);
  }, []);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorAnim.value,
  }));

  const addLine = useCallback((line: HistoryLine) => {
    setHistory(prev => [...prev, line]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  const handleSubmit = useCallback(() => {
    const raw = input.trim();
    const cmd = raw.toLowerCase();
    if (!cmd) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addLine({ text: `> ${raw}`, type: 'input' });
    setInput('');

    if (cmd === 'clear') {
      setTimeout(() => setHistory([{ text: 'cleared.', type: 'system' }]), 100);
      return;
    }

    if (cmd === 'help') {
      HELP_LINES.forEach((l, i) => {
        setTimeout(() => addLine({ text: l, type: 'response' }), i * 55);
      });
      return;
    }

    const target = ROUTES[cmd];
    if (target) {
      addLine({ text: `→ ${cmd}`, type: 'response' });
      setTimeout(() => router.push(target as any), 280);
    } else {
      addLine({ text: `"${cmd}" not found`, type: 'error' });
      addLine({ text: 'try: help', type: 'system' });
    }
  }, [input, addLine, router]);

  const lineColor = (type: HistoryLine['type']) => {
    switch (type) {
      case 'input':    return '#33ff00';
      case 'response': return '#1aaa00';
      case 'error':    return '#ffb000';
      case 'system':   return '#0a5500';
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Pressable
        style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 8 }]}
        onPress={() => inputRef.current?.focus()}
      >
        {/* History */}
        <ScrollView
          ref={scrollRef}
          style={styles.history}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {history.map((line, i) => (
            <Text key={i} style={[styles.line, { color: lineColor(line.type) }]}>
              {line.text}
            </Text>
          ))}
        </ScrollView>

        {/* Input row */}
        <View style={styles.inputRow}>
          <Text style={styles.prompt}>{'> '}</Text>
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSubmit}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            returnKeyType="go"
            caretHidden
            placeholderTextColor="#0a5500"
            placeholder="command"
          />
          <Animated.View style={[styles.cursor, cursorStyle]} />
        </View>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    backgroundColor: '#020802',
  },
  history: {
    flex: 1,
    marginBottom: 16,
  },
  line: {
    fontFamily: 'CourierPrime',
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#0a5500',
    paddingTop: 12,
    paddingBottom: 4,
  },
  prompt: {
    fontFamily: 'CourierPrime',
    fontSize: 14,
    color: '#33ff00',
    textShadowColor: '#33ff00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  input: {
    flex: 1,
    fontFamily: 'CourierPrime',
    fontSize: 14,
    color: '#33ff00',
    letterSpacing: 0.3,
    padding: 0,
    textShadowColor: '#33ff00',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
  cursor: {
    width: 9,
    height: 17,
    marginLeft: 2,
    backgroundColor: '#33ff00',
  },
});
