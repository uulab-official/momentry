import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type Props = {
  visible: boolean;
  children: ReactNode;
  onRequestClose: () => void;
  dismissible?: boolean;
  dialogStyle?: StyleProp<ViewStyle>;
};

/** Consistent, reduced-motion friendly entrance for confirmations and pickers. */
export function AnimatedDialog({ visible, children, onRequestClose, dismissible = true, dialogStyle }: Props) {
  const [progress] = useState(() => new Animated.Value(0));
  const [reduceMotion, setReduceMotion] = useState(false);
  const [rendered, setRendered] = useState(visible);

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

  useEffect(() => {
    progress.stopAnimation();
    if (visible) {
      const frame = requestAnimationFrame(() => {
        setRendered(true);
        if (reduceMotion) {
          progress.setValue(1);
          return;
        }
        progress.setValue(0);
        Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: Platform.OS !== 'web' }).start();
      });
      return () => cancelAnimationFrame(frame);
    }
    if (reduceMotion) {
      progress.setValue(0);
      const frame = requestAnimationFrame(() => setRendered(false));
      return () => cancelAnimationFrame(frame);
    }
    Animated.timing(progress, { toValue: 0, duration: 160, useNativeDriver: Platform.OS !== 'web' })
      .start(({ finished }) => {
        if (finished) setRendered(false);
      });
  }, [progress, reduceMotion, visible]);

  if (!rendered) return null;

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] });

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onRequestClose}>
      <Animated.View style={[styles.overlay, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} disabled={!dismissible} onPress={onRequestClose} />
        <Animated.View style={[styles.dialog, dialogStyle, { transform: [{ translateY }, { scale }] }]}>
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.44)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 420 },
});
