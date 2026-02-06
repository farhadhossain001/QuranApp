import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ScrollText, Book, ArrowRight } from 'lucide-react';
import { useAppStore } from '../context/Store';
import { getHadithBooks } from '../services/api';
import { HadithBook } from '../types';

const HadithPage = () => {
    const { t, setHeaderTitle } = useAppStore();
    const [books, setBooks] = useState<HadithBook[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setHeaderTitle(t('hadith'));
        const fetchBooks = async () => {
            const data = await getHadithBooks();
            setBooks(data);
            setLoading(false);
        };
        fetchBooks();
    }, [t, setHeaderTitle]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="bg-orange-50 dark:bg-orange-900/10 p-6 rounded-2xl flex items-center gap-4 mb-6">
                <div className="p-4 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-full">
                    <ScrollText size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('hadith')}</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">{t('hadithDesc')}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {books.map((book) => (
                    <Link 
                        key={book.id} 
                        to={`/hadith/${book.bookSlug}`}
                        className="group bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-primary dark:hover:border-primary-dark transition shadow-sm hover:shadow-md flex flex-col justify-between"
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-xl text-primary dark:text-primary-dark group-hover:bg-primary group-hover:text-white transition-colors">
                                <Book size={24} />
                            </div>
                            <span className="text-xs font-bold px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-gray-500 dark:text-gray-400">
                                {book.hadiths_count} Hadiths
                            </span>
                        </div>
                        
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-primary transition-colors">
                                {book.bookName}
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{book.writerName}</p>
                            
                            <div className="flex items-center text-sm font-medium text-primary dark:text-primary-dark opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
                                Read Book <ArrowRight size={16} className="ml-1" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default HadithPage;