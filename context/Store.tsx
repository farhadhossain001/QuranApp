import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserSettings, Bookmark, Surah } from '../types';
import { translations } from '../utils/translations';
import { getAyahAudioUrl } from '../services/api';
import { toBengaliNumber } from '../utils/numberUtils';
import { surahNamesBn } from '../utils/surahData';

interface AudioState {
  isPlaying: boolean;
  currentSurahId: number | null;
  currentAyahId: number | null;
  audioUrl: string | null;
}

interface AppContextType {
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  bookmarks: Bookmark[];
  toggleBookmark: (bookmark: Bookmark) => void;
  audio: AudioState;
  playAyah: (surahId: number, ayahId: number, url: string) => void;
  pauseAudio: () => void;
  stopAudio: () => void;
  resumeAudio: () => void;
  playNextAyah: () => void;
  playPrevAyah: () => void;
  recentSurah: Surah | null;
  setRecentSurah: (surah: Surah) => void;
  t: (key: string) => string;
  formatNumber: (num: number | string) => string;
  getSurahName: (surah: Surah) => string;
}

const defaultSettings: UserSettings = {
  theme: 'light',
  fontSize: 3,
  showTranslation: true,
  showTransliteration: false,
  reciterId: 7,
  appLanguage: 'en',
  translationMode: 'both', // Default to show both translations
  location: {
    latitude: 23.8103, // Default Dhaka
    longitude: 90.4125,
    address: 'Dhaka (Default)'
  },
  volume: 1.0,
  playbackRate: 1.0,
  repeatMode: 'all', // Default to auto-play
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Settings State
  const [settings, setSettings] = useState<UserSettings>(() => {
    const stored = localStorage.getItem('quran_settings');
    // Migration: merge defaults for new properties (like location)
    const parsed = stored ? JSON.parse(stored) : {};
    return { ...defaultSettings, ...parsed, location: parsed.location || defaultSettings.location };
  });

  // Bookmarks State
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => {
    const stored = localStorage.getItem('quran_bookmarks');
    return stored ? JSON.parse(stored) : [];
  });

  // Recent Surah
  const [recentSurah, setRecentState] = useState<Surah | null>(() => {
      const stored = localStorage.getItem('quran_recent');
      return stored ? JSON.parse(stored) : null;
  });

  // Audio State
  const [audio, setAudio] = useState<AudioState>({
    isPlaying: false,
    currentSurahId: null,
    currentAyahId: null,
    audioUrl: null,
  });

  // Effects for Persistence
  useEffect(() => {
    localStorage.setItem('quran_settings', JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('quran_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  useEffect(() => {
      if(recentSurah) {
          localStorage.setItem('quran_recent', JSON.stringify(recentSurah));
      }
  }, [recentSurah]);

  // Actions
  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  const toggleBookmark = (bookmark: Bookmark) => {
    setBookmarks((prev) => {
      const exists = prev.find((b) => b.id === bookmark.id);
      if (exists) {
        return prev.filter((b) => b.id !== bookmark.id);
      }
      return [...prev, bookmark];
    });
  };

  const setRecentSurah = (surah: Surah) => {
      setRecentState(surah);
  }

  // Audio Actions
  const playAyah = (surahId: number, ayahId: number, url: string) => {
    setAudio({
      isPlaying: true,
      currentSurahId: surahId,
      currentAyahId: ayahId,
      audioUrl: url,
    });
  };

  const pauseAudio = () => {
    setAudio(prev => ({ ...prev, isPlaying: false }));
  };

  const resumeAudio = () => {
    if (audio.audioUrl) {
      setAudio(prev => ({ ...prev, isPlaying: true }));
    }
  };

  const stopAudio = () => {
      setAudio({
          isPlaying: false,
          currentSurahId: null,
          currentAyahId: null,
          audioUrl: null
      })
  }

  const playNextAyah = () => {
    if (audio.currentSurahId && audio.currentAyahId) {
      const nextAyahId = audio.currentAyahId + 1;
      const url = getAyahAudioUrl(audio.currentSurahId, nextAyahId, settings.reciterId);
      playAyah(audio.currentSurahId, nextAyahId, url);
    }
  };

  const playPrevAyah = () => {
    if (audio.currentSurahId && audio.currentAyahId && audio.currentAyahId > 1) {
      const prevAyahId = audio.currentAyahId - 1;
      const url = getAyahAudioUrl(audio.currentSurahId, prevAyahId, settings.reciterId);
      playAyah(audio.currentSurahId, prevAyahId, url);
    }
  };

  // Translation Helper
  const t = (key: string) => {
    return translations[settings.appLanguage]?.[key] || key;
  };

  // Number Formatter
  const formatNumber = (num: number | string): string => {
    if (settings.appLanguage === 'bn') {
      return toBengaliNumber(num);
    }
    return num.toString();
  };

  // Surah Name Helper
  const getSurahName = (surah: Surah): string => {
    if (settings.appLanguage === 'bn') {
      return surahNamesBn[surah.id] || surah.name_simple;
    }
    return surah.name_simple;
  };

  return (
    <AppContext.Provider
      value={{
        settings,
        updateSettings,
        bookmarks,
        toggleBookmark,
        audio,
        playAyah,
        pauseAudio,
        stopAudio,
        resumeAudio,
        playNextAyah,
        playPrevAyah,
        recentSurah,
        setRecentSurah,
        t,
        formatNumber,
        getSurahName
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used within AppProvider');
  return context;
};