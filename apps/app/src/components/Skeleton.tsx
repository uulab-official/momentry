import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

export function useShimmerAnimation() {
  const [progress] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    progress.stopAnimation();
    if (reduceMotion) {
      progress.setValue(0.5);
      return;
    }
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress, reduceMotion]);

  return { progress, reduceMotion };
}

export function ShimmerBlock({
  progress,
  reduceMotion,
  baseColor,
  highlightColor,
  style,
}: {
  progress: Animated.Value;
  reduceMotion: boolean;
  baseColor: string;
  highlightColor: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { width } = useWindowDimensions();
  const bandWidth = 88;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-bandWidth, width + bandWidth],
  });

  return (
    <View style={[styles.block, { backgroundColor: baseColor }, style]}>
      {!reduceMotion ? (
        <Animated.View
          style={[
            styles.highlight,
            {
              width: bandWidth,
              backgroundColor: highlightColor,
              transform: [{ translateX }, { skewX: '-12deg' }],
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { overflow: 'hidden' },
  highlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    opacity: 0.58,
    pointerEvents: 'none',
  },
});
