import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
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

const BisoyvittikSubcategoriesPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, setHeaderTitle, settings } = useAppStore();
  
  const category = location.state?.category as Category | undefined;
  const categoryTitle = location.state?.title || category?.title || '';
  
  const [subcategories, setSubcategories] = useState<Category[]>(category?.sub_categories || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHeaderTitle(categoryTitle || t('subcategories'));
  }, [categoryTitle, setHeaderTitle, t]);

  useEffect(() => {
    if (category?.sub_categories) {
      setSubcategories(category.sub_categories);
    }
  }, [category]);

  const handleSubcategoryClick = (sub: Category) => {
    navigate(`/bisoyvittik/${sub.id}/items`, {
      state: {
        subcategory: sub,
        title: sub.title
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
          onClick={() => {}}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
        >
          {t('update')}
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20 space-y-4">
      {category?.description && (
        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl">
          <p className="text-sm text-gray-600 dark:text-gray-400">{category.description}</p>
        </div>
      )}

      <div className="space-y-3">
        {subcategories.map(sub => (
          <div
            key={sub.id}
            onClick={() => handleSubcategoryClick(sub)}
            className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-800 rounded-xl p-4 cursor-pointer hover:border-emerald-500 hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                <Folder className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                  {sub.title}
                </h3>
                <div className="flex items-center gap-3 mt-1">
                  {sub.sub_categories && sub.sub_categories.length > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {sub.sub_categories.length} {t('subcategories')}
                    </span>
                  )}
                  {sub.items_count && sub.items_count > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {sub.items_count} {t('items')}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {subcategories.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          {t('noResults')}
        </div>
      )}
    </div>
  );
};

export default BisoyvittikSubcategoriesPage;
