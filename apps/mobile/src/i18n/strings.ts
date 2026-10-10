import type { ArtworkLanguage } from '@repo/shared';

/**
 * Every text of the app's own screens, spoken or shown, in both languages.
 * The texts about artworks come from the packages (see localizeManifest).
 */
const pl = {
  /** Language of the speech engine. */
  locale: 'pl-PL',
  seconds: (seconds: number) => seconds.toFixed(1).replace('.', ','),
  gallery: {
    tagline: 'Poznaj obraz, wodząc po nim palcem. Dźwięk mówi, co jest pod palcem.',
    language: 'Język',
    training: 'Trening',
    trainingText: '20 sekund ćwiczenia na prostych kształtach, zanim otworzysz obraz',
    trainingHint: 'Krótkie ćwiczenie przed poznawaniem obrazów',
    voice: 'Głos lektora i tempo mowy ›',
    voiceLabel: 'Głos lektora',
    voiceHint: 'Otwiera ustawienia mowy telefonu, gdzie można zmienić głos i tempo',
    heading: 'Galeria',
    landscape: '↻ Telefon poziomo',
    portrait: 'Telefon pionowo',
    cardLabel: (title: string, author: string, year: string, objects: number, landscape: boolean) =>
      `${title}. ${author}, ${year}. Obiektów do odkrycia: ${objects}. ` +
      (landscape ? 'Obraz poziomy, telefon trzeba będzie obrócić poziomo.' : 'Obraz pionowy.'),
    cardHint: 'Otwiera obraz do poznawania dotykiem',
  },
  artwork: {
    back: '‹ Galeria',
    backLabel: 'Wróć do galerii',
    gestures: 'Stuknij 2 razy: nazwa i opis obiektu · dwa palce: opis obrazu',
    holdLandscape: '↻ Trzymaj telefon poziomo',
    holdPortrait: 'Trzymaj telefon pionowo',
    storyHintObject: 'Stuknij dwa razy jeszcze raz, aby usłyszeć historię.',
    storyHintArtwork: 'Stuknij dwoma palcami jeszcze raz, aby usłyszeć historię obrazu.',
    nothingHere: 'Tutaj nie ma opisanego obiektu.',
    intro: (title: string, author: string, landscape: boolean) =>
      `${title}. ${author}. ` +
      (landscape ? 'Obraz poziomy. Obróć telefon poziomo. ' : 'Obraz pionowy. Trzymaj telefon pionowo. ') +
      'Słyszysz wszystkie dźwięki obrazu naraz. Wódź palcem po ekranie, aby je rozdzielić. ' +
      'Stuknij dwa razy, aby usłyszeć, czego dotykasz. Stuknij dwoma palcami, aby usłyszeć opis obrazu.',
    boardLabel: (title: string) => `Obraz ${title}. Aby poznawać go palcem, wstrzymaj czytnik ekranu.`,
  },
  training: {
    rule: 'Dźwięk mówi, co jest pod palcem, a nie gdzie.',
    intro: 'Trening. Dźwięk mówi, co jest pod palcem, a nie gdzie. Wódź palcem po ekranie. Przytrzymaj palec, aby usłyszeć nazwę.',
    boardLabel: 'Plansza treningowa. Aby ćwiczyć, wstrzymaj czytnik ekranu.',
    objects: { horse: 'koń', bird: 'ptak', water: 'woda' },
    find: (name: string) => `Znajdź: ${name}. Kiedy znajdziesz, dotknij dwa razy.`,
    wrong: (name: string) => `To nie jest ${name}.`,
    nothing: 'Tu nic nie ma.',
    bravo: (seconds: string) => `Brawo! Czas: ${seconds} sekundy.`,
    modeTraining: 'Trening',
    modeTest: 'Test',
    shuffle: 'Losuj układ',
    running: 'Próba trwa…',
    newTrial: 'Nowa próba',
    showObjects: 'Pokaż obiekty',
    namesOnHold: 'Nazwy po przytrzymaniu',
    goal: (target: number) => `Cel: znalezienie obiektu w mniej niż ${target} s`,
    summary: (trials: number, median: string, target: number, fast: number) =>
      `Próby: ${trials} · mediana ${median} s · poniżej ${target} s: ${fast}/${trials}`,
    result: (name: string, seconds: string, errors: number) => `${name} ${seconds} s (błędy: ${errors})`,
  },
};

