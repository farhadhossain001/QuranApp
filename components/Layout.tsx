
import React, { useRef, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { getSpecificAyahAudio } from '../services/api';
import { 
  Home, Bookmark, Settings, Search, Play, Pause, X, Moon, Sun, BookOpen, 
  SkipBack, SkipForward, Repeat, Repeat1, Volume2, VolumeX, Gauge, Loader2, 
  ArrowLeft, SlidersHorizontal, Mic, Check, ChevronUp
} from 'lucide-react';
import LanguagePopup from './LanguagePopup';

interface LayoutProps {
  children: React.ReactNode;
}

const AudioPlayerBar = () => {
  const { 
    audio, pauseAudio, resumeAudio, stopAudio, 
    playNextAyah, playPrevAyah, playAyah,
    settings, updateSettings, t, formatNumber, reciters 
  } = useAppStore();
  
  const location = useLocation();
  const isHome = location.pathname === '/';
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Menu States
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showReciterMenu, setShowReciterMenu] = useState(false);
  const [reciterSearch, setReciterSearch] = useState('');

  // Close menus on click outside (simple backdrop approach)
  const closeMenus = () => {
      setShowSpeedMenu(false);
      setShowReciterMenu(false);
  };

  // Sync Audio Element Props with Settings
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : settings.volume;
      audioRef.current.playbackRate = settings.playbackRate;
      audioRef.current.loop = settings.repeatMode === 'one';
    }
  }, [settings.volume, settings.playbackRate, settings.repeatMode, isMuted]);

  // Format time with localization
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return formatNumber('0:00');
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return formatNumber(`${mins}:${secs.toString().padStart(2, '0')}`);
  };

  // Handle Playback Logic
  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement && audio.audioUrl) {
      // Check if source actually changed to avoid unnecessary reloads
      const isSourceChanged = audioElement.src !== audio.audioUrl;

      if (isSourceChanged) {
        setIsLoading(true); // Start loading when source changes
        audioElement.src = audio.audioUrl;
        audioElement.load();
      }

      if (audio.isPlaying) {
        const playPromise = audioElement.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsLoading(false);
            })
            .catch(error => {
              // Ignore AbortError which happens when skipping tracks quickly
              if (error.name === 'AbortError') return;
              
              console.error("Audio playback interrupted", error);
              setIsLoading(false);
              
              // If it's a 404/NotSupported (likely end of Surah or missing file), stop audio
              if (error.name === 'NotSupportedError' || (audioElement.error && audioElement.error.code === 4)) {
                 // Handled in onError prop now
              }
            });
        }
      } else {
        audioElement.pause();
        setIsLoading(false);
      }
    }
  }, [audio.isPlaying, audio.audioUrl]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
      setIsLoading(false);
    }
  };

  const handleEnded = () => {
    if (settings.repeatMode === 'one') {
      audioRef.current?.play().catch(() => {});
    } else if (settings.repeatMode === 'all') {
      playNextAyah();
    } else {
      stopAudio();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleRepeat = () => {
    const modes: ('none' | 'one' | 'all')[] = ['none', 'all', 'one'];
    const currentIndex = modes.indexOf(settings.repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    updateSettings({ repeatMode: nextMode });
  };

  // Filter reciters
  const filteredReciters = reciters.filter(r => 
      r.reciter_name.toLowerCase().includes(reciterSearch.toLowerCase()) ||
      r.style.toLowerCase().includes(reciterSearch.toLowerCase())
  );

  const availableSpeeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const handleAudioError = async (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
      const target = e.target as HTMLAudioElement;
      console.warn("Audio Error:", target.error?.code, target.error?.message);

      // Error Code 4 is MEDIA_ERR_SRC_NOT_SUPPORTED (often 404 or bad codec)
      // If we are NOT already on the fallback reciter (7: Mishary), try switching.
      if (settings.reciterId !== 7 && audio.currentSurahId && audio.currentAyahId) {
          console.log("Audio source failed, attempting auto-switch to default reciter (Mishary)...");
          setIsLoading(true);
          
          try {
              // 1. Fetch new URL for the current Ayah using default Reciter (7)
              const newUrl = await getSpecificAyahAudio(audio.currentSurahId, audio.currentAyahId, 7);
              
              if (newUrl) {
                   // 2. Update Settings so future fetches uses correct reciter
                  updateSettings({ reciterId: 7 });

                  // 3. Immediately play the new URL
                  // playAyah updates the store's audioUrl, triggering the useEffect to load/play
                  playAyah(audio.currentSurahId, audio.currentAyahId, newUrl);
              } else {
                  // Fallback failed
                  setIsLoading(false);
                  stopAudio();
              }
          } catch (err) {
              console.error("Auto-switch failed", err);
              setIsLoading(false);
              stopAudio();
          }
      } else {
          // Already on fallback or other error
          setIsLoading(false);
          stopAudio();
      }
  };

  if (!audio.audioUrl) return null;

  return (
    <>
      {/* Invisible Backdrop for menus - Z-Index 55 */}
      {(showSpeedMenu || showReciterMenu) && (
          <div className="fixed inset-0 z-[55] bg-black/5" onClick={closeMenus} />
      )}

      {/* Audio Player Bar - Z-Index 60 (Must be higher than backdrop) */}
      <div className={`fixed ${isHome ? 'bottom-16' : 'bottom-0 pb-safe'} md:bottom-0 left-0 right-0 bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-[60] animate-slide-up transition-all duration-300`}>
        <audio 
          ref={audioRef} 
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onWaiting={() => setIsLoading(true)}
          onCanPlay={() => setIsLoading(false)}
          onPlaying={() => setIsLoading(false)}
          onEnded={handleEnded}
          onPause={() => { if (audio.isPlaying) pauseAudio(); }}
          onPlay={() => { if (!audio.isPlaying) resumeAudio(); }}
          onError={handleAudioError}
        />

        {/* Progress Bar (Full Width Top) */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700 cursor-pointer group">
          <div 
            className="h-full bg-primary relative transition-all duration-100 ease-linear" 
            style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition shadow" />
          </div>
          <input 
            type="range" 
            min="0" 
            max={duration || 0} 
            value={currentTime} 
            onChange={handleSeek}
            className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="max-w-5xl mx-auto p-3 flex items-center justify-between gap-4">
          
          {/* Left: Info & Controls */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className="hidden sm:flex flex-col min-w-0">
               <span className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">
                 {t('surah')} {formatNumber(audio.currentSurahId || 0)} : {t('ayah')} {formatNumber(audio.currentAyahId || 0)}
               </span>
               <span className="text-xs text-gray-500 font-mono">
                 {formatTime(currentTime)} / {formatTime(duration)}
               </span>
            </div>

            {/* Reciter Selector */}
            <div className="relative">
                <button 
                  onClick={() => {
                      setShowReciterMenu(!showReciterMenu);
                      setShowSpeedMenu(false);
                  }}
                  className={`flex items-center gap-1 text-xs font-medium transition px-2 py-1 rounded ${showReciterMenu ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-primary'}`}
                  title={t('reciter')}
                >
                  <Mic size={14} />
                  <span className="hidden lg:inline max-w-[80px] truncate">
                      {reciters.find(r => r.id === settings.reciterId)?.reciter_name || 'Reciter'}
                  </span>
                </button>

                {/* Reciter Menu Popover */}
                {showReciterMenu && (
                    <div className="absolute bottom-full left-0 mb-3 w-72 bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col max-h-[60vh] sm:max-h-80 animate-fade-in">
                         <div className="p-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
                             <input 
                                type="text"
                                placeholder="Search reciter..."
                                value={reciterSearch}
                                onChange={(e) => setReciterSearch(e.target.value)}
                                className="w-full px-3 py-2 text-sm rounded-lg bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
                                autoFocus
                             />
                         </div>
                         <div className="overflow-y-auto p-1 custom-scrollbar flex-1 min-h-0">
                             {filteredReciters.map(reciter => {
                                 const isActive = settings.reciterId === reciter.id;
                                 return (
                                     <button
                                        key={reciter.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            updateSettings({ reciterId: reciter.id });
                                            setShowReciterMenu(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-lg flex items-center justify-between transition ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200'}`}
                                     >
                                         <div className="truncate pr-2">
                                             <div className="font-medium truncate">{reciter.reciter_name}</div>
                                             {reciter.style && <div className="text-[10px] opacity-70 truncate">{reciter.style}</div>}
                                         </div>
                                         {isActive && <Check size={14} />}
                                     </button>
                                 )
                             })}
                             {filteredReciters.length === 0 && (
                                 <div className="p-4 text-center text-xs text-gray-400">No reciters found</div>
                             )}
                         </div>
                    </div>
                )}
            </div>

            {/* Speed Selector (Dropdown) */}
            <div className="relative">
                <button 
                  onClick={() => {
                      setShowSpeedMenu(!showSpeedMenu);
                      setShowReciterMenu(false);
                  }}
                  className={`flex items-center gap-1 text-xs font-medium transition px-2 py-1 rounded ${showSpeedMenu ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-primary'}`}
                  title={t('speed')}
                >
                  <Gauge size={14} />
                  <span>{formatNumber(settings.playbackRate)}x</span>
                  <ChevronUp size={10} className={`transition-transform ${showSpeedMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Speed Menu Popover */}
                {showSpeedMenu && (
                    <div className="absolute bottom-full left-0 mb-3 w-24 bg-white dark:bg-surface-dark rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in py-1">
                        {availableSpeeds.map(speed => (
                            <button
                                key={speed}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    updateSettings({ playbackRate: speed });
                                    setShowSpeedMenu(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition ${settings.playbackRate === speed ? 'text-primary font-bold bg-primary/5' : 'text-gray-700 dark:text-gray-200'}`}
                            >
                                {speed}x
                                {settings.playbackRate === speed && <Check size={12} />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
          </div>

          {/* Center: Main Controls */}
          <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
            <button onClick={playPrevAyah} className="text-gray-500 hover:text-primary transition" title={t('prevAyah')}>
              <SkipBack size={24} />
            </button>
            
            <button
              onClick={() => audio.isPlaying ? pauseAudio() : resumeAudio()}
              disabled={isLoading}
              className="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-full hover:bg-primary-dark transition shadow-lg disabled:opacity-80 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                audio.isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />
              )}
            </button>

            <button onClick={playNextAyah} className="text-gray-500 hover:text-primary transition" title={t('nextAyah')}>
              <SkipForward size={24} />
            </button>
          </div>

          {/* Right: Secondary Controls (Repeat, Volume, Close) */}
          <div className="flex items-center gap-3 flex-1 justify-end">
            
            {/* Repeat Toggle */}
            <button 
              onClick={toggleRepeat}
              className={`p-2 rounded-full transition ${settings.repeatMode !== 'none' ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-600'}`}
              title={t('repeat')}
            >
              {settings.repeatMode === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
            </button>

            {/* Volume (Desktop) */}
            <div className="hidden md:flex items-center gap-2 group">
               <button onClick={() => setIsMuted(!isMuted)} className="text-gray-500 hover:text-gray-700">
                  {isMuted || settings.volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
               </button>
               <input 
                 type="range" 
                 min="0" 
                 max="1" 
                 step="0.05" 
                 value={isMuted ? 0 : settings.volume}
                 onChange={(e) => updateSettings({ volume: parseFloat(e.target.value) })}
                 className="w-20 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary"
               />
            </div>

            <button 
              onClick={stopAudio}
              className="p-2 text-gray-400 hover:text-red-500 transition ml-2"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { settings, updateSettings, t, headerTitle, audio, isSettingsDrawerOpen, setSettingsDrawerOpen } = useAppStore();
  const location = useLocation();
  const navigate = useNavigate();

  const toggleTheme = () => {
    updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  const navItems = [
    { icon: <Home size={20} />, label: t('home'), path: '/' },
    { icon: <Search size={20} />, label: t('search'), path: '/search' },
    { icon: <Bookmark size={20} />, label: t('saved'), path: '/bookmarks' },
    { icon: <Settings size={20} />, label: t('settings'), path: '/settings' },
  ];

  const isHome = location.pathname === '/';
  // Check if we should show the Page Settings icon
  const showPageSettings = location.pathname.startsWith('/surah/') || location.pathname.startsWith('/hadith/') || location.pathname === '/asma-ul-husna';
  
  // Calculate bottom padding for mobile
  let mobilePadding = 'pb-6'; // Default minimal padding
  if (isHome) {
      // Home: Nav exists (h-16). If audio, Player sits on top.
      mobilePadding = audio.audioUrl ? 'pb-40' : 'pb-24';
  } else {
      // Not Home: No Nav. If audio, Player sits at bottom (approx h-20 with controls).
      mobilePadding = audio.audioUrl ? 'pb-28' : 'pb-6';
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background-light dark:bg-background-dark text-gray-900 dark:text-gray-100 transition-colors duration-300">
        
        {/* Language Selection Popup */}
        <LanguagePopup />

        {/* Top Header */}
        <header className="sticky top-0 z-40 w-full backdrop-blur flex-none transition-colors duration-500 lg:z-50 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-surface-dark/95">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="py-4 flex items-center justify-between gap-4">
                    {/* Left Side: Logo or Back/Title */}
                    <div className="flex items-center gap-3 flex-shrink-0 min-w-0">
                        {isHome ? (
                            <Link to="/" className="flex items-center gap-2 text-primary dark:text-primary-dark font-bold text-xl">
                                <BookOpen size={24} />
                                <span>Qur'an Light</span>
                            </Link>
                        ) : (
                            <div className="flex items-center gap-3 text-gray-900 dark:text-gray-100 min-w-0">
                                <button 
                                    onClick={() => navigate(-1)} 
                                    className="p-1 -ml-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-600 dark:text-gray-300 flex-shrink-0"
                                    aria-label="Go Back"
                                >
                                    <ArrowLeft size={24} />
                                </button>
                                <h1 className="font-bold text-xl truncate">{headerTitle}</h1>
                            </div>
                        )}
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1 bg-gray-100/80 dark:bg-gray-800/80 p-1.5 rounded-full border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link 
                                    key={item.path} 
                                    to={item.path}
                                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                                        isActive 
                                        ? 'bg-white dark:bg-surface-dark text-primary dark:text-primary-dark shadow-sm ring-1 ring-black/5 dark:ring-white/5' 
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'
                                    }`}
                                >
                                    {React.cloneElement(item.icon as React.ReactElement<any>, { size: 16 })}
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Right Side: Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Page Settings Toggle */}
                        {showPageSettings && (
                            <button 
                                onClick={() => setSettingsDrawerOpen(!isSettingsDrawerOpen)}
                                className={`p-2 rounded-full transition ${isSettingsDrawerOpen ? 'bg-primary/10 text-primary' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                                aria-label="Page Settings"
                            >
                                <SlidersHorizontal size={20} />
                            </button>
                        )}

                        <button 
                            onClick={toggleTheme} 
                            className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition"
                            aria-label="Toggle Theme"
                        >
                             {settings.theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                        </button>
                    </div>
                </div>
            </div>
        </header>

        {/* Main Content */}
        <main className={`flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:pb-6 ${mobilePadding}`}>
            {children}
        </main>

        {/* Audio Player */}
        <AudioPlayerBar />

        {/* Mobile Bottom Nav - Conditionally rendered only on Home for Mobile */}
        {isHome && (
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-gray-800 z-40 pb-safe">
                <div className="flex justify-around items-center h-16">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link 
                                key={item.path} 
                                to={item.path}
                                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-primary dark:text-primary-dark' : 'text-gray-500 dark:text-gray-400'}`}
                            >
                                {item.icon}
                                <span className="text-[10px] font-medium">{item.label}</span>
                            </Link>
                        );
                    })}
                </div>
            </nav>
        )}
    </div>
  );
};

export default Layout;
