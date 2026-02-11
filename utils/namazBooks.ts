
export interface NamazBook {
  id: string;
  title_en: string;
  title_bn: string;
  author: string;
  description: string;
  pdfUrl: string;
  coverImage: string;
  color?: string;
}

export const namazBooks: NamazBook[] = [
  {
    id: "1",
    title_en: "Nurul Idah / Namazer Bishoy",
    title_bn: "নুরুল ঈজাহ / নামাজের বিষয়",
    author: "Imam Shurunbulali",
    description: "A comprehensive guide to Islamic Jurisprudence (Hanafi Fiqh) covering purification and prayer.",
    pdfUrl: "https://archive.org/download/azharmea-www.eelm.weebly.com-skype-id-azharmea/NamazerBishoy.pdf",
    coverImage: "https://archive.org/download/NurulIdahEnglish/NurulIdahEnglish.jpg", 
    color: "bg-emerald-600"
  },
  {
    id: "2",
    title_en: "Salat (Prayer) Guide",
    title_bn: "সালাত (নামাজ) গাইড",
    author: "Unknown",
    description: "A simple guide to performing Salat with illustrations.",
    pdfUrl: "https://archive.org/download/RulesOfNamaz/RulesOfNamaz.pdf",
    coverImage: "https://archive.org/download/RulesOfNamaz/RulesOfNamaz.jpg",
    color: "bg-blue-600"
  },
  {
    id: "3",
    title_en: "Sahih Namaz Shikkha",
    title_bn: "সহীহ নামাজ শিক্ষা",
    author: "Mufti Mansurul Haque",
    description: "Authentic method of performing prayer according to Sunnah.",
    pdfUrl: "https://archive.org/download/SahihNamazShikkha/Sahih%20Namaz%20Shikkha.pdf", 
    coverImage: "https://ia800108.us.archive.org/30/items/SahihNamazShikkha/Sahih%20Namaz%20Shikkha_itemimage.png",
    color: "bg-teal-600"
  },
  {
    id: "4",
    title_en: "Masayele Namaz",
    title_bn: "মাসায়েলে নামাজ",
    author: "Shaykh Zakariyya",
    description: "Detailed rulings regarding prayer.",
    pdfUrl: "https://archive.org/download/MasayeleNamaz/Masayele%20Namaz.pdf",
    coverImage: "https://ia902604.us.archive.org/5/items/MasayeleNamaz/Masayele%20Namaz_itemimage.png",
    color: "bg-indigo-600"
  }
];
