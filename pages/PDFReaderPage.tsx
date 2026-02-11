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

// --- Zoomable Container Component ---
interface ZoomableContainerProps {
    children: React.ReactNode;
    containerRef: React.RefObject<HTMLDivElement>;
    onZoomChange?: (scale: number) => void;
    minScale?: number;
    maxScale?: number;
}

const ZoomableContainer: React.FC<ZoomableContainerProps> = ({
    children,
    containerRef,
    onZoomChange,
    minScale = 0.5,
    maxScale = 4,
}) => {
    const contentRef = useRef<HTMLDivElement>(null);
    
    // Transform state
    const [transform, setTransform] = useState({
        scale: 1,
        translateX: 0,
        translateY: 0,
    });
    
    // Animation state
    const [isAnimating, setIsAnimating] = useState(false);
    
    // Gesture tracking ref
    const gestureRef = useRef<{
        type: 'none' | 'pinch' | 'pan';
        initialDistance: number;
        initialScale: number;
        initialTranslateX: number;
        initialTranslateY: number;
        pinchCenterX: number;
        pinchCenterY: number;
        startX: number;
        startY: number;
        lastScale: number;
    }>({
        type: 'none',
        initialDistance: 0,
        initialScale: 1,
        initialTranslateX: 0,
        initialTranslateY: 0,
        pinchCenterX: 0,
        pinchCenterY: 0,
        startX: 0,
        startY: 0,
        lastScale: 1,
    });

    // Double tap detection
    const lastTapRef = useRef<{ time: number; x: number; y: number }>({ time: 0, x: 0, y: 0 });

    // Helper functions
    const getDistance = (touch1: React.Touch, touch2: React.Touch) => {
        return Math.hypot(
            touch2.clientX - touch1.clientX,
            touch2.clientY - touch1.clientY
        );
    };

    const getCenter = (touch1: React.Touch, touch2: React.Touch) => {
        return {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2,
        };
    };

    // Constrain translation to keep content in view
    const constrainTranslation = useCallback((
        scale: number,
        translateX: number,
        translateY: number
    ) => {
        if (!containerRef.current || !contentRef.current) {
            return { translateX, translateY };
        }

        const containerRect = containerRef.current.getBoundingClientRect();
        const contentRect = contentRef.current.getBoundingClientRect();
        
        const scaledWidth = contentRect.width * scale;
        const scaledHeight = contentRect.height * scale;
        
        const maxTranslateX = Math.max(0, (scaledWidth - containerRect.width) / 2);
        const maxTranslateY = Math.max(0, (scaledHeight - containerRect.height) / 2);

        return {
            translateX: Math.max(-maxTranslateX, Math.min(maxTranslateX, translateX)),
            translateY: Math.max(-maxTranslateY, Math.min(maxTranslateY, translateY)),
        };
    }, [containerRef]);

    // Reset zoom
    const resetZoom = useCallback(() => {
        setIsAnimating(true);
        setTransform({ scale: 1, translateX: 0, translateY: 0 });
        setTimeout(() => setIsAnimating(false), 300);
        onZoomChange?.(1);
    }, [onZoomChange]);

    // Zoom to point
    const zoomToPoint = useCallback((
        newScale: number,
        centerX: number,
        centerY: number,
        animate = true
    ) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const containerCenterX = rect.width / 2;
        const containerCenterY = rect.height / 2;

        // Calculate the point relative to container center
        const pointX = centerX - rect.left - containerCenterX;
        const pointY = centerY - rect.top - containerCenterY;

        // Calculate new translation to zoom towards that point
        const scaleChange = newScale / transform.scale;
        const newTranslateX = transform.translateX * scaleChange - pointX * (scaleChange - 1);
        const newTranslateY = transform.translateY * scaleChange - pointY * (scaleChange - 1);

        const constrained = constrainTranslation(newScale, newTranslateX, newTranslateY);

        if (animate) {
            setIsAnimating(true);
            setTimeout(() => setIsAnimating(false), 300);
        }

        setTransform({
            scale: newScale,
            translateX: constrained.translateX,
            translateY: constrained.translateY,
        });
        
        onZoomChange?.(newScale);
    }, [transform, containerRef, constrainTranslation, onZoomChange]);

    // Handle touch start
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        setIsAnimating(false);

        if (e.touches.length === 2) {
            // Pinch gesture start
            e.preventDefault();
            const distance = getDistance(e.touches[0], e.touches[1]);
            const center = getCenter(e.touches[0], e.touches[1]);

            gestureRef.current = {
                type: 'pinch',
                initialDistance: distance,
                initialScale: transform.scale,
                initialTranslateX: transform.translateX,
                initialTranslateY: transform.translateY,
                pinchCenterX: center.x,
                pinchCenterY: center.y,
                startX: center.x,
                startY: center.y,
                lastScale: transform.scale,
            };
        } else if (e.touches.length === 1) {
            // Check for double tap
            const now = Date.now();
            const touch = e.touches[0];
            const tapDistance = Math.hypot(
                touch.clientX - lastTapRef.current.x,
                touch.clientY - lastTapRef.current.y
            );

            if (now - lastTapRef.current.time < 300 && tapDistance < 50) {
                // Double tap detected
                e.preventDefault();
                if (transform.scale > 1.1) {
                    resetZoom();
                } else {
                    zoomToPoint(2.5, touch.clientX, touch.clientY, true);
                }
                lastTapRef.current = { time: 0, x: 0, y: 0 };
                return;
            }

            lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };

            // Pan gesture start (only when zoomed)
            if (transform.scale > 1) {
                gestureRef.current = {
                    type: 'pan',
                    initialDistance: 0,
                    initialScale: transform.scale,
                    initialTranslateX: transform.translateX,
                    initialTranslateY: transform.translateY,
                    pinchCenterX: 0,
                    pinchCenterY: 0,
                    startX: touch.clientX,
                    startY: touch.clientY,
                    lastScale: transform.scale,
                };
            }
        }
    }, [transform, resetZoom, zoomToPoint]);

    // Handle touch move
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        const gesture = gestureRef.current;

        if (gesture.type === 'pinch' && e.touches.length === 2) {
            e.preventDefault();

            const distance = getDistance(e.touches[0], e.touches[1]);
            const center = getCenter(e.touches[0], e.touches[1]);

            // Calculate new scale
            const scaleRatio = distance / gesture.initialDistance;
            let newScale = gesture.initialScale * scaleRatio;
            newScale = Math.max(minScale, Math.min(maxScale, newScale));

            // Calculate pinch center movement
            const centerDeltaX = center.x - gesture.startX;
            const centerDeltaY = center.y - gesture.startY;

            // Calculate translation adjustment for zoom-to-point effect
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const containerCenterX = rect.width / 2;
            const containerCenterY = rect.height / 2;

            const pinchPointX = gesture.pinchCenterX - rect.left - containerCenterX;
            const pinchPointY = gesture.pinchCenterY - rect.top - containerCenterY;

            const scaleChange = newScale / gesture.initialScale;
            
            let newTranslateX = gesture.initialTranslateX * scaleChange 
                - pinchPointX * (scaleChange - 1) 
                + centerDeltaX;
            let newTranslateY = gesture.initialTranslateY * scaleChange 
                - pinchPointY * (scaleChange - 1) 
                + centerDeltaY;

            const constrained = constrainTranslation(newScale, newTranslateX, newTranslateY);

            setTransform({
                scale: newScale,
                translateX: constrained.translateX,
                translateY: constrained.translateY,
            });

            gesture.lastScale = newScale;

        } else if (gesture.type === 'pan' && e.touches.length === 1) {
            e.preventDefault();

            const touch = e.touches[0];
            const deltaX = touch.clientX - gesture.startX;
            const deltaY = touch.clientY - gesture.startY;

            const newTranslateX = gesture.initialTranslateX + deltaX;
            const newTranslateY = gesture.initialTranslateY + deltaY;

            const constrained = constrainTranslation(transform.scale, newTranslateX, newTranslateY);

            setTransform(prev => ({
                ...prev,
                translateX: constrained.translateX,
                translateY: constrained.translateY,
            }));
        }
    }, [minScale, maxScale, containerRef, constrainTranslation, transform.scale]);

    // Handle touch end
    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        const gesture = gestureRef.current;

        if (e.touches.length === 0) {
            // All fingers lifted
            if (gesture.type !== 'none') {
                // Snap to min scale if below threshold
                if (transform.scale < 1) {
                    setIsAnimating(true);
                    setTransform({ scale: 1, translateX: 0, translateY: 0 });
                    setTimeout(() => setIsAnimating(false), 300);
                    onZoomChange?.(1);
                } else {
                    onZoomChange?.(transform.scale);
                }
            }
            gestureRef.current.type = 'none';
        } else if (e.touches.length === 1 && gesture.type === 'pinch') {
            // Transition from pinch to pan
            const touch = e.touches[0];
            gestureRef.current = {
                type: 'pan',
                initialDistance: 0,
                initialScale: transform.scale,
                initialTranslateX: transform.translateX,
                initialTranslateY: transform.translateY,
                pinchCenterX: 0,
                pinchCenterY: 0,
                startX: touch.clientX,
                startY: touch.clientY,
                lastScale: transform.scale,
            };
        }
    }, [transform, onZoomChange]);

    // Handle wheel zoom (for desktop/trackpad)
    const handleWheel = useCallback((e: React.WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = -e.deltaY * 0.01;
            const newScale = Math.max(minScale, Math.min(maxScale, transform.scale + delta));
            zoomToPoint(newScale, e.clientX, e.clientY, false);
        }
    }, [transform.scale, minScale, maxScale, zoomToPoint]);

    // Expose reset function
    useEffect(() => {
        if (containerRef.current) {
            (containerRef.current as any).resetZoom = resetZoom;
            (containerRef.current as any).currentScale = transform.scale;
        }
    }, [containerRef, resetZoom, transform.scale]);

    const contentStyle: React.CSSProperties = {
        transform: `translate3d(${transform.translateX}px, ${transform.translateY}px, 0) scale(${transform.scale})`,
        transformOrigin: 'center center',
        transition: isAnimating ? 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
        willChange: 'transform',
        touchAction: transform.scale > 1 ? 'none' : 'pan-y',
    };

    return (
        <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            style={{ 
                width: '100%', 
                height: '100%', 
                overflow: 'hidden',
                touchAction: 'none',
            }}
        >
            <div
                ref={contentRef}
                style={contentStyle}
                className="flex justify-center items-start min-h-full"
            >
                {children}
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
  const [scale, setScale] = useState<number | null>(null); 
  const [pageInput, setPageInput] = useState("1");
  const [currentZoom, setCurrentZoom] = useState(1);
  
  // Refs
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);
  const singleRenderTaskRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
        
        let currentScale = scale;

        if (currentScale === null) {
            const unscaledViewport = page.getViewport({ scale: 1 });
            const containerWidth = containerRef.current.clientWidth;
            const targetWidth = Math.min(containerWidth - 32, 800); 
            const newScale = targetWidth / unscaledViewport.width;
            currentScale = Math.max(0.5, Math.min(newScale, 2.0));
            setScale(currentScale);
        }

        await renderPdfPage(pdfDoc, pageNum, currentScale, singleCanvasRef.current, singleRenderTaskRef);
        
      } catch (err: any) {
          console.error("Render error", err);
      } finally {
          setRendering(false);
      }
    };

    renderSinglePage();
  }, [pdfDoc, pageNum, scale, viewMode]);

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

  // Handle zoom change from ZoomableContainer
  const handleZoomChange = useCallback((newZoom: number) => {
      setCurrentZoom(newZoom);
  }, []);

  // Reset zoom
  const handleResetZoom = () => {
      if (containerRef.current && (containerRef.current as any).resetZoom) {
          (containerRef.current as any).resetZoom();
      }
  };

  const handleZoomIn = () => setScale(s => Math.min(3.0, (s || 1) + 0.25));
  const handleZoomOut = () => setScale(s => Math.max(0.5, (s || 1) - 0.25));

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

      {/* Zoom indicator */}
      {currentZoom > 1.05 && viewMode === 'single' && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 bg-black/70 text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
              <span>{Math.round(currentZoom * 100)}%</span>
              <button 
                  onClick={handleResetZoom}
                  className="p-0.5 hover:bg-white/20 rounded-full transition"
              >
                  <RotateCcw size={12} />
              </button>
          </div>
      )}

      {/* Main Content Area */}
      {viewMode === 'single' ? (
          <div 
            className="flex-1 overflow-hidden relative pt-20 pb-24"
            ref={containerRef}
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

            {/* Zoomable Container with Single Page */}
            <ZoomableContainer 
                containerRef={containerRef}
                onZoomChange={handleZoomChange}
                minScale={0.5}
                maxScale={4}
            >
                <div className={`transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}>
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
          // --- Scroll View ---
          <div 
            className="flex-1 overflow-y-auto relative pt-20 pb-24 px-4 bg-gray-100 dark:bg-gray-900"
            ref={scrollContainerRef}
          >
             {loading ? (
                 <div className="flex flex-col items-center justify-center h-full gap-4">
                     <Loader2 size={32} className="animate-spin text-primary" />
                     <p className="text-sm text-gray-500">Preparing Scroll View...</p>
                 </div>
             ) : (
                 <div className="max-w-4xl mx-auto">
                     {Array.from({ length: numPages }, (_, i) => (
                         <LazyPdfPage 
                            key={i + 1} 
                            pdfDoc={pdfDoc} 
                            pageNum={i + 1} 
                            scale={scale || 1}
                            onVisible={handleScrollPageVisible}
                         />
                     ))}
                 </div>
             )}
          </div>
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
                 
                 {currentZoom > 1.05 && (
                     <button
                         onClick={handleResetZoom}
                         className="px-2 py-1 text-xs font-medium text-gray-500 hover:text-primary transition"
                     >
                         {Math.round(currentZoom * 100)}%
                     </button>
                 )}
                 
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
