
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

export interface TranslationResource {
  id: number;
  name: string;
  author_name: string;
  slug: string;
  language_name: string;
  translated_name: {
    name: string;
    language_name: string;
  };
}

export interface Reciter {
  id: number;
  reciter_name: string;
  style: string;
  translated_name: {
    name: string;
    language_name: string;
  };
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
  showArabic: boolean;
  showTranslation: boolean;
  showTransliteration: boolean;
  reciterId: number;
  appLanguage: 'en' | 'bn';
  selectedTranslationIds: number[]; // Array of resource IDs (e.g. [20, 131])
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

// Hadith Interfaces - Updated for fawazahmed0/hadith-api
export interface HadithEdition {
  name: string; // slug, e.g. "eng-abudawud"
  language: string; // e.g. "English"
  link: string; // full book url
}

export interface HadithBook {
  id: string; // slug, e.g., 'abudawud'
  name: string; // Display Name, e.g. 'Sunan Abu Dawud'
  editions: HadithEdition[];
}

export interface HadithChapter {
  id: string; // Section ID/Number (e.g. "1")
  sectionNumber: string; 
  sectionName: string; // e.g. "Revelation"
  bookSlug: string;
}

export interface HadithGrade {
  grade: string;
  source_name?: string;
  error?: string;
}

export interface Hadith {
  hadithNumber: string;
  textArabic: string;
  textTranslation: string;
  grades: HadithGrade[];
}

// Asma-ul-Husna Interface
export interface NameOfAllah {
  id: number;
  arabic: string;
  transliteration: string;
  translation: string; // Normalized field, API might return 'meaning' or language specific
  meaning?: string; // Detailed meaning
  audio?: string; // Audio URL
}

// Tafsir Interfaces
export interface TafsirResource {
  id: number;
  name: string;
  author_name: string;
  slug: string;
  language_name: string;
  translated_name: {
    name: string;
    language_name: string;
  };
}

export interface Tafsir {
  resource_id: number;
  resource_name: string;
  language_id: number;
  slug: string;
  translated_name: {
    name: string;
    language_name: string;
  };
  text: string; // HTML content
}

// Radio Interfaces
export interface RadioStation {
  id: number;
  name: string;
  nameAr: string;
  description: string;
  country: string;
  language: string;
  genre: string[];
  streamUrl: string;
  streamFormat: string;
  bitrate: string;
  website: string;
  status: string;
  lastChecked: string;
}

export interface RadioApiResponse {
  status: string;
  version: string;
  timestamp: string;
  total: number;
  stations: RadioStation[];
  metadata: {
    apiVersion: string;
    documentation: string;
    updateFrequency: string;
    license: string;
    sources: string[];
  };
}
