import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { useAppStore } from '../context/Store';
import { namazBooks } from '../utils/namazBooks';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ArrowLeft, Loader2, ExternalLink, AlertCircle, FileText, ScrollText, RectangleHorizontal, RotateCcw } from 'lucide-react';

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

// --- Touch Gesture Hook ---
interface GestureState {
    scale: number;
    x: number;
    y: number;
}

const useTouchGestures = (
    containerRef: React.RefObject<HTMLDivElement>,
    contentRef: React.RefObject<HTMLDivElement>,
    enabled: boolean = true
) => {
    const [transform, setTransform] = useState<GestureState>({ scale: 1, x: 0, y: 0 });
    const [isGesturing, setIsGesturing] = useState(false);
    
    const gestureRef = useRef({
        type: 'none' as 'none' | 'pinch' | 'pan',
        startDist: 0,
        startScale: 1,
        startX: 0,
        startY: 0,
        startTransformX: 0,
        startTransformY: 0,
        centerX: 0,
        centerY: 0,
        lastScale: 1
    });

    const getDistance = useCallback((t1: React.Touch, t2: React.Touch) => {
        return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    }, []);

    const getCenter = useCallback((t1: React.Touch, t2: React.Touch) => ({
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2
    }), []);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (!enabled) return;

        if (e.touches.length === 2) {
            e.preventDefault();
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = getDistance(t1, t2);
            const center = getCenter(t1, t2);
            
            gestureRef.current = {
                type: 'pinch',
                startDist: dist,
                startScale: transform.scale,
                startX: 0,
                startY: 0,
                startTransformX: transform.x,
                startTransformY: transform.y,
                centerX: center.x,
                centerY: center.y,
                lastScale: transform.scale
            };
            setIsGesturing(true);
        } else if (e.touches.length === 1 && transform.scale > 1) {
            gestureRef.current = {
                ...gestureRef.current,
                type: 'pan',
                startX: e.touches[0].clientX,
                startY: e.touches[0].clientY,
                startTransformX: transform.x,
                startTransformY: transform.y
            };
            setIsGesturing(true);
        }
    }, [enabled, transform, getDistance, getCenter]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!enabled) return;
        
        const gesture = gestureRef.current;

        if (gesture.type === 'pinch' && e.touches.length === 2) {
            e.preventDefault();
            e.stopPropagation();
            
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = getDistance(t1, t2);
            const center = getCenter(t1, t2);
            
            // Calculate new scale
            const scaleRatio = dist / gesture.startDist;
            const newScale = Math.max(0.5, Math.min(gesture.startScale * scaleRatio, 5));
            
            // Calculate translation to zoom toward pinch center
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (containerRect) {
                const containerCenterX = containerRect.width / 2;
                const containerCenterY = containerRect.height / 2;
                
                // Distance from pinch center to container center
                const pinchOffsetX = gesture.centerX - containerRect.left - containerCenterX;
                const pinchOffsetY = gesture.centerY - containerRect.top - containerCenterY;
                
                // Scale the offset difference
                const scaleChange = newScale / gesture.startScale;
                const newX = gesture.startTransformX + (center.x - gesture.centerX) - pinchOffsetX * (scaleChange - 1);
                const newY = gesture.startTransformY + (center.y - gesture.centerY) - pinchOffsetY * (scaleChange - 1);
                
                setTransform({
                    scale: newScale,
                    x: newX,
                    y: newY
                });
            }
        } else if (gesture.type === 'pan' && e.touches.length === 1) {
            e.preventDefault();
            
            const deltaX = e.touches[0].clientX - gesture.startX;
            const deltaY = e.touches[0].clientY - gesture.startY;
            
            // Apply bounds based on zoom level
            const containerRect = containerRef.current?.getBoundingClientRect();
            const contentRect = contentRef.current?.getBoundingClientRect();
            
            if (containerRect && contentRect) {
                const maxX = Math.max(0, (contentRect.width * transform.scale - containerRect.width) / 2);
                const maxY = Math.max(0, (contentRect.height * transform.scale - containerRect.height) / 2);
                
                const newX = Math.max(-maxX, Math.min(maxX, gesture.startTransformX + deltaX));
                const newY = Math.max(-maxY, Math.min(maxY, gesture.startTransformY + deltaY));
                
                setTransform(prev => ({
                    ...prev,
                    x: newX,
                    y: newY
                }));
            } else {
                setTransform(prev => ({
                    ...prev,
                    x: gesture.startTransformX + deltaX,
                    y: gesture.startTransformY + deltaY
                }));
            }
        }
    }, [enabled, transform.scale, getDistance, getCenter, containerRef, contentRef]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!enabled) return;
        
        // If going from 2 fingers to 1, start pan mode
        if (e.touches.length === 1 && gestureRef.current.type === 'pinch' && transform.scale > 1) {
            gestureRef.current = {
                ...gestureRef.current,
                type: 'pan',
                startX: e.touches[0].clientX,
                startY: e.touches[0].clientY,
                startTransformX: transform.x,
                startTransformY: transform.y
            };
            return;
        }
        
        if (e.touches.length === 0) {
            // Snap back if scale is close to 1
            if (transform.scale <= 1.05) {
                setTransform({ scale: 1, x: 0, y: 0 });
            }
            
            gestureRef.current.type = 'none';
            setIsGesturing(false);
        }
    }, [enabled, transform]);

    const resetTransform = useCallback(() => {
        setTransform({ scale: 1, x: 0, y: 0 });
        setIsGesturing(false);
        gestureRef.current.type = 'none';
    }, []);

    const zoomIn = useCallback(() => {
        setTransform(prev => ({
            ...prev,
            scale: Math.min(5, prev.scale + 0.5)
        }));
    }, []);

    const zoomOut = useCallback(() => {
        const newScale = Math.max(0.5, transform.scale - 0.5);
        if (newScale <= 1) {
            setTransform({ scale: 1, x: 0, y: 0 });
        } else {
            setTransform(prev => ({ ...prev, scale: newScale }));
        }
    }, [transform.scale]);

    return {
        transform,
        isGesturing,
        handlers: {
            onTouchStart: handleTouchStart,
            onTouchMove: handleTouchMove,
            onTouchEnd: handleTouchEnd
        },
        resetTransform,
        zoomIn,
        zoomOut,
        isZoomed: transform.scale > 1
    };
};

