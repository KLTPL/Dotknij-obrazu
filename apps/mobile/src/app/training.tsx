import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExplorationBoard } from '@/exploration/exploration-board';
import { useObjectSounds } from '@/exploration/use-object-sounds';
import { useSpeaker } from '@/exploration/use-speaker';
import { useLanguage } from '@/i18n/language';
import { ControlPanel, type Mode } from '@/readability-test/control-panel';
import { objectAt, SCENE_OBJECTS } from '@/readability-test/scene';
import { useReadabilityTrial } from '@/readability-test/use-readability-trial';
import { Button } from '@/ui/button';

/**
 * Training on plain shapes before exploring an artwork. Its test mode measures whether
 * a blindfolded person finds an object by sound alone; a teammate operates the panel.
 */
export default function TrainingScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const names = t.training.objects;
  const sounds = useObjectSounds(SCENE_OBJECTS);
  const speaker = useSpeaker(sounds.setDucked);
  const trial = useReadabilityTrial(speaker.speak, t);
  const [mode, setMode] = useState<Mode>('training');
  const [showObjects, setShowObjects] = useState(true);
  const [namesOnHold, setNamesOnHold] = useState(true);

  useEffect(() => {
    speaker.introduce(t.training.intro);
    return speaker.stop;
  }, [speaker, t]);

  const changeMode = (next: Mode) => {
    speaker.stop();
    trial.cancel();
    setMode(next);
    setShowObjects(next === 'training');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.bar}>
        <Button label={t.artwork.back} accessibilityLabel={t.artwork.backLabel} onPress={() => router.back()} />
        <Text style={styles.rule}>{t.training.rule}</Text>
      </View>
      <ExplorationBoard
        style={styles.board}
        accessibilityLabel={t.training.boardLabel}
        objectAt={(x, y) => objectAt(trial.layout, x, y)}
        onTouchStart={trial.markTouch}
        onObjectChange={(object) => sounds.setActive(object?.id ?? null)}
        onHold={(object) => object && namesOnHold && speaker.speak(names[object.id])}
        onDoubleTap={(object) => {
          if (mode === 'test') trial.confirm(object);
          else if (object) speaker.speak(names[object.id]);
        }}
      >
        {showObjects &&
          trial.layout.map(({ id, color, rect }) => (
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
              <Text style={styles.label}>{names[id]}</Text>
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
  rule: { flex: 1, color: '#ffd60a', fontSize: 16, fontWeight: '600' },
  board: { flex: 1 },
  object: { position: 'absolute', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#fff', fontSize: 22, fontWeight: '600' },
});
