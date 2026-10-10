import * as Speech from 'expo-speech';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ControlPanel, type Mode } from '@/readability-test/control-panel';
import { ExplorationBoard } from '@/readability-test/exploration-board';
import { SCENE_OBJECTS } from '@/readability-test/scene';
import { useObjectSounds } from '@/readability-test/use-object-sounds';
import { useReadabilityTrial } from '@/readability-test/use-readability-trial';
import { useSpeaker } from '@/readability-test/use-speaker';

/**
 * Readability test: can a blindfolded person find an object by sound alone?
 * The tester only touches the board; a teammate operates the panel below it.
 */
export default function ReadabilityTestScreen() {
  const sounds = useObjectSounds(SCENE_OBJECTS);
  const speak = useSpeaker(sounds.setDucked);
  const trial = useReadabilityTrial(speak);
  const [mode, setMode] = useState<Mode>('training');
  const [showObjects, setShowObjects] = useState(true);
  const [namesOnHold, setNamesOnHold] = useState(true);

  const changeMode = (next: Mode) => {
    void Speech.stop();
    trial.cancel();
    setMode(next);
    setShowObjects(next === 'training');
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <ExplorationBoard
        objects={trial.layout}
        showObjects={showObjects}
        onTouchStart={trial.markTouch}
        onObjectChange={(object) => sounds.setActive(object?.id ?? null)}
        onHold={(object) => namesOnHold && speak(object.name)}
        onDoubleTap={(object) => {
          if (mode === 'test') trial.confirm(object);
          else if (object) speak(object.name);
        }}
      />
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
});
