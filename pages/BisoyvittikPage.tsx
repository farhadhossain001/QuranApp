import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { BisoyvittikIcon } from '../components/CustomIcons';
import { ChevronRight, Folder, Loader2 } from 'lucide-react';

interface Category {
  id: number;
  source_id: number;
  title: string;
  description: string | null;
  translation_language: string;
  source_language: string;
  items_count?: number;
  has_children?: boolean;
  category_items?: string;
  sub_categories?: Category[];
}

const API_BASE = 'https://api3.islamhouse.com/v3/paV29H2gm56kvLP/main';

const BisoyvittikPage = () => {
  const { t, setHeaderTitle, settings } = useAppStore();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHeaderTitle(t('bisoyvittik'));
  }, [t, setHeaderTitle]);

  useEffect(() => {
    fetchCategories();
  }, [settings.appLanguage]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const lang = settings.appLanguage === 'bn' ? 'bn' : 'en';
      const response = await fetch(`${API_BASE}/get-categories-tree/${lang}/json`);
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data.sub_categories || []);
    } catch (err) {
      setError(t('categoriesError'));
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category: Category) => {
    navigate(`/bisoyvittik/${category.id}/subcategories`, { 
      state: { 
        category: category,
        title: category.title
      } 
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-gray-500">{t('categoriesLoading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchCategories}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
        >
          {t('update')}
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20 space-y-6">
      <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-2xl flex items-center gap-4">
        <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full">
          <BisoyvittikIcon size={32} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('bisoyvittik')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('bisoyvittikDesc')}</p>
        </div>
      </div>

      <div className="space-y-3">
        {categories.map(category => (
          <div
            key={category.id}
            onClick={() => handleCategoryClick(category)}
            className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-800 rounded-xl p-4 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                <Folder className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                  {category.title}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  {category.sub_categories && category.sub_categories.length > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {category.sub_categories.length} {t('subcategories')}
                    </span>
                  )}
                  {category.items_count && category.items_count > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {category.items_count} {t('items')}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          {t('noResults')}
        </div>
      )}
    </div>
  );
};

export default BisoyvittikPage;
