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
    const [compassAccuracy, setCompassAccuracy] = useState<number | null>(null);
    
    // Smoothing with exponential moving average
    const smoothedHeadingRef = useRef<number>(0);
    const lastHeadingRef = useRef<number>(0);
    const headingHistoryRef = useRef<number[]>([]);

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
        };
    }, [t, setHeaderTitle, settings.location]);

    useEffect(() => {
        if (qiblaDirection === null) return;
        
        const diff = Math.abs(deviceHeading - qiblaDirection);
        const normalizedDiff = diff > 180 ? 360 - diff : diff;
        const aligned = normalizedDiff < 5;

        if (aligned && !isAligned) {
            if (navigator.vibrate) navigator.vibrate(50);
            setIsAligned(true);
        } else if (!aligned && isAligned) {
            setIsAligned(false);
        }
    }, [deviceHeading, qiblaDirection, isAligned]);

    // Normalize angle to 0-360 range
    const normalizeAngle = (angle: number): number => {
        let normalized = angle % 360;
        if (normalized < 0) normalized += 360;
        return normalized;
    };

    // Calculate shortest angle difference
    const getAngleDifference = (angle1: number, angle2: number): number => {
        let diff = angle1 - angle2;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        return diff;
    };

    // Smooth heading changes with exponential moving average
    const smoothHeading = (newHeading: number): number => {
        const normalized = normalizeAngle(newHeading);
        
        // Add to history
        headingHistoryRef.current.push(normalized);
        if (headingHistoryRef.current.length > 5) {
            headingHistoryRef.current.shift();
        }

        // If first reading, set directly
        if (smoothedHeadingRef.current === 0 && headingHistoryRef.current.length === 1) {
            smoothedHeadingRef.current = normalized;
            lastHeadingRef.current = normalized;
            return normalized;
        }

        // Calculate difference from last smoothed heading
        const diff = getAngleDifference(normalized, smoothedHeadingRef.current);
        
        // Use higher smoothing factor for small changes, lower for large changes
        // This prevents lag on actual rotation while filtering out noise
        const smoothingFactor = Math.abs(diff) > 10 ? 0.3 : 0.15;
        
        // Apply exponential moving average
        smoothedHeadingRef.current = normalizeAngle(
            smoothedHeadingRef.current + diff * smoothingFactor
        );
        
        lastHeadingRef.current = normalized;
        return smoothedHeadingRef.current;
    };

    const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
        let heading = 0;
        
        // @ts-ignore - iOS uses webkitCompassHeading
        if (event.webkitCompassHeading !== undefined) {
            // @ts-ignore
            heading = event.webkitCompassHeading;
        } else if (event.alpha !== null) {
            // Android and other devices
            heading = 360 - event.alpha;
            
            // Adjust for device orientation if available
            if (event.beta !== null && event.gamma !== null) {
                // Compensate for device tilt
                const beta = event.beta;
                const gamma = event.gamma;
                
                // Only use compass when device is relatively flat
                if (Math.abs(beta - 90) < 45) {
                    heading = 360 - event.alpha;
                }
            }
        }

        // Store accuracy if available
        // @ts-ignore
        if (event.webkitCompassAccuracy !== undefined) {
            // @ts-ignore
            setCompassAccuracy(event.webkitCompassAccuracy);
        } else if (event.absolute !== undefined) {
            setCompassAccuracy(event.absolute ? 10 : 20);
        }

        const smoothed = smoothHeading(heading);
        setDeviceHeading(smoothed);
    }, []);

    const startCompass = () => {
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
                        alert(t('compassPermissionDenied') || "Permission required to use compass");
                    }
                })
                .catch(console.error);
        } else {
            // Non-iOS or older iOS
            setPermissionGranted(true);
            if ('ondeviceorientationabsolute' in window) {
                window.addEventListener('deviceorientationabsolute' as any, handleOrientation, true);
            } else {
                window.addEventListener('deviceorientation', handleOrientation, true);
            }
        }
    };

    const compassRotation = -deviceHeading;

    // Generate Compass Ticks with improved styling
    const ticks = useMemo(() => {
        return Array.from({ length: 72 }).map((_, i) => {
            const angle = i * 5;
            const isCardinal = angle % 90 === 0;
            const isMajor = angle % 30 === 0;
            const isIntermediate = angle % 15 === 0;
            
            return (
                <div
                    key={i}
                    className="absolute top-0 left-1/2 origin-bottom"
                    style={{ 
                        transform: `translateX(-50%) rotate(${angle}deg)`,
                        height: '50%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        pointerEvents: 'none'
                    }}
                >
                    <div 
                        className={`
                            ${isCardinal ? 'h-6 w-[3px] bg-primary dark:bg-primary-dark' : 
                              isMajor ? 'h-4 w-[2px] bg-gray-700 dark:bg-gray-300' : 
                              isIntermediate ? 'h-3 w-[1.5px] bg-gray-400 dark:bg-gray-600' :
                              'h-2 w-[1px] bg-gray-300 dark:bg-gray-700'}
                            rounded-full
                        `}
                    />
                </div>
            );
        });
    }, []);

    // Calculate relative angle to Qibla
    const relativeQiblaAngle = useMemo(() => {
        if (qiblaDirection === null) return 0;
        return normalizeAngle(qiblaDirection - deviceHeading);
    }, [qiblaDirection, deviceHeading]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[75vh] space-y-8 pb-20">
            
            {/* Top Info Header */}
            <div className="text-center space-y-2 mt-4">
                <div className="inline-flex items-center justify-center gap-3 px-5 py-2.5 bg-white dark:bg-surface-dark rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800">
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            {t('qiblaDirection')}
                        </span>
                        <span className={`text-2xl font-bold tabular-nums ${isAligned ? 'text-green-600 dark:text-green-400' : 'text-primary dark:text-primary-dark'}`}>
                            {qiblaDirection ? formatNumber(qiblaDirection.toFixed(0)) : '--'}°
                        </span>
                    </div>
                    <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"></div>
                    <div className="flex flex-col items-start">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            Current
                        </span>
                        <span className="text-2xl font-bold tabular-nums text-gray-700 dark:text-gray-300">
                            {formatNumber(deviceHeading.toFixed(0))}°
                        </span>
                    </div>
                </div>
                <p className="text-[10px] text-gray-400 max-w-[250px] mx-auto truncate">
                    {settings.location.address || "Current Location"}
                </p>
            </div>

            {/* Main Compass UI - Enhanced Design */}
            <div className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] flex items-center justify-center">
                
                {/* Outer Glow Effect */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-primary-dark/10 dark:to-secondary/10 blur-2xl"></div>
                
                {/* Static Outer Bezel */}
                <div className="absolute inset-0 rounded-full border-[10px] border-white dark:border-surface-dark shadow-2xl dark:shadow-black/50 z-0">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800"></div>
                </div>
                <div className="absolute inset-3 rounded-full border-2 border-gray-200/50 dark:border-gray-700/50 z-0"></div>

                {/* Rotating Dial */}
                <div 
                    className="w-full h-full rounded-full relative z-10"
                    style={{ 
                        transform: `rotate(${compassRotation}deg)`,
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        willTransform: 'transform'
                    }}
                >
                    {/* Background gradient */}
                    <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-800 dark:via-gray-850 dark:to-gray-900"></div>
                    
                    {/* Ticks */}
                    <div className="absolute inset-6 sm:inset-8">
                        {ticks}
                    </div>

                    {/* Cardinal Labels */}
                    {[
                        { label: 'N', angle: 0, color: 'text-red-500 dark:text-red-400' },
                        { label: 'E', angle: 90, color: 'text-gray-600 dark:text-gray-400' },
                        { label: 'S', angle: 180, color: 'text-gray-600 dark:text-gray-400' },
                        { label: 'W', angle: 270, color: 'text-gray-600 dark:text-gray-400' }
                    ].map(({ label, angle, color }) => (
                        <div
                            key={label}
                            className="absolute top-10 sm:top-12 left-1/2 -translate-x-1/2"
                            style={{ 
                                transformOrigin: `0 ${label === 'N' || label === 'S' ? '110px' : '110px'}`, 
                                transform: `rotate(${angle}deg) translateY(-8px)` 
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

                    {/* Kaaba Indicator */}
                    {qiblaDirection !== null && (
                        <div 
                            className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-12 pointer-events-none"
                            style={{ transform: `rotate(${qiblaDirection}deg)` }}
                        >
                            <div className="absolute top-5 sm:top-7 left-1/2 -translate-x-1/2">
                                <div className={`relative transition-all duration-300 ${isAligned ? 'scale-125' : 'scale-100'}`}>
                                    <div className={`p-2 rounded-full ${isAligned ? 'bg-green-100 dark:bg-green-900/30 shadow-lg shadow-green-500/50' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                                        <KaabaIcon 
                                            size={28} 
                                            className={`${isAligned ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`} 
                                        />
                                    </div>
                                    {/* Direction Arrow */}
                                    <div className={`w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[8px] mx-auto mt-1 ${isAligned ? 'border-t-green-600 dark:border-t-green-400' : 'border-t-amber-600 dark:border-t-amber-400'}`}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Degree Numbers */}
                    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((degree) => (
                        <div
                            key={degree}
                            className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2"
                            style={{ 
                                transformOrigin: `0 ${degree === 0 || degree === 180 ? '85px' : '80px'}`,
                                transform: `rotate(${degree}deg) translateY(-10px)` 
                            }}
                        >
                            <span 
                                style={{ transform: `rotate(${-degree}deg)` }} 
                                className="block text-[10px] sm:text-xs font-semibold text-gray-400 dark:text-gray-500 tabular-nums"
                            >
                                {degree}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Static Top Indicator (Lubber Line) - Enhanced */}
                <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 z-20 flex flex-col items-center">
                    <div className={`w-1 h-10 rounded-full shadow-lg transition-all duration-300 ${isAligned ? 'bg-green-600 dark:bg-green-400 shadow-green-500/50 scale-110' : 'bg-primary dark:bg-primary-dark shadow-primary/30'}`}></div>
                    <div className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] -mt-[1px] transition-colors duration-300 ${isAligned ? 'border-t-green-600 dark:border-t-green-400' : 'border-t-primary dark:border-t-primary-dark'}`}></div>
                </div>

                {/* Center Ornament - Enhanced */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gradient-to-br from-white/80 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-900/80 backdrop-blur-md rounded-full border-2 border-gray-200/50 dark:border-gray-700/50 flex items-center justify-center shadow-lg">
                        <div className={`w-3 h-3 rounded-full transition-all duration-300 ${isAligned ? 'bg-green-600 dark:bg-green-400 shadow-lg shadow-green-500/50 scale-125' : 'bg-primary dark:bg-primary-dark'}`}></div>
                    </div>
                </div>

                {/* Accuracy Indicator */}
                {compassAccuracy !== null && compassAccuracy > 0 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20">
                        <div className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${
                            compassAccuracy < 15 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            compassAccuracy < 30 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                            ±{compassAccuracy}°
                        </div>
                    </div>
                )}

            </div>

            {/* Alignment Feedback */}
            <div className="text-center space-y-2 min-h-[60px]">
                {isAligned ? (
                    <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="inline-flex items-center gap-2 px-5 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full shadow-lg">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                            </svg>
                            <span className="text-sm font-bold">Aligned with Qibla</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">You may perform your Salah</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-medium">
                                {relativeQiblaAngle < 180 ? 'Turn right' : 'Turn left'} {Math.abs(relativeQiblaAngle - (relativeQiblaAngle < 180 ? 0 : 360)).toFixed(0)}°
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="text-center px-6 max-w-sm space-y-4">
                {!permissionGranted && isIOS && (
                    <button 
                        onClick={startCompass}
                        className="bg-gradient-to-r from-primary to-primary-dark text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all w-full active:scale-95"
                    >
                        {t('compassPermission') || 'Enable Compass'}
                    </button>
                )}
                
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl p-4">
                    <p className="text-xs text-blue-900 dark:text-blue-300 leading-relaxed">
                        <span className="font-semibold block mb-1">💡 Calibration Tips:</span>
                        • Hold your phone flat (parallel to ground)<br/>
                        • Move away from metal objects & electronics<br/>
                        • Rotate phone in a figure-8 pattern to calibrate
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QiblaPage;
