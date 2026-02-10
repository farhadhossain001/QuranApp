import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAppStore } from '../context/Store';
import { getQiblaDirection } from '../services/api';

// SVG Icons
const KaabaIcon = ({ className = "", size = 24, isAligned = false }: { className?: string; size?: number; isAligned?: boolean }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={className}
    >
        {/* Kaaba base structure */}
        <rect
            x="4"
            y="6"
            width="16"
            height="14"
            rx="1"
            fill={isAligned ? "#1f2937" : "#374151"}
            className="dark:fill-gray-200"
        />
        {/* Kiswa cloth draping */}
        <rect
            x="4"
            y="6"
            width="16"
            height="3"
            fill={isAligned ? "#fbbf24" : "#d4af37"}
        />
        {/* Gold band detail */}
        <rect
            x="4"
            y="8"
            width="16"
            height="1.5"
            fill={isAligned ? "#fcd34d" : "#c9a227"}
        />
        {/* Door */}
        <rect
            x="9"
            y="11"
            width="6"
            height="9"
            rx="0.5"
            fill={isAligned ? "#92400e" : "#78350f"}
        />
        {/* Door frame */}
        <rect
            x="9.5"
            y="11.5"
            width="5"
            height="8"
            rx="0.3"
            fill="none"
            stroke={isAligned ? "#fbbf24" : "#d4af37"}
            strokeWidth="0.5"
        />
    </svg>
);

const CompassNeedleIcon = ({ isAligned = false }: { isAligned?: boolean }) => (
    <svg width="28" height="44" viewBox="0 0 28 44" className="drop-shadow-xl">
        {/* Needle shadow */}
        <ellipse cx="14" cy="42" rx="6" ry="2" fill="rgba(0,0,0,0.2)" />
        
        {/* Main needle body */}
        <path
            d="M14 2 L22 18 L14 14 L6 18 Z"
            fill={isAligned ? "#10b981" : "#ef4444"}
            className="transition-colors duration-300"
        />
        <path
            d="M14 2 L14 14 L6 18 Z"
            fill={isAligned ? "#059669" : "#dc2626"}
            className="transition-colors duration-300"
        />
        
        {/* Needle stem */}
        <rect
            x="11"
            y="16"
            width="6"
            height="22"
            rx="3"
            fill={isAligned ? "#10b981" : "#6b7280"}
            className="transition-colors duration-300"
        />
        <rect
            x="11"
            y="16"
            width="3"
            height="22"
            rx="1.5"
            fill={isAligned ? "#059669" : "#4b5563"}
            className="transition-colors duration-300"
        />
        
        {/* Highlight on needle */}
        <path
            d="M14 4 L18 14 L14 12 Z"
            fill="rgba(255,255,255,0.3)"
        />
    </svg>
);

