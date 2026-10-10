import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExplorationBoard } from '@/exploration/exploration-board';
import { useObjectSounds } from '@/exploration/use-object-sounds';
import { useSpeaker } from '@/exploration/use-speaker';
import { ControlPanel, type Mode } from '@/readability-test/control-panel';
import { objectAt, SCENE_OBJECTS } from '@/readability-test/scene';
import { useReadabilityTrial } from '@/readability-test/use-readability-trial';

const RULE = 'Dźwięk mówi, co jest pod palcem, a nie gdzie.';

/**
 * Training on plain shapes before exploring an artwork. Its test mode measures whether
 * a blindfolded person finds an object by sound alone; a teammate operates the panel.
 */
export default function TrainingScreen() {
  const router = useRouter();
  const sounds = useObjectSounds(SCENE_OBJECTS);
  const speaker = useSpeaker(sounds.setDucked);
  const trial = useReadabilityTrial(speaker.speak);
  const [mode, setMode] = useState<Mode>('training');
  const [showObjects, setShowObjects] = useState(true);
  const [namesOnHold, setNamesOnHold] = useState(true);

  useEffect(() => {
    speaker.speak(`Trening. ${RULE} Wódź palcem po ekranie. Przytrzymaj palec, aby usłyszeć nazwę.`);
    return speaker.stop;
  }, [speaker]);

  const changeMode = (next: Mode) => {
    speaker.stop();
    trial.cancel();
    setMode(next);
    setShowObjects(next === 'training');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.bar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Wróć do galerii"
        >
          <Text style={styles.backText}>‹ Galeria</Text>
        </Pressable>
        <Text style={styles.rule}>{RULE}</Text>
      </View>
      <ExplorationBoard
        style={styles.board}
        accessibilityLabel="Plansza treningowa. Aby ćwiczyć, wstrzymaj czytnik ekranu."
        objectAt={(x, y) => objectAt(trial.layout, x, y)}
        onTouchStart={trial.markTouch}
        onObjectChange={(object) => sounds.setActive(object?.id ?? null)}
        onHold={(object) => object && namesOnHold && speaker.speak(object.name)}
        onDoubleTap={(object) => {
          if (mode === 'test') trial.confirm(object);
          else if (object) speaker.speak(object.name);
        }}
      >
        {showObjects &&
          trial.layout.map(({ id, name, color, rect }) => (
            <View
              key={id}
              style={[
                styles.object,
                {
                  backgroundColor: color,
                  left: `${rect.x * 100}%`,
                  top: `${rect.y * 100}%`,
                  width: `${rect.width * 100}%`,
                  height: `${rect.height * 100}%`,
                },
              ]}
            >
              <Text style={styles.label}>{name}</Text>
            </View>
          ))}
      </ExplorationBoard>
      <ControlPanel
        mode={mode}
        onModeChange={changeMode}
        showObjects={showObjects}
        onShowObjectsChange={setShowObjects}
        namesOnHold={namesOnHold}
        onNamesOnHoldChange={setNamesOnHold}
        trialRunning={trial.target !== null}
        onStartTrial={trial.start}
        onShuffle={trial.shuffleLayout}
        results={trial.results}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  back: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#222' },
  backText: { color: '#fff', fontSize: 16 },
  rule: { flex: 1, color: '#ffd60a', fontSize: 16, fontWeight: '600' },
  board: { flex: 1 },
  object: { position: 'absolute', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#fff', fontSize: 22, fontWeight: '600' },
});
