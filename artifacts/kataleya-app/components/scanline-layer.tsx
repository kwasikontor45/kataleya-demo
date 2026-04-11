// components/scanline-layer.tsx
// CRT scanline texture — applied globally across all screens.
// Static SVG, renders once. pointerEvents none, purely atmospheric.

import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Line } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

export function ScanlineLayer() {
  const count = Math.ceil(H / 4);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={W} height={H}>
        {Array.from({ length: count }, (_, i) => (
          <Line
            key={i}
            x1={0} y1={i * 4}
            x2={W} y2={i * 4}
            stroke="rgba(255,255,255,0.012)"
            strokeWidth={0.5}
          />
        ))}
      </Svg>
    </View>
  );
}
