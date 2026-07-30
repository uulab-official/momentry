import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { PureComponent, useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  type GestureResponderEvent,
  Modal,
  PanResponder,
  type PanResponderGestureState,
  type PanResponderInstance,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/src/components/AnimatedPressable';
import { pretendard } from '@/src/theme/typography';

type Props = {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
};

const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 1.1;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

type ZoomableImageProps = {
  imageUri: string;
  failed: boolean;
  width: number;
  height: number;
  dragY: Animated.Value;
  reduceMotion: boolean;
  onLoad: () => void;
  onError: () => void;
  onDismiss: (direction: number) => void;
};

class ZoomableImage extends PureComponent<ZoomableImageProps> {
  private readonly scale = new Animated.Value(1);
  private readonly translateX = new Animated.Value(0);
  private readonly translateY = new Animated.Value(0);
  private readonly panResponder: PanResponderInstance;
  private currentScale = 1;
  private currentX = 0;
  private currentY = 0;
  private panStartX = 0;
  private panStartY = 0;
  private pinchStartDistance = 0;
  private pinchStartScale = 1;

  constructor(props: ZoomableImageProps) {
    super(props);
    this.panResponder = PanResponder.create({
      onMoveShouldSetPanResponder: (event, gesture) => {
        if (event.nativeEvent.touches.length >= 2 || this.currentScale > 1.01) return true;
        return Math.abs(gesture.dy) > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx) * 1.15;
      },
      onPanResponderGrant: this.handleGrant,
      onPanResponderMove: this.handleMove,
      onPanResponderRelease: this.handleRelease,
      onPanResponderTerminate: this.handleTerminate,
      onPanResponderTerminationRequest: () => false,
    });
  }

  componentDidUpdate(previous: ZoomableImageProps) {
    if (previous.imageUri !== this.props.imageUri) this.resetTransform(false);
  }

  componentWillUnmount() {
    this.scale.stopAnimation();
    this.translateX.stopAnimation();
    this.translateY.stopAnimation();
  }

  private distanceBetweenTouches(event: GestureResponderEvent) {
    const [first, second] = event.nativeEvent.touches;
    if (!first || !second) return 0;
    return Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY);
  }

  private handleGrant = (event: GestureResponderEvent) => {
    this.panStartX = this.currentX;
    this.panStartY = this.currentY;
    const distance = this.distanceBetweenTouches(event);
    if (distance > 0) {
      this.pinchStartDistance = distance;
      this.pinchStartScale = this.currentScale;
    }
  };

  private handleMove = (event: GestureResponderEvent, gesture: PanResponderGestureState) => {
    const distance = this.distanceBetweenTouches(event);
    if (distance > 0) {
      if (this.pinchStartDistance === 0) {
        this.pinchStartDistance = distance;
        this.pinchStartScale = this.currentScale;
      }
      const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.pinchStartScale * distance / this.pinchStartDistance));
      this.currentScale = nextScale;
      this.scale.setValue(nextScale);
      this.props.dragY.setValue(0);
      if (nextScale <= 1.01) this.setTranslation(0, 0);
      return;
    }

    if (this.currentScale > 1.01) {
      const maxX = this.props.width * (this.currentScale - 1) * 0.5;
      const maxY = this.props.height * 0.41 * (this.currentScale - 1);
      this.setTranslation(
        Math.max(-maxX, Math.min(maxX, this.panStartX + gesture.dx)),
        Math.max(-maxY, Math.min(maxY, this.panStartY + gesture.dy)),
      );
      return;
    }
    this.props.dragY.setValue(gesture.dy);
  };

  private handleRelease = (_: GestureResponderEvent, gesture: PanResponderGestureState) => {
    this.pinchStartDistance = 0;
    if (this.currentScale > 1.01) {
      if (this.currentScale < 1.08) this.resetTransform(true);
      return;
    }
    const shouldDismiss = Math.abs(gesture.dy) > DISMISS_DISTANCE
      || Math.abs(gesture.vy) > DISMISS_VELOCITY;
    if (shouldDismiss) {
      this.props.onDismiss(gesture.dy < 0 ? -1 : 1);
      return;
    }
    this.resetDismissDrag();
  };

  private handleTerminate = () => {
    this.pinchStartDistance = 0;
    if (this.currentScale <= 1.01) this.resetDismissDrag();
  };

  private setTranslation(x: number, y: number) {
    this.currentX = x;
    this.currentY = y;
    this.translateX.setValue(x);
    this.translateY.setValue(y);
  }

  private resetDismissDrag() {
    if (this.props.reduceMotion) {
      this.props.dragY.setValue(0);
      return;
    }
    Animated.spring(this.props.dragY, {
      toValue: 0,
      damping: 22,
      stiffness: 260,
      mass: 0.8,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }

  private resetTransform(animated: boolean) {
    this.currentScale = 1;
    this.currentX = 0;
    this.currentY = 0;
    this.pinchStartDistance = 0;
    if (!animated || this.props.reduceMotion) {
      this.scale.setValue(1);
      this.translateX.setValue(0);
      this.translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.spring(this.scale, { toValue: 1, damping: 22, stiffness: 260, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(this.translateX, { toValue: 0, damping: 22, stiffness: 260, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(this.translateY, { toValue: 0, damping: 22, stiffness: 260, useNativeDriver: Platform.OS !== 'web' }),
    ]).start();
  }

  render() {
    const { failed, imageUri, onError, onLoad } = this.props;
    return (
      <View style={styles.gestureSurface} {...this.panResponder.panHandlers}>
        {failed ? (
          <View style={styles.failure}>
            <Ionicons name="image-outline" size={44} color="#FFFFFF" />
            <Text style={styles.failureText}>사진을 불러오지 못했어요.</Text>
          </View>
        ) : (
          <Animated.Image
            source={{ uri: imageUri }}
            style={[
              styles.image,
              { transform: [{ translateX: this.translateX }, { translateY: this.translateY }, { scale: this.scale }] },
            ]}
            resizeMode="contain"
            onLoad={onLoad}
            onError={onError}
          />
        )}
      </View>
    );
  }
}

export function MediaViewer({ visible, imageUri, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [opacity] = useState(() => new Animated.Value(0));
  const [dragY] = useState(() => new Animated.Value(0));
  const [closing, setClosing] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [imageState, setImageState] = useState<{ uri: string | null; status: 'loading' | 'loaded' | 'failed' }>({
    uri: imageUri,
    status: 'loading',
  });

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
    if (!visible) return;
    dragY.setValue(0);
    opacity.stopAnimation();
    if (reduceMotion) {
      opacity.setValue(1);
      return;
    }
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [dragY, imageUri, opacity, reduceMotion, visible]);

  const requestClose = useCallback((direction = 0) => {
    if (closing) return;
    setClosing(true);
    if (reduceMotion) {
      setClosing(false);
      onClose();
      return;
    }
    const animations: Animated.CompositeAnimation[] = [
      Animated.timing(opacity, {
        toValue: 0,
        duration: 170,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ];
    if (direction !== 0) {
      animations.push(Animated.timing(dragY, {
        toValue: direction * (height + 80),
        duration: 190,
        useNativeDriver: Platform.OS !== 'web',
      }));
    }
    Animated.parallel(animations).start(({ finished }) => {
      setClosing(false);
      if (finished) onClose();
    });
  }, [closing, dragY, height, onClose, opacity, reduceMotion]);

  if (!visible || !imageUri) return null;
  const imageStatus = imageState.uri === imageUri ? imageState.status : 'loading';

  const dragScale = dragY.interpolate({
    inputRange: [-height * 0.45, 0, height * 0.45],
    outputRange: [0.92, 1, 0.92],
    extrapolate: 'clamp',
  });
  const backdropDragOpacity = dragY.interpolate({
    inputRange: [-height * 0.45, 0, height * 0.45],
    outputRange: [0.28, 1, 0.28],
    extrapolate: 'clamp',
  });

  return (
    <Modal
      visible
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={() => requestClose()}
    >
      <StatusBar style="light" />
      <View style={styles.root} accessibilityViewIsModal>
        <Animated.View
          style={[styles.backdrop, { opacity: Animated.multiply(opacity, backdropDragOpacity), pointerEvents: 'none' }]}
        />
        <Pressable
          accessible={false}
          style={StyleSheet.absoluteFill}
          onPress={() => requestClose()}
        />
        <Animated.View
          style={[
            styles.stage,
            {
              opacity,
              transform: [{ translateY: dragY }, { scale: dragScale }],
            },
          ]}
        >
          <ZoomableImage
            key={imageUri}
            imageUri={imageUri}
            failed={imageStatus === 'failed'}
            width={width}
            height={height}
            dragY={dragY}
            reduceMotion={reduceMotion}
            onLoad={() => setImageState({ uri: imageUri, status: 'loaded' })}
            onError={() => setImageState({ uri: imageUri, status: 'failed' })}
            onDismiss={requestClose}
          />
          {imageStatus === 'loading' ? <ActivityIndicator accessibilityLabel="사진 불러오는 중" color="#FFFFFF" style={styles.loading} /> : null}
        </Animated.View>
        <Animated.View
          style={[styles.topBar, { paddingTop: Math.max(insets.top, 12), opacity, pointerEvents: 'box-none' }]}
        >
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel="사진 보기 닫기"
            hitSlop={10}
            onPress={() => requestClose()}
            style={styles.close}
            pressedOpacity={0.7}
            scaleTo={0.92}
          >
            <Ionicons name="close" size={27} color="#FFFFFF" />
          </AnimatedPressable>
        </Animated.View>
        <Animated.View
          style={[styles.hintWrap, { paddingBottom: Math.max(insets.bottom, 14), opacity, pointerEvents: 'none' }]}
        >
          <Text style={styles.hint}>확대하거나 위아래로 밀어 닫기</Text>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: '#050605' },
  stage: { flex: 1 },
  gestureSurface: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '82%' },
  loading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  failure: { alignItems: 'center', gap: 12 },
  failureText: { ...pretendard(700), color: '#FFFFFF', fontSize: 14 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 16, alignItems: 'flex-end' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  hintWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  hint: { ...pretendard(700), color: 'rgba(255,255,255,0.72)', fontSize: 12 },
});
