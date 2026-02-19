
export interface KitabBook {
  id: string;
  title_en: string;
  title_bn: string;
  author: string;
  description: string;
  pdfUrl: string;
  coverImage: string;
  color?: string;
}

export const kitabBooks: KitabBook[] = [
  {
    id: "kitab-1",
    title_en: "Arabic Holy Quran",
    title_bn: "কুরআন মাজিদ",
    author: "",
    description: "",
    pdfUrl: "https://dn721609.ca.archive.org/0/items/holy-quran-beautiful-arabic-text/holy-quran-beautiful-arabic-text.pdf",
    coverImage: "https://ia803408.us.archive.org/BookReader/BookReaderImages.php?zip=/20/items/holy-quran-beautiful-arabic-text/holy-quran-beautiful-arabic-text_jp2.zip&file=holy-quran-beautiful-arabic-text_jp2/holy-quran-beautiful-arabic-text_0000.jp2&id=holy-quran-beautiful-arabic-text&scale=4&rotate=0",
    color: "bg-emerald-600"
  },
  {
    id: "kitab-2",
    title_en: "Arabic Holy Quran",
    title_bn: "কুরআন মাজিদ",
    author: "",
    description: "",
    pdfUrl: "https://dn721808.ca.archive.org/0/items/al-quran-15-lines-saudi-color_202512/AlQuran15Lines-SaudiColor.pdf",
    coverImage: "https://ia802307.us.archive.org/BookReader/BookReaderImages.php?zip=/22/items/al-quran-15-lines-saudi-color_202512/AlQuran15Lines-SaudiColor_jp2.zip&file=AlQuran15Lines-SaudiColor_jp2/AlQuran15Lines-SaudiColor_0000.jp2&id=al-quran-15-lines-saudi-color_202512&scale=2&rotate=0",
    color: "bg-blue-600"
  },
  {
    id: "kitab-3",
    title_en: "Bangla Translation",
    title_bn: "বাংলা অনুবাদ",
    author: "",
    description: "Stories and lessons from the lives of the Companions of the Prophet.",
    pdfUrl: "https://quraneralo.com/quran/Quran_Arabic+Bangla_Translation.pdf",
    coverImage: "https://image2url.com/r2/default/images/1771517632749-b68118e8-128a-4fe7-a8c4-0bc8abd4c8cf.png",
    color: "bg-teal-600"
  },
      {
    id: "kitab-5",
    title_en: "Arabic English Translation",
    title_bn: "আরবি ইংরেজি অনুবাদ",
    author: "",
    description: "A comprehensive guide on Islamic jurisprudence and daily life.",
    pdfUrl: "https://media.islamicity.org/wp-content/uploads/quran/quran-arabic-english-clearquran-edition-allah.pdf",
    coverImage: "https://image2url.com/r2/default/images/1771518221445-82c339e6-2864-41ab-a00c-2f5d44f99fc3.png",
    color: "bg-indigo-600"
  },
  
  {
    id: "kitab-4",
    title_en: "English Translation",
    title_bn: "ইংরেজি অনুবাদ",
    author: "",
    description: "A comprehensive guide on Islamic jurisprudence and daily life.",
    pdfUrl: "https://www.clearquran.com/downloads/quran-english-translation-clearquran-edition-allah.pdf",
    coverImage: "https://image2url.com/r2/default/images/1771518221445-82c339e6-2864-41ab-a00c-2f5d44f99fc3.png",
    color: "bg-indigo-600"
  }
];
