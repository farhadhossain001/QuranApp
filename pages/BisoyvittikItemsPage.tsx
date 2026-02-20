import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../context/Store';
import { ChevronRight, Loader2, FileText, Music, Video, BookOpen, Play, Pause, Volume2, VolumeX, X, SkipBack, SkipForward, Maximize, Minimize } from 'lucide-react';

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
  
  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentPlayingId, setCurrentPlayingId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [currentAudioTitle, setCurrentAudioTitle] = useState('');
  
  // Video player state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [currentVideoId, setCurrentVideoId] = useState<number | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoCurrentTime, setVideoCurrentTime] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoVolume, setVideoVolume] = useState(1);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentVideoTitle, setCurrentVideoTitle] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement | null>(null);

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

  // Check if item is an audio file
  const isAudioItem = (item: Item) => {
    if (item.type.toLowerCase() === 'audio' || item.type.toLowerCase() === 'mp3') {
      return true;
    }
    if (item.attachments && item.attachments.length > 0) {
      const ext = item.attachments[0].extension_type.toLowerCase();
      return ext === 'mp3' || ext === 'audio' || ext === 'wav' || ext === 'ogg' || ext === 'm4a';
    }
    return false;
  };

  // Check if item is a video file
  const isVideoItem = (item: Item) => {
    if (item.type.toLowerCase() === 'video') {
      return true;
    }
    if (item.attachments && item.attachments.length > 0) {
      const ext = item.attachments[0].extension_type.toLowerCase();
      return ext === 'mp4' || ext === 'video' || ext === 'webm' || ext === 'mkv' || ext === 'avi' || ext === 'mov';
    }
    return false;
  };

  // Audio player functions
  const togglePlay = (item: Item) => {
    if (!item.attachments || item.attachments.length === 0) return;
    
    const audioUrl = item.attachments[0].url;
    
    if (currentPlayingId === item.id && isPlaying) {
      // Pause current audio
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    } else {
      // Play new audio or resume
      if (currentPlayingId !== item.id) {
        // New audio
        if (audioRef.current) {
          audioRef.current.pause();
        }
        audioRef.current = new Audio(audioUrl);
        audioRef.current.volume = isMuted ? 0 : volume;
        
        audioRef.current.ontimeupdate = () => {
          setCurrentTime(audioRef.current?.currentTime || 0);
        };
        
        audioRef.current.ondurationchange = () => {
          setDuration(audioRef.current?.duration || 0);
        };
        
        audioRef.current.onended = () => {
          setIsPlaying(false);
          setCurrentPlayingId(null);
          setCurrentTime(0);
        };
        
        audioRef.current.onerror = () => {
          console.error('Audio error');
          setIsPlaying(false);
          setCurrentPlayingId(null);
        };
      }
      
      audioRef.current?.play();
      setCurrentPlayingId(item.id);
      setCurrentAudioTitle(item.title);
      setIsPlaying(true);
      setShowPlayer(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    if (newVolume > 0) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume;
        setIsMuted(false);
      } else {
        audioRef.current.volume = 0;
        setIsMuted(true);
      }
    }
  };

  const closePlayer = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentPlayingId(null);
    setShowPlayer(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Video player functions
  const toggleVideoPlay = (item: Item) => {
    if (!item.attachments || item.attachments.length === 0) return;
    
    const videoUrl = item.attachments[0].url;
    
    if (currentVideoId === item.id && isVideoPlaying) {
      // Pause current video
      if (videoRef.current) {
        videoRef.current.pause();
        setIsVideoPlaying(false);
      }
    } else {
      // Play new video or resume
      if (currentVideoId !== item.id) {
        // New video
        if (videoRef.current) {
          videoRef.current.pause();
        }
        videoRef.current = null; // Reset to create new video element
        
        setShowVideoPlayer(true);
        setCurrentVideoId(item.id);
        setCurrentVideoTitle(item.title);
        setVideoCurrentTime(0);
        setVideoDuration(0);
        
        // Small delay to ensure the video element is rendered
        setTimeout(() => {
          if (videoContainerRef.current) {
            const video = document.createElement('video');
            video.src = videoUrl;
            video.className = 'w-full h-full object-contain bg-black';
            video.playsInline = true;
            video.volume = isVideoMuted ? 0 : videoVolume;
            
            video.ontimeupdate = () => {
              setVideoCurrentTime(video.currentTime);
            };
            
            video.ondurationchange = () => {
              setVideoDuration(video.duration);
            };
            
            video.onended = () => {
              setIsVideoPlaying(false);
              setVideoCurrentTime(0);
            };
            
            video.onerror = () => {
              console.error('Video error');
              setIsVideoPlaying(false);
              setCurrentVideoId(null);
            };
            
            video.onplay = () => {
              setIsVideoPlaying(true);
            };
            
            video.onpause = () => {
              setIsVideoPlaying(false);
            };
            
            videoContainerRef.current.innerHTML = '';
            videoContainerRef.current.appendChild(video);
            videoRef.current = video;
            video.play().catch(err => console.error('Video play error:', err));
          }
        }, 100);
      } else {
        // Resume existing video
        videoRef.current?.play().catch(err => console.error('Video resume error:', err));
      }
      
      setIsVideoPlaying(true);
    }
  };

  const handleVideoSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setVideoCurrentTime(newTime);
    }
  };

  const handleVideoVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVideoVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    if (newVolume > 0) {
      setIsVideoMuted(false);
    }
  };

  const toggleVideoMute = () => {
    if (videoRef.current) {
      if (isVideoMuted) {
        videoRef.current.volume = videoVolume;
        setIsVideoMuted(false);
      } else {
        videoRef.current.volume = 0;
        setIsVideoMuted(true);
      }
    }
  };

  const closeVideoPlayer = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current = null;
    }
    if (videoContainerRef.current) {
      videoContainerRef.current.innerHTML = '';
    }
    setIsVideoPlaying(false);
    setCurrentVideoId(null);
    setShowVideoPlayer(false);
    setVideoCurrentTime(0);
    setVideoDuration(0);
    setIsFullscreen(false);
  };

  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    
    if (!isFullscreen) {
      if (videoContainerRef.current.requestFullscreen) {
        videoContainerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Cleanup audio and video on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current = null;
      }
    };
  }, []);

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
    <div className={`space-y-4 ${showPlayer ? 'pb-28' : 'pb-20'}`}>
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
        {items.map(item => {
          const isAudio = isAudioItem(item);
          const isVideo = isVideoItem(item);
          const isThisPlaying = currentPlayingId === item.id && isPlaying;
          const isThisVideoPlaying = currentVideoId === item.id && isVideoPlaying;
          
          return (
            <div
              key={item.id}
              className="bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:border-primary hover:shadow-md transition-all"
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
                
                {/* Play button for audio items */}
                {isAudio && item.attachments && item.attachments.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlay(item);
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isThisPlaying 
                        ? 'bg-primary text-white' 
                        : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                    }`}
                  >
                    {isThisPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                )}
                
                {/* Play button for video items */}
                {isVideo && item.attachments && item.attachments.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVideoPlay(item);
                    }}
                    className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isThisVideoPlaying 
                        ? 'bg-red-500 text-white' 
                        : 'bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white'
                    }`}
                  >
                    {isThisVideoPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                )}
                
                {/* Chevron for non-audio and non-video items */}
                {!isAudio && !isVideo && (
                  <ChevronRight 
                    className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1 cursor-pointer"
                    onClick={() => handleItemClick(item)}
                  />
                )}
              </div>
              
              {getAuthorNames(item) && (
                <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('author')}: {getAuthorNames(item)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
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

      {/* Audio Player Bar */}
      {showPlayer && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-surface-dark border-t border-gray-200 dark:border-gray-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-[60] animate-slide-up">
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
            {/* Left: Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">
                  {currentAudioTitle}
                </span>
                <span className="text-xs text-gray-500 font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Center: Main Controls */}
            <div className="flex items-center gap-3 md:gap-6 flex-shrink-0">
              <button 
                onClick={() => {
                  if (audioRef.current) {
                    const newTime = Math.max(0, currentTime - 10);
                    audioRef.current.currentTime = newTime;
                    setCurrentTime(newTime);
                  }
                }}
                className="text-gray-500 hover:text-primary transition" 
                title="Rewind 10s"
              >
                <SkipBack size={24} />
              </button>
              
              <button
                onClick={() => {
                  if (audioRef.current) {
                    if (isPlaying) {
                      audioRef.current.pause();
                    } else {
                      audioRef.current.play();
                    }
                    setIsPlaying(!isPlaying);
                  }
                }}
                className="w-12 h-12 flex items-center justify-center bg-primary text-white rounded-full hover:bg-primary-dark transition shadow-lg"
              >
                {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
              </button>

              <button 
                onClick={() => {
                  if (audioRef.current) {
                    const newTime = Math.min(duration, currentTime + 10);
                    audioRef.current.currentTime = newTime;
                    setCurrentTime(newTime);
                  }
                }}
                className="text-gray-500 hover:text-primary transition" 
                title="Forward 10s"
              >
                <SkipForward size={24} />
              </button>
            </div>

            {/* Right: Secondary Controls (Volume, Close) */}
            <div className="flex items-center gap-3 flex-1 justify-end">
              {/* Volume */}
              <div className="hidden md:flex items-center gap-2 group">
                <button onClick={toggleMute} className="text-gray-500 hover:text-gray-700">
                  {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>

              <button 
                onClick={closePlayer}
                className="p-2 text-gray-400 hover:text-red-500 transition ml-2"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {showVideoPlayer && (
        <div className="fixed inset-0 z-[70] bg-black/90 flex flex-col">
          {/* Video Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
            <div className="flex-1 min-w-0 mr-4">
              <h3 className="text-white font-medium truncate">{currentVideoTitle}</h3>
              <p className="text-white/60 text-xs">
                {formatTime(videoCurrentTime)} / {formatTime(videoDuration)}
              </p>
            </div>
            <button
              onClick={closeVideoPlayer}
              className="p-2 text-white/80 hover:text-white transition rounded-full hover:bg-white/10"
            >
              <X size={24} />
            </button>
          </div>

          {/* Video Container */}
          <div 
            ref={videoContainerRef}
            className="flex-1 flex items-center justify-center bg-black"
          >
            {/* Video element will be inserted here dynamically */}
          </div>

          {/* Video Controls */}
          <div className="bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0 p-4">
            {/* Progress Bar */}
            <div className="relative h-1 bg-white/20 rounded-full mb-4 group cursor-pointer">
              <div 
                className="absolute h-full bg-red-500 rounded-full transition-all duration-100"
                style={{ width: `${(videoCurrentTime / (videoDuration || 1)) * 100}%` }}
              />
              <input
                type="range"
                min="0"
                max={videoDuration || 0}
                value={videoCurrentTime}
                onChange={handleVideoSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      const newTime = Math.max(0, videoCurrentTime - 10);
                      videoRef.current.currentTime = newTime;
                      setVideoCurrentTime(newTime);
                    }
                  }}
                  className="p-2 text-white/80 hover:text-white transition"
                >
                  <SkipBack size={24} />
                </button>
                
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      if (isVideoPlaying) {
                        videoRef.current.pause();
                      } else {
                        videoRef.current.play();
                      }
                    }
                  }}
                  className="w-14 h-14 flex items-center justify-center bg-white text-black rounded-full hover:bg-white/90 transition"
                >
                  {isVideoPlaying ? (
                    <Pause size={28} fill="currentColor" />
                  ) : (
                    <Play size={28} fill="currentColor" className="ml-1" />
                  )}
                </button>

                <button
                  onClick={() => {
                    if (videoRef.current) {
                      const newTime = Math.min(videoDuration, videoCurrentTime + 10);
                      videoRef.current.currentTime = newTime;
                      setVideoCurrentTime(newTime);
                    }
                  }}
                  className="p-2 text-white/80 hover:text-white transition"
                >
                  <SkipForward size={24} />
                </button>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={toggleVideoMute} 
                    className="p-2 text-white/80 hover:text-white transition"
                  >
                    {isVideoMuted || videoVolume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
                  </button>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={isVideoMuted ? 0 : videoVolume}
                    onChange={handleVideoVolumeChange}
                    className="w-20 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>

                <button 
                  onClick={toggleFullscreen}
                  className="p-2 text-white/80 hover:text-white transition"
                >
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BisoyvittikItemsPage;
