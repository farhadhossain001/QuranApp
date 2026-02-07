
import { Surah, Ayah, HadithBook, HadithChapter, Hadith, TranslationResource, Reciter, NameOfAllah } from '../types';
import { asmaData } from '../utils/asmaData';

const BASE_URL = 'https://api.quran.com/api/v4';

// Hadith API Configuration (New Provider)
const HADITH_BASE_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1';

// Islamic API Key
const ISLAMIC_API_KEY = '3Z7SzW1uBjvE2S0pJjmJtyHF9fYZ9ficVNL2k2p9fMxhZhlR';

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

// Fetch available translations
export const getAvailableTranslations = async (): Promise<TranslationResource[]> => {
    try {
        const response = await fetch(`${BASE_URL}/resources/translations`);
        if (!response.ok) throw new Error('Failed to fetch translations');
        const data = await response.json();
        return data.translations;
    } catch (error) {
        console.error(error);
        return [];
    }
};

// Fetch available reciters
export const getReciters = async (): Promise<Reciter[]> => {
    try {
        const response = await fetch(`${BASE_URL}/resources/recitations`);
        if (!response.ok) throw new Error('Failed to fetch recitations');
        const data = await response.json();
        return data.recitations;
    } catch (error) {
        console.error(error);
        return [];
    }
};

// Getting verses with audio and dynamic translations
export const getVerses = async (
    chapterId: number, 
    page = 1, 
    limit = 20, 
    translationIds: number[] = [20],
    reciterId: number = 7 // Default Mishary (7)
): Promise<{ verses: Ayah[], total_pages: number } | null> => {
  try {
    const translationsParam = translationIds.length > 0 ? translationIds.join(',') : '20';
    
    // Request audio by passing `audio={reciterId}`
    const url = `${BASE_URL}/verses/by_chapter/${chapterId}?language=en&words=false&translations=${translationsParam}&audio=${reciterId}&page=${page}&per_page=${limit}&fields=text_uthmani`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch verses');
    const data = await response.json();
    
    // Transform Response to standard Ayah format with full audio URL
    const verses: Ayah[] = data.verses.map((v: any) => {
        let audioUrl = '';
        if (v.audio && v.audio.url) {
            audioUrl = v.audio.url.startsWith('http') ? v.audio.url : `https://audio.qurancdn.com/${v.audio.url}`;
        }

        return {
            ...v,
            audio: {
                url: audioUrl
            }
        };
    });

    return {
      verses: verses,
      total_pages: data.pagination.total_pages
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};

// Fetch specific Ayah Audio (Used for Fallback mechanism)
export const getSpecificAyahAudio = async (surahId: number, ayahId: number, reciterId: number): Promise<string | null> => {
  try {
    const url = `${BASE_URL}/verses/by_key/${surahId}:${ayahId}?audio=${reciterId}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const verse = data.verse;
    if (verse && verse.audio && verse.audio.url) {
         return verse.audio.url.startsWith('http') ? verse.audio.url : `https://audio.qurancdn.com/${verse.audio.url}`;
    }
    return null;
  } catch (error) {
    console.error("Error fetching specific ayah audio:", error);
    return null;
  }
};

// Get Audio for a specific verse (Deprecated: Using dynamic audio from getVerses now)
// kept for legacy fallback if needed
export const getAyahAudioUrl = (surahId: number, ayahId: number, reciterId = 7): string => {
    return ''; 
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
export const getPrayerTimes = async (lat: number, lng: number, dateObj?: Date) => {
  try {
    const date = dateObj || new Date();
    // Padding date components to ensure DD-MM-YYYY format
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const year = date.getFullYear();
    const dateStr = `${day}-${month}-${year}`;

    const url = `https://api.aladhan.com/v1/timings/${dateStr}?latitude=${lat}&longitude=${lng}&method=1&school=1`;
    
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

// --- Asma-ul-Husna API ---

export const getAsmaUlHusna = async (language: 'en' | 'bn'): Promise<NameOfAllah[]> => {
    // 1. First, try to fetch from the API as per user request
    try {
        const url = `https://islamicapi.com/api/v1/asma-ul-husna/?language=${language}&api_key=${ISLAMIC_API_KEY}`;
        
        const response = await fetch(url);
        
        if (response.ok) {
             const data = await response.json();
             if (data.status === 200 && data.data) {
                 return data.data.map((item: any, index: number) => {
                    // Handle relative audio paths if the API returns them
                    // Example input: "/audio/asma-ul-husna/rahman.mp3"
                    // Target: "https://islamicapi.com/audio/asma-ul-husna/rahman.mp3"
                    let audioUrl = item.audio;
                    if (audioUrl && !audioUrl.startsWith('http')) {
                        audioUrl = `https://islamicapi.com${audioUrl}`;
                    }
                    
                    return {
                        id: item.number || index + 1, // 'number' from json
                        arabic: item.name || item.arabic, // 'name' from json
                        transliteration: item.transliteration,
                        translation: item.translation || item.meaning, 
                        meaning: item.meaning,
                        audio: audioUrl
                    };
                });
             }
        }
        throw new Error("Primary API failed");
    } catch (e) {
        console.warn("API failed, switching to local fallback...", e);
        
        // 2. Fallback to Local Data (Robust & Fast)
        // This ensures the page always loads, and supports Bangla specifically as requested
        // Local data already has fully qualified audio URLs
        return asmaData[language] || asmaData['en'];
    }
}
