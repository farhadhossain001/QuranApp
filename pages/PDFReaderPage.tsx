import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { useAppStore } from '../context/Store';
import { namazBooks } from '../utils/namazBooks';
import { 
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ArrowLeft, 
  Loader2, AlertCircle, FileText, ScrollText, RectangleHorizontal, RotateCcw 
} from 'lucide-react';

// --- Helper: Render Page Function ---
const renderPdfPage = async (
    pdfDoc: any, 
    pageNum: number, 
    scale: number, 
    canvas: HTMLCanvasElement, 
    currentTaskRef: React.MutableRefObject<any>
) => {
    if (!pdfDoc || !canvas) return;

    if (currentTaskRef.current) {
        currentTaskRef.current.cancel();
    }

    try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');
        
        if (!context) return;

        const outputScale = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        const transform = outputScale !== 1 
          ? [outputScale, 0, 0, outputScale, 0, 0] 
          : null;

        const renderContext = {
          canvasContext: context,
          transform: transform,
          viewport: viewport,
        };
        
        const renderTask = page.render(renderContext);
        currentTaskRef.current = renderTask;

        await renderTask.promise;
    } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
            console.error(`Error rendering page ${pageNum}`, err);
        }
    }
};

// --- Sub-Component: Lazy Page for Scroll Mode ---
const LazyPdfPage = ({ 
    pdfDoc, 
    pageNum, 
    scale, 
    onVisible 
}: { 
    pdfDoc: any, 
    pageNum: number, 
    scale: number, 
    onVisible: (num: number) => void 
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const renderTaskRef = useRef<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    onVisible(pageNum);
                }
            },
            { rootMargin: '50% 0px', threshold: 0.1 }
        );

        if (wrapperRef.current) {
            observer.observe(wrapperRef.current);
        }

        return () => observer.disconnect();
    }, [pageNum, onVisible]);

    useEffect(() => {
        if (isVisible && pdfDoc) {
            renderPdfPage(pdfDoc, pageNum, scale, canvasRef.current!, renderTaskRef);
        }
    }, [isVisible, pdfDoc, pageNum, scale]);

    return (
        <div 
            ref={wrapperRef} 
            id={`page-container-${pageNum}`}
            className="flex justify-center my-4 min-h-[300px] relative"
        >
            <div className="relative shadow-lg bg-white">
                <canvas ref={canvasRef} className="block bg-white" />
                {!isVisible && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-400 text-xs min-w-[280px] min-h-[400px]">
                        Page {pageNum}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Touch Gesture Types ---
interface GestureState {
    initialDistance: number;
    initialScale: number;
    initialTranslate: { x: number; y: number };
    pinchCenter: { x: number; y: number };
    startTouch: { x: number; y: number };
    lastTap: number;
    isPinching: boolean;
    isDragging: boolean;
}

interface TransformState {
    scale: number;
    translateX: number;
    translateY: number;
}

const PDFReaderPage = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { t, settings, formatNumber } = useAppStore();
  
  // States
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'scroll'>('scroll');
  
  // PDF State
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [baseScale, setBaseScale] = useState<number>(1);
  const [pageInput, setPageInput] = useState("1");
  
  // Transform state for smooth zoom/pan
  const [transform, setTransform] = useState<TransformState>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });
  
  // Visual transform during gesture (for smooth feedback)
  const [visualTransform, setVisualTransform] = useState<TransformState | null>(null);
  
  // Refs
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);
  const singleRenderTaskRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Gesture ref
  const gestureRef = useRef<GestureState>({
    initialDistance: 0,
    initialScale: 1,
    initialTranslate: { x: 0, y: 0 },
    pinchCenter: { x: 0, y: 0 },
    startTouch: { x: 0, y: 0 },
    lastTap: 0,
    isPinching: false,
    isDragging: false,
  });

  const book = namazBooks.find(b => b.id === bookId);

  // Computed effective scale
  const effectiveScale = baseScale * transform.scale;

  // Initialize PDF worker
  useEffect(() => {
      const pdfjs: any = (pdfjsLib as any).default || pdfjsLib;
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
          pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
      }
  }, []);

  // Sync input with pageNum
  useEffect(() => {
      setPageInput(pageNum.toString());
  }, [pageNum]);

  // Safety Timeout
  useEffect(() => {
      if (loading && !useFallbackViewer) {
          const manualTimer = setTimeout(() => setShowManualFallback(true), 3000);
          const autoTimer = setTimeout(() => {
              console.warn("PDF load timeout.");
              setUseFallbackViewer(true);
              setLoading(false);
          }, 15000);
          return () => {
              clearTimeout(manualTimer);
              clearTimeout(autoTimer);
          };
      }
  }, [loading, useFallbackViewer]);

  // Fetch PDF
  useEffect(() => {
    if (!book) return;

    setLoading(true);
    setUseFallbackViewer(false);
    setPdfDoc(null);
    setShowManualFallback(false);

    let active = true;
    const controller = new AbortController();

    const fetchPdf = async () => {
      const strategies = [
        { name: 'CodeTabs', url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(book.pdfUrl)}` }
      ];

      for (const strategy of strategies) {
        if (!active) return;
        
        try {
          const timeoutId = setTimeout(() => controller.abort(), 10000); 
          
          const response = await fetch(strategy.url, { 
            signal: controller.signal,
            cache: 'no-store'
          });
          
          clearTimeout(timeoutId);

          if (!response.ok) continue;

          const blob = await response.blob();
          
          if (blob.size < 500 || blob.type.includes('text/html')) continue;

          if (active) {
            const arrayBuffer = await blob.arrayBuffer();
            const pdfjs: any = (pdfjsLib as any).default || pdfjsLib;
            
            try {
                const loadingTask = pdfjs.getDocument({
                    data: arrayBuffer,
                    cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
                    cMapPacked: true,
                });

                const pdf = await loadingTask.promise;
                setPdfDoc(pdf);
                setNumPages(pdf.numPages);
                
                // Calculate initial base scale
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 1 });
                const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
                const targetWidth = Math.min(containerWidth - 32, 800);
                const calculatedScale = targetWidth / viewport.width;
                setBaseScale(Math.max(0.5, Math.min(calculatedScale, 2.0)));
                
                setLoading(false);
                return; 
            } catch (renderError) {
                console.error("PDF Parsing error", renderError);
                continue;
            }
          }
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }

      if (active) {
        setUseFallbackViewer(true);
        setLoading(false);
      }
    };

    fetchPdf();

    return () => {
      active = false;
      controller.abort();
    };
  }, [book]);

  // Reset transform when changing modes
  useEffect(() => {
    setTransform({ scale: 1, translateX: 0, translateY: 0 });
    setVisualTransform(null);
  }, [viewMode]);

  // --- Single View Rendering ---
  useEffect(() => {
    if (viewMode !== 'single') return;

    const renderSinglePage = async () => {
      if (!pdfDoc || !singleCanvasRef.current) return;
      
      setRendering(true);

      try {
        await renderPdfPage(pdfDoc, pageNum, effectiveScale, singleCanvasRef.current, singleRenderTaskRef);
      } catch (err: any) {
          console.error("Render error", err);
      } finally {
          setRendering(false);
      }
    };

    renderSinglePage();
  }, [pdfDoc, pageNum, effectiveScale, viewMode]);

  // --- Scroll Mode Page Visibility ---
  const handleScrollPageVisible = useCallback((visiblePageNum: number) => {
      setPageNum(visiblePageNum);
  }, []);

  const scrollToPage = (targetPage: number) => {
      if (viewMode === 'scroll') {
          const el = document.getElementById(`page-container-${targetPage}`);
          if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
      } else {
          setPageNum(targetPage);
      }
  };

  // --- Get distance between two touch points ---
  const getDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    return Math.hypot(
      touch2.clientX - touch1.clientX,
      touch2.clientY - touch1.clientY
    );
  };

  // --- Get center point between two touches ---
  const getCenter = (touch1: React.Touch, touch2: React.Touch) => ({
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  });

  // --- Touch Handlers ---
  const handleTouchStart = (e: React.TouchEvent) => {
    const gesture = gestureRef.current;
    const now = Date.now();

    if (e.touches.length === 2) {
      // Pinch start
      gesture.isPinching = true;
      gesture.isDragging = false;
      
      gesture.initialDistance = getDistance(e.touches[0], e.touches[1]);
      gesture.initialScale = transform.scale;
      gesture.initialTranslate = {
        x: transform.translateX,
        y: transform.translateY,
      };
      gesture.pinchCenter = getCenter(e.touches[0], e.touches[1]);
      
    } else if (e.touches.length === 1) {
      // Check for double tap
      if (now - gesture.lastTap < 300) {
        handleDoubleTap(e.touches[0]);
        gesture.lastTap = 0;
        return;
      }
      gesture.lastTap = now;
      
      // Single touch - prepare for drag if zoomed
      if (transform.scale > 1) {
        gesture.isDragging = true;
        gesture.startTouch = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        gesture.initialTranslate = {
          x: transform.translateX,
          y: transform.translateY,
        };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const gesture = gestureRef.current;

    if (gesture.isPinching && e.touches.length === 2) {
      e.preventDefault();
      e.stopPropagation();
      
      const currentDistance = getDistance(e.touches[0], e.touches[1]);
      const currentCenter = getCenter(e.touches[0], e.touches[1]);
      
      // Calculate new scale
      const scaleChange = currentDistance / gesture.initialDistance;
      let newScale = gesture.initialScale * scaleChange;
      newScale = Math.max(0.5, Math.min(newScale, 4));
      
      // Calculate translation to keep pinch center fixed
      const deltaX = currentCenter.x - gesture.pinchCenter.x;
      const deltaY = currentCenter.y - gesture.pinchCenter.y;
      
      // Scale factor for translation adjustment
      const scaleFactor = newScale / gesture.initialScale;
      
      const newTranslateX = gesture.initialTranslate.x * scaleFactor + deltaX;
      const newTranslateY = gesture.initialTranslate.y * scaleFactor + deltaY;
      
      // Use visual transform for smooth feedback
      setVisualTransform({
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY,
      });
      
    } else if (gesture.isDragging && e.touches.length === 1 && transform.scale > 1) {
      e.preventDefault();
      
      const deltaX = e.touches[0].clientX - gesture.startTouch.x;
      const deltaY = e.touches[0].clientY - gesture.startTouch.y;
      
      setVisualTransform({
        scale: transform.scale,
        translateX: gesture.initialTranslate.x + deltaX,
        translateY: gesture.initialTranslate.y + deltaY,
      });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const gesture = gestureRef.current;

    if (e.touches.length === 0) {
      // All fingers lifted
      if (visualTransform) {
        // Apply the visual transform to actual state
        let finalScale = visualTransform.scale;
        let finalTranslateX = visualTransform.translateX;
        let finalTranslateY = visualTransform.translateY;
        
        // Snap back if scale is too small
        if (finalScale < 1) {
          finalScale = 1;
          finalTranslateX = 0;
          finalTranslateY = 0;
        }
        
        // Clamp translation to prevent going too far
        const container = containerRef.current || scrollContainerRef.current;
        if (container && finalScale > 1) {
          const containerRect = container.getBoundingClientRect();
          const maxTranslateX = (containerRect.width * (finalScale - 1)) / 2;
          const maxTranslateY = (containerRect.height * (finalScale - 1)) / 2;
          
          finalTranslateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, finalTranslateX));
          finalTranslateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, finalTranslateY));
        }
        
        setTransform({
          scale: finalScale,
          translateX: finalTranslateX,
          translateY: finalTranslateY,
        });
        setVisualTransform(null);
      }
      
      gesture.isPinching = false;
      gesture.isDragging = false;
      
    } else if (e.touches.length === 1 && gesture.isPinching) {
      // Transitioned from pinch to single touch
      if (visualTransform) {
        setTransform(visualTransform);
        setVisualTransform(null);
      }
      
      gesture.isPinching = false;
      
      // Start dragging with remaining finger
      if (transform.scale > 1 || (visualTransform && visualTransform.scale > 1)) {
        gesture.isDragging = true;
        gesture.startTouch = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
        gesture.initialTranslate = visualTransform 
          ? { x: visualTransform.translateX, y: visualTransform.translateY }
          : { x: transform.translateX, y: transform.translateY };
      }
    }
  };

  // --- Double Tap Handler ---
  const handleDoubleTap = (touch: React.Touch) => {
    if (transform.scale > 1) {
      // Reset zoom
      setTransform({ scale: 1, translateX: 0, translateY: 0 });
    } else {
      // Zoom to 2x at tap point
      const container = containerRef.current || scrollContainerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const tapX = touch.clientX - rect.left;
        const tapY = touch.clientY - rect.top;
        
        // Calculate translation to center on tap point
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        setTransform({
          scale: 2,
          translateX: (centerX - tapX),
          translateY: (centerY - tapY) * 0.5,
        });
      }
    }
  };

  // --- Zoom Handlers ---
  const handleZoomIn = () => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(4, prev.scale + 0.25),
    }));
  };

  const handleZoomOut = () => {
    setTransform(prev => {
      const newScale = Math.max(0.5, prev.scale - 0.25);
      return {
        scale: newScale,
        translateX: newScale <= 1 ? 0 : prev.translateX,
        translateY: newScale <= 1 ? 0 : prev.translateY,
      };
    });
  };

  const handleResetZoom = () => {
    setTransform({ scale: 1, translateX: 0, translateY: 0 });
  };

  const handlePageSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const val = parseInt(pageInput);
      if (!isNaN(val) && val >= 1 && val <= numPages) {
          scrollToPage(val);
      } else {
          setPageInput(pageNum.toString());
      }
      inputRef.current?.blur();
  };

  const handlePageBlur = () => {
      const val = parseInt(pageInput);
      if (!isNaN(val) && val >= 1 && val <= numPages) {
          scrollToPage(val);
      } else {
          setPageInput(pageNum.toString());
      }
  };

  const goNext = () => {
      const next = Math.min(numPages, pageNum + 1);
      scrollToPage(next);
  };
  
  const goPrev = () => {
      const prev = Math.max(1, pageNum - 1);
      scrollToPage(prev);
  };

  const toggleViewMode = () => {
      const newMode = viewMode === 'single' ? 'scroll' : 'single';
      setViewMode(newMode);
      setTimeout(() => {
          if (newMode === 'scroll') {
              scrollToPage(pageNum);
          }
      }, 100);
  };

  // Current transform to apply (visual during gesture, actual otherwise)
  const currentTransform = visualTransform || transform;
  
  // Transform style
  const transformStyle: React.CSSProperties = {
    transform: `translate(${currentTransform.translateX}px, ${currentTransform.translateY}px) scale(${currentTransform.scale})`,
    transformOrigin: 'center top',
    transition: visualTransform ? 'none' : 'transform 0.2s ease-out',
    touchAction: transform.scale > 1 ? 'none' : 'pan-y',
  };

  if (!book) return <div>Book not found</div>;

  // Fallback Viewer UI
  if (useFallbackViewer) {
      return (
        <div className="fixed inset-0 z-50 bg-gray-100 dark:bg-gray-900 flex flex-col h-full">
             <div className="h-14 bg-white dark:bg-surface-dark border-b border-gray-200 dark:border-gray-800 flex items-center px-4 shadow-sm z-10 gap-3">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                    <ArrowLeft size={20} className="text-gray-700 dark:text-gray-200" />
                </button>
                <div className="flex-1 truncate font-medium text-gray-900 dark:text-white">
                    {settings.appLanguage === 'bn' ? book.title_bn : book.title_en}
                </div>
             </div>
             
             <div className="bg-amber-50 text-amber-800 px-4 py-2 text-xs text-center border-b border-amber-100 flex items-center justify-center gap-2">
                <AlertCircle size={14} />
                Using Simple Viewer
             </div>
             <div className="flex-1 relative bg-white">
                <iframe 
                    src={`https://docs.google.com/viewer?url=${encodeURIComponent(book.pdfUrl)}&embedded=true`}
                    className="absolute inset-0 w-full h-full border-0"
                    title="PDF Fallback Viewer"
                />
             </div>
        </div>
      );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-100/90 dark:bg-gray-900/90 backdrop-blur-sm flex flex-col h-full">
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 transition-transform duration-300">
          <div className="bg-white/80 dark:bg-surface-dark/80 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 shadow-sm rounded-full h-12 flex items-center justify-between px-2 pr-4 max-w-3xl mx-auto">
                <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition">
                    <ArrowLeft size={20} className="text-gray-700 dark:text-gray-200" />
                </button>
                <h1 className="flex-1 text-center font-bold text-sm text-gray-900 dark:text-white truncate px-2">
                    {settings.appLanguage === 'bn' ? book.title_bn : book.title_en}
                </h1>
                
                <button 
                    onClick={toggleViewMode}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition text-primary"
                    title={viewMode === 'single' ? "Switch to Scroll View" : "Switch to Page View"}
                >
                    {viewMode === 'single' ? <ScrollText size={20} /> : <RectangleHorizontal size={20} />}
                </button>
          </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'single' ? (
          // --- Single Page View ---
          <div 
            className="flex-1 overflow-hidden relative pt-20 pb-24"
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: transform.scale > 1 ? 'none' : 'pan-y' }}
          >
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className="flex flex-col items-center gap-4 bg-white/90 dark:bg-surface-dark/90 p-6 rounded-2xl shadow-xl backdrop-blur-sm">
                        <Loader2 size={32} className="animate-spin text-primary" />
                        <div className="text-center">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Downloading Book...</p>
                            <p className="text-xs text-gray-500 mt-1">Please wait a moment</p>
                        </div>
                        {showManualFallback && (
                            <button 
                                onClick={() => { setUseFallbackViewer(true); setLoading(false); }}
                                className="mt-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition flex items-center gap-2"
                            >
                                <FileText size={12} />
                                Use Simple Viewer
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Single Page with Transform */}
            <div 
                className="flex justify-center min-h-full items-start overflow-hidden"
                style={{ height: '100%' }}
            >
                <div 
                    ref={contentRef}
                    className={`relative transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                    style={transformStyle}
                >
                    <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white">
                        <canvas ref={singleCanvasRef} className="block" />
                        
                        {rendering && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[1px]">
                                <Loader2 size={24} className="animate-spin text-primary" />
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
      ) : (
          // --- Scroll View ---
          <div 
            className="flex-1 overflow-auto relative pt-20 pb-24 px-4 bg-gray-100 dark:bg-gray-900"
            ref={scrollContainerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ touchAction: transform.scale > 1 ? 'none' : 'pan-y pinch-zoom' }}
          >
             {loading ? (
                 <div className="flex flex-col items-center justify-center h-full gap-4">
                     <Loader2 size={32} className="animate-spin text-primary" />
                     <p className="text-sm text-gray-500">Preparing Scroll View...</p>
                 </div>
             ) : (
                 <div 
                    className="max-w-4xl mx-auto"
                    style={transformStyle}
                 >
                     {Array.from({ length: numPages }, (_, i) => (
                         <LazyPdfPage 
                            key={i + 1} 
                            pdfDoc={pdfDoc} 
                            pageNum={i + 1} 
                            scale={baseScale * transform.scale}
                            onVisible={handleScrollPageVisible}
                         />
                     ))}
                 </div>
             )}
          </div>
      )}

      {/* Bottom Controls */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none">
         <div className="bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 shadow-lg rounded-2xl p-2 flex items-center gap-3 pointer-events-auto">
             
             {/* Page Nav */}
             <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                 <button 
                    onClick={goPrev}
                    disabled={pageNum <= 1 || loading}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 transition shadow-sm"
                 >
                     <ChevronLeft size={18} />
                 </button>
                 
                 <form 
                    onSubmit={handlePageSubmit}
                    className="flex items-center justify-center gap-1 min-w-[4rem] px-2"
                 >
                    <input 
                        ref={inputRef}
                        type="text" 
                        inputMode="numeric"
                        value={pageInput}
                        onChange={(e) => setPageInput(e.target.value)}
                        onBlur={handlePageBlur}
                        onFocus={(e) => e.target.select()}
                        className="w-8 text-center bg-transparent font-bold font-mono text-gray-900 dark:text-gray-100 focus:outline-none focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-primary/50 rounded-md py-0.5 text-sm"
                    />
                    <span className="text-gray-400 font-normal text-xs pointer-events-none select-none">/ {formatNumber(numPages)}</span>
                 </form>

                 <button 
                    onClick={goNext}
                    disabled={pageNum >= numPages || loading}
                    className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 transition shadow-sm"
                 >
                     <ChevronRight size={18} />
                 </button>
             </div>

             <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>

             {/* Zoom Controls */}
             <div className="flex items-center gap-1">
                 <button 
                    onClick={handleZoomOut}
                    className="p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white transition"
                    disabled={transform.scale <= 0.5}
                 >
                     <ZoomOut size={20} />
                 </button>
                 
                 {/* Zoom Percentage / Reset */}
                 <button
                    onClick={handleResetZoom}
                    className="min-w-[3rem] text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-primary transition"
                    title="Reset Zoom"
                 >
                    {Math.round(transform.scale * 100)}%
                 </button>
                 
                 <button 
                    onClick={handleZoomIn}
                    className="p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white transition"
                    disabled={transform.scale >= 4}
                 >
                     <ZoomIn size={20} />
                 </button>
             </div>
             
             {/* Reset Button (shows only when zoomed) */}
             {transform.scale !== 1 && (
               <>
                 <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
                 <button 
                    onClick={handleResetZoom}
                    className="p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white transition"
                    title="Reset View"
                 >
                     <RotateCcw size={18} />
                 </button>
               </>
             )}
         </div>
      </div>
    </div>
  );
};

export default PDFReaderPage;