const LocationPinIcon = ({ className = "" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);

const CheckIcon = ({ className = "" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const RotateIcon = ({ className = "" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 2v6h-6" />
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
        <path d="M3 22v-6h6" />
        <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
);

const ShieldCheckIcon = ({ className = "" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
    </svg>
);

const InfoIcon = ({ className = "" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
);

const QiblaPage = () => {
    const { t, setHeaderTitle, settings, formatNumber } = useAppStore();
    const [qiblaDirection, setQiblaDirection] = useState<number | null>(null);
    const [smoothedHeading, setSmoothedHeading] = useState<number>(0);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isAligned, setIsAligned] = useState(false);
    const [compassError, setCompassError] = useState<string | null>(null);

    // Refs for smooth rotation handling
    const currentHeadingRef = useRef<number>(0);
    const targetHeadingRef = useRef<number>(0);
    const animationRef = useRef<number | null>(null);
    const lastUpdateTimeRef = useRef<number>(Date.now());
    const headingHistoryRef = useRef<number[]>([]);

    // Normalize angle to 0-360 range
    const normalizeAngle = useCallback((angle: number): number => {
        angle = angle % 360;
        return angle < 0 ? angle + 360 : angle;
    }, []);

    // Calculate the shortest rotation path between two angles
    const getShortestRotation = useCallback((from: number, to: number): number => {
        const diff = normalizeAngle(to - from);
        return diff > 180 ? diff - 360 : diff;
    }, [normalizeAngle]);

    // Apply median filter to reduce noise
    const applyMedianFilter = useCallback((newValue: number, history: number[], maxSize: number = 5): number => {
        const adjustedHistory = history.map(h => {
            const diff = newValue - h;
            if (diff > 180) return h + 360;
            if (diff < -180) return h - 360;
            return h;
        });
        adjustedHistory.push(newValue);

        if (adjustedHistory.length > maxSize) {
            adjustedHistory.shift();
        }

        const sorted = [...adjustedHistory].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)];
        return normalizeAngle(median);
    }, [normalizeAngle]);

    // Smooth animation loop
    const animateCompass = useCallback(() => {
        const now = Date.now();
        const deltaTime = Math.min((now - lastUpdateTimeRef.current) / 1000, 0.1);
        lastUpdateTimeRef.current = now;

        const current = currentHeadingRef.current;
        const target = targetHeadingRef.current;
        const diff = getShortestRotation(current, target);

        const smoothingFactor = 0.15;
        const threshold = 0.1;

        if (Math.abs(diff) > threshold) {
            const newHeading = normalizeAngle(current + diff * smoothingFactor);
            currentHeadingRef.current = newHeading;
            setSmoothedHeading(newHeading);
        }

        animationRef.current = requestAnimationFrame(animateCompass);
    }, [getShortestRotation, normalizeAngle]);

    // Start animation loop
    useEffect(() => {
        animationRef.current = requestAnimationFrame(animateCompass);
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [animateCompass]);

    // Handle device orientation
    const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
        let heading = 0;

        if ((event as any).webkitCompassHeading !== undefined) {
            heading = (event as any).webkitCompassHeading;
        } else if (event.alpha !== null) {
            if ((event as any).absolute === true || event.absolute) {
                heading = (360 - event.alpha) % 360;
            } else {
                heading = (360 - event.alpha) % 360;
            }
        }

        headingHistoryRef.current.push(heading);
        if (headingHistoryRef.current.length > 5) {
            headingHistoryRef.current.shift();
        }
        const filteredHeading = applyMedianFilter(heading, [...headingHistoryRef.current].slice(0, -1));

        targetHeadingRef.current = filteredHeading;
    }, [applyMedianFilter]);

    // Initialize compass and fetch Qibla direction
    useEffect(() => {
        setHeaderTitle(t('qibla'));

        const fetchQibla = async () => {
            try {
                const dir = await getQiblaDirection(settings.location.latitude, settings.location.longitude);
                if (dir !== null) setQiblaDirection(dir);
            } catch (error) {
                console.error('Failed to fetch Qibla direction:', error);
            }
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
        };
    }, [t, setHeaderTitle, settings.location, handleOrientation]);

    // Check alignment
    useEffect(() => {
        if (qiblaDirection === null) return;

        const diff = Math.abs(getShortestRotation(smoothedHeading, qiblaDirection));
        const aligned = diff < 5;

        if (aligned !== isAligned) {
            if (aligned && navigator.vibrate) {
                navigator.vibrate([50, 30, 50]);
            }
            setIsAligned(aligned);
        }
    }, [smoothedHeading, qiblaDirection, isAligned, getShortestRotation]);

    const startCompass = useCallback(() => {
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            (DeviceOrientationEvent as any).requestPermission()
                .then((response: string) => {
                    if (response === 'granted') {
                        setPermissionGranted(true);
                        setCompassError(null);
                        window.addEventListener('deviceorientation', handleOrientation, true);
                    } else {
                        setCompassError('Permission denied');
                    }
                })
                .catch((err: Error) => {
                    console.error(err);
                    setCompassError('Failed to request permission');
                });
        } else {
            setPermissionGranted(true);
            if ('ondeviceorientationabsolute' in window) {
                window.addEventListener('deviceorientationabsolute' as any, handleOrientation, true);
            } else {
                window.addEventListener('deviceorientation', handleOrientation, true);
            }
        }
    }, [handleOrientation]);

    const compassRotation = -smoothedHeading;

    // Generate compass tick marks
    const ticks = useMemo(() => {
        const elements = [];
        const totalTicks = 72;

        for (let i = 0; i < totalTicks; i++) {
            const angle = i * (360 / totalTicks);
            const isCardinal = angle % 90 === 0;
            const isMajor = angle % 30 === 0;
            const isMinor = angle % 15 === 0;

            let height, width, color;
            if (isCardinal) {
                height = 16;
                width = 2.5;
                color = angle === 0 ? '#ef4444' : '#10b981';
            } else if (isMajor) {
                height = 12;
                width = 2;
                color = '#6b7280';
            } else if (isMinor) {
                height = 8;
                width = 1.5;
                color = '#9ca3af';
            } else {
                height = 5;
                width = 1;
                color = '#d1d5db';
            }

            elements.push(
                <line
                    key={i}
                    x1="150"
                    y1="20"
                    x2="150"
                    y2={20 + height}
                    stroke={color}
                    strokeWidth={width}
                    strokeLinecap="round"
                    className="dark:opacity-80"
                    transform={`rotate(${angle} 150 150)`}
                />
            );
        }
        return elements;
    }, []);

    // Cardinal direction labels with proper icons
    const cardinalLabels = useMemo(() => {
        const labels = [
            { text: 'N', angle: 0 },
            { text: 'E', angle: 90 },
            { text: 'S', angle: 180 },
            { text: 'W', angle: 270 },
        ];

        return labels.map(({ text, angle }) => {
            const radians = (angle - 90) * (Math.PI / 180);
            const radius = 115;
            const x = 150 + radius * Math.cos(radians);
            const y = 150 + radius * Math.sin(radians);

            const isNorth = angle === 0;

            return (
                <g key={text}>
                    {isNorth ? (
                        // North indicator with triangle
                        <g transform={`translate(${x}, ${y})`}>
                            <polygon
                                points="0,-12 -8,6 8,6"
                                fill="#ef4444"
                                className="drop-shadow-sm"
                            />
                            <text
                                y="2"
                                fill="white"
                                fontSize="10"
                                fontWeight="bold"
                                textAnchor="middle"
                                dominantBaseline="middle"
                            >
                                N
                            </text>
                        </g>
                    ) : (
                        <text
                            x={x}
                            y={y}
                            fill="#374151"
                            className="dark:fill-gray-300"
                            fontSize="18"
                            fontWeight="600"
                            textAnchor="middle"
                            dominantBaseline="middle"
                        >
                            {text}
                        </text>
                    )}
                </g>
            );
        });
    }, []);

    // Degree markers
    const degreeMarkers = useMemo(() => {
        const markers = [];
        for (let angle = 30; angle < 360; angle += 30) {
            if (angle % 90 !== 0) {
                const radians = (angle - 90) * (Math.PI / 180);
                const radius = 115;
                const x = 150 + radius * Math.cos(radians);
                const y = 150 + radius * Math.sin(radians);

                markers.push(
                    <text
                        key={angle}
                        x={x}
                        y={y}
                        fill="#9ca3af"
                        className="dark:fill-gray-500"
                        fontSize="11"
                        fontWeight="500"
                        textAnchor="middle"
                        dominantBaseline="middle"
                    >
                        {angle}°
                    </text>
                );
            }
        }
        return markers;
    }, []);

    // Qibla indicator on compass
    const qiblaIndicator = useMemo(() => {
        if (qiblaDirection === null) return null;

        return (
            <g transform={`rotate(${qiblaDirection} 150 150)`}>
                {/* Qibla direction line */}
                <line
                    x1="150"
                    y1="55"
                    x2="150"
                    y2="75"
                    stroke="#f59e0b"
                    strokeWidth="3"
                    strokeLinecap="round"
                    className={`transition-opacity duration-300 ${isAligned ? 'opacity-100' : 'opacity-60'}`}
                />
                
                {/* Kaaba marker background */}
                <circle
                    cx="150"
                    cy="38"
                    r="16"
                    fill={isAligned ? '#fef3c7' : '#f3f4f6'}
                    stroke={isAligned ? '#f59e0b' : '#d1d5db'}
                    strokeWidth="2"
                    className="dark:fill-gray-800 dark:stroke-gray-600 transition-colors duration-300"
                />
                
                {/* Kaaba icon - rotates counter to compass to stay upright */}
                <g transform={`rotate(-${qiblaDirection} 150 38)`}>
                    <g transform="translate(138, 26)">
                        <KaabaIcon size={24} isAligned={isAligned} />
                    </g>
                </g>
            </g>
        );
    }, [qiblaDirection, isAligned]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6 pb-20 px-4">

            {/* Header Info Card */}
            <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-4 px-6 py-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="text-left">
                        <div className="flex items-center gap-1.5 mb-1">
                            <KaabaIcon size={14} isAligned={isAligned} />
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                {t('qiblaDirection')}
                            </p>
                        </div>
                        <p className={`text-2xl font-bold tabular-nums tracking-tight transition-colors duration-300 ${isAligned ? 'text-green-500' : 'text-primary dark:text-primary-dark'
                            }`}>
                            {qiblaDirection ? `${formatNumber(qiblaDirection.toFixed(0))}°` : '--'}
                        </p>
                    </div>
                    <div className="w-px h-14 bg-gray-200 dark:bg-gray-700" />
                    <div className="text-left">
                        <div className="flex items-center gap-1.5 mb-1">
                            <svg className="w-3 h-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" />
                                <polygon points="12,2 15,9 12,7 9,9" fill="currentColor" />
                            </svg>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                Heading
                            </p>
                        </div>
                        <p className="text-2xl font-bold tabular-nums tracking-tight text-gray-700 dark:text-gray-300">
                            {formatNumber(Math.round(smoothedHeading))}°
                        </p>
                    </div>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1.5">
                    <LocationPinIcon className="w-3 h-3" />
                    {settings.location.address || "Current Location"}
                </p>
            </div>

            {/* Compass Container */}
            <div className="relative w-[320px] h-[320px] sm:w-[360px] sm:h-[360px]">

                {/* Outer decorative rings */}
                <div className="absolute -inset-3 rounded-full bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 opacity-50" />
                <div className="absolute -inset-2 rounded-full bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 shadow-2xl" />
                <div className="absolute -inset-1 rounded-full bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900" />

                {/* Main Compass Face */}
                <div className={`absolute inset-0 rounded-full shadow-inner overflow-hidden transition-all duration-500 ${isAligned
                        ? 'bg-gradient-to-br from-green-50 via-white to-green-50 dark:from-gray-800 dark:via-gray-850 dark:to-gray-800'
                        : 'bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-850 dark:via-gray-900 dark:to-gray-800'
                    }`}>

                    {/* Concentric circle guides */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 300">
                        <circle cx="150" cy="150" r="130" fill="none" stroke="#e5e7eb" strokeWidth="1" className="dark:stroke-gray-700" />
                        <circle cx="150" cy="150" r="100" fill="none" stroke="#e5e7eb" strokeWidth="0.5" className="dark:stroke-gray-700" />
                        <circle cx="150" cy="150" r="70" fill="none" stroke="#e5e7eb" strokeWidth="0.5" className="dark:stroke-gray-700" />
                    </svg>

                    {/* Rotating Compass Dial */}
                    <svg
                        viewBox="0 0 300 300"
                        className="absolute inset-0 w-full h-full"
                        style={{
                            transform: `rotate(${compassRotation}deg)`,
                            transition: 'none',
                        }}
                    >
                        {/* Tick marks */}
                        {ticks}

                        {/* Degree markers */}
                        {degreeMarkers}

                        {/* Cardinal labels */}
                        {cardinalLabels}

                        {/* Qibla Indicator */}
                        {qiblaIndicator}
                    </svg>
                </div>

                {/* Static Top Pointer */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <div className={`transition-transform duration-300 ${isAligned ? 'scale-110' : 'scale-100'}`}>
                        <CompassNeedleIcon isAligned={isAligned} />
                    </div>
                </div>

                {/* Center Pivot Point */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="relative">
                        {/* Outer decorative ring */}
                        <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full shadow-xl border-4 transition-all duration-300 flex items-center justify-center ${isAligned
                                ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200 dark:from-green-900/30 dark:to-green-800/30 dark:border-green-700'
                                : 'bg-gradient-to-br from-white to-gray-100 border-gray-200 dark:from-gray-700 dark:to-gray-800 dark:border-gray-600'
                            }`}>
                            {/* Middle ring */}
                            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full shadow-inner flex items-center justify-center transition-all duration-300 ${isAligned
                                    ? 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-800/50 dark:to-green-900/50'
                                    : 'bg-gradient-to-br from-gray-50 to-gray-200 dark:from-gray-800 dark:to-gray-700'
                                }`}>
                                {/* Inner circle with icon */}
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${isAligned
                                        ? 'bg-green-500 shadow-green-500/40'
                                        : 'bg-gradient-to-br from-gray-600 to-gray-800 dark:from-gray-500 dark:to-gray-700'
                                    }`}>
                                    {isAligned ? (
                                        <CheckIcon className="w-6 h-6 text-white" />
                                    ) : (
                                        <div className="w-3 h-3 rounded-full bg-white/80" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alignment glow effect */}
                {isAligned && (
                    <div className="absolute inset-0 rounded-full pointer-events-none">
                        <div className="absolute inset-0 rounded-full bg-green-500/5 animate-pulse" />
                        <div className="absolute inset-2 rounded-full border-2 border-green-400/20 animate-ping" style={{ animationDuration: '2s' }} />
                    </div>
                )}
            </div>

            {/* Status Message */}
            <div className="h-14 flex items-center justify-center">
                {isAligned ? (
                    <div className="inline-flex items-center gap-2.5 px-6 py-3 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-sm font-semibold rounded-full shadow-lg border border-green-200 dark:border-green-800">
                        <CheckIcon className="w-5 h-5" />
                        You are facing the Qibla
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-2.5 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm rounded-full border border-gray-200 dark:border-gray-700">
                        <RotateIcon className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
                        Rotate to align with Qibla
                    </div>
                )}
            </div>

            {/* Permission Button & Instructions */}
            <div className="text-center px-6 max-w-sm space-y-4">
                {!permissionGranted && isIOS && (
                    <button
                        onClick={startCompass}
                        className="w-full bg-gradient-to-r from-primary to-blue-600 dark:from-primary-dark dark:to-blue-500 text-white px-6 py-4 rounded-2xl font-semibold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/40 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3"
                    >
                        <ShieldCheckIcon className="w-5 h-5" />
                        Enable Compass
                    </button>
                )}

                {compassError && (
                    <p className="text-sm text-red-500 dark:text-red-400 flex items-center justify-center gap-2">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {compassError}
                    </p>
                )}

                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800/50">
                    <div className="flex items-start gap-3">
                        <InfoIcon className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed text-left">
                            Hold your phone flat and horizontal. For best accuracy, move your phone in a figure-8 pattern to calibrate the compass.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QiblaPage;