export type Strings = typeof pl;

const en: Strings = {
  locale: 'en-US',
  seconds: (seconds) => seconds.toFixed(1),
  gallery: {
    tagline: 'Explore a painting by moving a finger across it. The sound tells you what is under your finger.',
    language: 'Language',
    training: 'Training',
    trainingText: '20 seconds of practice on simple shapes before you open a painting',
    trainingHint: 'A short exercise before exploring paintings',
    voice: 'Narrator voice and speech rate ›',
    voiceLabel: 'Narrator voice',
    voiceHint: "Opens the phone's speech settings, where you can change the voice and its speed",
    heading: 'Gallery',
    landscape: '↻ Phone sideways',
    portrait: 'Phone upright',
    cardLabel: (title, author, year, objects, landscape) =>
      `${title}. ${author}, ${year}. Objects to discover: ${objects}. ` +
      (landscape ? 'A wide painting, you will need to turn the phone sideways.' : 'A tall painting.'),
    cardHint: 'Opens the painting for exploring by touch',
  },
  artwork: {
    back: '‹ Gallery',
    backLabel: 'Back to the gallery',
    gestures: 'Double tap: name and description of an object · two fingers: the whole painting',
    holdLandscape: '↻ Hold the phone sideways',
    holdPortrait: 'Hold the phone upright',
    storyHintObject: 'Double tap again to hear the story.',
    storyHintArtwork: 'Tap with two fingers again to hear the story of the painting.',
    nothingHere: 'There is no described object here.',
    intro: (title, author, landscape) =>
      `${title}. ${author}. ` +
      (landscape ? 'A wide painting. Turn the phone sideways. ' : 'A tall painting. Hold the phone upright. ') +
      'You can hear all the sounds of the painting at once. Move a finger across the screen to tell them apart. ' +
      'Double tap to hear what you are touching. Tap with two fingers to hear a description of the painting.',
    boardLabel: (title) => `Painting: ${title}. To explore it with a finger, pause the screen reader.`,
  },
  training: {
    rule: 'The sound tells you what is under your finger, not where.',
    intro: 'Training. The sound tells you what is under your finger, not where. Move a finger across the screen. Hold it still to hear the name.',
    boardLabel: 'Training board. To practise, pause the screen reader.',
    objects: { horse: 'horse', bird: 'bird', water: 'water' },
    find: (name) => `Find: ${name}. When you find it, double tap.`,
    wrong: (name) => `This is not the ${name}.`,
    nothing: 'There is nothing here.',
    bravo: (seconds) => `Well done! Time: ${seconds} seconds.`,
    modeTraining: 'Training',
    modeTest: 'Test',
    shuffle: 'Shuffle layout',
    running: 'Trial running…',
    newTrial: 'New trial',
    showObjects: 'Show objects',
    namesOnHold: 'Names on hold',
    goal: (target) => `Goal: find the object in less than ${target} s`,
    summary: (trials, median, target, fast) =>
      `Trials: ${trials} · median ${median} s · under ${target} s: ${fast}/${trials}`,
    result: (name, seconds, errors) => `${name} ${seconds} s (errors: ${errors})`,
  },
};

export const STRINGS: Record<ArtworkLanguage, Strings> = { pl, en };

/** Names of the languages in themselves, for the switch in the gallery. */
export const LANGUAGE_NAMES: Record<ArtworkLanguage, string> = { pl: 'Polski', en: 'English' };
