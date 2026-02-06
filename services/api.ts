
import { Surah, Ayah, HadithBook, HadithChapter, Hadith } from '../types';

const BASE_URL = 'https://api.quran.com/api/v4';

// Hadith API Configuration (New Provider)
const HADITH_BASE_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1';

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
    if (!response.ok) throw new Error('Failed to fetch Quran chapters');
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

// --- Hadith API Functions (New Provider) ---

// In-memory cache to prevent re-fetching large JSON files
let editionsCache: any = null;
let infoCache: any = null;

const fetchEditions = async () => {
    if (editionsCache) return editionsCache;
    try {
        const res = await fetch(`${HADITH_BASE_URL}/editions.min.json`);
        if (!res.ok) throw new Error("Failed to fetch editions");
        const data = await res.json();
        editionsCache = data;
        return data;
    } catch (e) {
        console.error(e);
        return {};
    }
};

const fetchInfo = async () => {
    if (infoCache) return infoCache;
    try {
        const res = await fetch(`${HADITH_BASE_URL}/info.min.json`);
        if (!res.ok) throw new Error("Failed to fetch hadith info");
        const data = await res.json();
        infoCache = data;
        return data;
    } catch (e) {
        console.error(e);
        return {};
    }
}

export const getHadithBooks = async (): Promise<HadithBook[]> => {
  try {
    const editions = await fetchEditions();
    // editions.min.json structure: { "abudawud": { "name": "Sunan Abu Dawud", "collection": [...] }, ... }
    
    return Object.entries(editions).map(([slug, data]: [string, any]) => {
        return {
            id: slug,
            name: data.name || slug,
            editions: (data.collection || []).map((c: any) => ({
                name: c.name, // e.g. "ben-abudawud"
                language: c.language, // e.g. "Bengali"
                link: c.link
            }))
        };
    });
  } catch (error) {
    console.error("Error getting hadith books:", error);
    return [];
  }
};

export const getHadithChapters = async (bookSlug: string): Promise<HadithChapter[]> => {
  try {
    const info = await fetchInfo();
    const bookInfo = info[bookSlug];
    
    if (!bookInfo || !bookInfo.metadata || !bookInfo.metadata.sections) {
        return [];
    }

    const sections = bookInfo.metadata.sections;
    // sections is object { "1": "Revelation", ... }
    
    return Object.entries(sections).map(([number, title]) => ({
        id: number,
        sectionNumber: number,
        sectionName: title as string,
        bookSlug: bookSlug
    }));
  } catch (error) {
    console.error("Error getting hadith chapters:", error);
    return [];
  }
};

export const getHadiths = async (bookSlug: string, sectionNumber: string, translationEditionSlug?: string): Promise<Hadith[]> => {
  try {
    // 1. Get Metadata to identify Arabic edition
    const editionsData = await fetchEditions();
    const bookData = editionsData[bookSlug];
    
    if (!bookData || !bookData.collection) return [];

    const collection = bookData.collection;

    // Find Arabic edition (Source text)
    // Usually starts with 'ara-', or language is Arabic
    const arabicEdition = collection.find((c: any) => c.language.toLowerCase() === 'arabic' && c.name.startsWith('ara-')) 
                          || collection.find((c: any) => c.language.toLowerCase() === 'arabic')
                          || { name: `ara-${bookSlug}` };
    
    const arabicSlug = arabicEdition.name;

    // Determine Translation Edition
    let transSlug = translationEditionSlug;
    
    // If no specific translation provided, try to find English or Bengali default
    if (!transSlug) {
        const eng = collection.find((c: any) => c.language.toLowerCase() === 'english');
        transSlug = eng ? eng.name : null;
    }

    // Construct URLs for sections
    const arabicUrl = `${HADITH_BASE_URL}/editions/${arabicSlug}/sections/${sectionNumber}.json`;
    
    const promises = [fetch(arabicUrl).catch(e => null)];
    if (transSlug && transSlug !== arabicSlug) {
        const transUrl = `${HADITH_BASE_URL}/editions/${transSlug}/sections/${sectionNumber}.json`;
        promises.push(fetch(transUrl).catch(e => null));
    }

    const responses = await Promise.all(promises);
    const araRes = responses[0];
    const transRes = responses[1]; // might be undefined

    let araData: any = {};
    let transData: any = {};

    if (araRes && araRes.ok) araData = await araRes.json();
    if (transRes && transRes.ok) transData = await transRes.json();

    const hadiths: Hadith[] = [];
    const araHadiths = araData.hadiths || [];
    const transHadiths = transData.hadiths || [];

    // Map translation by hadithnumber
    const transMap = new Map();
    transHadiths.forEach((h: any) => transMap.set(h.hadithnumber, h));

    // Combine
    araHadiths.forEach((araH: any) => {
        const transH = transMap.get(araH.hadithnumber);
        
        hadiths.push({
            hadithNumber: araH.hadithnumber,
            textArabic: araH.text || "",
            textTranslation: transH ? transH.text : "", // Empty if no translation found
            grades: araH.grades || []
        });
    });

    // Handle case where Arabic might be missing but translation exists
    if (hadiths.length === 0 && transHadiths.length > 0) {
        transHadiths.forEach((transH: any) => {
            hadiths.push({
                hadithNumber: transH.hadithnumber,
                textArabic: "",
                textTranslation: transH.text,
                grades: transH.grades || []
            });
        });
    }

    return hadiths;

  } catch (error) {
    console.error(error);
    return [];
  }
};