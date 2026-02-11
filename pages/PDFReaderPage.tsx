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
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 border border-gray-200 text-gray-400 text-xs">
                        Page {pageNum}
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Pinch Zoom Hook ---
interface TouchState {
    scale: number;
    translateX: number;
    translateY: number;
}

const usePinchZoom = (
    contentRef: React.RefObject<HTMLDivElement>,
    containerRef: React.RefObject<HTMLDivElement>,
    initialScale: number = 1,
    minScale: number = 0.5,
    maxScale: number = 4
) => {
    const [touchState, setTouchState] = useState<TouchState>({
        scale: initialScale,
        translateX: 0,
        translateY: 0,
    });

    const gestureRef = useRef({
        isGesturing: false,
        isPinching: false,
        isPanning: false,
        startDistance: 0,
        startScale: 1,
        startX: 0,
        startY: 0,
        startTranslateX: 0,
        startTranslateY: 0,
        lastTouchX: 0,
        lastTouchY: 0,
        pinchCenterX: 0,
        pinchCenterY: 0,
    });

    const animationFrameRef = useRef<number | null>(null);

    const getDistance = (touches: React.TouchList) => {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    };

    const getCenter = (touches: React.TouchList) => {
        return {
            x: (touches[0].clientX + touches[1].clientX) / 2,
            y: (touches[0].clientY + touches[1].clientY) / 2,
        };
    };

    const clampTranslate = useCallback((
        translateX: number, 
        translateY: number, 
        scale: number
    ): { x: number; y: number } => {
        if (!contentRef.current || !containerRef.current) {
            return { x: translateX, y: translateY };
        }

        const content = contentRef.current;
        const container = containerRef.current;
        
        const contentRect = content.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        const scaledWidth = contentRect.width;
        const scaledHeight = contentRect.height;

        // If content is smaller than container, center it
        if (scaledWidth <= containerRect.width) {
            translateX = 0;
        } else {
            const maxTranslateX = (scaledWidth - containerRect.width) / 2 / scale;
            translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX));
        }

        if (scaledHeight <= containerRect.height) {
            translateY = 0;
        } else {
            const maxTranslateY = (scaledHeight - containerRect.height) / 2 / scale;
            translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY));
        }

        return { x: translateX, y: translateY };
    }, [contentRef, containerRef]);

    const applyTransform = useCallback((scale: number, translateX: number, translateY: number, smooth: boolean = false) => {
        if (!contentRef.current) return;
        
        const clamped = clampTranslate(translateX, translateY, scale);
        
        contentRef.current.style.transition = smooth ? 'transform 0.3s ease-out' : 'none';
        contentRef.current.style.transform = `translate3d(${clamped.x}px, ${clamped.y}px, 0) scale(${scale})`;
        contentRef.current.style.transformOrigin = 'center center';
    }, [contentRef, clampTranslate]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        const gesture = gestureRef.current;

        if (e.touches.length === 2) {
            // Pinch start
            gesture.isPinching = true;
            gesture.isPanning = false;
            gesture.isGesturing = true;
            gesture.startDistance = getDistance(e.touches);
            gesture.startScale = touchState.scale;
            gesture.startTranslateX = touchState.translateX;
            gesture.startTranslateY = touchState.translateY;
            
            const center = getCenter(e.touches);
            gesture.pinchCenterX = center.x;
            gesture.pinchCenterY = center.y;
        } else if (e.touches.length === 1 && touchState.scale > 1) {
            // Pan start (only when zoomed in)
            gesture.isPanning = true;
            gesture.isPinching = false;
            gesture.isGesturing = true;
            gesture.lastTouchX = e.touches[0].clientX;
            gesture.lastTouchY = e.touches[0].clientY;
            gesture.startTranslateX = touchState.translateX;
            gesture.startTranslateY = touchState.translateY;
            gesture.startX = e.touches[0].clientX;
            gesture.startY = e.touches[0].clientY;
        }
    }, [touchState]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        const gesture = gestureRef.current;

        if (!gesture.isGesturing) return;

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
            if (gesture.isPinching && e.touches.length === 2) {
                e.preventDefault();
                
                const currentDistance = getDistance(e.touches);
                const scaleRatio = currentDistance / gesture.startDistance;
                let newScale = gesture.startScale * scaleRatio;
                
                // Apply scale limits with elastic feel
                if (newScale < minScale) {
                    newScale = minScale - (minScale - newScale) * 0.5;
                } else if (newScale > maxScale) {
                    newScale = maxScale + (newScale - maxScale) * 0.2;
                }

                const center = getCenter(e.touches);
                const deltaX = center.x - gesture.pinchCenterX;
                const deltaY = center.y - gesture.pinchCenterY;
                
                const newTranslateX = gesture.startTranslateX + deltaX / newScale;
                const newTranslateY = gesture.startTranslateY + deltaY / newScale;

                applyTransform(newScale, newTranslateX, newTranslateY);
                
                setTouchState({
                    scale: newScale,
                    translateX: newTranslateX,
                    translateY: newTranslateY,
                });
            } else if (gesture.isPanning && e.touches.length === 1) {
                e.preventDefault();
                
                const deltaX = e.touches[0].clientX - gesture.lastTouchX;
                const deltaY = e.touches[0].clientY - gesture.lastTouchY;
                
                gesture.lastTouchX = e.touches[0].clientX;
                gesture.lastTouchY = e.touches[0].clientY;

                const newTranslateX = touchState.translateX + deltaX / touchState.scale;
                const newTranslateY = touchState.translateY + deltaY / touchState.scale;

                applyTransform(touchState.scale, newTranslateX, newTranslateY);
                
                setTouchState(prev => ({
                    ...prev,
                    translateX: newTranslateX,
                    translateY: newTranslateY,
                }));
            }
        });
    }, [touchState, applyTransform, minScale, maxScale]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        const gesture = gestureRef.current;

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }

        if (gesture.isPinching) {
            // Snap back if out of bounds
            let finalScale = touchState.scale;
            if (finalScale < minScale) {
                finalScale = minScale;
            } else if (finalScale > maxScale) {
                finalScale = maxScale;
            }

            // Reset translate if zoomed out
            let finalTranslateX = touchState.translateX;
            let finalTranslateY = touchState.translateY;
            
            if (finalScale <= 1) {
                finalTranslateX = 0;
                finalTranslateY = 0;
            }

            const clamped = clampTranslate(finalTranslateX, finalTranslateY, finalScale);
            
            applyTransform(finalScale, clamped.x, clamped.y, true);
            
            setTouchState({
                scale: finalScale,
                translateX: clamped.x,
                translateY: clamped.y,
            });
        }

        if (e.touches.length === 0) {
            gesture.isGesturing = false;
            gesture.isPinching = false;
            gesture.isPanning = false;
        } else if (e.touches.length === 1 && gesture.isPinching) {
            // Transition from pinch to pan
            gesture.isPinching = false;
            gesture.isPanning = touchState.scale > 1;
            gesture.lastTouchX = e.touches[0].clientX;
            gesture.lastTouchY = e.touches[0].clientY;
        }
    }, [touchState, applyTransform, clampTranslate, minScale, maxScale]);

    const resetZoom = useCallback(() => {
        setTouchState({
            scale: 1,
            translateX: 0,
            translateY: 0,
        });
        applyTransform(1, 0, 0, true);
    }, [applyTransform]);

    const zoomIn = useCallback(() => {
        const newScale = Math.min(maxScale, touchState.scale + 0.5);
        setTouchState(prev => ({ ...prev, scale: newScale }));
        applyTransform(newScale, touchState.translateX, touchState.translateY, true);
    }, [touchState, applyTransform, maxScale]);

    const zoomOut = useCallback(() => {
        const newScale = Math.max(minScale, touchState.scale - 0.5);
        let newTranslateX = touchState.translateX;
        let newTranslateY = touchState.translateY;
        
        if (newScale <= 1) {
            newTranslateX = 0;
            newTranslateY = 0;
        }
        
        setTouchState({ scale: newScale, translateX: newTranslateX, translateY: newTranslateY });
        applyTransform(newScale, newTranslateX, newTranslateY, true);
    }, [touchState, applyTransform, minScale]);

    const setScale = useCallback((newScale: number) => {
        const clampedScale = Math.max(minScale, Math.min(maxScale, newScale));
        setTouchState(prev => ({ ...prev, scale: clampedScale }));
        applyTransform(clampedScale, touchState.translateX, touchState.translateY, true);
    }, [touchState, applyTransform, minScale, maxScale]);

    return {
        touchState,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        resetZoom,
        zoomIn,
        zoomOut,
        setScale,
        isZoomed: touchState.scale > 1,
    };
};

