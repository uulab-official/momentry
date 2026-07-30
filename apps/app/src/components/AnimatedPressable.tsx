import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  type PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

type Props = Omit<PressableProps, 'style' | 'onPressIn' | 'onPressOut'> & {
  style?: StyleProp<ViewStyle>;
  onPressIn?: PressableProps['onPressIn'];
  onPressOut?: PressableProps['onPressOut'];
  scaleTo?: number;
  pressedOpacity?: number;
};

const NativeAnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** A small, native-feeling press response shared by buttons, rows, and cards. */
export function AnimatedPressable({
  style,
  onPressIn,
  onPressOut,
  scaleTo = 0.975,
  pressedOpacity = 0.78,
  ...props
}: Props) {
  const [scale] = useState(() => new Animated.Value(1));
  const [reduceMotion, setReduceMotion] = useState(false);
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    }).catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const animateTo = (toValue: number) => {
    scale.stopAnimation();
    if (reduceMotion) {
      scale.setValue(1);
      return;
    }
    Animated.spring(scale, {
      toValue,
      useNativeDriver: Platform.OS !== 'web',
      speed: 26,
      bounciness: 3,
    }).start();
  };

  return <NativeAnimatedPressable
    {...props}
    onPressIn={(event) => {
      setPressed(true);
      animateTo(scaleTo);
      onPressIn?.(event);
    }}
    onPressOut={(event) => {
      setPressed(false);
      animateTo(1);
      onPressOut?.(event);
    }}
    style={[style, pressed ? { opacity: pressedOpacity } : null, { transform: [{ scale }] }]}
  />;
}
