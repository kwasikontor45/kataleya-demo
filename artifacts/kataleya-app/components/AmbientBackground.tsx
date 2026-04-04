'use no memo';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

// Matches HTML .ambient-bg — radial sage + terra gradients drifting slowly.
// Two fixed radial blobs: sage at 20%/50%, terra at 80%/80%.
export function AmbientBackground() {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Matches HTML ambientShift — 20s ease-in-out infinite
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 10000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 10000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const sageTranslate = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 30],
  });
  const terraTranslate = drift.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Sage blob — top-left, matches HTML 20% 50% */}
      <Animated.View
        style={[
          styles.blob,
          styles.sageBlob,
          { transform: [{ translateX: sageTranslate }, { translateY: sageTranslate }] },
        ]}
      />
      {/* Terra blob — bottom-right, matches HTML 80% 80% */}
      <Animated.View
        style={[
          styles.blob,
          styles.terraBlob,
          { transform: [{ translateX: terraTranslate }, { translateY: terraTranslate }] },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.3,
  },
  sageBlob: {
    width: 340,
    height: 340,
    top: '20%',
    left: '-20%',
    backgroundColor: 'rgba(135,168,120,0.18)',
  },
  terraBlob: {
    width: 280,
    height: 280,
    bottom: '5%',
    right: '-15%',
    backgroundColor: 'rgba(212,163,115,0.12)',
  },
});
