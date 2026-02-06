import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getChapters } from '../services/api';
import { Surah } from '../types';
import { Search } from 'lucide-react';
import { useAppStore } from '../context/Store';

const QuranPage = () => {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { t, formatNumber, getSurahName, setHeaderTitle } = useAppStore();

  useEffect(() => {
    setHeaderTitle(t('quran'));
  }, [t, setHeaderTitle]);

  useEffect(() => {
    const fetchSurahs = async () => {
      const data = await getChapters();
      setSurahs(data);
      setLoading(false);
    };
    fetchSurahs();
  }, []);

  const filteredSurahs = surahs.filter(surah => 
    surah.name_simple.toLowerCase().includes(searchQuery.toLowerCase()) ||
    surah.name_arabic.includes(searchQuery) ||
    surah.translated_name.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    surah.id.toString() === searchQuery || 
    getSurahName(surah).includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder={t('searchPlaceholder')}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 transition shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSurahs.map((surah) => (
            <Link 
              key={surah.id} 
              to={`/surah/${surah.id}`}
              className="group bg-white dark:bg-surface-dark p-4 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-primary dark:hover:border-primary-dark transition shadow-sm hover:shadow-md flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-sm font-bold text-primary dark:text-primary-dark group-hover:bg-primary group-hover:text-white transition-colors">
                  {formatNumber(surah.id)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{getSurahName(surah)}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{surah.translated_name.name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-amiri text-xl text-gray-800 dark:text-gray-200">{surah.name_arabic}</p>
                <p className="text-[10px] text-gray-400">{formatNumber(surah.verses_count)} {t('verses')}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuranPage;