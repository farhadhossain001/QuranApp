import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAppStore } from '../context/Store';
import { getQiblaDirection } from '../services/api';

// Kaaba SVG Icon Component
const KaabaIcon = ({ size = 32, className = "" }: { size?: number; className?: string }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 64 64" 
        fill="none" 
        className={className}
    >
        {/* Kaaba Base */}
        <rect x="12" y="16" width="40" height="40" fill="currentColor" rx="2"/>
        {/* Gold Band (Hizam) */}
        <rect x="12" y="24" width="40" height="6" fill="#D4AF37"/>
        {/* Door */}
        <rect x="26" y="36" width="12" height="18" rx="1" fill="#8B7355"/>
        <rect x="28" y="38" width="8" height="14" rx="1" fill="#A08060"/>
        {/* Kiswah Pattern Lines */}
        <path d="M12 34 L52 34" stroke="#1a1a1a" strokeWidth="0.5" opacity="0.3"/>
        <path d="M12 44 L52 44" stroke="#1a1a1a" strokeWidth="0.5" opacity="0.3"/>
        {/* Corner Decorations */}
        <circle cx="14" cy="18" r="1.5" fill="#D4AF37"/>
        <circle cx="50" cy="18" r="1.5" fill="#D4AF37"/>
        {/* Top Edge */}
        <path d="M10 16 L32 8 L54 16" stroke="currentColor" strokeWidth="2" fill="none"/>
    </svg>
);

// Compass Arrow Icon
const CompassArrowIcon = ({ className = "" }: { className?: string }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 2L16 10H8L12 2Z" fill="currentColor"/>
    </svg>
);

const QiblaPage = () => {
    const { t, setHeaderTitle, settings, formatNumber } = useAppStore();
    const [qiblaDirection, setQiblaDirection] = useState<number | null>(null);
    const [deviceHeading, setDeviceHeading] = useState<number>(0);
    const [smoothHeading, setSmoothHeading] = useState<number>(0);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isAligned, setIsAligned] = useState(false);
    const [compassError, setCompassError] = useState<string | null>(null);
    
    // Refs for smooth rotation
    const lastRawHeading = useRef<number>(0);
    const cumulativeRotation = useRef<number>(0);
    const animationFrame = useRef<number>();

    useEffect(() => {
        setHeaderTitle(t('qibla'));
        
        const fetchQibla = async () => {
            const dir = await getQiblaDirection(settings.location.latitude, settings.location.longitude);
            if (dir) setQiblaDirection(dir);
        };
        fetchQibla();

        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        setIsIOS(isIOSDevice);

        if (!isIOSDevice) {
            startCompass();
        }

        return () => {
            window.removeEventListener('deviceorientationabsolute' as any, handleOrientation);
            window.removeEventListener('deviceorientation', handleOrientation);
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current);
            }
        };
    }, [t, setHeaderTitle, settings.location]);

    // Smooth heading animation
    useEffect(() => {
        const smoothUpdate = () => {
            setSmoothHeading(prev => {
                const diff = cumulativeRotation.current - prev;
                if (Math.abs(diff) < 0.5) return cumulativeRotation.current;
                return prev + diff * 0.15; // Smooth interpolation
            });
            animationFrame.current = requestAnimationFrame(smoothUpdate);
        };
        animationFrame.current = requestAnimationFrame(smoothUpdate);
        
        return () => {
            if (animationFrame.current) {
                cancelAnimationFrame(animationFrame.current);
            }
        };
    }, []);

    // Alignment detection
    useEffect(() => {
        if (qiblaDirection === null) return;
        
        const normalizedHeading = ((smoothHeading % 360) + 360) % 360;
        const diff = Math.abs(normalizedHeading - qiblaDirection);
        const aligned = diff < 5 || diff > 355;

        if (aligned && !isAligned) {
            if (navigator.vibrate) navigator.vibrate(50);
            setIsAligned(true);
        } else if (!aligned && isAligned) {
            setIsAligned(false);
        }
    }, [smoothHeading, qiblaDirection, isAligned]);

    const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
        let heading = 0;
        
        // @ts-ignore - webkitCompassHeading for iOS
        if (event.webkitCompassHeading !== undefined) {
            // @ts-ignore
            heading = event.webkitCompassHeading;
        } else if (event.alpha !== null) {
            // For Android/other devices
            heading = (360 - event.alpha) % 360;
        }

        // Handle rotation across 0/360 boundary to prevent spinning
        const lastHeading = lastRawHeading.current;
        let delta = heading - lastHeading;
        
        // Normalize delta to -180 to 180 range
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        
        cumulativeRotation.current += delta;
        lastRawHeading.current = heading;
        
        setDeviceHeading(heading);
    }, []);

    const startCompass = async () => {
        try {
            // @ts-ignore
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
                // @ts-ignore
                const response = await DeviceOrientationEvent.requestPermission();
                if (response === 'granted') {
                    setPermissionGranted(true);
                    window.addEventListener('deviceorientation', handleOrientation);
                } else {
                    setCompassError("Permission denied. Please enable compass access.");
                }
            } else {
                setPermissionGranted(true);
                if ('ondeviceorientationabsolute' in window) {
                    window.addEventListener('deviceorientationabsolute' as any, handleOrientation);
                } else {
                    window.addEventListener('deviceorientation', handleOrientation);
                }
            }
        } catch (error) {
            console.error("Compass error:", error);
            setCompassError("Unable to access compass. Please ensure your device has a compass sensor.");
        }
    };

    const compassRotation = -smoothHeading;
    const normalizedHeading = ((smoothHeading % 360) + 360) % 360;

    // Generate compass ticks using SVG
    const CompassDial = useMemo(() => {
        const ticks = [];
        const labels = [
            { angle: 0, label: 'N', color: '#EF4444' },
            { angle: 90, label: 'E', color: 'currentColor' },
            { angle: 180, label: 'S', color: 'currentColor' },
            { angle: 270, label: 'W', color: 'currentColor' },
        ];
        
        // Generate tick marks
        for (let i = 0; i < 360; i += 5) {
            const isCardinal = i % 90 === 0;
            const isMajor = i % 30 === 0;
            const isMinor = i % 15 === 0;
            
            let tickLength = 6;
            let strokeWidth = 1;
            let opacity = 0.3;
            
            if (isCardinal) {
                tickLength = 16;
                strokeWidth = 3;
                opacity = 1;
            } else if (isMajor) {
                tickLength = 12;
                strokeWidth = 2;
                opacity = 0.7;
            } else if (isMinor) {
                tickLength = 8;
                strokeWidth = 1.5;
                opacity = 0.5;
            }
            
            const radians = (i - 90) * (Math.PI / 180);
            const outerRadius = 115;
            const innerRadius = outerRadius - tickLength;
            
            const x1 = 130 + outerRadius * Math.cos(radians);
            const y1 = 130 + outerRadius * Math.sin(radians);
            const x2 = 130 + innerRadius * Math.cos(radians);
            const y2 = 130 + innerRadius * Math.sin(radians);
            
            ticks.push(
                <line
                    key={`tick-${i}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isCardinal && i === 0 ? '#EF4444' : 'currentColor'}
                    strokeWidth={strokeWidth}
                    opacity={opacity}
                    strokeLinecap="round"
                />
            );
            
            // Degree numbers for major marks (every 30 degrees, except cardinals)
            if (isMajor && !isCardinal) {
                const labelRadius = outerRadius - 24;
                const lx = 130 + labelRadius * Math.cos(radians);
                const ly = 130 + labelRadius * Math.sin(radians);
                
                ticks.push(
                    <text
                        key={`degree-${i}`}
                        x={lx}
                        y={ly}
                        fill="currentColor"
                        fontSize="11"
                        fontWeight="500"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        opacity="0.5"
                    >
                        {i}
                    </text>
                );
            }
        }
        
        // Cardinal direction labels
        labels.forEach(({ angle, label, color }) => {
            const radians = (angle - 90) * (Math.PI / 180);
            const labelRadius = 85;
            const x = 130 + labelRadius * Math.cos(radians);
            const y = 130 + labelRadius * Math.sin(radians);
            
            ticks.push(
                <text
                    key={`label-${label}`}
                    x={x}
                    y={y}
                    fill={color}
                    fontSize="20"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontFamily: 'system-ui, sans-serif' }}
                >
                    {label}
                </text>
            );
        });
        
        return ticks;
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[75vh] space-y-8 pb-20 px-4">
            
            {/* Header Info */}
            <div className="text-center space-y-3 mt-4">
                <div className="inline-flex items-center justify-center gap-3 px-5 py-2.5 bg-white dark:bg-surface-dark rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800">
                    <div className="text-center">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block">
                            {t('qiblaDirection')}
                        </span>
                        <span className={`text-2xl font-bold font-mono ${isAligned ? 'text-green-500' : 'text-primary dark:text-primary-dark'}`}>
                            {qiblaDirection ? formatNumber(qiblaDirection.toFixed(0)) : '--'}°
                        </span>
                    </div>
                    <div className="w-px h-10 bg-gray-200 dark:bg-gray-700"/>
                    <div className="text-center">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 block">
                            Heading
                        </span>
                        <span className="text-2xl font-bold font-mono text-gray-700 dark:text-gray-300">
                            {formatNumber(normalizedHeading.toFixed(0))}°
                        </span>
                    </div>
                </div>
                <p className="text-xs text-gray-400 max-w-[220px] mx-auto truncate">
                    📍 {settings.location.address || "Current Location"}
                </p>
            </div>

            {/* Main Compass */}
            <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] flex items-center justify-center">
                
                {/* Outer Ring Shadow */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 shadow-2xl"/>
                
                {/* Outer Bezel */}
                <div className="absolute inset-1 rounded-full bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-950 shadow-inner"/>
                
                {/* Inner Ring */}
                <div className="absolute inset-3 rounded-full border-2 border-gray-100 dark:border-gray-800"/>
                
                {/* Rotating Compass Dial */}
                <svg
                    width="260"
                    height="260"
                    viewBox="0 0 260 260"
                    className="absolute text-gray-700 dark:text-gray-300 will-change-transform"
                    style={{ 
                        transform: `rotate(${compassRotation}deg)`,
                    }}
                >
                    {/* Background Circle */}
                    <circle cx="130" cy="130" r="120" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.1"/>
                    
                    {/* Compass Ticks and Labels */}
                    {CompassDial}
                    
                    {/* Qibla Indicator on the dial */}
                    {qiblaDirection !== null && (
                        <g transform={`rotate(${qiblaDirection}, 130, 130)`}>
                            {/* Qibla line */}
                            <line
                                x1="130"
                                y1="130"
                                x2="130"
                                y2="25"
                                stroke={isAligned ? "#22C55E" : "#F59E0B"}
                                strokeWidth="2"
                                strokeDasharray="4,4"
                                opacity="0.6"
                            />
                            {/* Kaaba marker */}
                            <g transform="translate(130, 20)">
                                <circle r="18" fill={isAligned ? "#22C55E" : "#F59E0B"} opacity="0.15"/>
                                <circle r="14" fill="white" className="dark:fill-gray-900"/>
                                <g transform="translate(-10, -10) scale(0.625)">
                                    {/* Simplified Kaaba Icon */}
                                    <rect x="4" y="4" width="24" height="24" fill={isAligned ? "#22C55E" : "#1F2937"} rx="1"/>
                                    <rect x="4" y="8" width="24" height="4" fill="#D4AF37"/>
                                    <rect x="12" y="16" width="8" height="12" fill="#8B7355" rx="1"/>
                                </g>
                            </g>
                        </g>
                    )}
                </svg>

                {/* Static Top Pointer */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20">
                    <svg width="20" height="36" viewBox="0 0 20 36" className={`${isAligned ? 'text-green-500' : 'text-primary dark:text-primary-dark'} drop-shadow-lg`}>
                        <path 
                            d="M10 0 L16 12 L10 8 L4 12 Z" 
                            fill="currentColor"
                        />
                        <rect x="8" y="12" width="4" height="20" rx="2" fill="currentColor" opacity="0.8"/>
                    </svg>
                </div>

                {/* Center Decoration */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-300
                        ${isAligned 
                            ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800' 
                            : 'bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700'
                        }
                        backdrop-blur-sm shadow-lg`}
                    >
                        <div className={`w-3 h-3 rounded-full transition-colors duration-300
                            ${isAligned ? 'bg-green-500' : 'bg-primary dark:bg-primary-dark'}`}
                        />
                    </div>
                </div>

                {/* Alignment Glow Effect */}
                {isAligned && (
                    <div className="absolute inset-0 rounded-full animate-pulse pointer-events-none">
                        <div className="absolute inset-4 rounded-full border-2 border-green-400/30"/>
                    </div>
                )}
            </div>

            {/* Status Message */}
            <div className="h-12 flex items-center justify-center">
                {isAligned ? (
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-100 dark:bg-green-900/30 rounded-full animate-pulse">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                            You are facing the Qibla
                        </span>
                    </div>
                ) : qiblaDirection !== null && (
                    <div className="flex items-center gap-2 text-gray-400">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                        <span className="text-sm">Rotate to align with Qibla</span>
                    </div>
                )}
            </div>

            {/* Permission/Error Handling */}
            <div className="text-center px-6 max-w-xs">
                {compassError && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-xs text-red-600 dark:text-red-400">{compassError}</p>
                    </div>
                )}
                
                {!permissionGranted && isIOS && (
                    <button 
                        onClick={startCompass}
                        className="w-full bg-primary hover:bg-primary-dark text-white px-6 py-3.5 rounded-xl font-semibold shadow-lg transition-all duration-200 active:scale-95 mb-4"
                    >
                        <span className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            {t('compassPermission')}
                        </span>
                    </button>
                )}
                
                <p className="text-xs text-gray-400 leading-relaxed">
                    {!permissionGranted && !isIOS
                        ? "Move your phone in a figure-8 pattern to calibrate the compass"
                        : "Hold your phone flat and rotate until aligned"
                    }
                </p>
            </div>
        </div>
    );
};

export default QiblaPage;
