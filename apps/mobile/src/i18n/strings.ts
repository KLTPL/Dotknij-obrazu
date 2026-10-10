import type { ArtworkLanguage } from '@repo/shared';

/**
 * Every text of the app's own screens, spoken or shown, in both languages.
 * The texts about artworks come from the packages (see localizeManifest).
 */
const pl = {
  /** Language of the speech engine. */
  locale: 'pl-PL',
  seconds: (seconds: number) => seconds.toFixed(1).replace('.', ','),
  welcome: {
    lead:
      'Poznawaj obrazy dotykiem i słuchem. Wódź palcem po obrazie: dźwięk mówi, co jest pod palcem, ' +
      'a telefon drga na krawędziach. Stuknij dwa razy, aby usłyszeć opis.',
    advice: 'Zacznij od krótkiego treningu na prostych kształtach.',
    buttons: 'Na dole ekranu są dwa przyciski: trening i galeria.',
    training: 'Zacznij trening',
    gallery: 'Przejdź do galerii',
  },
  gallery: {
    heading: 'Galeria',
    training: 'Trening',
    trainingHint: 'Krótkie ćwiczenie przed poznawaniem obrazów',
    settings: 'Ustawienia',
    explore: 'Poznaj obraz',
    landscape: '↻ Telefon poziomo',
    portrait: 'Telefon pionowo',
    objects: (count: number) => `Obiekty do odkrycia: ${count}`,
    pageLabel: (title: string, author: string, year: string, teaser: string, objects: number, landscape: boolean) =>
      `${title}. ${author}, ${year}. ${teaser} Obiektów do odkrycia: ${objects}. ` +
      (landscape ? 'Obraz poziomy, telefon trzeba będzie obrócić poziomo.' : 'Obraz pionowy.'),
    pageHint: 'Otwiera obraz do poznawania dotykiem',
    teaser: (title: string, author: string, year: string, teaser: string) => `${title}. ${author}, ${year}. ${teaser}`,
    howTo: 'Stuknij dwa razy, aby poznać obraz. Przesuń palcem w górę, aby przejść do następnego.',
    actionDescription: 'Opis obrazu',
    actionStory: 'Historia obrazu',
    actionDetails: 'Szczegóły i lista obiektów',
    end: 'Koniec galerii',
    endSpoken: 'Koniec galerii. Przesuń palcem w dół, aby wrócić do obrazów.',
    backToStart: 'Wróć do pierwszego obrazu',
  },
  settings: {
    title: 'Ustawienia',
    language: 'Język',
    preview: 'Dźwięki w galerii',
    previewText: 'Obraz na ekranie cicho gra swoje dźwięki',
    voice: 'Głos lektora i tempo mowy',
    voiceHint: 'Otwiera ustawienia mowy telefonu, gdzie można zmienić głos i tempo',
    training: 'Trening',
    welcome: 'Pokaż ekran powitalny',
    gestures: 'Gesty na obrazie',
    gestureList: [
      'Wódź jednym palcem: słychać obiekt pod palcem, a kontury drgają.',
      'Stuknij dwa razy: nazwa i opis obiektu. Jeszcze raz: jego historia.',
      'Stuknij dwoma palcami: opis obrazu albo zatrzymanie mowy.',
      'W galerii przesuń w górę lub w dół, aby zmienić obraz.',
      'Gest wstecz, czyli przesunięcie palcem od krawędzi ekranu do środka: powrót do galerii.',
    ],
    about: 'O aplikacji',
    aboutText:
      'Obrazy pochodzą z domeny publicznej. Dźwięki to nagrania CC0 i z domeny publicznej ' +
      'oraz nasza własna synteza.',
  },
  details: {
    open: 'Info',
    openLabel: 'Opis obrazu i lista obiektów',
    close: 'Zamknij',
    description: 'Opis',
    story: 'Historia',
    objects: 'Obiekty',
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
      'Stuknij dwa razy, aby usłyszeć, czego dotykasz. Stuknij dwoma palcami, aby usłyszeć opis obrazu. ' +
      'Aby wrócić do galerii, użyj gestu wstecz: przesuń palcem od krawędzi ekranu do środka.',
    boardLabel: (title: string) => `Obraz ${title}`,
    boardHint: 'Aby poznawać go palcem, wstrzymaj czytnik ekranu. Opis i lista obiektów są w akcjach.',
    actionObjects: 'Lista obiektów',
    actionStop: 'Zatrzymaj mowę',
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
  welcome: {
    lead:
      'Explore paintings by touch and sound. Move a finger across a painting: the sound tells you what is ' +
      'under your finger, and the phone vibrates on the edges. Double tap to hear a description.',
    advice: 'Start with a short training on simple shapes.',
    buttons: 'At the bottom of the screen there are two buttons: training and gallery.',
    training: 'Start training',
    gallery: 'Go to the gallery',
  },
  gallery: {
    heading: 'Gallery',
    training: 'Training',
    trainingHint: 'A short exercise before exploring paintings',
    settings: 'Settings',
    explore: 'Explore the painting',
    landscape: '↻ Phone sideways',
    portrait: 'Phone upright',
    objects: (count) => `Objects to discover: ${count}`,
    pageLabel: (title, author, year, teaser, objects, landscape) =>
      `${title}. ${author}, ${year}. ${teaser} Objects to discover: ${objects}. ` +
      (landscape ? 'A wide painting, you will need to turn the phone sideways.' : 'A tall painting.'),
    pageHint: 'Opens the painting for exploring by touch',
    teaser: (title, author, year, teaser) => `${title}. ${author}, ${year}. ${teaser}`,
    howTo: 'Double tap to explore the painting. Swipe up to go to the next one.',
    actionDescription: 'Description of the painting',
    actionStory: 'Story of the painting',
    actionDetails: 'Details and list of objects',
    end: 'End of the gallery',
    endSpoken: 'End of the gallery. Swipe down to go back to the paintings.',
    backToStart: 'Back to the first painting',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    preview: 'Sounds in the gallery',
    previewText: 'The painting on screen quietly plays its sounds',
    voice: 'Narrator voice and speech rate',
    voiceHint: "Opens the phone's speech settings, where you can change the voice and its speed",
    training: 'Training',
    welcome: 'Show the welcome screen',
    gestures: 'Gestures on a painting',
    gestureList: [
      'Move one finger: you hear the object under it, and outlines vibrate.',
      'Double tap: name and description of an object. Again: its story.',
      'Tap with two fingers: description of the painting, or stop speech.',
      'In the gallery swipe up or down to change the painting.',
      'The back gesture, a swipe from the edge of the screen towards the middle: back to the gallery.',
    ],
    about: 'About',
    aboutText: 'The paintings are in the public domain. The sounds are CC0 and public domain recordings and our own synthesis.',
  },
  details: {
    open: 'Info',
    openLabel: 'Description of the painting and list of objects',
    close: 'Close',
    description: 'Description',
    story: 'Story',
    objects: 'Objects',
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
      'Double tap to hear what you are touching. Tap with two fingers to hear a description of the painting. ' +
      'To go back to the gallery, use the back gesture: swipe from the edge of the screen towards the middle.',
    boardLabel: (title) => `Painting: ${title}`,
    boardHint: 'To explore it with a finger, pause the screen reader. The description and the list of objects are in the actions.',
    actionObjects: 'List of objects',
    actionStop: 'Stop speech',
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
