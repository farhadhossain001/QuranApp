
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { NamazIcon } from '../components/CustomIcons';
import { namazBooks, NamazBook } from '../utils/namazBooks';
import { Search, BookOpen } from 'lucide-react';

const NamazShikkhaPage = () => {
  const { t, setHeaderTitle, settings } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [books, setBooks] = useState<NamazBook[]>(namazBooks);

  useEffect(() => {
    setHeaderTitle(t('namazShikkha'));
  }, [t, setHeaderTitle]);

  const filteredBooks = books.filter(book => 
    book.title_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.title_bn.includes(searchQuery) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="pb-20 space-y-6">
      {/* Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl flex items-center gap-4">
        <div className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full">
          <NamazIcon size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('namazShikkha')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('namazShikkhaDesc')}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input 
          type="text" 
          placeholder={t('searchBook')}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 focus:ring-primary/50 transition shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBooks.map((book) => (
          <Link 
            key={book.id} 
            to={`/read-book/${book.id}`}
            className="flex flex-col bg-white dark:bg-surface-dark rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 group h-full"
          >
            {/* Cover Image Section */}
            <div className={`relative h-48 w-full overflow-hidden ${book.color || 'bg-gray-100'} flex items-center justify-center`}>
                {book.coverImage ? (
                    <>
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors z-10" />
                        <img 
                            src={book.coverImage} 
                            alt={book.title_en}
                            className="h-full w-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                        {/* Fallback if image fails or loading */}
                        <div className="hidden absolute inset-0 flex items-center justify-center">
                            <BookOpen className="text-white/40" size={60} />
                        </div>
                    </>
                ) : (
                    <BookOpen className="text-white/40" size={60} />
                )}
                
                {/* Overlay Title for better visibility if image is busy */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pt-10 z-20">
                     <h3 className="text-white font-bold text-lg leading-tight line-clamp-1">
                        {settings.appLanguage === 'bn' ? book.title_bn : book.title_en}
                    </h3>
                </div>
            </div>

            {/* Content Section */}
            <div className="p-4 flex flex-col flex-1">
                <div className="mb-auto">
                    <p className="text-xs text-primary font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
                       <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block"></span>
                       {book.author}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
                        {book.description}
                    </p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="w-full bg-gray-50 dark:bg-gray-800 group-hover:bg-primary group-hover:text-white text-gray-700 dark:text-gray-300 py-2.5 rounded-lg font-medium text-center text-sm transition-colors flex items-center justify-center gap-2">
                        <BookOpen size={16} />
                        {t('readBook')}
                    </div>
                </div>
            </div>
          </Link>
        ))}
      </div>
      
      {filteredBooks.length === 0 && (
          <div className="text-center py-10 text-gray-500">
              No books found.
          </div>
      )}
    </div>
  );
};

export default NamazShikkhaPage;
