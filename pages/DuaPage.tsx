
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { ChevronRight, BookOpen } from 'lucide-react';
import { getDuaCategories, DuaCategory } from '../services/duaData';

const DuaPage = () => {
  const { t, setHeaderTitle } = useAppStore();
  const [categories, setCategories] = useState<DuaCategory[]>([]);

  useEffect(() => {
    setHeaderTitle(t('dua'));
    setCategories(getDuaCategories());
  }, [setHeaderTitle, t]);

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
        <h2 className="text-lg font-bold mb-1">{t('duaCategories')}</h2>
        <p className="text-sm opacity-90">{t('duaDesc')}</p>
      </div>

      <div className="space-y-3">
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/dua/${category.id}`}
            className="block bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center">
                  <BookOpen size={24} className="text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                    {category.title}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {category.total_duas} {t('totalDuas')}
                  </p>
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default DuaPage;
