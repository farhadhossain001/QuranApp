import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/Store';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import QuranPage from './pages/QuranPage';
import PrayerTimesPage from './pages/PrayerTimesPage';
import HadithPage from './pages/HadithPage';
import HadithChaptersPage from './pages/HadithChaptersPage';
import HadithDetailsPage from './pages/HadithDetailsPage';
import SurahPage from './pages/SurahPage';
import BookmarksPage from './pages/BookmarksPage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/quran" element={<QuranPage />} />
            <Route path="/prayer-times" element={<PrayerTimesPage />} />
            <Route path="/hadith" element={<HadithPage />} />
            <Route path="/hadith/:bookSlug" element={<HadithChaptersPage />} />
            <Route path="/hadith/:bookSlug/:chapterNumber" element={<HadithDetailsPage />} />
            <Route path="/surah/:id" element={<SurahPage />} />
            <Route path="/bookmarks" element={<BookmarksPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </Layout>
      </HashRouter>
    </AppProvider>
  );
}

export default App;