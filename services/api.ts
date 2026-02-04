import { Surah, Ayah } from '../types';

const BASE_URL = 'https://api.quran.com/api/v4';

// Translation IDs: 
// 161: Bangla (Dr. Abu Bakr Muhammad Zakaria)
// 131: Bangla (Taisirul Quran)
// 20: English (Saheeh International)
const TRANSLATION_IDS = '161,131,20';

export const RECITERS = [
  { id: 7, name: 'Abdul Basit (Murattal)', path: 'Abdul_Basit_Murattal_64kbps' },
  { id: 2, name: 'Mishari Rashid al-Afasy', path: 'Alafasy_64kbps' },
  { id: 1, name: 'Mahmoud Khalil Al-Hussary', path: 'Husary_64kbps' },
  { id: 4, name: 'Abu Bakr al-Shatri', path: 'Abu_Bakr_Ash-Shaatree_128kbps' },
];

export const getChapters = async (): Promise<Surah[]> => {
  try {
    const response = await fetch(`${BASE_URL}/chapters`);
    if (!response.ok) throw new Error('Failed to fetch chapters');
    const data = await response.json();
    return data.chapters;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getChapterInfo = async (id: number): Promise<Surah | null> => {
  try {
    const response = await fetch(`${BASE_URL}/chapters/${id}`);
    if (!response.ok) throw new Error('Failed to fetch chapter info');
    const data = await response.json();
    return data.chapter;
  } catch (error) {
    console.error(error);
    return null;
  }
};

// Getting verses with audio and translations
export const getVerses = async (chapterId: number, page = 1, limit = 20): Promise<{ verses: Ayah[], total_pages: number } | null> => {
  try {
    // We request audio_url as well to simplify things, though strictly the API structure separates them often.
    // Using `fields` to get text_uthmani
    const url = `${BASE_URL}/verses/by_chapter/${chapterId}?language=en&words=false&translations=${TRANSLATION_IDS}&page=${page}&per_page=${limit}&fields=text_uthmani`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch verses');
    const data = await response.json();
    
    return {
      verses: data.verses,
      total_pages: data.pagination.total_pages
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};

// Get Audio for a specific verse (using the recital endpoint specific for ayahs)
export const getAyahAudioUrl = (surahId: number, ayahId: number, reciterId = 7): string => {
  const reciter = RECITERS.find(r => r.id === reciterId) || RECITERS[0];
  const formattedSurah = surahId.toString().padStart(3, '0');
  const formattedAyah = ayahId.toString().padStart(3, '0');
  
  // Using EveryAyah for reliable audio source
  return `https://everyayah.com/data/${reciter.path}/${formattedSurah}${formattedAyah}.mp3`;
};

// Search
export const searchVerses = async (query: string, page = 1) => {
    try {
        const response = await fetch(`${BASE_URL}/search?q=${query}&size=20&page=${page}&language=en`);
        if(!response.ok) throw new Error("Search failed");
        return await response.json();
    } catch (e) {
        console.error(e);
        return null;
    }
}

// Prayer Times
export const getPrayerTimes = async (lat: number, lng: number) => {
  try {
    const date = new Date();
    // Padding date components to ensure DD-MM-YYYY format
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = date.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=2`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch prayer times");
    const data = await response.json();
    return data.data; // Aladhan returns { code: 200, status: "OK", data: { ... } }
  } catch (e) {
    console.error(e);
    return null;
  }
};