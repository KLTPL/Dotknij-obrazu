import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { type GestureResponderEvent, type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { objectAt, type ObjectId, type PlacedObject } from './scene';

const HOLD_MS = 600;
const HOLD_SLOP_PX = 12;
const DOUBLE_TAP_MS = 350;
const DOUBLE_TAP_SLOP_PX = 40;

type Point = { x: number; y: number };

type Props = {
  objects: readonly PlacedObject[];
  showObjects: boolean;
  onTouchStart: () => void;
  /** Fires on entering or leaving an object, and with null when the finger lifts. */
  onObjectChange: (object: PlacedObject | null) => void;
  onHold: (object: PlacedObject) => void;
  onDoubleTap: (object: PlacedObject | null) => void;
};

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function ExplorationBoard({ objects, showObjects, onTouchStart, onObjectChange, onHold, onDoubleTap }: Props) {
  const [size, setSize] = useState({ width: 1, height: 1 });
  const currentRef = useRef<ObjectId | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdAnchorRef = useRef<Point>({ x: 0, y: 0 });
  const lastTapRef = useRef<{ time: number; point: Point } | null>(null);

  const pointOf = (event: GestureResponderEvent): Point => ({
    x: event.nativeEvent.locationX,
    y: event.nativeEvent.locationY,
  });
  const objectUnder = (point: Point) => objectAt(objects, point.x / size.width, point.y / size.height);

  const cancelHold = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = null;
  };

  const restartHold = (object: PlacedObject | null, point: Point) => {
    cancelHold();
    holdAnchorRef.current = point;
    if (object) holdTimerRef.current = setTimeout(() => onHold(object), HOLD_MS);
  };

  const track = (point: Point) => {
    const object = objectUnder(point);
    const id = object?.id ?? null;
    if (id !== currentRef.current) {
      // Crossing an object's edge: the tick tells the user a boundary was passed
      currentRef.current = id;
      void Haptics.selectionAsync();
      onObjectChange(object);
      restartHold(object, point);
    } else if (distance(point, holdAnchorRef.current) > HOLD_SLOP_PX) {
      restartHold(object, point);
    }
  };

  const handleGrant = (event: GestureResponderEvent) => {
    onTouchStart();
    currentRef.current = null;
    track(pointOf(event));
  };

  const handleRelease = (event: GestureResponderEvent) => {
    cancelHold();
    currentRef.current = null;
    onObjectChange(null);

    const point = pointOf(event);
    const now = Date.now();
    const lastTap = lastTapRef.current;
    if (lastTap && now - lastTap.time < DOUBLE_TAP_MS && distance(point, lastTap.point) < DOUBLE_TAP_SLOP_PX) {
      lastTapRef.current = null;
      onDoubleTap(objectUnder(point));
    } else {
      lastTapRef.current = { time: now, point };
    }
  };

  return (
    <View
      style={styles.board}
      onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={handleGrant}
      onResponderMove={(event) => track(pointOf(event))}
      onResponderRelease={handleRelease}
      onResponderTerminate={() => {
        cancelHold();
        currentRef.current = null;
        onObjectChange(null);
      }}
    >
      {showObjects &&
        objects.map(({ id, name, color, rect }) => (
          // pointerEvents="none" keeps locationX/Y relative to the board itself
          <View
            key={id}
            pointerEvents="none"
            style={[
              styles.object,
              {
                backgroundColor: color,
                left: rect.x * size.width,
                top: rect.y * size.height,
                width: rect.width * size.width,
                height: rect.height * size.height,
              },
            ]}
          >
            <Text style={styles.label}>{name}</Text>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  board: { flex: 1, backgroundColor: '#000' },
  object: { position: 'absolute', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#fff', fontSize: 22, fontWeight: '600' },
});
