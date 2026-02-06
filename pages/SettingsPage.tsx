
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../context/Store';
import { Moon, Sun, Monitor, Type, Globe, Mic, BookA, MapPin, Loader2 } from 'lucide-react';
import { RECITERS } from '../services/api';

const SettingsPage = () => {
  const { settings, updateSettings, t, setHeaderTitle } = useAppStore();
  const [detecting, setDetecting] = useState(false);
  const [manualCoords, setManualCoords] = useState({
      lat: settings.location.latitude.toString(),
      lng: settings.location.longitude.toString()
  });

  useEffect(() => {
    setHeaderTitle(t('settings'));
  }, [t, setHeaderTitle]);

  const handleGetCurrentLocation = () => {
      setDetecting(true);
      if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  updateSettings({
                      location: {
                          latitude: position.coords.latitude,
                          longitude: position.coords.longitude,
                          address: 'Current Location'
                      }
                  });
                  setManualCoords({
                      lat: position.coords.latitude.toString(),
                      lng: position.coords.longitude.toString()
                  });
                  setDetecting(false);
              },
              (error) => {
                  console.error(error);
                  alert(t('locationError') || 'Could not access location');
                  setDetecting(false);
              }
          );
      } else {
          alert('Geolocation is not supported by your browser');
          setDetecting(false);
      }
  };

  const handleManualUpdate = () => {
      const lat = parseFloat(manualCoords.lat);
      const lng = parseFloat(manualCoords.lng);
      if(!isNaN(lat) && !isNaN(lng)) {
          updateSettings({
              location: {
                  latitude: lat,
                  longitude: lng,
                  address: 'Custom Location'
              }
          });
      }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">

      {/* Location Settings */}
      <section className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-primary" />
            {t('locationSettings')}
        </h2>
        
        <div className="space-y-4">
            <button 
                onClick={handleGetCurrentLocation}
                disabled={detecting}
                className="w-full flex items-center justify-center gap-2 p-3 bg-secondary text-white rounded-xl font-medium hover:bg-opacity-90 transition disabled:opacity-70"
            >
                {detecting ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
                {detecting ? t('detecting') : t('useCurrentLocation')}
            </button>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-500 mb-3 font-medium uppercase">{t('setManually')}</p>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">{t('latitude')}</label>
                        <input 
                            type="text" 
                            value={manualCoords.lat}
                            onChange={(e) => setManualCoords({...manualCoords, lat: e.target.value})}
                            className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-400 mb-1 block">{t('longitude')}</label>
                        <input 
                            type="text" 
                            value={manualCoords.lng}
                            onChange={(e) => setManualCoords({...manualCoords, lng: e.target.value})}
                            className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm"
                        />
                    </div>
                </div>
                <button 
                    onClick={handleManualUpdate}
                    className="mt-3 w-full py-2 bg-gray-100 dark:bg-gray-800 text-primary dark:text-primary-dark rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                    {t('update')}
                </button>
            </div>
        </div>
      </section>

      {/* App Language */}
      <section className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe size={20} className="text-primary" />
            {t('appLanguage')}
        </h2>
        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => updateSettings({ appLanguage: 'en' })}
                className={`p-3 rounded-xl border font-medium transition ${settings.appLanguage === 'en' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
                {t('english')}
            </button>
            <button 
                onClick={() => updateSettings({ appLanguage: 'bn' })}
                className={`p-3 rounded-xl border font-medium transition ${settings.appLanguage === 'bn' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
                {t('bangla')}
            </button>
        </div>
      </section>

      {/* Translation Content Language */}
      <section className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookA size={20} className="text-primary" />
            {t('translationLanguage')}
        </h2>
        <div className="grid grid-cols-3 gap-2">
            <button 
                onClick={() => updateSettings({ translationMode: 'en' })}
                className={`p-3 rounded-xl border text-sm font-medium transition ${settings.translationMode === 'en' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
                {t('english')}
            </button>
            <button 
                onClick={() => updateSettings({ translationMode: 'bn' })}
                className={`p-3 rounded-xl border text-sm font-medium transition ${settings.translationMode === 'bn' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
                {t('bangla')}
            </button>
             <button 
                onClick={() => updateSettings({ translationMode: 'both' })}
                className={`p-3 rounded-xl border text-sm font-medium transition ${settings.translationMode === 'both' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
                {t('both')}
            </button>
        </div>
      </section>

      {/* Reciter */}
      <section className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Mic size={20} className="text-primary" />
            {t('reciter')}
        </h2>
        <select 
            value={settings.reciterId}
            onChange={(e) => updateSettings({ reciterId: parseInt(e.target.value) })}
            className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
            {RECITERS.map((reciter) => (
                <option key={reciter.id} value={reciter.id}>
                    {reciter.name}
                </option>
            ))}
        </select>
      </section>

      {/* Appearance */}
      <section className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Monitor size={20} className="text-primary" />
            {t('appearance')}
        </h2>
        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => updateSettings({ theme: 'light' })}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition ${settings.theme === 'light' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
                <Sun size={20} />
                <span>{t('light')}</span>
            </button>
            <button 
                onClick={() => updateSettings({ theme: 'dark' })}
                className={`flex items-center justify-center gap-2 p-4 rounded-xl border transition ${settings.theme === 'dark' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
                <Moon size={20} />
                <span>{t('dark')}</span>
            </button>
        </div>
      </section>

      {/* Typography */}
      <section className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Type size={20} className="text-primary" />
            {t('readingExp')}
        </h2>
        
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-medium mb-3 text-gray-600 dark:text-gray-400">{t('fontSize')}</label>
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-xl p-2">
                    <span className="text-xs px-2">A</span>
                    <input 
                        type="range" 
                        min="1" 
                        max="5" 
                        step="1"
                        value={settings.fontSize}
                        onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                        className="w-full mx-4 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <span className="text-xl px-2">A</span>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <span>{t('showArabic')}</span>
                <button 
                    onClick={() => updateSettings({ showArabic: !settings.showArabic })}
                    className={`w-12 h-6 rounded-full relative transition-colors ${settings.showArabic ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                >
                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.showArabic ? 'translate-x-6' : ''}`} />
                </button>
            </div>

            <div className="flex items-center justify-between">
                <span>{t('showTranslation')}</span>
                <button 
                    onClick={() => updateSettings({ showTranslation: !settings.showTranslation })}
                    className={`w-12 h-6 rounded-full relative transition-colors ${settings.showTranslation ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-700'}`}
                >
                    <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${settings.showTranslation ? 'translate-x-6' : ''}`} />
                </button>
            </div>
        </div>
      </section>

       <div className="text-center text-sm text-gray-400 pt-8 pb-8">
           {t('about')}
       </div>
    </div>
  );
};

export default SettingsPage;
