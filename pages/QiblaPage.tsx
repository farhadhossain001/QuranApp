import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAppStore } from '../context/Store';
import { getQiblaDirection } from '../services/api';
import { KaabaIcon } from '../components/CustomIcons';

const QiblaPage = () => {
    const { t, setHeaderTitle, settings, formatNumber } = useAppStore();
    const [qiblaDirection, setQiblaDirection] = useState<number | null>(null);
    const [smoothHeading, setSmoothHeading] = useState<number>(0);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isAligned, setIsAligned] = useState(false);
    
    // Refs for smooth compass animation
    const currentHeadingRef = useRef<number>(0);
    const targetHeadingRef = useRef<number>(0);
    const animationFrameRef = useRef<number | null>(null);
    const isAnimatingRef = useRef<boolean>(false);

    // Normalize angle to 0-360 range
    const normalizeAngle = useCallback((angle: number): number => {
        while (angle < 0) angle += 360;
        while (angle >= 360) angle -= 360;
        return angle;
    }, []);

    // Get shortest rotation path between two angles
    const getShortestRotation = useCallback((from: number, to: number): number => {
        const diff = normalizeAngle(to - from);
        return diff > 180 ? diff - 360 : diff;
    }, [normalizeAngle]);

    // Smooth animation loop using lerp
    const animateCompass = useCallback(() => {
        const diff = getShortestRotation(currentHeadingRef.current, targetHeadingRef.current);
        
        // Smooth interpolation factor (lower = smoother but slower)
        const smoothingFactor = 0.08;
        
        if (Math.abs(diff) > 0.5) {
            currentHeadingRef.current = normalizeAngle(
                currentHeadingRef.current + diff * smoothingFactor
            );
            setSmoothHeading(currentHeadingRef.current);
        }
        
        if (isAnimatingRef.current) {
            animationFrameRef.current = requestAnimationFrame(animateCompass);
        }
    }, [getShortestRotation, normalizeAngle]);

    // Handle device orientation event
    const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
        let heading = 0;
        
        // @ts-ignore - webkitCompassHeading for iOS
        if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
            // @ts-ignore
            heading = event.webkitCompassHeading;
        } else if (event.alpha !== null) {
            // Android and other devices
            heading = event.absolute ? (360 - event.alpha) : (360 - event.alpha);
        }
        
        // Filter out invalid readings
        if (!isNaN(heading) && isFinite(heading)) {
            targetHeadingRef.current = normalizeAngle(heading);
        }
    }, [normalizeAngle]);

    // Start compass functionality
    const startCompass = useCallback(() => {
        // Start animation loop
        isAnimatingRef.current = true;
        animationFrameRef.current = requestAnimationFrame(animateCompass);
        
        // @ts-ignore
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            // iOS 13+ requires permission
            // @ts-ignore
            DeviceOrientationEvent.requestPermission()
                .then((response: string) => {
                    if (response === 'granted') {
                        setPermissionGranted(true);
                        window.addEventListener('deviceorientation', handleOrientation, true);
                    } else {
                        alert("Permission required to use compass");
                    }
                })
                .catch(console.error);
        } else {
            setPermissionGranted(true);
            // Try absolute orientation first (more accurate)
            if ('ondeviceorientationabsolute' in window) {
                window.addEventListener('deviceorientationabsolute' as any, handleOrientation, true);
            } else {
                window.addEventListener('deviceorientation', handleOrientation, true);
            }
        }
    }, [handleOrientation, animateCompass]);

    useEffect(() => {
        setHeaderTitle(t('qibla'));
        
        const fetchQibla = async () => {
            const dir = await getQiblaDirection(settings.location.latitude, settings.location.longitude);
            if (dir) setQiblaDirection(dir);
        };
        fetchQibla();

        // Detect iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        setIsIOS(isIOSDevice);

        if (!isIOSDevice) {
            startCompass();
        }

        return () => {
            isAnimatingRef.current = false;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            window.removeEventListener('deviceorientationabsolute' as any, handleOrientation);
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, [t, setHeaderTitle, settings.location, startCompass, handleOrientation]);

    // Check alignment
    useEffect(() => {
        if (qiblaDirection === null) return;
        
        const diff = Math.abs(getShortestRotation(smoothHeading, qiblaDirection));
        const aligned = diff < 5;

        if (aligned && !isAligned) {
            if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
            setIsAligned(true);
        } else if (!aligned && isAligned) {
            setIsAligned(false);
        }
    }, [smoothHeading, qiblaDirection, isAligned, getShortestRotation]);

    const compassRotation = -smoothHeading;

    // Generate tick marks
    const ticks = useMemo(() => {
        const elements = [];
        for (let i = 0; i < 360; i += 5) {
            const isCardinal = i % 90 === 0;
            const isMajor = i % 30 === 0;
            const isMinor = i % 15 === 0;
            
            let height = 6;
            let width = 1;
            let color = 'bg-gray-300 dark:bg-gray-600';
            
            if (isCardinal) {
                height = 18;
                width = 3;
                color = i === 0 ? 'bg-red-500' : 'bg-gray-700 dark:bg-gray-200';
            } else if (isMajor) {
                height = 12;
                width = 2;
                color = 'bg-gray-500 dark:bg-gray-400';
            } else if (isMinor) {
                height = 8;
                width = 1.5;
                color = 'bg-gray-400 dark:bg-gray-500';
            }
            
            elements.push(
                <div
                    key={i}
                    className={`absolute left-1/2 ${color} rounded-full`}
                    style={{
                        width: `${width}px`,
                        height: `${height}px`,
                        top: '8px',
                        transformOrigin: `center 122px`,
                        transform: `translateX(-50%) rotate(${i}deg)`,
                    }}
                />
            );
        }
        return elements;
    }, []);

    // Degree labels
    const degreeLabels = useMemo(() => {
        return [30, 60, 120, 150, 210, 240, 300, 330].map((deg) => (
            <div
                key={deg}
                className="absolute text-[9px] font-semibold text-gray-400 dark:text-gray-500"
                style={{
                    left: '50%',
                    top: '28px',
                    transformOrigin: `center 102px`,
                    transform: `translateX(-50%) rotate(${deg}deg)`
                }}
            >
                <span style={{ display: 'block', transform: `rotate(${-deg}deg)` }}>
                    {deg}°
                </span>
            </div>
        ));
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6 pb-20 px-4">
            
            {/* Info Header */}
            <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-4 px-6 py-3 bg-white dark:bg-gray-800/80 rounded-2xl shadow-xl shadow-gray-200/50 dark:shadow-black/20 border border-gray-100 dark:border-gray-700">
                    <div className="text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">
                            Qibla
                        </span>
                        <span className={`text-2xl font-bold tabular-nums transition-colors ${isAligned ? 'text-green-500' : 'text-primary dark:text-primary-dark'}`}>
                            {qiblaDirection ? `${formatNumber(qiblaDirection.toFixed(0))}°` : '--'}
                        </span>
                    </div>
                    <div className="w-px h-10 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>
                    <div className="text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 block">
                            Heading
                        </span>
                        <span className="text-2xl font-bold tabular-nums text-gray-800 dark:text-white">
                            {formatNumber(Math.round(smoothHeading))}°
                        </span>
                    </div>
                </div>
                <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="truncate max-w-[200px]">{settings.location.address || "Current Location"}</span>
                </p>
            </div>

            {/* Compass Container */}
            <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px]">
                
                {/* Outer Bezel - Premium Metal Look */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-200 via-gray-100 to-gray-300 dark:from-gray-600 dark:via-gray-700 dark:to-gray-800 shadow-2xl"></div>
                <div className="absolute inset-[3px] rounded-full bg-gradient-to-br from-gray-300 via-white to-gray-200 dark:from-gray-700 dark:via-gray-800 dark:to-gray-900"></div>
                <div className="absolute inset-[6px] rounded-full bg-gradient-to-br from-slate-50 to-white dark:from-gray-850 dark:to-gray-900 shadow-inner"></div>
                
                {/* Inner Shadow Ring */}
                <div className="absolute inset-[8px] rounded-full shadow-[inset_0_2px_10px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_10px_rgba(0,0,0,0.4)]"></div>

                {/* Rotating Compass Dial */}
                <div 
                    className="absolute inset-[10px] rounded-full"
                    style={{ 
                        transform: `rotate(${compassRotation}deg)`,
                        willChange: 'transform',
                    }}
                >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 rounded-full opacity-30">
                        <div className="absolute inset-[40%] rounded-full border border-gray-300 dark:border-gray-600"></div>
                        <div className="absolute inset-[30%] rounded-full border border-gray-200 dark:border-gray-700"></div>
                    </div>

                    {/* Tick Marks */}
                    {ticks}
                    
                    {/* Degree Labels */}
                    {degreeLabels}

                    {/* Cardinal Directions */}
                    {[
                        { label: 'N', angle: 0, isNorth: true },
                        { label: 'E', angle: 90, isNorth: false },
                        { label: 'S', angle: 180, isNorth: false },
                        { label: 'W', angle: 270, isNorth: false }
                    ].map(({ label, angle, isNorth }) => (
                        <div
                            key={label}
                            className="absolute"
                            style={{
                                left: '50%',
                                top: '32px',
                                transformOrigin: `center 98px`,
                                transform: `translateX(-50%) rotate(${angle}deg)`
                            }}
                        >
                            <span 
                                className={`block text-lg sm:text-xl font-black tracking-wide
                                    ${isNorth ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}
                                style={{ transform: `rotate(${-angle}deg)` }}
                            >
                                {label}
                            </span>
                        </div>
                    ))}

                    {/* Qibla Indicator */}
                    {qiblaDirection !== null && (
                        <div 
                            className="absolute inset-0 pointer-events-none"
                            style={{ transform: `rotate(${qiblaDirection}deg)` }}
                        >
                            {/* Direction Line */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-[50px] w-[2px] h-[70px] bg-gradient-to-b from-amber-400 via-amber-300 to-transparent rounded-full"></div>
                            
                            {/* Kaaba Container */}
                            <div 
                                className={`absolute left-1/2 top-[14px] -translate-x-1/2 transition-transform duration-300 ${isAligned ? 'scale-110' : 'scale-100'}`}
                            >
                                <div 
                                    className={`relative p-2.5 rounded-xl transition-all duration-500
                                        ${isAligned 
                                            ? 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-lg shadow-amber-400/60' 
                                            : 'bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/60 dark:to-amber-800/60 border border-amber-300 dark:border-amber-600'
                                        }`}
                                    style={{ transform: `rotate(${-qiblaDirection}deg)` }}
                                >
                                    <KaabaIcon 
                                        size={22} 
                                        className={`transition-colors ${isAligned ? 'text-white' : 'text-amber-700 dark:text-amber-300'}`} 
                                    />
                                </div>
                                {/* Pointer Arrow */}
                                <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 transition-colors
                                    border-l-[5px] border-l-transparent 
                                    border-r-[5px] border-r-transparent 
                                    border-t-[7px] ${isAligned ? 'border-t-amber-500' : 'border-t-amber-400'}`}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Static Top Pointer (Lubber Line) */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30">
                    <div className={`relative transition-all duration-500 ${isAligned ? 'scale-110' : 'scale-100'}`}>
                        <div className={`w-0 h-0 
                            border-l-[12px] border-l-transparent 
                            border-r-[12px] border-r-transparent 
                            border-t-[24px] transition-colors duration-300 drop-shadow-lg
                            ${isAligned 
                                ? 'border-t-green-500' 
                                : 'border-t-gray-800 dark:border-t-white'}`}
                        ></div>
                        {isAligned && (
                            <div className="absolute inset-0 w-0 h-0 
                                border-l-[12px] border-l-transparent 
                                border-r-[12px] border-r-transparent 
                                border-t-[24px] border-t-green-400 animate-ping opacity-50"
                            ></div>
                        )}
                    </div>
                </div>

                {/* Center Cap - Premium Look */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-700 dark:via-gray-750 dark:to-gray-800 shadow-xl border border-gray-200/50 dark:border-gray-600/50 flex items-center justify-center">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-gray-100 to-white dark:from-gray-800 dark:to-gray-900 shadow-[inset_0_2px_8px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.4)] flex items-center justify-center border border-gray-100 dark:border-gray-700">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 dark:from-gray-500 dark:to-gray-300 shadow-inner flex items-center justify-center">
                                <div className="w-2 h-2 rounded-full bg-white dark:bg-gray-100 shadow-sm"></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alignment Glow Effect */}
                {isAligned && (
                    <div className="absolute inset-0 rounded-full animate-pulse pointer-events-none">
                        <div className="absolute inset-0 rounded-full border-4 border-green-400/30"></div>
                        <div className="absolute inset-2 rounded-full border-2 border-green-400/20"></div>
                    </div>
                )}
            </div>

            {/* Status Message */}
            <div className="h-12 flex items-center justify-center">
                {isAligned ? (
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-bold rounded-full shadow-lg shadow-green-500/30 animate-bounce">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Facing Qibla
                    </div>
                ) : qiblaDirection !== null ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Rotate to align with Qibla
                    </p>
                ) : (
                    <p className="text-sm text-gray-400">Loading direction...</p>
                )}
            </div>

            {/* iOS Permission Button */}
            {!permissionGranted && isIOS && (
                <button 
                    onClick={startCompass}
                    className="flex items-center gap-2 bg-gradient-to-r from-primary to-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {t('compassPermission')}
                </button>
            )}
            
            {/* Helper Text */}
            <div className="text-center px-6 max-w-sm">
                <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
                    Hold your phone flat • Keep away from metal objects • Calibrate by moving in a figure-8 pattern
                </p>
            </div>
        </div>
    );
};

export default QiblaPage;
