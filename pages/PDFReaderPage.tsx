
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { useAppStore } from '../context/Store';
import { namazBooks } from '../utils/namazBooks';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, ArrowLeft, Loader2, AlertCircle, FileText, ScrollText, RectangleHorizontal } from 'lucide-react';

// --- Helper: Render Page Function ---
const renderPdfPage = async (
    pdfDoc: any, 
    pageNum: number, 
    scale: number, 
    canvas: HTMLCanvasElement, 
    currentTaskRef: React.MutableRefObject<any>
) => {
    if (!pdfDoc || !canvas) return;

    // Cancel any pending render task for this canvas
    if (currentTaskRef.current) {
        currentTaskRef.current.cancel();
    }

    try {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const context = canvas.getContext('2d');
        
        if (!context) return;

        // High DPI Rendering
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
    
    // Intersection Observer to detect visibility
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

    // Render when visible or scale changes
    useEffect(() => {
        if (isVisible && pdfDoc && scale) {
            renderPdfPage(pdfDoc, pageNum, scale, canvasRef.current!, renderTaskRef);
        }
    }, [isVisible, pdfDoc, pageNum, scale]);

    return (
        <div 
            ref={wrapperRef} 
            id={`page-container-${pageNum}`}
            className="flex justify-center my-4 relative"
            style={{ minHeight: scale ? 200 * scale : 300 }}
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

const PDFReaderPage = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const { settings, formatNumber } = useAppStore();
  
  // States
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [useFallbackViewer, setUseFallbackViewer] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [viewMode, setViewMode] = useState<'single' | 'scroll'>('single'); // Default: Single Page
  
  // PDF State
  const [pdfDoc, setPdfDoc] = useState<any | null>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState<number | null>(null); 
  const [pageInput, setPageInput] = useState("1");
  
  // Interaction State
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const touchStateRef = useRef<{
      distance: number | null;
      startScale: number;
      startX: number;
      startY: number;
      lastX: number;
      lastY: number;
      isPanning: boolean;
  }>({
      distance: null,
      startScale: 1,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      isPanning: false
  });

  // Refs
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);
  const singleRenderTaskRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
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

  // Initial Auto-Fit Logic
  useEffect(() => {
      if (pdfDoc && !scale) {
          const fit = async () => {
              try {
                  const page = await pdfDoc.getPage(1);
                  const viewport = page.getViewport({ scale: 1 });
                  const availableWidth = containerRef.current?.clientWidth || window.innerWidth;
                  const targetWidth = Math.min(availableWidth - 24, 800); 
                  const newScale = targetWidth / viewport.width;
                  setScale(newScale);
              } catch (e) {
                  console.error("Auto fit failed", e);
                  setScale(1);
              }
          };
          fit();
      }
  }, [pdfDoc, scale]);

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
          const timeoutId = setTimeout(() => controller.abort(), 10000); 
          const response = await fetch(strategy.url, { signal: controller.signal, cache: 'no-store' });
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

  // --- Single View Render ---
  useEffect(() => {
    if (viewMode !== 'single' || !scale) return; 

    const renderSinglePage = async () => {
      if (!pdfDoc || !singleCanvasRef.current) return;
      setRendering(true);
      try {
        await renderPdfPage(pdfDoc, pageNum, scale, singleCanvasRef.current, singleRenderTaskRef);
        
        // Reset CSS transform on page change for Single View
        transformRef.current = { x: 0, y: 0, scale: 1 };
        if (contentRef.current) {
            contentRef.current.style.transform = `translate3d(0px, 0px, 0) scale(1)`;
        }
      } catch (err) {
          console.error(err);
      } finally {
          setRendering(false);
      }
    };
    renderSinglePage();
  }, [pdfDoc, pageNum, scale, viewMode]);

  // --- INTERACTION HANDLERS ---

  const updateSingleTransform = () => {
      if (contentRef.current) {
          const { x, y, scale } = transformRef.current;
          contentRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
      }
  };

  const getDistance = (touches: React.TouchList) => {
      return Math.hypot(
          touches[0].clientX - touches[1].clientX,
          touches[0].clientY - touches[1].clientY
      );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      if (viewMode === 'scroll') {
          // Scroll Mode
          if (e.touches.length === 2) {
              touchStateRef.current.distance = getDistance(e.touches);
              touchStateRef.current.startScale = scale || 1;
          }
      } else {
          // Single Mode
          if (e.touches.length === 1) {
              touchStateRef.current.isPanning = true;
              touchStateRef.current.startX = e.touches[0].clientX;
              touchStateRef.current.startY = e.touches[0].clientY;
              touchStateRef.current.lastX = transformRef.current.x;
              touchStateRef.current.lastY = transformRef.current.y;
          } else if (e.touches.length === 2) {
              touchStateRef.current.isPanning = false;
              touchStateRef.current.distance = getDistance(e.touches);
              touchStateRef.current.startScale = transformRef.current.scale;
          }
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (viewMode === 'scroll') {
          // Scroll Mode: Only handle Pinch Zoom
          if (e.touches.length === 2 && touchStateRef.current.distance) {
              e.preventDefault(); // Stop browser zoom
              const dist = getDistance(e.touches);
              const ratio = dist / touchStateRef.current.distance;
              
              // Apply CSS scaling to the content wrapper for smoothness
              if (scrollContentRef.current) {
                  scrollContentRef.current.style.transformOrigin = 'center top';
                  scrollContentRef.current.style.transform = `scale(${ratio})`;
              }
          }
          // Single finger touch is left alone for native scrolling (handled by overflow-auto)
      } else {
          // Single Mode: Pan & CSS Zoom
          e.preventDefault(); 
          if (e.touches.length === 1 && touchStateRef.current.isPanning) {
              const dx = e.touches[0].clientX - touchStateRef.current.startX;
              const dy = e.touches[0].clientY - touchStateRef.current.startY;
              transformRef.current.x = touchStateRef.current.lastX + dx;
              transformRef.current.y = touchStateRef.current.lastY + dy;
              updateSingleTransform();

          } else if (e.touches.length === 2 && touchStateRef.current.distance) {
              const dist = getDistance(e.touches);
              const ratio = dist / touchStateRef.current.distance;
              const newScale = Math.max(1, Math.min(touchStateRef.current.startScale * ratio, 4.0));
              transformRef.current.scale = newScale;
              updateSingleTransform();
          }
      }
  };

  const handleTouchEnd = () => {
      if (viewMode === 'scroll') {
          if (touchStateRef.current.distance && scrollContentRef.current) {
                // End of Pinch: Calculate new scale and re-render
                const currentTransform = scrollContentRef.current.style.transform;
                const match = currentTransform.match(/scale\((.*?)\)/);
                const ratio = match ? parseFloat(match[1]) : 1;

                scrollContentRef.current.style.transform = 'none';
                
                const currentScale = scale || 1;
                // Limit scale 
                const newScale = Math.max(0.5, Math.min(currentScale * ratio, 3.0));
                setScale(newScale);
          }
      } else {
          // Single Mode Snap Back
          const { scale, x, y } = transformRef.current;
          let newScale = scale;
          let newX = x;
          let newY = y;

          if (scale < 1) { newScale = 1; newX = 0; newY = 0; }
          if (newScale === 1) { newX = 0; newY = 0; }
          
          if (newScale !== scale || newX !== x || newY !== y) {
              if (contentRef.current) {
                  contentRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)';
                  transformRef.current = { x: newX, y: newY, scale: newScale };
                  updateSingleTransform();
                  setTimeout(() => {
                      if (contentRef.current) contentRef.current.style.transition = 'none';
                  }, 300);
              }
          }
      }
      
      touchStateRef.current.distance = null;
      touchStateRef.current.isPanning = false;
  };

  const handleDoubleTap = () => {
      if (viewMode === 'single') {
          if (transformRef.current.scale > 1) {
              // Reset
              if (contentRef.current) {
                  contentRef.current.style.transition = 'transform 0.3s ease';
                  transformRef.current = { x: 0, y: 0, scale: 1 };
                  updateSingleTransform();
                  setTimeout(() => { if(contentRef.current) contentRef.current.style.transition = 'none'; }, 300);
              }
          } else {
              // Zoom In
              if (contentRef.current) {
                  contentRef.current.style.transition = 'transform 0.3s ease';
                  transformRef.current = { x: 0, y: 0, scale: 2 };
                  updateSingleTransform();
                  setTimeout(() => { if(contentRef.current) contentRef.current.style.transition = 'none'; }, 300);
              }
          }
      } else {
          // Scroll Mode: Reset global scale to 1.5 or Auto-Fit (approx 0.6-0.8 on mobile)
          setScale(s => (s && s > 1.2) ? 0.8 : 1.5); 
      }
  };

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

  // Nav Handlers
  const goNext = () => {
      const next = Math.min(numPages, pageNum + 1);
      scrollToPage(next);
  };
  
  const goPrev = () => {
      const prev = Math.max(1, pageNum - 1);
      scrollToPage(prev);
  };

  // Zoom Button Handlers
  const handleZoomIn = () => {
      if (viewMode === 'single') {
          transformRef.current.scale = Math.min(transformRef.current.scale + 0.5, 4);
          if (contentRef.current) {
              contentRef.current.style.transition = 'transform 0.2s ease';
              updateSingleTransform();
              setTimeout(() => { if(contentRef.current) contentRef.current.style.transition = 'none'; }, 200);
          }
      } else {
          setScale(s => Math.min(3.0, (s || 1) + 0.25));
      }
  };

  const handleZoomOut = () => {
      if (viewMode === 'single') {
          transformRef.current.scale = Math.max(transformRef.current.scale - 0.5, 1);
          if (transformRef.current.scale === 1) { transformRef.current.x = 0; transformRef.current.y = 0; }
          if (contentRef.current) {
              contentRef.current.style.transition = 'transform 0.2s ease';
              updateSingleTransform();
              setTimeout(() => { if(contentRef.current) contentRef.current.style.transition = 'none'; }, 200);
          }
      } else {
          setScale(s => Math.max(0.5, (s || 1) - 0.25));
      }
  };

  const toggleViewMode = () => {
      const newMode = viewMode === 'single' ? 'scroll' : 'single';
      setViewMode(newMode);
      setScale(null); // Reset scale to trigger auto-fit logic for new mode
      setTimeout(() => {
          if (newMode === 'scroll') {
              scrollToPage(pageNum);
          }
      }, 100);
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
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleTap}
          >
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                    <div className="flex flex-col items-center gap-4 bg-white/90 dark:bg-surface-dark/90 p-6 rounded-2xl shadow-xl backdrop-blur-sm">
                        <Loader2 size={32} className="animate-spin text-primary" />
                        <div className="text-center">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Downloading Book...</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Render Canvas Container */}
            <div 
                ref={contentRef}
                className="flex justify-center items-center min-h-full transition-opacity duration-300 origin-center"
                style={{ opacity: loading ? 0 : 1 }}
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
      ) : (
          // --- Scroll View ---
          <div 
            className="flex-1 overflow-auto relative pt-20 pb-24 px-4 bg-gray-100 dark:bg-gray-900"
            ref={scrollContainerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onDoubleClick={handleDoubleTap}
          >
             {loading ? (
                 <div className="flex flex-col items-center justify-center h-full gap-4">
                     <Loader2 size={32} className="animate-spin text-primary" />
                     <p className="text-sm text-gray-500">Preparing Scroll View...</p>
                 </div>
             ) : (
                 <div 
                    ref={scrollContentRef}
                    className="max-w-4xl mx-auto origin-top transition-transform duration-75"
                 >
                     {/* Render List of Pages */}
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
                 
                 {/* Page Input */}
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
                        onBlur={() => {
                            // Only update if changed
                            const val = parseInt(pageInput);
                            if (!isNaN(val) && val !== pageNum) handlePageSubmit({ preventDefault: () => {} } as any);
                        }}
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
