
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../context/Store';
import { Moon, Sun, Monitor, Type, Globe, Mic, BookA, MapPin, Loader2, Search, Crosshair } from 'lucide-react';

const SettingsPage = () => {
  const { settings, updateSettings, t, setHeaderTitle, reciters } = useAppStore();
  const [detecting, setDetecting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
              async (position) => {
                  const { latitude, longitude } = position.coords;
                  let address = 'Current Location';
                  
                  // Reverse Geocoding
                  try {
                      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=${settings.appLanguage === 'bn' ? 'bn' : 'en'}`);
                      if (res.ok) {
                          const data = await res.json();
                          if (data && data.address) {
                              // Prioritize city-like fields
                              address = data.address.city || 
                                        data.address.town || 
                                        data.address.village || 
                                        data.address.municipality ||
                                        data.address.suburb ||
                                        data.address.county || 
                                        data.address.state || 
                                        'Current Location';
                          }
                      }
                  } catch (e) {
                      console.error("Reverse geocoding failed", e);
                  }

                  updateSettings({
                      location: {
                          latitude: latitude,
                          longitude: longitude,
                          address: address
                      }
                  });
                  setManualCoords({
                      lat: latitude.toString(),
                      lng: longitude.toString()
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

  const handleSearchLocation = async () => {
      if (!searchQuery.trim()) return;
      setIsSearching(true);
      try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&accept-language=${settings.appLanguage === 'bn' ? 'bn' : 'en'}`);
          if (res.ok) {
              const data = await res.json();
              if (data && data.length > 0) {
                  const result = data[0];
                  const lat = parseFloat(result.lat);
                  const lng = parseFloat(result.lon);
                  // Use the display name, but truncated for brevity if needed, or just the first part
                  const shortName = result.display_name.split(',')[0];
                  
                  updateSettings({
                      location: {
                          latitude: lat,
                          longitude: lng,
                          address: shortName
                      }
                  });
                  setManualCoords({
                      lat: result.lat,
                      lng: result.lon
                  });
                  setSearchQuery(''); // Clear search on success
              } else {
                  alert(t('locationNotFound'));
              }
          } else {
              alert('Error searching location');
          }
      } catch (e) {
          console.error(e);
          alert('Network error');
      } finally {
          setIsSearching(false);
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
                  address: 'Custom Coordinates'
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
        
        {/* Current Location Badge */}
        <div className="bg-primary/5 dark:bg-primary/10 border border-primary/10 dark:border-primary/20 p-4 rounded-xl mb-6 flex items-center justify-between">
            <div>
                <p className="text-xs text-primary font-bold uppercase tracking-wider mb-1">{t('location')}</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg leading-tight">
                    {settings.location.address || 'Unknown Location'}
                </p>
                <p className="text-xs text-gray-500 font-mono mt-1">
                    {settings.location.latitude.toFixed(4)}, {settings.location.longitude.toFixed(4)}
                </p>
            </div>
            <div className="bg-white dark:bg-surface-dark p-2 rounded-full shadow-sm text-primary">
                <MapPin size={24} />
            </div>
        </div>

        <div className="space-y-4">
            {/* City Search */}
            <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block ml-1">{t('searchLocation')}</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
                            placeholder={t('cityPlaceholder')}
                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
                        />
                    </div>
                    <button 
                        onClick={handleSearchLocation}
                        disabled={isSearching || !searchQuery.trim()}
                        className="px-4 bg-primary text-white rounded-xl hover:bg-opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isSearching ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-400 font-medium">
                <div className="h-px bg-gray-100 dark:bg-gray-700 flex-1"></div>
                OR
                <div className="h-px bg-gray-100 dark:bg-gray-700 flex-1"></div>
            </div>

            {/* Detect Location Button */}
            <button 
                onClick={handleGetCurrentLocation}
                disabled={detecting}
                className="w-full flex items-center justify-center gap-2 p-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition disabled:opacity-70 text-sm"
            >
                {detecting ? <Loader2 size={18} className="animate-spin" /> : <Crosshair size={18} />}
                {detecting ? t('detecting') : t('useCurrentLocation')}
            </button>

            {/* Manual Coordinates Toggle */}
            <details className="group pt-2">
                <summary className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-500 hover:text-primary transition select-none">
                    <span className="group-open:rotate-90 transition-transform">▶</span>
                    {t('manualCoordinates')}
                </summary>
                <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div>
                            <label className="text-[10px] text-gray-400 mb-1 block uppercase font-bold">{t('latitude')}</label>
                            <input 
                                type="text" 
                                value={manualCoords.lat}
                                onChange={(e) => setManualCoords({...manualCoords, lat: e.target.value})}
                                className="w-full p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-1 focus:ring-primary outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-400 mb-1 block uppercase font-bold">{t('longitude')}</label>
                            <input 
                                type="text" 
                                value={manualCoords.lng}
                                onChange={(e) => setManualCoords({...manualCoords, lng: e.target.value})}
                                className="w-full p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-1 focus:ring-primary outline-none"
                            />
                        </div>
                    </div>
                    <button 
                        onClick={handleManualUpdate}
                        className="w-full py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-600 transition"
                    >
                        {t('update')}
                    </button>
                </div>
            </details>
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

      {/* Translation - Redirect hint */}
      <section className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookA size={20} className="text-primary" />
            {t('translationLanguage')}
        </h2>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-sm text-gray-600 dark:text-gray-300">
             To manage specific translations, open a Surah and use the Settings icon in the top right.
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
            {reciters.length > 0 ? (
                reciters.map((reciter) => (
                    <option key={reciter.id} value={reciter.id}>
                        {reciter.reciter_name} {reciter.style ? `(${reciter.style})` : ''}
                    </option>
                ))
            ) : (
                <option value={7}>Mishary Rashid Al-Afasy</option>
            )}
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