// --- Sub-Component: Lazy Page for Scroll Mode ---
const LazyPdfPage = ({ 
    pdfDoc, 
    pageNum, 
    scale, 
    onVisible,
    transform,
    isGesturing
}: { 
    pdfDoc: any, 
    pageNum: number, 
    scale: number, 
    onVisible: (num: number) => void,
    transform: GestureState,
    isGesturing: boolean
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
            { rootMargin: '100% 0px', threshold: 0.01 }
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

    const pageTransformStyle: React.CSSProperties = {
        transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
        transformOrigin: 'center top',
        transition: isGesturing ? 'none' : 'transform 0.2s ease-out',
        willChange: isGesturing ? 'transform' : 'auto'
    };

    return (
        <div 
            ref={wrapperRef} 
            id={`page-container-${pageNum}`}
            className="flex justify-center my-4 min-h-[300px] relative overflow-visible"
        >
            <div 
                className="relative shadow-lg bg-white"
                style={pageTransformStyle}
            >
                <canvas ref={canvasRef} className="block bg-white" />
                {!isVisible && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-400 text-xs min-w-[200px] min-h-[300px]">
                        Page {pageNum}
                    </div>
                )}
            </div>
        </div>
    );
};

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
  const [renderScale, setRenderScale] = useState<number | null>(null); 
  const [pageInput, setPageInput] = useState("1");
  
  // Refs
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);
  const singleRenderTaskRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Touch gesture hooks for both modes
  const singleViewGestures = useTouchGestures(containerRef, contentRef, viewMode === 'single' && !loading);
  const scrollViewGestures = useTouchGestures(scrollContainerRef, scrollContentRef, viewMode === 'scroll' && !loading);
  
  // Get current gesture handler based on mode
  const currentGestures = viewMode === 'single' ? singleViewGestures : scrollViewGestures;

  const book = namazBooks.find(b => b.id === bookId);

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

  // Reset gesture transform when changing pages or view mode
  useEffect(() => {
      singleViewGestures.resetTransform();
      scrollViewGestures.resetTransform();
  }, [pageNum, viewMode]);

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

  // Fetch Logic
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
          console.log(`Attempting fetch via ${strategy.name}...`);
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

  // --- Single View Rendering ---
  useEffect(() => {
    if (viewMode !== 'single') return;

    const renderSinglePage = async () => {
      if (!pdfDoc || !singleCanvasRef.current || !containerRef.current) return;
      
      setRendering(true);

      try {
        const page = await pdfDoc.getPage(pageNum);
        
        let currentScale = renderScale;

        if (currentScale === null) {
            const unscaledViewport = page.getViewport({ scale: 1 });
            const containerWidth = containerRef.current.clientWidth;
            const targetWidth = Math.min(containerWidth - 32, 800); 
            const newScale = targetWidth / unscaledViewport.width;
            currentScale = Math.max(0.5, Math.min(newScale, 2.0));
            setRenderScale(currentScale);
        }

        await renderPdfPage(pdfDoc, pageNum, currentScale, singleCanvasRef.current, singleRenderTaskRef);
        
      } catch (err: any) {
          console.error("Render error", err);
      } finally {
          setRendering(false);
      }
    };

    renderSinglePage();
  }, [pdfDoc, pageNum, renderScale, viewMode]);

  // --- Scroll Mode Helpers ---
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

  const handleZoomIn = () => currentGestures.zoomIn();
  const handleZoomOut = () => currentGestures.zoomOut();
  const handleResetZoom = () => currentGestures.resetTransform();

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

  if (!book) return <div>Book not found</div>;

  // Fallback Viewer UI (Google Docs)
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

  // Transform styles
  const singleTransformStyle: React.CSSProperties = {
      transform: `translate(${singleViewGestures.transform.x}px, ${singleViewGestures.transform.y}px) scale(${singleViewGestures.transform.scale})`,
      transformOrigin: 'center top',
      transition: singleViewGestures.isGesturing ? 'none' : 'transform 0.2s ease-out',
      willChange: singleViewGestures.isGesturing ? 'transform' : 'auto'
  };

  // Custom PDF Viewer UI
  return (
    <div className="fixed inset-0 z-50 bg-gray-100/90 dark:bg-gray-900/90 backdrop-blur-sm flex flex-col h-full">
      
      {/* Floating Header */}
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
            className="flex-1 overflow-hidden relative pt-20 pb-24 touch-none"
            ref={containerRef}
            {...singleViewGestures.handlers}
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

            {/* Single Page Render with Touch Transform */}
            <div 
                ref={contentRef}
                className={`flex justify-center min-h-full items-start transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                style={singleTransformStyle}
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

            {/* Zoom indicator when zoomed */}
            {singleViewGestures.isZoomed && (
                <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm">
                    {Math.round(singleViewGestures.transform.scale * 100)}%
                </div>
            )}
          </div>
      ) : (
          // --- Scroll View ---
          <div 
            className={`flex-1 relative pt-20 pb-24 px-4 bg-gray-100 dark:bg-gray-900 ${
                scrollViewGestures.isZoomed ? 'overflow-hidden touch-none' : 'overflow-y-auto'
            }`}
            ref={scrollContainerRef}
            {...scrollViewGestures.handlers}
          >
             {loading ? (
                 <div className="flex flex-col items-center justify-center h-full gap-4">
                     <Loader2 size={32} className="animate-spin text-primary" />
                     <p className="text-sm text-gray-500">Preparing Scroll View...</p>
                 </div>
             ) : (
                 <div 
                    className="max-w-4xl mx-auto"
                    ref={scrollContentRef}
                 >
                     {Array.from({ length: numPages }, (_, i) => (
                         <LazyPdfPage 
                            key={i + 1} 
                            pdfDoc={pdfDoc} 
                            pageNum={i + 1} 
                            scale={renderScale || 1}
                            onVisible={handleScrollPageVisible}
                            transform={scrollViewGestures.transform}
                            isGesturing={scrollViewGestures.isGesturing}
                         />
                     ))}
                 </div>
             )}

             {/* Zoom indicator when zoomed */}
             {scrollViewGestures.isZoomed && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm z-30">
                    {Math.round(scrollViewGestures.transform.scale * 100)}%
                </div>
             )}
          </div>
      )}

      {/* Floating Bottom Controls */}
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
                    className="p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white transition active:scale-95"
                    aria-label="Zoom Out"
                 >
                     <ZoomOut size={20} />
                 </button>
                 
                 {/* Reset zoom button - only show when zoomed */}
                 {currentGestures.isZoomed && (
                     <button 
                        onClick={handleResetZoom}
                        className="p-2 text-primary hover:text-primary/80 transition active:scale-95"
                        aria-label="Reset Zoom"
                     >
                         <RotateCcw size={18} />
                     </button>
                 )}
                 
                 <button 
                    onClick={handleZoomIn}
                    className="p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white transition active:scale-95"
                    aria-label="Zoom In"
                 >
                     <ZoomIn size={20} />
                 </button>
             </div>
         </div>
      </div>
    </div>
  );
};

export default PDFReaderPage;
