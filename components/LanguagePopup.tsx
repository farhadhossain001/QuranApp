
import React, { useEffect, useState } from 'react';
import { useAppStore } from '../context/Store';
import { Globe } from 'lucide-react';

const LanguagePopup = () => {
  const { updateSettings } = useAppStore();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already selected a language
    const hasSelected = localStorage.getItem('language_setup_complete');
    if (!hasSelected) {
      setIsVisible(true);
    }
  }, []);

  const handleSelect = (lang: 'en' | 'bn') => {
    // Update global app state
    updateSettings({ appLanguage: lang });
    
    // Mark setup as complete
    localStorage.setItem('language_setup_complete', 'true');
    
    // Close popup
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 font-sans">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
      
      {/* Modal Card */}
      <div className="bg-white dark:bg-surface-dark rounded-[2rem] p-8 shadow-2xl max-w-sm w-full border border-gray-100 dark:border-gray-700 relative z-10 animate-slide-up">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 text-primary animate-pulse">
            <Globe size={32} />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Welcome</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Please select your preferred language
            <br />
            আপনার পছন্দের ভাষা নির্বাচন করুন
          </p>
        </div>
        
        <div className="space-y-4">
          <button 
            onClick={() => handleSelect('en')}
            className="w-full py-4 px-6 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-all duration-200 group flex items-center justify-between"
          >
            <span className="font-bold text-lg">English</span>
            <span className="text-2xl transform group-hover:scale-110 transition-transform duration-200">🇺🇸</span>
          </button>
          
          <button 
            onClick={() => handleSelect('bn')}
            className="w-full py-4 px-6 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-primary hover:text-white dark:hover:bg-primary dark:hover:text-white border border-gray-200 dark:border-gray-700 hover:border-primary dark:hover:border-primary transition-all duration-200 group flex items-center justify-between"
          >
            <span className="font-bold text-lg">বাংলা</span>
            <span className="text-2xl transform group-hover:scale-110 transition-transform duration-200">🇧🇩</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguagePopup;
