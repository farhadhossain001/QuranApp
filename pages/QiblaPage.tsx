import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAppStore } from '../context/Store';
import { getQiblaDirection } from '../services/api';
import { KaabaIcon } from '../components/CustomIcons';

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
        // Handle angle wraparound for the filter
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

        // Smooth interpolation with easing
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

        // iOS Safari with webkit prefix
        if ((event as any).webkitCompassHeading !== undefined) {
            heading = (event as any).webkitCompassHeading;
        }
        // Android with absolute orientation
        else if (event.alpha !== null) {
            // For absolute orientation events
            if ((event as any).absolute === true || event.absolute) {
                heading = (360 - event.alpha) % 360;
            } else {
                // Fallback for relative orientation
                heading = (360 - event.alpha) % 360;
            }
        }

        // Apply median filter to reduce noise
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

        // Check if iOS
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
            // Prefer absolute orientation for Android
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

            let height, width, opacity;
            if (isCardinal) {
                height = 20;
                width = 3;
                opacity = 1;
            } else if (isMajor) {
                height = 14;
                width = 2;
                opacity = 0.8;
            } else if (isMinor) {
                height = 10;
                width = 1.5;
                opacity = 0.5;
            } else {
                height = 6;
                width = 1;
                opacity = 0.3;
            }

            elements.push(
                <line
                    key={i}
                    x1="150"
                    y1="12"
                    x2="150"
                    y2={12 + height}
                    stroke={isCardinal ? '#10b981' : 'currentColor'}
                    strokeWidth={width}
                    strokeLinecap="round"
                    opacity={opacity}
                    transform={`rotate(${angle} 150 150)`}
                />
            );
        }
        return elements;
    }, []);

    // Cardinal direction labels
    const cardinalLabels = useMemo(() => {
        const labels = [
            { text: 'N', angle: 0, color: '#ef4444' },
            { text: 'E', angle: 90, color: 'currentColor' },
            { text: 'S', angle: 180, color: 'currentColor' },
            { text: 'W', angle: 270, color: 'currentColor' },
        ];

        return labels.map(({ text, angle, color }) => {
            const radians = (angle - 90) * (Math.PI / 180);
            const radius = 105;
            const x = 150 + radius * Math.cos(radians);
            const y = 150 + radius * Math.sin(radians);

            return (
                <text
                    key={text}
                    x={x}
                    y={y}
                    fill={color}
                    fontSize="22"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="select-none"
                >
                    {text}
                </text>
            );
        });
    }, []);

    // Degree markers
    const degreeMarkers = useMemo(() => {
        const markers = [];
        for (let angle = 30; angle < 360; angle += 30) {
            if (angle % 90 !== 0) {
                const radians = (angle - 90) * (Math.PI / 180);
                const radius = 105;
                const x = 150 + radius * Math.cos(radians);
                const y = 150 + radius * Math.sin(radians);

                markers.push(
                    <text
                        key={angle}
                        x={x}
                        y={y}
                        fill="currentColor"
                        fontSize="11"
                        fontWeight="500"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        opacity={0.5}
                        className="select-none"
                    >
                        {angle}°
                    </text>
                );
            }
        }
        return markers;
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6 pb-20 px-4">

            {/* Header Info Card */}
            <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-4 px-6 py-3 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="text-left">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            {t('qiblaDirection')}
                        </p>
                        <p className={`text-2xl font-bold tabular-nums tracking-tight transition-colors duration-300 ${
                            isAligned ? 'text-green-500' : 'text-primary dark:text-primary-dark'
                        }`}>
                            {qiblaDirection ? `${formatNumber(qiblaDirection.toFixed(0))}°` : '--'}
                        </p>
                    </div>
                    <div className="w-px h-12 bg-gray-200 dark:bg-gray-700" />
                    <div className="text-left">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                            Heading
                        </p>
                        <p className="text-2xl font-bold tabular-nums tracking-tight text-gray-700 dark:text-gray-300">
                            {formatNumber(Math.round(smoothedHeading))}°
                        </p>
                    </div>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    {settings.location.address || "Current Location"}
                </p>
            </div>

            {/* Compass Container */}
            <div className="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[340px]">

                {/* Outer Decorative Ring */}
                <div className="absolute -inset-2 rounded-full bg-gradient-to-b from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 shadow-2xl" />
                <div className="absolute -inset-1 rounded-full bg-gradient-to-b from-white to-gray-100 dark:from-gray-800 dark:to-gray-900" />

                {/* Main Compass Face */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-850 dark:via-gray-900 dark:to-gray-800 shadow-inner overflow-hidden">

                    {/* Subtle pattern overlay */}
                    <div className="absolute inset-0 opacity-5 dark:opacity-10"
                        style={{
                            backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                            backgroundSize: '20px 20px'
                        }}
                    />

                    {/* Rotating Compass Dial */}
                    <svg
                        viewBox="0 0 300 300"
                        className="absolute inset-0 w-full h-full text-gray-600 dark:text-gray-400"
                        style={{
                            transform: `rotate(${compassRotation}deg)`,
                        }}
                    >
                        {/* Tick marks */}
                        {ticks}

                        {/* Degree markers */}
                        {degreeMarkers}

                        {/* Cardinal labels */}
                        {cardinalLabels}

                        {/* Qibla Indicator */}
                        {qiblaDirection !== null && (
                            <g transform={`rotate(${qiblaDirection} 150 150)`}>
                                {/* Qibla arc */}
                                <path
                                    d="M 150 30 L 150 55"
                                    stroke="#f59e0b"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    className={`transition-all duration-300 ${isAligned ? 'opacity-100' : 'opacity-70'}`}
                                />
                                {/* Kaaba icon background */}
                                <circle
                                    cx="150"
                                    cy="22"
                                    r="18"
                                    fill={isAligned ? '#fef3c7' : '#f3f4f6'}
                                    className="dark:fill-gray-700 transition-colors duration-300"
                                />
                                <circle
                                    cx="150"
                                    cy="22"
                                    r="18"
                                    fill="none"
                                    stroke={isAligned ? '#f59e0b' : '#9ca3af'}
                                    strokeWidth="2"
                                    className="transition-colors duration-300"
                                />
                                {/* Kaaba symbol */}
                                <g transform={`rotate(-${qiblaDirection} 150 22)`}>
                                    <rect
                                        x="140"
                                        y="12"
                                        width="20"
                                        height="20"
                                        rx="2"
                                        fill={isAligned ? '#92400e' : '#374151'}
                                        className="dark:fill-gray-300 transition-colors duration-300"
                                    />
                                    <rect
                                        x="143"
                                        y="15"
                                        width="14"
                                        height="3"
                                        rx="1"
                                        fill={isAligned ? '#fbbf24' : '#6b7280'}
                                        className="transition-colors duration-300"
                                    />
                                </g>
                            </g>
                        )}
                    </svg>
                </div>

                {/* Static Top Pointer */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-20">
                    <div className={`transition-all duration-300 ${isAligned ? 'scale-110' : 'scale-100'}`}>
                        <svg width="24" height="36" viewBox="0 0 24 36" className="drop-shadow-lg">
                            <path
                                d="M12 0 L20 16 L12 12 L4 16 Z"
                                fill={isAligned ? '#10b981' : '#3b82f6'}
                                className="transition-colors duration-300"
                            />
                            <rect
                                x="10"
                                y="14"
                                width="4"
                                height="20"
                                rx="2"
                                fill={isAligned ? '#10b981' : '#3b82f6'}
                                className="transition-colors duration-300"
                            />
                        </svg>
                    </div>
                </div>

                {/* Center Pivot Point */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="relative">
                        {/* Outer ring */}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-white to-gray-200 dark:from-gray-700 dark:to-gray-800 shadow-xl border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center">
                            {/* Inner ring */}
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-gray-100 to-white dark:from-gray-800 dark:to-gray-700 shadow-inner flex items-center justify-center">
                                {/* Center dot */}
                                <div className={`w-4 h-4 rounded-full transition-all duration-300 shadow-lg ${
                                    isAligned
                                        ? 'bg-green-500 shadow-green-500/50'
                                        : 'bg-primary dark:bg-primary-dark shadow-primary/30'
                                }`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alignment glow effect */}
                {isAligned && (
                    <div className="absolute inset-0 rounded-full animate-pulse pointer-events-none">
                        <div className="absolute inset-0 rounded-full bg-green-500/10 dark:bg-green-400/10" />
                        <div className="absolute inset-4 rounded-full border-2 border-green-500/30 dark:border-green-400/30" />
                    </div>
                )}
            </div>

            {/* Status Message */}
            <div className="h-12 flex items-center justify-center">
                {isAligned ? (
                    <div className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-sm font-semibold rounded-full shadow-md animate-bounce-subtle">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        You are facing the Qibla
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-2 px-5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm rounded-full">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Rotate to align with Kaaba
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
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Enable Compass
                    </button>
                )}

                {compassError && (
                    <p className="text-sm text-red-500 dark:text-red-400">{compassError}</p>
                )}

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        💡 Hold your phone flat and horizontal. For best accuracy, move your phone in a figure-8 pattern to calibrate the compass.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QiblaPage;
