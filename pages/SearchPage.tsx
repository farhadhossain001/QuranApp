import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { searchVerses } from '../services/api';
import { useAppStore } from '../context/Store';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { t } = useAppStore();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setSearched(true);
    const data = await searchVerses(query);
    if (data && data.search && data.search.results) {
      setResults(data.search.results);
    } else {
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">{t('searchTitle')}</h1>
      
      <form onSubmit={handleSearch} className="mb-8">
        <div className="relative">
            <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('searchHint')}
                className="w-full pl-4 pr-12 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button 
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-white rounded-lg hover:bg-opacity-90"
            >
                <Search size={18} />
            </button>
        </div>
      </form>

      {loading && (
          <div className="space-y-4">
              {[1,2,3].map(i => (
                  <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
              ))}
          </div>
      )}

      {!loading && searched && results.length === 0 && (
          <div className="text-center text-gray-500 py-10">
              <p className="font-medium">{t('noResults')} "{query}"</p>
              <p className="text-sm mt-2 text-gray-400">{t('noResultsDesc')}</p>
          </div>
      )}

      <div className="space-y-4">
          {results.map((result: any) => (
              <div key={result.verse_key} className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-bold text-primary dark:text-primary-dark bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                          {result.verse_key}
                      </span>
                      <Link to={`/surah/${result.chapter_id}`} className="text-xs text-gray-400 hover:text-primary">
                          {t('goToSurah')}
                      </Link>
                  </div>
                  
                  {/* Using dangerouslySetInnerHTML because search API returns <mark> tags */}
                  <div 
                    className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: result.text }}
                  />
              </div>
          ))}
      </div>
    </div>
  );
};

export default SearchPage;