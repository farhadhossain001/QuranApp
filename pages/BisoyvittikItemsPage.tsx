import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { ChevronRight, Loader2, FileText, Music, Video, BookOpen } from 'lucide-react';

interface Category {
  id: number;
  source_id: number;
  title: string;
  description: string | null;
  items_count?: number;
  sub_categories?: Category[];
}

interface Item {
  id: number;
  source_id: number;
  title: string;
  description: string | null;
  type: string;
  add_date: number;
  source_language: string;
  translated_language: string;
  prepared_by?: Array<{ id: number; title: string | null; kind: string }>;
  attachments?: Array<{
    order: number;
    size: string;
    extension_type: string;
    description: string | null;
    url: string;
  }>;
}

interface ItemsResponse {
  links: {
    next: string;
    prev: string;
    first: string;
    last: string;
    current_page: number;
    pages_number: number;
    total_items: number;
  };
  data: Item[];
}

const API_BASE = 'https://api3.islamhouse.com/v3/paV29H2gm56kvLP/main';

const getItemIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'audio':
    case 'mp3':
      return <Music className="w-5 h-5 text-purple-500" />;
    case 'video':
      return <Video className="w-5 h-5 text-red-500" />;
    case 'book':
    case 'books':
      return <BookOpen className="w-5 h-5 text-blue-500" />;
    case 'article':
    case 'articles':
      return <FileText className="w-5 h-5 text-green-500" />;
    default:
      return <FileText className="w-5 h-5 text-gray-500" />;
  }
};

const BisoyvittikItemsPage = () => {
  const { subcategoryId } = useParams<{ subcategoryId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t, setHeaderTitle, settings } = useAppStore();
  
  const subcategory = location.state?.subcategory as Category | undefined;
  const subcategoryTitle = location.state?.title || subcategory?.title || '';
  
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    setHeaderTitle(subcategoryTitle || t('items'));
  }, [subcategoryTitle, setHeaderTitle, t]);

  useEffect(() => {
    if (subcategoryId) {
      fetchItems(1);
    }
  }, [subcategoryId, settings.appLanguage]);

  const fetchItems = async (page: number) => {
    try {
      if (page === 1) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      
      const lang = settings.appLanguage === 'bn' ? 'bn' : 'en';
      const response = await fetch(
        `${API_BASE}/get-category-items/${subcategoryId}/showall/${lang}/${lang}/${page}/25/json`
      );
      
      if (!response.ok) throw new Error('Failed to fetch items');
      
      const data: ItemsResponse = await response.json();
      
      if (page === 1) {
        setItems(data.data || []);
      } else {
        setItems(prev => [...prev, ...(data.data || [])]);
      }
      
      setTotalPages(data.links?.pages_number || 1);
      setTotalItems(data.links?.total_items || 0);
      
    } catch (err) {
      setError(t('categoriesError'));
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchItems(nextPage);
  };

  const handleItemClick = (item: Item) => {
    if (item.attachments && item.attachments.length > 0) {
      const attachment = item.attachments[0];
      if (attachment.extension_type === 'PDF') {
        navigate(`/read-book/islamhouse-${item.id}`, {
          state: {
            title: item.title,
            pdfUrl: attachment.url,
            type: 'islamhouse'
          }
        });
      } else {
        window.open(attachment.url, '_blank');
      }
    }
  };

  const getAuthorNames = (item: Item) => {
    if (!item.prepared_by || item.prepared_by.length === 0) return null;
    const authors = item.prepared_by
      .filter(p => p.kind === 'author' && p.title)
      .map(p => p.title);
    const translators = item.prepared_by
      .filter(p => p.kind === 'translator' && p.title)
      .map(p => p.title);
    
    if (authors.length > 0) return authors.join(', ');
    if (translators.length > 0) return translators.join(', ');
    return null;
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
          onClick={() => fetchItems(1)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
        >
          {t('update')}
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20 space-y-4">
      {subcategory?.description && (
        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl">
          <p className="text-sm text-gray-600 dark:text-gray-400">{subcategory.description}</p>
        </div>
      )}

      {totalItems > 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {totalItems} {t('items')}
        </p>
      )}

      <div className="space-y-3">
        {items.map(item => (
          <div
            key={item.id}
            onClick={() => handleItemClick(item)}
            className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-800 rounded-xl p-4 cursor-pointer hover:border-primary hover:shadow-md transition-all active:scale-[0.98]"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                {getItemIcon(item.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded capitalize">
                    {item.type}
                  </span>
                  {item.attachments && item.attachments.length > 0 && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                      {item.attachments[0].extension_type}
                      {item.attachments[0].size && ` • ${item.attachments[0].size}`}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
            </div>
            
            {getAuthorNames(item) && (
              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {t('author')}: {getAuthorNames(item)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {loadingMore && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      )}

      {currentPage < totalPages && !loadingMore && items.length > 0 && (
        <button
          onClick={loadMore}
          className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition"
        >
          {t('loadMoreItems')}
        </button>
      )}

      {!loading && items.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          {t('noResults')}
        </div>
      )}
    </div>
  );
};

export default BisoyvittikItemsPage;
