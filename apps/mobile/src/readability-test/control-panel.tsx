import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { formatSeconds, type TrialResult } from './use-readability-trial';

export type Mode = 'training' | 'test';

const TARGET_SECONDS = 20;

type Props = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  showObjects: boolean;
  onShowObjectsChange: (value: boolean) => void;
  namesOnHold: boolean;
  onNamesOnHoldChange: (value: boolean) => void;
  trialRunning: boolean;
  onStartTrial: () => void;
  onShuffle: () => void;
  results: readonly TrialResult[];
};

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function Summary({ results }: { results: readonly TrialResult[] }) {
  if (results.length === 0) {
    return <Text style={styles.muted}>Cel: znalezienie obiektu w mniej niż {TARGET_SECONDS} s</Text>;
  }
  const times = results.map((result) => result.seconds);
  const fast = times.filter((time) => time < TARGET_SECONDS).length;
  const last = results.slice(-4).reverse();
  return (
    <View>
      <Text style={styles.text}>
        Próby: {results.length} · mediana {formatSeconds(median(times))} s · poniżej {TARGET_SECONDS} s: {fast}/
        {results.length}
      </Text>
      <Text style={styles.muted}>
        {last
          .map((result) => `${result.targetName} ${formatSeconds(result.seconds)} s (błędy: ${result.errors})`)
          .join('  ·  ')}
      </Text>
    </View>
  );
}

export function ControlPanel(props: Props) {
  const { mode, trialRunning } = props;
  return (
    <View style={styles.panel}>
      <View style={styles.row}>
        {(['training', 'test'] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => props.onModeChange(value)}
            style={[styles.segment, mode === value && styles.segmentActive]}
          >
            <Text style={styles.text}>{value === 'training' ? 'Trening' : 'Test'}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={mode === 'test' ? props.onStartTrial : props.onShuffle}
          style={[styles.button, trialRunning && styles.buttonBusy]}
        >
          <Text style={styles.buttonText}>
            {mode === 'training' ? 'Losuj układ' : trialRunning ? 'Próba trwa…' : 'Nowa próba'}
          </Text>
        </Pressable>
      </View>
      <View style={styles.row}>
        <Text style={styles.text}>Pokaż obiekty</Text>
        <Switch value={props.showObjects} onValueChange={props.onShowObjectsChange} />
        <Text style={styles.text}>Nazwy po przytrzymaniu</Text>
        <Switch value={props.namesOnHold} onValueChange={props.onNamesOnHoldChange} />
      </View>
      {mode === 'test' && <Summary results={props.results} />}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { padding: 12, gap: 10, backgroundColor: '#111', borderTopWidth: 1, borderTopColor: '#333' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  segment: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#222' },
  segmentActive: { backgroundColor: '#3a5fb5' },
  button: { marginLeft: 'auto', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#e8e8e8' },
  buttonBusy: { backgroundColor: '#888' },
  buttonText: { color: '#000', fontWeight: '600' },
  text: { color: '#fff' },
  muted: { color: '#999', fontSize: 12 },
});
