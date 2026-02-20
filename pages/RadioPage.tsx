
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Radio, Search, Globe, X, Loader2, Signal, ChevronUp, ChevronDown } from 'lucide-react';
import { useAppStore } from '../context/Store';

interface RadioStation {
  id: number;
  name: string;
  nameAr: string;
  description: string;
  country: string;
  language: string;
  genre: string[];
  streamUrl: string;
  streamFormat: string;
  bitrate: string;
  website: string;
  status: string;
  lastChecked: string;
}

interface RadioApiResponse {
  status: string;
  version: string;
  timestamp: string;
  total: number;
  stations: RadioStation[];
}

const RadioPage: React.FC = () => {
  const { t } = useAppStore();
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [filteredStations, setFilteredStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStation, setCurrentStation] = useState<RadioStation | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const API_URL = 'https://raw.githubusercontent.com/uthumany/radio-api/main/client/public/api/stations.json';

  useEffect(() => {
    fetchStations();
  }, []);

  useEffect(() => {
    filterStations();
  }, [stations, searchQuery, selectedGenre]);

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const fetchStations = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch stations');
      }
      const data: RadioApiResponse = await response.json();
      setStations(data.stations.filter(s => s.status === 'active'));
      setError(null);
    } catch (err) {
      setError(t('stationsError'));
      console.error('Error fetching stations:', err);
    } finally {
      setLoading(false);
    }
  };

  const filterStations = () => {
    let filtered = stations;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        station =>
          station.name.toLowerCase().includes(query) ||
          station.nameAr.includes(query) ||
          station.country.toLowerCase().includes(query) ||
          station.description.toLowerCase().includes(query)
      );
    }

    if (selectedGenre !== 'all') {
      filtered = filtered.filter(station =>
        station.genre.some(g => g.toLowerCase() === selectedGenre.toLowerCase())
      );
    }

    setFilteredStations(filtered);
  };

  const getAllGenres = (): string[] => {
    const genres = new Set<string>();
    stations.forEach(station => {
      station.genre.forEach(g => genres.add(g));
    });
    return Array.from(genres).sort();
  };

  const playStation = (station: RadioStation) => {
    if (currentStation?.id === station.id && isPlaying) {
      // Pause current station
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      // Play new station
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentStation(station);
      setIsPlaying(true);
      setIsLoading(true);
      
      // Create new audio element
      const audio = new Audio(station.streamUrl);
      audioRef.current = audio;
      audio.volume = isMuted ? 0 : volume;
      
      audio.oncanplay = () => {
        setIsLoading(false);
      };
      
      audio.onplaying = () => {
        setIsLoading(false);
      };
      
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
        setIsPlaying(false);
        setIsLoading(false);
      });
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      setIsLoading(true);
      audioRef.current.play().then(() => {
        setIsLoading(false);
      }).catch(err => {
        console.error('Error playing audio:', err);
        setIsLoading(false);
      });
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const stopPlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentStation(null);
    setIsLoading(false);
    setIsPlayerExpanded(false);
  };

  useEffect(() => {
    return () => {
      // Cleanup audio on unmount
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary-dark dark:from-primary-dark dark:to-primary text-white p-4 sm:p-6 rounded-b-2xl sm:rounded-b-3xl shadow-lg">
        <h1 className="text-xl sm:text-2xl font-bold mb-1">{t('radio')}</h1>
        <p className="text-white/80 text-xs sm:text-sm">{t('radioDesc')}</p>
      </div>

      {/* Radio Player - Fixed at bottom when playing */}
      {currentStation && (
        <>
          {/* Backdrop overlay for expanded player */}
          <div 
            className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 sm:hidden ${
              isPlayerExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            onClick={() => setIsPlayerExpanded(false)}
          />
          
          <div className={`fixed left-0 right-0 z-50 bg-white dark:bg-gray-900 shadow-2xl transition-all duration-500 ease-out ${
            isPlayerExpanded 
              ? 'inset-0 sm:inset-auto sm:top-20 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md sm:rounded-2xl sm:m-4 opacity-100 translate-y-0' 
              : 'bottom-0 sm:bottom-4 sm:left-4 sm:right-4 sm:rounded-xl opacity-100'
          }`}>
            {/* Mobile Full Screen Player */}
            {isPlayerExpanded ? (
              <div className="h-full flex flex-col sm:max-h-[80vh] animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                  <h2 className="font-semibold text-gray-900 dark:text-white">{t('nowPlaying')}</h2>
                  <button
                    onClick={() => setIsPlayerExpanded(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <ChevronDown size={24} />
                  </button>
                </div>

                {/* Expanded Player Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 bg-gradient-to-b from-primary/5 to-transparent">
                  {/* Station Icon */}
                  <div className="relative mb-6 animate-scale-in">
                    <div className={`w-32 h-32 sm:w-40 sm:h-40 rounded-full flex items-center justify-center ${
                      isPlaying ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                    } transition-colors duration-500 shadow-xl`}>
                      {isLoading ? (
                        <Loader2 size={48} className="text-white animate-spin" />
                      ) : (
                        <Radio size={48} className={`${isPlaying ? 'text-white' : 'text-gray-500 dark:text-gray-400'} ${isPlaying ? 'animate-pulse' : ''}`} />
                      )}
                    </div>
                    {/* Live Indicator */}
                    {isPlaying && !isLoading && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg animate-scale-in">
                        <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                      </div>
                    )}
                  </div>

                  {/* Station Info */}
                  <div className="text-center mb-8 w-full max-w-xs animate-slide-up">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 truncate">
                      {currentStation.name}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 truncate font-arabic mb-2">
                      {currentStation.nameAr}
                    </p>
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                      <Signal size={14} className="text-green-500" />
                      <span className="text-green-500 font-medium">LIVE</span>
                      <span>•</span>
                      <Globe size={14} />
                      <span>{currentStation.country}</span>
                    </div>
                  </div>

                  {/* Genre Tags */}
                  <div className="flex gap-2 mb-8 animate-slide-up" style={{ animationDelay: '100ms' }}>
                    {currentStation.genre.map(g => (
                      <span
                        key={g}
                        className="text-sm px-4 py-1.5 bg-primary/10 text-primary dark:text-primary-dark rounded-full font-medium"
                      >
                        {g}
                      </span>
                    ))}
                  </div>

                  {/* Volume Control */}
                  <div className="w-full max-w-xs mb-8 animate-slide-up" style={{ animationDelay: '200ms' }}>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={toggleMute}
                        className="p-2 text-gray-500 hover:text-primary transition"
                      >
                        {isMuted || volume === 0 ? <VolumeX size={24} /> : <Volume2 size={24} />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-primary"
                      />
                      <span className="text-sm text-gray-400 w-10 text-right">
                        {Math.round((isMuted ? 0 : volume) * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Main Controls */}
                  <div className="flex items-center gap-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
                    <button
                      onClick={stopPlayback}
                      className="p-3 text-gray-400 hover:text-red-500 transition rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <X size={28} />
                    </button>
                    
                    <button
                      onClick={togglePlayPause}
                      disabled={isLoading}
                      className="w-20 h-20 flex items-center justify-center bg-primary text-white rounded-full hover:bg-primary-dark transition shadow-xl disabled:opacity-80 transform hover:scale-105 active:scale-95"
                    >
                      {isLoading ? (
                        <Loader2 size={32} className="animate-spin" />
                      ) : isPlaying ? (
                        <Pause size={32} fill="currentColor" />
                      ) : (
                        <Play size={32} fill="currentColor" className="ml-1" />
                      )}
                    </button>

                    {/* Placeholder for symmetry */}
                    <div className="w-12 h-12"></div>
                  </div>
                </div>
              </div>
            ) : (
            /* Mini Player */
            <div className="sm:rounded-xl overflow-hidden">
              {/* Progress bar for playing state */}
              {isPlaying && !isLoading && (
                <div className="h-1 bg-gradient-to-r from-primary via-primary-dark to-primary">
                  <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                </div>
              )}
              
              <div className="p-3 sm:p-4">
                <div className="flex items-center gap-3">
                  {/* Station Icon */}
                  <div className="relative flex-shrink-0">
                    <div 
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center bg-primary cursor-pointer"
                      onClick={() => setIsPlayerExpanded(true)}
                    >
                      {isLoading ? (
                        <Loader2 size={20} className="text-white animate-spin" />
                      ) : (
                        <Radio size={20} className={`text-white ${isPlaying ? 'animate-pulse' : ''}`} />
                      )}
                    </div>
                    {isPlaying && !isLoading && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                      </div>
                    )}
                  </div>

                  {/* Station Info */}
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => setIsPlayerExpanded(true)}
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm sm:text-base">
                        {currentStation.name}
                      </h3>
                      <Signal size={12} className="text-green-500 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {currentStation.country} • {currentStation.bitrate}
                    </p>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-1 sm:gap-2">
                    {/* Volume - Hidden on very small screens */}
                    <div className="hidden sm:flex items-center gap-2">
                      <button
                        onClick={toggleMute}
                        className="p-2 text-gray-500 hover:text-primary transition"
                      >
                        {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-primary"
                      />
                    </div>

                    {/* Play/Pause */}
                    <button
                      onClick={togglePlayPause}
                      disabled={isLoading}
                      className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center bg-primary text-white rounded-full hover:bg-primary-dark transition shadow-lg disabled:opacity-80"
                    >
                      {isLoading ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : isPlaying ? (
                        <Pause size={18} fill="currentColor" />
                      ) : (
                        <Play size={18} fill="currentColor" className="ml-0.5" />
                      )}
                    </button>

                    {/* Close */}
                    <button
                      onClick={stopPlayback}
                      className="p-2 text-gray-400 hover:text-red-500 transition rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Expand button - mobile only */}
                  <button
                    onClick={() => setIsPlayerExpanded(true)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition sm:hidden"
                  >
                    <ChevronUp size={20} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        </>
      )}

      {/* Search and Filter */}
      <div className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder={t('searchHint')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl border-0 focus:ring-2 focus:ring-primary dark:text-white text-sm sm:text-base"
          />
        </div>

        {/* Genre Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setSelectedGenre('all')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition ${
              selectedGenre === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {getAllGenres().map(genre => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition ${
                selectedGenre === genre
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      {/* Stations List */}
      <div className="px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">{t('loadingStations')}</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <Radio size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-red-500">{error}</p>
            <button
              onClick={fetchStations}
              className="mt-4 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
            >
              {t('loadMore')}
            </button>
          </div>
        ) : filteredStations.length === 0 ? (
          <div className="text-center py-12">
            <Radio size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">{t('noResults')}</p>
          </div>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2">
              {filteredStations.length} {t('radioStations').toLowerCase()}
            </p>
            {filteredStations.map(station => (
              <div
                key={station.id}
                onClick={() => playStation(station)}
                className={`bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow-sm cursor-pointer transition-all hover:shadow-md active:scale-[0.98] ${
                  currentStation?.id === station.id ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                      currentStation?.id === station.id && isPlaying
                        ? 'bg-primary text-white scale-110'
                        : currentStation?.id === station.id
                        ? 'bg-primary/20 text-primary'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {currentStation?.id === station.id && isLoading ? (
                      <Loader2 size={16} className="animate-spin sm:hidden" />
                    ) : currentStation?.id === station.id && isPlaying ? (
                      <Pause size={16} className="sm:hidden" />
                    ) : (
                      <Play size={16} className="sm:hidden" />
                    )}
                    {currentStation?.id === station.id && isLoading ? (
                      <Loader2 size={20} className="animate-spin hidden sm:block" />
                    ) : currentStation?.id === station.id && isPlaying ? (
                      <Pause size={20} className="hidden sm:block" />
                    ) : (
                      <Play size={20} className="hidden sm:block" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm sm:text-base">
                      {station.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate font-arabic">
                      {station.nameAr}
                    </p>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                      <Globe size={10} className="text-gray-400 flex-shrink-0 sm:hidden" />
                      <Globe size={12} className="text-gray-400 flex-shrink-0 hidden sm:block" />
                      <span className="text-[10px] sm:text-xs text-gray-400 truncate">{station.country}</span>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <span className="text-[10px] sm:text-xs text-gray-400 truncate">{station.language}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 justify-end flex-shrink-0 hidden xs:flex">
                    {station.genre.slice(0, 2).map(g => (
                      <span
                        key={g}
                        className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Spacer for mini player */}
      {currentStation && !isPlayerExpanded && (
        <div className="h-20 sm:h-24"></div>
      )}
    </div>
  );
};

export default RadioPage;
