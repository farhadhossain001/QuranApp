import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { useAppStore } from '../context/Store';
import { namazBooks } from '../utils/namazBooks';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  ArrowLeft, 
  Loader2, 
  AlertCircle, 
  FileText, 
  ScrollText, 
  RectangleHorizontal,
  RotateCcw 
} from 'lucide-react';

// --- Touch State Interface ---
interface TouchState {
  initialDistance: number;
  initialScale: number;
  initialTranslate: { x: number; y: number };
  centerPoint: { x: number; y: number };
  isPinching: boolean;
  isPanning: boolean;
  lastTouchPos: { x: number; y: number };
  startTime: number;
}

// --- Transform State Interface ---
interface TransformState {
  scale: number;
  translateX: number;
  translateY: number;
}

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

// --- Helper: Calculate distance between two touch points ---
const getTouchDistance = (touch1: React.Touch, touch2: React.Touch): number => {
    return Math.hypot(
        touch1.clientX - touch2.clientX,
        touch1.clientY - touch2.clientY
    );
};

// --- Helper: Get center point between two touches ---
const getTouchCenter = (touch1: React.Touch, touch2: React.Touch): { x: number; y: number } => {
    return {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2
    };
};

// --- Sub-Component: Zoomable Container ---
const ZoomableContainer = ({ 
    children, 
    transform, 
    onTransformChange,
    containerRef,
    contentRef,
    minScale = 0.5,
    maxScale = 4.0
}: { 
    children: React.ReactNode;
    transform: TransformState;
    onTransformChange: (transform: TransformState) => void;
    containerRef: React.RefObject<HTMLDivElement>;
    contentRef: React.RefObject<HTMLDivElement>;
    minScale?: number;
    maxScale?: number;
}) => {
    const touchStateRef = useRef<TouchState | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const velocityRef = useRef({ x: 0, y: 0 });
    const lastMoveTimeRef = useRef(0);

    const clampTranslation = useCallback((
        translateX: number, 
        translateY: number, 
        scale: number
    ): { x: number; y: number } => {
        if (!containerRef.current || !contentRef.current) {
            return { x: translateX, y: translateY };
        }

        const containerRect = containerRef.current.getBoundingClientRect();
        const contentRect = contentRef.current.getBoundingClientRect();

        const scaledWidth = contentRect.width;
        const scaledHeight = contentRect.height;

        let clampedX = translateX;
        let clampedY = translateY;

        // If content is smaller than container, center it
        if (scaledWidth <= containerRect.width) {
            clampedX = 0;
        } else {
            const maxX = (scaledWidth - containerRect.width) / 2 + 20;
            clampedX = Math.max(-maxX, Math.min(maxX, translateX));
        }

        if (scaledHeight <= containerRect.height) {
            clampedY = 0;
        } else {
            const maxY = (scaledHeight - containerRect.height) / 2 + 20;
            clampedY = Math.max(-maxY, Math.min(maxY, translateY));
        }

        return { x: clampedX, y: clampedY };
    }, [containerRef, contentRef]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        // Cancel any ongoing momentum
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        velocityRef.current = { x: 0, y: 0 };

        if (e.touches.length === 2) {
            // Pinch gesture start
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = getTouchDistance(touch1, touch2);
            const center = getTouchCenter(touch1, touch2);

            touchStateRef.current = {
                initialDistance: distance,
                initialScale: transform.scale,
                initialTranslate: { x: transform.translateX, y: transform.translateY },
                centerPoint: center,
                isPinching: true,
                isPanning: false,
                lastTouchPos: center,
                startTime: Date.now()
            };
        } else if (e.touches.length === 1 && transform.scale > 1) {
            // Pan gesture start (only when zoomed in)
            const touch = e.touches[0];
            touchStateRef.current = {
                initialDistance: 0,
                initialScale: transform.scale,
                initialTranslate: { x: transform.translateX, y: transform.translateY },
                centerPoint: { x: touch.clientX, y: touch.clientY },
                isPinching: false,
                isPanning: true,
                lastTouchPos: { x: touch.clientX, y: touch.clientY },
                startTime: Date.now()
            };
        }
    }, [transform]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!touchStateRef.current) return;

        const now = Date.now();
        const deltaTime = now - lastMoveTimeRef.current;
        lastMoveTimeRef.current = now;

        if (e.touches.length === 2 && touchStateRef.current.isPinching) {
            e.preventDefault();
            e.stopPropagation();

            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const distance = getTouchDistance(touch1, touch2);
            const center = getTouchCenter(touch1, touch2);

            // Calculate new scale
            const scaleRatio = distance / touchStateRef.current.initialDistance;
            let newScale = touchStateRef.current.initialScale * scaleRatio;
            newScale = Math.max(minScale, Math.min(maxScale, newScale));

            // Calculate translation to zoom towards pinch center
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (containerRect) {
                const containerCenterX = containerRect.width / 2;
                const containerCenterY = containerRect.height / 2;

                const pinchOffsetX = center.x - containerRect.left - containerCenterX;
                const pinchOffsetY = center.y - containerRect.top - containerCenterY;

                const scaleDiff = newScale / touchStateRef.current.initialScale;
                
                let newTranslateX = touchStateRef.current.initialTranslate.x * scaleDiff + 
                    (center.x - touchStateRef.current.centerPoint.x);
                let newTranslateY = touchStateRef.current.initialTranslate.y * scaleDiff + 
                    (center.y - touchStateRef.current.centerPoint.y);

                const clamped = clampTranslation(newTranslateX, newTranslateY, newScale);

                onTransformChange({
                    scale: newScale,
                    translateX: clamped.x,
                    translateY: clamped.y
                });
            }

            touchStateRef.current.lastTouchPos = center;

        } else if (e.touches.length === 1 && touchStateRef.current.isPanning) {
            e.preventDefault();
            e.stopPropagation();

            const touch = e.touches[0];
            const deltaX = touch.clientX - touchStateRef.current.lastTouchPos.x;
            const deltaY = touch.clientY - touchStateRef.current.lastTouchPos.y;

            // Calculate velocity for momentum
            if (deltaTime > 0) {
                velocityRef.current = {
                    x: deltaX / deltaTime * 15,
                    y: deltaY / deltaTime * 15
                };
            }

            let newTranslateX = transform.translateX + deltaX;
            let newTranslateY = transform.translateY + deltaY;

            const clamped = clampTranslation(newTranslateX, newTranslateY, transform.scale);

            onTransformChange({
                ...transform,
                translateX: clamped.x,
                translateY: clamped.y
            });

            touchStateRef.current.lastTouchPos = { x: touch.clientX, y: touch.clientY };
        }
    }, [transform, onTransformChange, clampTranslation, minScale, maxScale, containerRef]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        if (!touchStateRef.current) return;

        // Apply momentum for panning
        if (touchStateRef.current.isPanning && (Math.abs(velocityRef.current.x) > 0.5 || Math.abs(velocityRef.current.y) > 0.5)) {
            const applyMomentum = () => {
                velocityRef.current.x *= 0.95;
                velocityRef.current.y *= 0.95;

                if (Math.abs(velocityRef.current.x) < 0.5 && Math.abs(velocityRef.current.y) < 0.5) {
                    animationFrameRef.current = null;
                    return;
                }

                onTransformChange(prev => {
                    const clamped = clampTranslation(
                        prev.translateX + velocityRef.current.x,
                        prev.translateY + velocityRef.current.y,
                        prev.scale
                    );
                    return {
                        ...prev,
                        translateX: clamped.x,
                        translateY: clamped.y
                    };
                });

                animationFrameRef.current = requestAnimationFrame(applyMomentum);
            };

            animationFrameRef.current = requestAnimationFrame(applyMomentum);
        }

        // Reset to 1x scale if pinched below threshold
        if (touchStateRef.current.isPinching && transform.scale < 1) {
            onTransformChange({
                scale: 1,
                translateX: 0,
                translateY: 0
            });
        }

        // Handle transition from 2 fingers to 1 finger
        if (e.touches.length === 1 && touchStateRef.current.isPinching) {
            const touch = e.touches[0];
            touchStateRef.current = {
                ...touchStateRef.current,
                isPinching: false,
                isPanning: true,
                lastTouchPos: { x: touch.clientX, y: touch.clientY }
            };
            return;
        }

        touchStateRef.current = null;
    }, [transform, onTransformChange, clampTranslation]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

    return (
        <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="w-full h-full"
            style={{ touchAction: transform.scale > 1 ? 'none' : 'pan-y' }}
        >
            {children}
        </div>
    );
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
  
  // Transform state for zoom and pan
  const [transform, setTransform] = useState<TransformState>({
    scale: 1,
    translateX: 0,
    translateY: 0
  });

  // Scroll mode transform
  const [scrollTransform, setScrollTransform] = useState<TransformState>({
    scale: 1,
    translateX: 0,
    translateY: 0
  });
  
  // Refs
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);
  const singleRenderTaskRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const book = namazBooks.find(b => b.id === bookId);

  // Effective scale calculation
  const effectiveScale = (baseScale || 1) * transform.scale;
  const scrollEffectiveScale = (baseScale || 1) * scrollTransform.scale;

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
    setTransform({ scale: 1, translateX: 0, translateY: 0 });
    setScrollTransform({ scale: 1, translateX: 0, translateY: 0 });

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
        
        let currentBaseScale = baseScale;

        if (currentBaseScale === null) {
            const unscaledViewport = page.getViewport({ scale: 1 });
            const containerWidth = containerRef.current.clientWidth;
            const targetWidth = Math.min(containerWidth - 32, 800); 
            const newScale = targetWidth / unscaledViewport.width;
            currentBaseScale = Math.max(0.5, Math.min(newScale, 2.0));
            setBaseScale(currentBaseScale);
        }

        await renderPdfPage(pdfDoc, pageNum, currentBaseScale, singleCanvasRef.current, singleRenderTaskRef);
        
      } catch (err: any) {
          console.error("Render error", err);
      } finally {
          setRendering(false);
      }
    };

    renderSinglePage();
  }, [pdfDoc, pageNum, baseScale, viewMode]);

  // Reset transform when page changes
  useEffect(() => {
    setTransform({ scale: 1, translateX: 0, translateY: 0 });
  }, [pageNum]);

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

  // --- Zoom Handlers ---
  const handleZoomIn = () => {
    if (viewMode === 'single') {
      setTransform(prev => ({
        ...prev,
        scale: Math.min(4.0, prev.scale + 0.25)
      }));
    } else {
      setScrollTransform(prev => ({
        ...prev,
        scale: Math.min(4.0, prev.scale + 0.25)
      }));
    }
  };

  const handleZoomOut = () => {
    if (viewMode === 'single') {
      setTransform(prev => {
        const newScale = Math.max(0.5, prev.scale - 0.25);
        return {
          scale: newScale,
          translateX: newScale <= 1 ? 0 : prev.translateX * (newScale / prev.scale),
          translateY: newScale <= 1 ? 0 : prev.translateY * (newScale / prev.scale)
        };
      });
    } else {
      setScrollTransform(prev => {
        const newScale = Math.max(0.5, prev.scale - 0.25);
        return {
          scale: newScale,
          translateX: newScale <= 1 ? 0 : prev.translateX * (newScale / prev.scale),
          translateY: newScale <= 1 ? 0 : prev.translateY * (newScale / prev.scale)
        };
      });
    }
  };

  const handleResetZoom = () => {
    if (viewMode === 'single') {
      setTransform({ scale: 1, translateX: 0, translateY: 0 });
    } else {
      setScrollTransform({ scale: 1, translateX: 0, translateY: 0 });
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

  // Nav Handlers
  const goNext = () => {
      const next = Math.min(numPages, pageNum + 1);
      scrollToPage(next);
  };
  
  const goPrev = () => {
      const prev = Math.max(1, pageNum - 1);
      scrollToPage(prev);
  };

  // Toggle Mode
  const toggleViewMode = () => {
      const newMode = viewMode === 'single' ? 'scroll' : 'single';
      setViewMode(newMode);
      setTransform({ scale: 1, translateX: 0, translateY: 0 });
      setScrollTransform({ scale: 1, translateX: 0, translateY: 0 });
      setTimeout(() => {
          if (newMode === 'scroll') {
              scrollToPage(pageNum);
          }
      }, 100);
  };

  // Current zoom percentage
  const currentZoom = viewMode === 'single' ? transform.scale : scrollTransform.scale;
  const isZoomed = currentZoom > 1;

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

      {/* Zoom Indicator */}
      {isZoomed && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm">
          {Math.round(currentZoom * 100)}% - Drag to pan
        </div>
      )}

      {/* Main Content Area */}
      {viewMode === 'single' ? (
          // --- Single Page View with Zoom ---
          <div 
            className="flex-1 overflow-hidden relative pt-20 pb-24"
            ref={containerRef}
          >
            <ZoomableContainer
              transform={transform}
              onTransformChange={setTransform}
              containerRef={containerRef}
              contentRef={contentRef}
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

              <div 
                  ref={contentRef}
                  className={`flex justify-center min-h-full items-center transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
                  style={{
                    transform: `translate(${transform.translateX}px, ${transform.translateY}px) scale(${transform.scale})`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.1s ease-out',
                    willChange: 'transform'
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
            </ZoomableContainer>
          </div>
      ) : (
          // --- Scroll View with Zoom ---
          <div 
            className="flex-1 overflow-hidden relative pt-20 pb-24"
            ref={scrollContainerRef}
          >
            <ZoomableContainer
              transform={scrollTransform}
              onTransformChange={setScrollTransform}
              containerRef={scrollContainerRef}
              contentRef={scrollContentRef}
            >
              <div 
                className="h-full overflow-y-auto px-4"
                style={{
                  transform: `translate(${scrollTransform.translateX}px, ${scrollTransform.translateY}px) scale(${scrollTransform.scale})`,
                  transformOrigin: 'center top',
                  transition: 'transform 0.1s ease-out',
                  willChange: 'transform'
                }}
              >
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                        <Loader2 size={32} className="animate-spin text-primary" />
                        <p className="text-sm text-gray-500">Preparing Scroll View...</p>
                    </div>
                ) : (
                    <div ref={scrollContentRef} className="max-w-4xl mx-auto py-4">
                        {Array.from({ length: numPages }, (_, i) => (
                            <LazyPdfPage 
                              key={i + 1} 
                              pdfDoc={pdfDoc} 
                              pageNum={i + 1} 
                              scale={baseScale || 1}
                              onVisible={handleScrollPageVisible}
                            />
                        ))}
                    </div>
                )}
              </div>
            </ZoomableContainer>
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
                    disabled={currentZoom <= 0.5}
                    className="p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white transition disabled:opacity-30"
                 >
                     <ZoomOut size={20} />
                 </button>
                 
                 {/* Zoom percentage / Reset button */}
                 <button
                    onClick={handleResetZoom}
                    className={`px-2 py-1 text-xs font-medium rounded-md transition min-w-[3rem] ${
                      isZoomed 
                        ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title="Reset zoom"
                 >
                    {Math.round(currentZoom * 100)}%
                 </button>
                 
                 <button 
                    onClick={handleZoomIn}
                    disabled={currentZoom >= 4.0}
                    className="p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white transition disabled:opacity-30"
                 >
                     <ZoomIn size={20} />
                 </button>
             </div>

             {/* Reset Button when zoomed */}
             {isZoomed && (
                <>
                  <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
                  <button 
                      onClick={handleResetZoom}
                      className="p-2 text-gray-500 hover:text-primary dark:text-gray-400 dark:hover:text-white transition"
                      title="Reset view"
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