// --- Scroll Mode Pinch Zoom Wrapper ---
const ZoomableScrollContainer = ({
    children,
    loading,
}: {
    children: React.ReactNode;
    loading: boolean;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    
    const {
        touchState,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        resetZoom,
        isZoomed,
    } = usePinchZoom(contentRef, containerRef, 1, 0.5, 3);

    return (
        <div 
            ref={containerRef}
            className="flex-1 overflow-auto relative pt-20 pb-24 touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{ 
                overflowX: isZoomed ? 'auto' : 'hidden',
                overflowY: 'auto',
            }}
        >
            {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <Loader2 size={32} className="animate-spin text-primary" />
                    <p className="text-sm text-gray-500">Preparing Scroll View...</p>
                </div>
            ) : (
                <div 
                    ref={contentRef}
                    className="max-w-4xl mx-auto px-4 will-change-transform"
                    style={{ transformOrigin: 'center top' }}
                >
                    {children}
                </div>
            )}
            
            {/* Reset Zoom Button */}
            {isZoomed && (
                <button
                    onClick={resetZoom}
                    className="fixed bottom-24 right-4 z-30 bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                    <RotateCcw size={20} />
                </button>
            )}
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
  const [baseScale, setBaseScale] = useState<number | null>(null); 
  const [pageInput, setPageInput] = useState("1");
  
  // Refs
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);
  const singleRenderTaskRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const book = namazBooks.find(b => b.id === bookId);

  // Pinch zoom hook for single page mode
  const {
    touchState,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    resetZoom,
    zoomIn,
    zoomOut,
    setScale: setZoomScale,
    isZoomed,
  } = usePinchZoom(contentRef, containerRef, 1, 0.5, 4);

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

  // Reset zoom when changing pages
  useEffect(() => {
    if (viewMode === 'single') {
      resetZoom();
    }
  }, [pageNum, viewMode]);

  // --- Single View Rendering ---
  useEffect(() => {
    if (viewMode !== 'single') return;

    const renderSinglePage = async () => {
      if (!pdfDoc || !singleCanvasRef.current || !containerRef.current) return;
      
      setRendering(true);

      try {
        const page = await pdfDoc.getPage(pageNum);
        
        let currentScale = baseScale;

        if (currentScale === null) {
            const unscaledViewport = page.getViewport({ scale: 1 });
            const containerWidth = containerRef.current.clientWidth;
            const targetWidth = Math.min(containerWidth - 32, 800); 
            const newScale = targetWidth / unscaledViewport.width;
            currentScale = Math.max(0.5, Math.min(newScale, 2.0));
            setBaseScale(currentScale);
        }

        await renderPdfPage(pdfDoc, pageNum, currentScale, singleCanvasRef.current, singleRenderTaskRef);
        
      } catch (err: any) {
          console.error("Render error", err);
      } finally {
          setRendering(false);
      }
    };

    renderSinglePage();
  }, [pdfDoc, pageNum, baseScale, viewMode]);

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

  const handleZoomIn = () => {
    if (viewMode === 'single') {
      zoomIn();
    } else {
      setBaseScale(s => Math.min(3.0, (s || 1) + 0.25));
    }
  };

  const handleZoomOut = () => {
    if (viewMode === 'single') {
      zoomOut();
    } else {
      setBaseScale(s => Math.max(0.5, (s || 1) - 0.25));
    }
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
      resetZoom();
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
          // --- Single Page View with Pinch Zoom ---
          <div 
            className="flex-1 overflow-hidden relative pt-20 pb-24 touch-none"
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              overflow: isZoomed ? 'auto' : 'hidden',
            }}
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

            {/* Single Page Render */}
            <div 
                ref={contentRef}
                className={`flex justify-center min-h-full items-center will-change-transform transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                style={{ 
                  transformOrigin: 'center center',
                  minHeight: '100%',
                }}
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

            {/* Reset Zoom Button */}
            {isZoomed && (
                <button
                    onClick={resetZoom}
                    className="fixed bottom-24 right-4 z-30 bg-white dark:bg-gray-800 shadow-lg rounded-full p-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                    <RotateCcw size={20} />
                </button>
            )}
          </div>
      ) : (
          // --- Scroll View with Zoom ---
          <ZoomableScrollContainer loading={loading}>
              {Array.from({ length: numPages }, (_, i) => (
                  <LazyPdfPage 
                     key={i + 1} 
                     pdfDoc={pdfDoc} 
                     pageNum={i + 1} 
                     scale={baseScale || 1}
                     onVisible={handleScrollPageVisible}
                  />
              ))}
          </ZoomableScrollContainer>
      )}

      {/* Floating Bottom Controls */}
      <div className="absolute bottom-6 left-0 right-0 z-20 flex justify-center px-4 pointer-events-none">
         <div className="bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 shadow-lg rounded-2xl p-2 flex items-center gap-4 pointer-events-auto">
             
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
                 >
                     <ZoomOut size={20} />
                 </button>
                 
                 {/* Zoom indicator */}
                 <span className="text-xs font-mono text-gray-400 min-w-[3rem] text-center">
                   {Math.round((viewMode === 'single' ? touchState.scale : (baseScale || 1)) * 100)}%
                 </span>
                 
                 <button 
                    onClick={handleZoomIn}
                    className="p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white transition"
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
