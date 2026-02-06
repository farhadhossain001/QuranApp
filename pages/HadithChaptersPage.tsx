
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { getHadithChapters } from '../services/api';
import { HadithChapter } from '../types';
import { Search } from 'lucide-react';

const HadithChaptersPage = () => {
    const { bookSlug } = useParams<{ bookSlug: string }>();
    const { setHeaderTitle } = useAppStore();
    const [chapters, setChapters] = useState<HadithChapter[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (bookSlug) {
            // Capitalize slug for title display roughly
            const title = bookSlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            setHeaderTitle(title);
            
            const fetchChapters = async () => {
                const data = await getHadithChapters(bookSlug);
                setChapters(data);
                setLoading(false);
            };
            fetchChapters();
        }
    }, [bookSlug, setHeaderTitle]);

    const filteredChapters = chapters.filter(c => 
        c.sectionName.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.sectionNumber.includes(searchQuery)
    );

    return (
        <div className="space-y-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input 
                    type="text" 
                    placeholder="Search sections..."
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 transition shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredChapters.map((chapter) => (
                        <Link 
                            key={chapter.id} 
                            to={`/hadith/${bookSlug}/${chapter.sectionNumber}`}
                            className="block bg-white dark:bg-surface-dark p-5 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-primary dark:hover:border-primary-dark transition shadow-sm hover:shadow-md group"
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 group-hover:bg-primary group-hover:text-white transition-colors">
                                        {chapter.sectionNumber}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                                            {chapter.sectionName}
                                        </h3>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                    {filteredChapters.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            No chapters found matching "{searchQuery}"
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HadithChaptersPage;