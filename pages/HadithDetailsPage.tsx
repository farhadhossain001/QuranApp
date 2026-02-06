import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { getHadiths } from '../services/api';
import { Hadith, ARABIC_FONT_SIZES, FONT_SIZES } from '../types';
import { Share2, Copy } from 'lucide-react';

const HadithDetailsPage = () => {
    const { bookSlug, chapterNumber } = useParams<{ bookSlug: string, chapterNumber: string }>();
    const { setHeaderTitle, settings } = useAppStore();
    const [hadiths, setHadiths] = useState<Hadith[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (bookSlug && chapterNumber) {
            setHeaderTitle(`Chapter ${chapterNumber}`);
            
            const fetchHadithsData = async () => {
                const data = await getHadiths(bookSlug, chapterNumber);
                setHadiths(data);
                setLoading(false);
            };
            fetchHadithsData();
        }
    }, [bookSlug, chapterNumber, setHeaderTitle]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add toast notification here
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-3xl mx-auto pb-20">
            {hadiths.map((hadith) => (
                <div 
                    key={hadith.id} 
                    className="bg-white dark:bg-surface-dark p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm"
                >
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                        <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-bold">
                            Hadith {hadith.hadithNumber}
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleCopy(`${hadith.hadithArabic}\n\n${hadith.hadithEnglish}`)}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                                title="Copy"
                            >
                                <Copy size={18} />
                            </button>
                        </div>
                    </div>

                    {hadith.englishNarrator && (
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 font-medium italic">
                            Narrated by: {hadith.englishNarrator}
                        </p>
                    )}

                    <div className={`font-amiri text-right leading-[2.2] mb-6 text-gray-900 dark:text-gray-100 ${ARABIC_FONT_SIZES[settings.fontSize as keyof typeof ARABIC_FONT_SIZES]}`}>
                        {hadith.hadithArabic}
                    </div>

                    <div className={`text-gray-700 dark:text-gray-300 leading-relaxed ${FONT_SIZES[settings.fontSize as keyof typeof FONT_SIZES]}`}>
                        {hadith.hadithEnglish}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                            hadith.status === 'Sahih' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            hadith.status === 'Hasan' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                            {hadith.status}
                        </span>
                    </div>
                </div>
            ))}
            
            {hadiths.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                    No hadiths found for this chapter.
                </div>
            )}
        </div>
    );
};

export default HadithDetailsPage;