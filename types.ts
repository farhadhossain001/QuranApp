export interface Surah {
  id: number;
  revelation_place: string;
  revelation_order: number;
  bismillah_pre: boolean;
  name_simple: string;
  name_complex: string;
  name_arabic: string;
  verses_count: number;
  translated_name: {
    language_name: string;
    name: string;
  };
}

export interface Translation {
  id: number;
  resource_id: number;
  text: string;
}

export interface AudioFile {
  url: string;
  duration?: number;
}

export interface Ayah {
  id: number;
  verse_number: number;
  verse_key: string;
  text_uthmani: string;
  translations: Translation[];
  audio?: AudioFile;
}

export interface Bookmark {
  id: string; // "surahId:ayahId"
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  timestamp: number;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  fontSize: number; // 1 to 5 scale
  showTranslation: boolean;
  showTransliteration: boolean;
  reciterId: number;
  appLanguage: 'en' | 'bn';
  translationMode: 'en' | 'bn' | 'both'; // Controls which translations to show
  location: {
    latitude: number;
    longitude: number;
    address?: string; // Optional display name
  };
  // Audio Preferences
  volume: number; // 0.0 to 1.0
  playbackRate: number; // 0.5, 0.75, 1, 1.25, 1.5, 2
  repeatMode: 'none' | 'one' | 'all'; // 'all' means auto-play next
}

export const FONT_SIZES = {
  1: 'text-lg',
  2: 'text-xl',
  3: 'text-2xl',
  4: 'text-3xl',
  5: 'text-4xl',
};

export const ARABIC_FONT_SIZES = {
  1: 'text-2xl',
  2: 'text-3xl',
  3: 'text-4xl',
  4: 'text-5xl',
  5: 'text-6xl',
};