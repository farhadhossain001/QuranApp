
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { getHadiths, getHadithBooks } from '../services/api';
import { Hadith, ARABIC_FONT_SIZES, FONT_SIZES, HadithEdition } from '../types';
import { Copy } from 'lucide-react';
import SettingsDrawer from '../components/SettingsDrawer';

const HadithDetailsPage = () => {
    const { bookSlug, chapterNumber } = useParams<{ bookSlug: string, chapterNumber: string }>();
    const { setHeaderTitle, settings, t } = useAppStore();
    const [hadiths, setHadiths] = useState<Hadith[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Language Selection State
    // We store the full edition slug (e.g. 'eng-abudawud')
    const [selectedEditionSlug, setSelectedEditionSlug] = useState<string>('');
    const [availableEditions, setAvailableEditions] = useState<HadithEdition[]>([]);

    // 1. Fetch Book Metadata to populate language selector
    useEffect(() => {
        const init = async () => {
            if (!bookSlug) return;
            const books = await getHadithBooks();
            const book = books.find(b => b.id === bookSlug);
            
            if (book) {
                // Filter distinct languages (preferring one edition per language for simplicity, or listing all)
                // We will list all NON-ARABIC editions, or all if user wants
                // Usually we want to select the "Translation". Arabic is base.
                const translations = book.editions.filter(e => e.language.toLowerCase() !== 'arabic');
                
                // Group by language to avoid clutter if multiple editions exist for same lang?
                // For now, let's just list them. If name is cryptic, show language.
                // Sort: English, Bangla, then alphabetical
                translations.sort((a, b) => {
                    const langA = a.language.toLowerCase();
                    const langB = b.language.toLowerCase();
                    if (langA === 'english') return -1;
                    if (langB === 'english') return 1;
                    if (langA === 'bengali') return -1;
                    if (langB === 'bengali') return 1;
                    return langA.localeCompare(langB);
                });

                setAvailableEditions(translations);

                // Set default selection
                // 1. Check LocalStorage for previously selected edition for this book
                const storedSlug = localStorage.getItem(`hadith_edition_${bookSlug}`);
                let defaultEd = null;

                if (storedSlug) {
                    defaultEd = translations.find(e => e.name === storedSlug);
                }

                // 2. If no stored pref, try to match app language settings
                if (!defaultEd) {
                    const appLang = settings.appLanguage === 'bn' ? 'bengali' : 'english';
                    defaultEd = translations.find(e => e.language.toLowerCase() === appLang) 
                                || translations.find(e => e.language.toLowerCase() === 'english')
                                || translations[0];
                }
                
                if (defaultEd) {
                    setSelectedEditionSlug(defaultEd.name);
                }
            }
        };
        init();
    }, [bookSlug, settings.appLanguage]);

    // 2. Fetch Hadiths when slug, chapter, or selected edition changes
    useEffect(() => {
        if (bookSlug && chapterNumber && selectedEditionSlug) {
            setHeaderTitle(`${t('hadith')} - Section ${chapterNumber}`);
            setLoading(true);
            
            const fetchHadithsData = async () => {
                // Pass the selected edition slug to API
                const data = await getHadiths(bookSlug, chapterNumber, selectedEditionSlug);
                setHadiths(data);
                setLoading(false);
            };
            fetchHadithsData();
        } else if (bookSlug && chapterNumber && !selectedEditionSlug && availableEditions.length > 0) {
            // Wait for edition selection initialization
        }
    }, [bookSlug, chapterNumber, setHeaderTitle, t, selectedEditionSlug, availableEditions.length]);

    const handleEditionChange = (slug: string) => {
        setSelectedEditionSlug(slug);
        if (bookSlug) {
            localStorage.setItem(`hadith_edition_${bookSlug}`, slug);
        }
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const cleanText = (text: string) => {
        if (!text) return '';
        return text.replace(/<[^>]*>?/gm, '');
    };

    if (loading && hadiths.length === 0) {
        return (
            <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-64 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-20">
            {/* Settings Drawer Integration */}
            <SettingsDrawer 
                type="hadith" 
                hadithOptions={{
                    editions: availableEditions,
                    selected: selectedEditionSlug,
                    onSelect: handleEditionChange
                }}
            />

            {/* Hadiths List */}
            {hadiths.map((hadith, index) => (
                <div 
                    key={index} 
                    className="bg-white dark:bg-surface-dark p-6 sm:p-8 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm"
                >
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">
                        <span className="bg-gray-100 dark:bg-gray-800 text-primary dark:text-primary-dark px-3 py-1 rounded-full text-xs font-bold">
                            Hadith {hadith.hadithNumber}
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleCopy(`${cleanText(hadith.textArabic)}\n\n${cleanText(hadith.textTranslation)}`)}
                                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                                title="Copy"
                            >
                                <Copy size={18} />
                            </button>
                        </div>
                    </div>

                    {settings.showArabic && hadith.textArabic && (
                        <div className={`font-amiri text-right leading-[2.2] mb-6 text-gray-900 dark:text-gray-100 ${ARABIC_FONT_SIZES[settings.fontSize as keyof typeof ARABIC_FONT_SIZES]}`}>
                            {cleanText(hadith.textArabic)}
                        </div>
                    )}

                    {settings.showTranslation && hadith.textTranslation && (
                        <div className={`space-y-4 ${FONT_SIZES[settings.fontSize as keyof typeof FONT_SIZES]}`}>
                            <div className="text-gray-600 dark:text-gray-400 leading-relaxed font-light font-sans">
                                {cleanText(hadith.textTranslation)}
                            </div>
                        </div>
                    )}

                    {hadith.grades && hadith.grades.length > 0 && (
                        <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2 justify-end">
                            {hadith.grades.map((g, i) => (
                                <span key={i} className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                                    g.grade.toLowerCase().includes('sahih') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    g.grade.toLowerCase().includes('hasan') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                    'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                }`}>
                                    {g.grade}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            ))}
            
            {!loading && hadiths.length === 0 && (
                <div className="text-center py-10 text-gray-500">
                    {t('loading') === 'Loading...' ? 'No hadiths found or translation unavailable.' : 'কোন হাদিস পাওয়া যায়নি।'}
                </div>
            )}
        </div>
    );
};

export default HadithDetailsPage;
