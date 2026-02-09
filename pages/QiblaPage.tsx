import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAppStore } from '../context/Store';
import { getQiblaDirection } from '../services/api';
import { KaabaIcon } from '../components/CustomIcons';

const QiblaPage = () => {
    const { t, setHeaderTitle, settings, formatNumber } = useAppStore();
    const [qiblaDirection, setQiblaDirection] = useState<number | null>(null);
    const [deviceHeading, setDeviceHeading] = useState<number>(0);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isAligned, setIsAligned] = useState(false);
    
    // Refs for smooth rotation
    const previousHeadingRef = useRef<number>(0);
    const animationFrameRef = useRef<number | null>(null);
    const targetHeadingRef = useRef<number>(0);
    const currentHeadingRef = useRef<number>(0);

    useEffect(() => {
        setHeaderTitle(t('qibla'));
        
        const fetchQibla = async () => {
            const dir = await getQiblaDirection(settings.location.latitude, settings.location.longitude);
            if (dir) setQiblaDirection(dir);
        };
        fetchQibla();

        const isIOSDevice = [
            'iPad Simulator',
            'iPhone Simulator',
            'iPod Simulator',
            'iPad',
            'iPhone',
            'iPod'
        ].includes(navigator.platform) || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
        
        setIsIOS(isIOSDevice);

        if (!isIOSDevice) {
            startCompass();
        }

        return () => {
            window.removeEventListener('deviceorientationabsolute' as any, handleOrientation);
            window.removeEventListener('deviceorientation', handleOrientation);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [t, setHeaderTitle, settings.location]);

    useEffect(() => {
        if (qiblaDirection === null) return;
        
        const diff = Math.abs(deviceHeading - qiblaDirection);
        const aligned = diff < 3 || diff > 357; 

        if (aligned && !isAligned) {
            if (navigator.vibrate) navigator.vibrate(100);
            setIsAligned(true);
        } else if (!aligned && isAligned) {
            setIsAligned(false);
        }
    }, [deviceHeading, qiblaDirection, isAligned]);

    // Normalize angle to 0-360 range
    const normalizeAngle = (angle: number): number => {
        angle = angle % 360;
        return angle < 0 ? angle + 360 : angle;
    };

    // Calculate shortest rotation path
    const getShortestRotation = (from: number, to: number): number => {
        const diff = to - from;
        if (Math.abs(diff) > 180) {
            return diff > 0 ? diff - 360 : diff + 360;
        }
        return diff;
    };

    // Smooth animation loop
    const animateCompass = useCallback(() => {
        const diff = getShortestRotation(currentHeadingRef.current, targetHeadingRef.current);
        const smoothingFactor = 0.15; // Adjust for smoothness (0.05 = very smooth, 0.3 = responsive)
        
        if (Math.abs(diff) > 0.1) {
            currentHeadingRef.current = normalizeAngle(currentHeadingRef.current + diff * smoothingFactor);
            setDeviceHeading(currentHeadingRef.current);
            animationFrameRef.current = requestAnimationFrame(animateCompass);
        } else {
            currentHeadingRef.current = targetHeadingRef.current;
            setDeviceHeading(targetHeadingRef.current);
        }
    }, []);

    const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
        let heading = 0;
        // @ts-ignore
        if (event.webkitCompassHeading !== undefined) {
            // @ts-ignore
            heading = event.webkitCompassHeading;
        } else if (event.alpha !== null) {
            heading = 360 - event.alpha;
        }
        
        // Update target heading
        targetHeadingRef.current = normalizeAngle(heading);
        
        // Start animation if not running
        if (!animationFrameRef.current) {
            animationFrameRef.current = requestAnimationFrame(animateCompass);
        }
    }, [animateCompass]);

    const startCompass = () => {
        // @ts-ignore
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            // @ts-ignore
            DeviceOrientationEvent.requestPermission()
                .then((response: string) => {
                    if (response === 'granted') {
                        setPermissionGranted(true);
                        window.addEventListener('deviceorientation', handleOrientation);
                    } else {
                        alert("Permission required to use compass");
                    }
                })
                .catch(console.error);
        } else {
            setPermissionGranted(true);
            if ('ondeviceorientationabsolute' in (window as any)) {
                window.addEventListener('deviceorientationabsolute' as any, handleOrientation);
            } else {
                window.addEventListener('deviceorientation', handleOrientation);
            }
        }
    };

    const compassRotation = -deviceHeading;

    // Generate Compass Ticks with degrees
    const ticks = useMemo(() => {
        return Array.from({ length: 72 }).map((_, i) => {
            const angle = i * 5;
            const isCardinal = angle % 90 === 0;
            const isMajor = angle % 30 === 0 && !isCardinal;
            const isMinor = angle % 10 === 0 && !isCardinal && !isMajor;
            
            return (
                <div
                    key={i}
                    className="absolute top-0 left-1/2 origin-bottom"
                    style={{ 
                        transform: `translateX(-50%) rotate(${angle}deg)`, 
                        height: '50%',
                        width: '1px'
                    }}
                >
                    {/* Tick mark */}
                    <div 
                        className={`
                            ${isCardinal ? 'h-4 w-[3px] bg-gray-800 dark:bg-gray-100' : 
                              isMajor ? 'h-3 w-[2px] bg-gray-600 dark:bg-gray-400' : 
                              isMinor ? 'h-2 w-[1px] bg-gray-400 dark:bg-gray-600' :
                              'h-1 w-[1px] bg-gray-300 dark:bg-gray-700'}
                            rounded-full
                        `}
                        style={{ marginLeft: '-1px' }}
                    />
                    
                    {/* Degree numbers for major marks */}
                    {(isMajor || (isCardinal && angle !== 0)) && angle !== 0 && (
                        <div 
                            className="absolute top-6 left-1/2 -translate-x-1/2"
                            style={{ transform: `rotate(${-angle}deg)` }}
                        >
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                                {angle}
                            </span>
                        </div>
                    )}
                </div>
            );
        });
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[75vh] space-y-8 pb-20">
            
            {/* Top Info Header */}
            <div className="text-center space-y-3 mt-4">
                <div className="inline-flex items-center justify-center gap-3 px-5 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                        {t('qiblaDirection')}
                    </span>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
                    <span className={`text-xl font-mono font-bold transition-colors ${
                        isAligned ? 'text-green-600 dark:text-green-400' : 'text-primary dark:text-primary-dark'
                    }`}>
                        {qiblaDirection ? formatNumber(Math.round(qiblaDirection)) : '--'}°
                    </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-[250px] mx-auto">
                    📍 {settings.location.address || "Current Location"}
                </p>
            </div>

            {/* Main Compass UI */}
            <div className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] flex items-center justify-center">
                
                {/* Outer Decorative Ring */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-black shadow-2xl"></div>
                <div className="absolute inset-[2px] rounded-full bg-gradient-to-br from-gray-50 to-white dark:from-black dark:to-gray-900"></div>
                
                {/* Inner Working Area */}
                <div className="absolute inset-4 rounded-full bg-white dark:bg-gray-950 shadow-inner">
                    
                    {/* Rotating Compass Dial */}
                    <div 
                        className="w-full h-full rounded-full relative"
                        style={{ 
                            transform: `rotate(${compassRotation}deg)`,
                            transition: 'none', // Remove CSS transition for smoother JS animation
                            willChange: 'transform'
                        }}
                    >
                        {/* Degree Ring Background */}
                        <div className="absolute inset-6 rounded-full border-2 border-gray-100 dark:border-gray-800"></div>
                        
                        {/* Ticks and Numbers */}
                        <div className="absolute inset-6">
                            {ticks}
                        </div>

                        {/* Cardinal Directions with Enhanced Style */}
                        {[
                            { label: 'N', angle: 0, color: 'text-red-600 dark:text-red-400' },
                            { label: 'E', angle: 90, color: 'text-gray-700 dark:text-gray-300' },
                            { label: 'S', angle: 180, color: 'text-gray-700 dark:text-gray-300' },
                            { label: 'W', angle: 270, color: 'text-gray-700 dark:text-gray-300' }
                        ].map(({ label, angle, color }) => (
                            <div
                                key={label}
                                className="absolute top-2 sm:top-3 left-1/2 -translate-x-1/2"
                                style={{ 
                                    transformOrigin: 'center 128px', 
                                    transform: `rotate(${angle}deg)` 
                                }}
                            >
                                <span 
                                    style={{ transform: `rotate(${-angle}deg)` }} 
                                    className={`block text-2xl sm:text-3xl font-bold ${color} drop-shadow-sm`}
                                >
                                    {label}
                                </span>
                            </div>
                        ))}

                        {/* Qibla Direction Indicator */}
                        {qiblaDirection !== null && (
                            <div 
                                className="absolute inset-0 pointer-events-none"
                                style={{ transform: `rotate(${qiblaDirection}deg)` }}
                            >
                                {/* Qibla Line */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-1/2 w-[2px]">
                                    <div className={`h-full w-full transition-all duration-300 ${
                                        isAligned 
                                            ? 'bg-gradient-to-b from-green-500 to-transparent' 
                                            : 'bg-gradient-to-b from-amber-500/70 to-transparent'
                                    }`}></div>
                                </div>
                                
                                {/* Kaaba Icon */}
                                <div className="absolute top-8 sm:top-10 left-1/2 -translate-x-1/2">
                                    <div 
                                        style={{ transform: `rotate(${-qiblaDirection - compassRotation}deg)` }}
                                        className={`relative transition-all duration-500 ${
                                            isAligned 
                                                ? 'scale-125 drop-shadow-[0_0_20px_rgba(34,197,94,0.6)]' 
                                                : 'scale-100'
                                        }`}
                                    >
                                        <KaabaIcon 
                                            size={36} 
                                            className={`transition-colors duration-300 ${
                                                isAligned 
                                                    ? 'text-green-600 dark:text-green-400' 
                                                    : 'text-amber-600 dark:text-amber-400'
                                            }`} 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Center Pivot Point */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-100 to-white dark:from-gray-800 dark:to-gray-900 shadow-lg flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-gradient-to-br from-primary to-primary-dark shadow-inner"></div>
                        </div>
                    </div>
                </div>

                {/* Fixed North Indicator (Lubber Line) */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
                    <div className={`transition-all duration-300 ${
                        isAligned 
                            ? 'scale-110' 
                            : 'scale-100'
                    }`}>
                        <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[16px] border-b-primary dark:border-b-primary-dark"></div>
                        <div className="absolute top-[2px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-white dark:border-b-gray-950"></div>
                    </div>
                </div>
            </div>

            {/* Status Messages */}
            <div className="text-center space-y-4 min-h-[80px]">
                {isAligned ? (
                    <div className="space-y-2 animate-fadeIn">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-sm font-semibold">Perfectly Aligned with Qibla</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">You can perform your Salah now</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-12 h-[2px] bg-gradient-to-r from-transparent to-gray-300 dark:to-gray-700"></div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                Turn {Math.abs(Math.round(qiblaDirection ? qiblaDirection - deviceHeading : 0))}° to align
                            </span>
                            <div className="w-12 h-[2px] bg-gradient-to-l from-transparent to-gray-300 dark:to-gray-700"></div>
                        </div>
                    </div>
                )}

                {/* Instructions / Permission Button */}
                {!permissionGranted && isIOS && (
                    <button 
                        onClick={startCompass}
                        className="bg-gradient-to-r from-primary to-primary-dark text-white px-6 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                    >
                        Enable Compass
                    </button>
                )}
                
                {!isIOS && !permissionGranted && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 max-w-[280px] mx-auto">
                        {t('calibrateDesc')}
                    </p>
                )}
            </div>
        </div>
    );
};

export default QiblaPage;
