
import { Surah, Ayah, HadithBook, HadithChapter, Hadith, TranslationResource, Reciter, NameOfAllah, TafsirResource, Tafsir, RadioStation, RadioApiResponse } from '../types';
import { asmaData } from '../utils/asmaData';

const BASE_URL = 'https://api.quran.com/api/v4';

// Hadith API Configuration (New Provider)
const HADITH_BASE_URL = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1';

// API key moved to backend serverless function for security
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

// Random Ayah
export const getRandomAyah = async (translationIds: number[] = [20]): Promise<Ayah | null> => {
  try {
    const translationsParam = translationIds.length > 0 ? translationIds.join(',') : '20';
    const url = `${BASE_URL}/verses/random?language=en&words=false&translations=${translationsParam}&fields=text_uthmani`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch random ayah');
    const data = await response.json();
    return data.verse;
  } catch (error) {
    console.error(error);
    return null;
  }
};

// Search
export const searchVerses = async (query: string, page = 1) => {
  try {
    const response = await fetch(`${BASE_URL}/search?q=${query}&size=20&page=${page}&language=en`);
    if (!response.ok) throw new Error("Search failed");
    return await response.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

// Prayer Times - Using Islamic API
export const getPrayerTimes = async (lat: number, lng: number, dateObj?: Date) => {
  try {
    // Build URL for the serverless function instead of the direct Islamic API to avoid CORS issues
    // The serverless function will securely handle the API key
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/api/prayer-time?lat=${lat}&lng=${lng}`;

    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch prayer times");
    const result = await response.json();

    if (result.code !== 200 || result.status !== 'success') {
      throw new Error("API returned error status");
    }

    // Transform the response to match the expected structure
    // The components expect: timings (object with prayer times), date (with hijri info)
    const data = result.data;

    // Transform times to timings format (the new API uses 'times' instead of 'timings')
    // Also ensure the time format is consistent (no timezone suffix needed)
    const timings = {
      Fajr: data.times.Fajr,
      Sunrise: data.times.Sunrise,
      Dhuhr: data.times.Dhuhr,
      Asr: data.times.Asr,
      Maghrib: data.times.Maghrib,
      Isha: data.times.Isha,
      Imsak: data.times.Imsak,
      Midnight: data.times.Midnight,
      Firstthird: data.times.Firstthird,
      Lastthird: data.times.Lastthird,
      Sunset: data.times.Sunset
    };

    // Transform date structure to match expected format
    const date = {
      readable: data.date.readable,
      timestamp: data.date.timestamp,
      hijri: {
        date: data.date.hijri.date,
        format: data.date.hijri.format,
        day: data.date.hijri.day,
        weekday: data.date.hijri.weekday,
        month: {
          number: data.date.hijri.month.number,
          en: data.date.hijri.month.en,
          ar: data.date.hijri.month.ar,
          days: data.date.hijri.month.days
        },
        year: data.date.hijri.year,
        designation: data.date.hijri.designation,
        holidays: data.date.hijri.holidays || [],
        adjustedHolidays: data.date.hijri.adjustedHolidays || [],
        method: data.date.hijri.method,
        shift: data.date.hijri.shift
      },
      gregorian: data.date.gregorian
    };

    return {
      timings,
      date,
      qibla: data.qibla,
      prohibited_times: data.prohibited_times,
      timezone: data.timezone
    };
  } catch (e) {
    console.error(e);
    return null;
  }
};

// Calendar
export const getCalendar = async (month: number, year: number, adjustment: number = -1) => {
  try {
    const response = await fetch(`https://api.aladhan.com/v1/gToHCalendar/${month}/${year}?adjustment=${adjustment}&calendarMethod=MATHEMATICAL`);
    if (!response.ok) throw new Error("Failed to fetch calendar");
    const data = await response.json();
    return data.data;
  } catch (e) {
    console.error(e);
    return [];
  }
};

// Qibla Direction
export const getQiblaDirection = async (lat: number, lng: number) => {
  try {
    const response = await fetch(`https://api.aladhan.com/v1/qibla/${lat}/${lng}`);
    if (!response.ok) throw new Error("Failed to fetch qibla");
    const data = await response.json();
    return data.data.direction;
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
    const baseUrl = window.location.origin;
    const url = `${baseUrl}/api/asma-ul-husna?language=${language}`;

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

// --- Tafsir API Functions ---

// Cache for tafsir resources
let tafsirsCache: TafsirResource[] | null = null;

// Fetch available tafsirs
export const getAvailableTafsirs = async (): Promise<TafsirResource[]> => {
  if (tafsirsCache) return tafsirsCache;

  try {
    const response = await fetch(`${BASE_URL}/resources/tafsirs`);
    if (!response.ok) throw new Error('Failed to fetch tafsirs');
    const data = await response.json();
    tafsirsCache = data.tafsirs;
    return tafsirsCache || [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

// Fetch tafsir for a specific ayah
export const getTafsirForAyah = async (verseKey: string, tafsirId: number = 169): Promise<Tafsir | null> => {
  try {
    const response = await fetch(`${BASE_URL}/tafsirs/${tafsirId}/by_ayah/${verseKey}`);
    if (!response.ok) throw new Error('Failed to fetch tafsir');
    const data = await response.json();
    return data.tafsir;
  } catch (error) {
    console.error(error);
    return null;
  }
};

// --- Radio API Functions ---

// Cache for radio stations
let radioStationsCache: RadioStation[] | null = null;

// Radio API URL
const RADIO_API_URL = 'https://raw.githubusercontent.com/uthumany/radio-api/main/client/public/api/stations.json';

// Fetch all radio stations
export const getRadioStations = async (): Promise<RadioStation[]> => {
  if (radioStationsCache) return radioStationsCache;

  try {
    const response = await fetch(RADIO_API_URL);
    if (!response.ok) throw new Error('Failed to fetch radio stations');
    const data: RadioApiResponse = await response.json();
    radioStationsCache = data.stations;
    return radioStationsCache || [];
  } catch (error) {
    console.error(error);
    return [];
  }
};

// Get stations filtered by language
export const getStationsByLanguage = async (language: string): Promise<RadioStation[]> => {
  const stations = await getRadioStations();
  return stations.filter(station =>
    station.language.toLowerCase() === language.toLowerCase()
  );
};

// Get stations filtered by genre
export const getStationsByGenre = async (genre: string): Promise<RadioStation[]> => {
  const stations = await getRadioStations();
  return stations.filter(station =>
    station.genre.some(g => g.toLowerCase() === genre.toLowerCase())
  );
};

// Get unique languages from stations
export const getAvailableLanguages = async (): Promise<string[]> => {
  const stations = await getRadioStations();
  const languages = new Set(stations.map(s => s.language));
  return Array.from(languages).sort();
};

// Get unique genres from stations
export const getAvailableGenres = async (): Promise<string[]> => {
  const stations = await getRadioStations();
  const genres = new Set<string>();
  stations.forEach(s => s.genre.forEach(g => genres.add(g)));
  return Array.from(genres).sort();
};
