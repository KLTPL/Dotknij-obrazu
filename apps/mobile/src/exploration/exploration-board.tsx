import type { ArtworkTexture } from '@repo/shared';
import { type ReactNode, useRef, useState } from 'react';
import {
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
  Animated,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type PointerEvent,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

import { useBorderCue } from './use-border-cue';
import { useTouchHaptics } from './use-touch-haptics';

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
  /** Closeness to a contour that can be traced, 0..1; felt as vibration. */
  contourAt?: (x: number, y: number) => number;
  /** Surface of an object, felt while the finger moves over it. */
  textureOf?: (object: T) => ArtworkTexture;
  onTouchStart?: () => void;
  /** Every finger left the board. */
  onTouchEnd?: () => void;
  onMove?: (x: number, y: number) => void;
  /** Fires on entering or leaving an object, and with null when the finger lifts. */
  onObjectChange: (object: T | null) => void;
  /** The finger rested in one place; the object is null on the background. */
  onHold?: (object: T | null, x: number, y: number) => void;
  onDoubleTap: (object: T | null) => void;
  onTwoFingerTap?: () => void;
  /**
   * Explore from hover events: a running screen reader turns a moving finger into hover instead
   * of touches, and its own double tap then describes the place the finger explored last.
   */
  exploreByHover?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  /** Screen reader actions; their names arrive in onAccessibilityAction. */
  accessibilityActions?: AccessibilityActionInfo[];
  onAccessibilityAction?: (name: string) => void;
  style?: StyleProp<ViewStyle>;
  /** Drawn under the finger cursor; never receives touches. */
  children?: ReactNode;
};

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/**
 * Touch surface explored with one finger: reports the object under the finger, signals the
 * border of an object with knocks and a short sound and the edge of the painting with a long
 * buzz, vibrates along contours and over textures, and recognizes hold, double tap and
 * two-finger tap.
 */
export function ExplorationBoard<T extends { id: string | number }>(props: Props<T>) {
  const { objectAt, contourAt, textureOf, onTouchStart, onMove, onObjectChange } = props;
  const { onTouchEnd, onHold, onDoubleTap, onTwoFingerTap, exploreByHover = false } = props;
  const haptics = useTouchHaptics();
  const borderCue = useBorderCue();
  const sizeRef = useRef({ width: 1, height: 1 });
  const currentRef = useRef<T['id'] | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdAnchorRef = useRef<Point>({ x: 0, y: 0 });
  const lastPointRef = useRef<Point>({ x: 0, y: 0 });
  const lastTapRef = useRef<{ time: number; point: Point } | null>(null);
  const touchStartedAtRef = useRef(0);
  const twoFingersRef = useRef(false);
  const insideRef = useRef(true);
  const hoveringRef = useRef(false);
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
    if (!onHold) return;
    holdAnchorRef.current = point;
    const { x, y } = normalized(point);
    holdTimerRef.current = setTimeout(() => onHold(object, x, y), HOLD_MS);
  };

  const leaveObject = () => {
    cancelHold();
    cursorOpacity.setValue(0);
    haptics.setContour(0);
    if (currentRef.current !== null) onObjectChange(null);
    currentRef.current = null;
  };

  const track = (point: Point) => {
    const { x, y } = normalized(point);
    cursor.setValue(point);
    onMove?.(x, y);

    const object = objectAt(x, y);
    const id = object?.id ?? null;
    haptics.setContour(contourAt?.(x, y) ?? 0);
    if (object && textureOf) haptics.travel(distance(point, lastPointRef.current), textureOf(object));
    lastPointRef.current = point;

    const inside = x >= 0 && x < 1 && y >= 0 && y < 1;
    const leftPainting = insideRef.current && !inside;
    insideRef.current = inside;
    if (leftPainting) haptics.frame();

    if (id !== currentRef.current) {
      // The loops crossfade, so the border itself is marked with knocks and a short signal;
      // sliding off the painting is felt as its frame instead
      if (!leftPainting) haptics.border(object !== null);
      borderCue.play(object !== null);
      currentRef.current = id;
      onObjectChange(object);
      restartHold(object, point);
    } else if (distance(point, holdAnchorRef.current) > HOLD_SLOP_PX) {
      restartHold(object, point);
    }
  };

  const begin = (point: Point) => {
    onTouchStart?.();
    cursorOpacity.setValue(1);
    insideRef.current = true;
    lastPointRef.current = point;
    track(point);
  };

  const handleGrant = (event: GestureResponderEvent) => {
    touchStartedAtRef.current = Date.now();
    twoFingersRef.current = false;
    begin(pointOf(event));
  };

  const handleHover = (event: PointerEvent) => {
    const point = { x: event.nativeEvent.offsetX, y: event.nativeEvent.offsetY };
    if (hoveringRef.current) {
      track(point);
      return;
    }
    hoveringRef.current = true;
    begin(point);
  };

  const handleHoverEnd = () => {
    if (!hoveringRef.current) return;
    hoveringRef.current = false;
    leaveObject();
    onTouchEnd?.();
  };

  const handleAction = (event: AccessibilityActionEvent) => {
    const name = event.nativeEvent.actionName;
    if (name === 'activate' && exploreByHover) {
      const { x, y } = normalized(lastPointRef.current);
      onDoubleTap(objectAt(x, y));
    } else {
      props.onAccessibilityAction?.(name);
    }
  };

  // Fires for every finger put down, also the ones joining a gesture that already started
  const handleStart = (event: GestureResponderEvent) => {
    if (event.nativeEvent.touches.length < 2) return;
    twoFingersRef.current = true;
    leaveObject();
  };

  const handleRelease = (event: GestureResponderEvent) => {
    const wasTwoFingers = twoFingersRef.current;
    leaveObject();
    onTouchEnd?.();
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
      accessibilityHint={props.accessibilityHint}
      accessibilityActions={
        exploreByHover ? [{ name: 'activate' }, ...(props.accessibilityActions ?? [])] : props.accessibilityActions
      }
      onAccessibilityAction={handleAction}
      onPointerMove={exploreByHover ? handleHover : undefined}
      onPointerLeave={exploreByHover ? handleHoverEnd : undefined}
      onLayout={(event: LayoutChangeEvent) => {
        sizeRef.current = event.nativeEvent.layout;
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={handleGrant}
      onResponderStart={handleStart}
      onResponderMove={(event) => {
        // With two fingers down there is no single point to explore
        if (!twoFingersRef.current && event.nativeEvent.touches.length < 2) track(pointOf(event));
      }}
      onResponderRelease={handleRelease}
      onResponderTerminate={() => {
        leaveObject();
        onTouchEnd?.();
      }}
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
