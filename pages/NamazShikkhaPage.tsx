
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { NamazIcon } from '../components/CustomIcons';
import { namazBooks, NamazBook } from '../utils/namazBooks';
import { Search, BookOpen, User } from 'lucide-react';

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

      {/* Books Grid - Vertical Cards Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {filteredBooks.map((book) => (
          <Link 
            key={book.id} 
            to={`/read-book/${book.id}`}
            className="group flex flex-col gap-3"
          >
            {/* Cover Image Section - Vertical Aspect Ratio (2:3) */}
            <div className={`relative aspect-[2/3] w-full overflow-hidden rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 ${book.color || 'bg-gray-100'}`}>
                {book.coverImage ? (
                    <>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors z-10" />
                        <img 
                            src={book.coverImage} 
                            alt={book.title_en}
                            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                            }}
                        />
                        {/* Fallback if image fails or loading */}
                        <div className="hidden absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                            <BookOpen className="text-gray-400 mb-2" size={32} />
                            <span className="text-xs text-gray-500 font-medium line-clamp-2">
                                {settings.appLanguage === 'bn' ? book.title_bn : book.title_en}
                            </span>
                        </div>
                    </>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                        <BookOpen className="text-white/40" size={40} />
                         <span className="text-xs text-white/80 font-medium mt-2 line-clamp-2 relative z-20">
                            {settings.appLanguage === 'bn' ? book.title_bn : book.title_en}
                        </span>
                    </div>
                )}
            </div>

            {/* Content Section - Title & Author Only */}
            <div className="flex flex-col px-1">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-primary transition-colors mb-1">
                    {settings.appLanguage === 'bn' ? book.title_bn : book.title_en}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                   <User size={12} />
                   <span className="truncate">{book.author}</span>
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
