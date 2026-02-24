
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { ChevronDown, ChevronUp, Copy, Check, Share2 } from 'lucide-react';
import { getDuaCategoryById, Dua, DuaCategory } from '../services/duaData';

const DuaDetailsPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { t, setHeaderTitle } = useAppStore();
  const [category, setCategory] = useState<DuaCategory | null>(null);
  const [expandedDua, setExpandedDua] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    const found = getDuaCategoryById(parseInt(categoryId || '0'));
    setCategory(found || null);
  }, [categoryId]);

  useEffect(() => {
    if (category) {
      setHeaderTitle(category.title);
    } else {
      setHeaderTitle(t('dua'));
    }
  }, [category, setHeaderTitle, t]);

  const toggleDua = (duaId: number) => {
    setExpandedDua(expandedDua === duaId ? null : duaId);
  };

  const copyToClipboard = async (text: string, duaId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(duaId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareDua = async (dua: Dua) => {
    const text = `${dua.title}\n\n${dua.arabic}\n\n${dua.pronunciation}\n\n${dua.meaning}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: dua.title,
          text: text
        });
      } else {
        copyToClipboard(text, dua.id);
      }
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  if (!category) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-gray-500 dark:text-gray-400">{t('comingSoon')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
        <h2 className="text-lg font-bold mb-1">{category.title}</h2>
        <p className="text-sm opacity-90">{category.total_duas} {t('totalDuas')}</p>
      </div>

      <div className="space-y-3">
        {category.duas.map((dua) => (
          <div
            key={dua.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
          >
            <button
              onClick={() => toggleDua(dua.id)}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div className="flex-1 pr-4">
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                  {dua.id}. {dua.title}
                </h3>
              </div>
              {expandedDua === dua.id ? (
              <ChevronUp size={20} className="text-gray-400 flex-shrink-0 transition-transform duration-300" />
            ) : (
              <ChevronDown size={20} className="text-gray-400 flex-shrink-0 transition-transform duration-300" />
            )}
            </button>

            <div 
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                expandedDua === dua.id ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700">
                {dua.arabic && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      {t('arabic')}
                    </p>
                    <p className="text-xl font-arabic text-right leading-loose text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg" dir="rtl">
                      {dua.arabic}
                    </p>
                  </div>
                )}

                {dua.pronunciation && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      {t('pronunciation')}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                      {dua.pronunciation}
                    </p>
                  </div>
                )}

                {dua.meaning && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                      {t('meaning')}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                      {dua.meaning}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => copyToClipboard(dua.arabic, dua.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    {copiedId === dua.id ? (
                      <>
                        <Check size={14} className="text-green-500" />
                        {t('copied')}
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        {t('copy')}
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => shareDua(dua)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <Share2 size={14} />
                    {t('share')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DuaDetailsPage;
