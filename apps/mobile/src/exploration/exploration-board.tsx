import * as Haptics from 'expo-haptics';
import { type ReactNode, useRef, useState } from 'react';
import {
  Animated,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

const HOLD_MS = 600;
const HOLD_SLOP_PX = 12;
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_SLOP_PX = 40;
const TWO_FINGER_TAP_MS = 500;
const CURSOR_SIZE = 44;

type Point = { x: number; y: number };

type Props<T extends { id: string | number }> = {
  /** Object under a point. Here and below x and y are 0..1 of the board. */
  objectAt: (x: number, y: number) => T | null;
  /** True on a border between objects. Without it a border is where the object changes. */
  isEdge?: (x: number, y: number) => boolean;
  onTouchStart?: () => void;
  onMove?: (x: number, y: number) => void;
  /** Fires on entering or leaving an object, and with null when the finger lifts. */
  onObjectChange: (object: T | null) => void;
  onHold: (object: T) => void;
  onDoubleTap: (object: T | null) => void;
  onTwoFingerTap?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  /** Drawn under the finger cursor; never receives touches. */
  children?: ReactNode;
};

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Touch surface explored with one finger: reports the object under the finger,
 * ticks on every border and recognizes hold, double tap and two-finger tap.
 */
export function ExplorationBoard<T extends { id: string | number }>(props: Props<T>) {
  const { objectAt, isEdge, onTouchStart, onMove, onObjectChange, onHold, onDoubleTap, onTwoFingerTap } = props;
  const sizeRef = useRef({ width: 1, height: 1 });
  const currentRef = useRef<T['id'] | null>(null);
  const onEdgeRef = useRef(false);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdAnchorRef = useRef<Point>({ x: 0, y: 0 });
  const lastTapRef = useRef<{ time: number; point: Point } | null>(null);
  const touchStartedAtRef = useRef(0);
  const twoFingersRef = useRef(false);
  // The ring showing the audience where the finger is; animated values avoid re-rendering on every move
  const [cursor] = useState(() => new Animated.ValueXY());
  const [cursorOpacity] = useState(() => new Animated.Value(0));

  const pointOf = (event: GestureResponderEvent): Point => ({
    x: event.nativeEvent.locationX,
    y: event.nativeEvent.locationY,
  });
  const normalized = (point: Point): Point => ({
    x: point.x / sizeRef.current.width,
    y: point.y / sizeRef.current.height,
  });

  const cancelHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  };

  const restartHold = (object: T | null, point: Point) => {
    cancelHold();
    holdAnchorRef.current = point;
    if (object) holdTimerRef.current = setTimeout(() => onHold(object), HOLD_MS);
  };

  const leaveObject = () => {
    cancelHold();
    cursorOpacity.setValue(0);
    if (currentRef.current !== null) onObjectChange(null);
    currentRef.current = null;
    onEdgeRef.current = false;
  };

  const track = (point: Point) => {
    const { x, y } = normalized(point);
    cursor.setValue(point);
    onMove?.(x, y);

    const object = objectAt(x, y);
    const id = object?.id ?? null;
    const onEdge = isEdge?.(x, y) ?? false;
    const changed = id !== currentRef.current;
    // One tick per border: when the finger enters the edge band,
    // or when the object changes because a fast finger jumped over the band
    if ((onEdge && !onEdgeRef.current) || (changed && !onEdge)) void Haptics.selectionAsync();
    onEdgeRef.current = onEdge;

    if (changed) {
      currentRef.current = id;
      onObjectChange(object);
      restartHold(object, point);
    } else if (distance(point, holdAnchorRef.current) > HOLD_SLOP_PX) {
      restartHold(object, point);
    }
  };

  const handleGrant = (event: GestureResponderEvent) => {
    onTouchStart?.();
    touchStartedAtRef.current = Date.now();
    twoFingersRef.current = false;
    cursorOpacity.setValue(1);
    track(pointOf(event));
  };

  // Also fires for every additional finger put down during the gesture
  const handleStart = (event: GestureResponderEvent) => {
    if (event.nativeEvent.touches.length < 2) return;
    twoFingersRef.current = true;
    leaveObject();
  };

  const handleRelease = (event: GestureResponderEvent) => {
    const wasTwoFingers = twoFingersRef.current;
    leaveObject();
    if (wasTwoFingers) {
      lastTapRef.current = null;
      if (Date.now() - touchStartedAtRef.current < TWO_FINGER_TAP_MS) onTwoFingerTap?.();
      return;
    }

    const point = pointOf(event);
    const now = Date.now();
    const lastTap = lastTapRef.current;
    if (lastTap && now - lastTap.time < DOUBLE_TAP_MS && distance(point, lastTap.point) < DOUBLE_TAP_SLOP_PX) {
      lastTapRef.current = null;
      const { x, y } = normalized(point);
      onDoubleTap(objectAt(x, y));
    } else {
      lastTapRef.current = { time: now, point };
    }
  };

  return (
    <View
      style={[styles.board, props.style]}
      accessible
      accessibilityLabel={props.accessibilityLabel}
      onLayout={(event: LayoutChangeEvent) => {
        sizeRef.current = event.nativeEvent.layout;
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={handleGrant}
      onResponderStart={handleStart}
      onResponderMove={(event) => {
        if (!twoFingersRef.current) track(pointOf(event));
      }}
      onResponderRelease={handleRelease}
      onResponderTerminate={leaveObject}
    >
      {/* pointerEvents="none" keeps locationX/Y relative to the board itself */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        {props.children}
      </View>
      <Animated.View
        pointerEvents="none"
        style={[styles.cursor, { opacity: cursorOpacity, transform: cursor.getTranslateTransform() }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  board: { backgroundColor: '#000', overflow: 'hidden' },
  cursor: {
    position: 'absolute',
    left: -CURSOR_SIZE / 2,
    top: -CURSOR_SIZE / 2,
    width: CURSOR_SIZE,
    height: CURSOR_SIZE,
    borderRadius: CURSOR_SIZE / 2,
    borderWidth: 3,
    borderColor: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
});
