
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
    title_en: "নূরানী পদ্ধতিতে ব্যবহারিক নামাজ শিক্ষা",
    title_bn: "নূরানী পদ্ধতিতে ব্যবহারিক নামাজ শিক্ষা",
    author: "প্রকৌশলী মইনুল হোসেন",
    description: "A comprehensive guide to Islamic Jurisprudence (Hanafi Fiqh) covering purification and prayer.",
    pdfUrl: "https://archive.org/download/azharmea-www.eelm.weebly.com-skype-id-azharmea/NamazerBishoy.pdf",
    coverImage: "https://i.ibb.co.com/sppd793n/image.png", 
    color: "bg-emerald-600"
  },
  {
    id: "2",
    title_en: "ধারাবাহিক পূর্ণাঙ্গ নামায শিক্ষা",
    title_bn: "ধারাবাহিক পূর্ণাঙ্গ নামায শিক্ষা",
    author: "মাওলানা মোঃ ফজলুর রহমান আশরাফী",
    description: "A simple guide to performing Salat with illustrations.",
    pdfUrl: "https://ia600909.us.archive.org/16/items/dharabahik-purnango-namaz-shikkha-pdf/dharabahik-purnango-namaz-shikkha-pdf.pdf",
    coverImage: "https://i.ibb.co.com/bMCh4Sqj/image.png",
    color: "bg-blue-600"
  },
  {
    id: "3",
    title_en: "এসো নামাজ পড়ি",
    title_bn: "এসো নামাজ পড়ি",
    author: "আবদুস শহীদ নাসিম",
    description: "Authentic method of performing prayer according to Sunnah.",
    pdfUrl: "https://ia801909.us.archive.org/1/items/20200923_20200923_1927/%E0%A6%8F%E0%A6%B8%E0%A7%8B%20%E0%A6%A8%E0%A6%BE%E0%A6%AE%E0%A6%BE%E0%A6%AF%20%E0%A6%AA%E0%A6%A1%E0%A6%BC%E0%A6%BF%20-%20%E0%A6%86%E0%A6%AC%E0%A6%A6%E0%A7%81%E0%A6%B8%20%E0%A6%B6%E0%A6%B9%E0%A7%80%E0%A6%A6%20%E0%A6%A8%E0%A6%BE%E0%A6%B8%E0%A6%BF%E0%A6%AE.pdf", 
    coverImage: "https://archive.org/services/img/20200923_20200923_1927",
    color: "bg-teal-600"
  },
  {
    id: "4",
    title_en: "নামাযের মাসায়েল",
    title_bn: "নামাযের মাসায়েল",
    author: "মুহাম্মদ ইকবাল কীলানী",
    description: "Detailed rulings regarding prayer.",
    pdfUrl: "https://archive.org/download/MasayeleNamaz/Masayele%20Namaz.pdf",
    coverImage: "https://archive.org/services/img/20200811_20200811_1705",
    color: "bg-indigo-600"
  }
];
