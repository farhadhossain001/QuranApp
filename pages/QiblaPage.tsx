import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAppStore } from '../context/Store';
import { getQiblaDirection } from '../services/api';

// Custom SVG Icons
const KaabaIcon = ({ className = "", size = 24, isAligned = false }: { className?: string; size?: number; isAligned?: boolean }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
        <rect x="4" y="6" width="16" height="14" rx="1" fill={isAligned ? "#92400e" : "#1f2937"} className="dark:fill-gray-200" />
        <rect x="4" y="8" width="16" height="3" fill={isAligned ? "#fbbf24" : "#4b5563"} className="dark:fill-amber-400" />
        <rect x="10" y="14" width="4" height="6" rx="0.5" fill={isAligned ? "#fbbf24" : "#6b7280"} className="dark:fill-amber-500" />
        <path d="M4 6L12 2L20 6" stroke={isAligned ? "#92400e" : "#1f2937"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="dark:stroke-gray-200" />
    </svg>
);

const CompassNeedleIcon = ({ className = "", isAligned = false }: { className?: string; isAligned?: boolean }) => (
    <svg width="40" height="50" viewBox="0 0 40 50" fill="none" className={className}>
        <defs>
            <linearGradient id="needleGradientTop" x1="20" y1="0" x2="20" y2="25" gradientUnits="userSpaceOnUse">
                <stop stopColor={isAligned ? "#10b981" : "#ef4444"} />
                <stop offset="1" stopColor={isAligned ? "#059669" : "#dc2626"} />
            </linearGradient>
            <linearGradient id="needleGradientBottom" x1="20" y1="25" x2="20" y2="50" gradientUnits="userSpaceOnUse">
                <stop stopColor="#e5e7eb" />
                <stop offset="1" stopColor="#9ca3af" />
            </linearGradient>
            <filter id="needleShadow" x="-2" y="-2" width="44" height="54">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
            </filter>
        </defs>
        {/* Top needle (North/Qibla) */}
        <path d="M20 0L28 22L20 18L12 22Z" fill="url(#needleGradientTop)" filter="url(#needleShadow)" />
        {/* Bottom needle (South) */}
        <path d="M20 50L12 28L20 32L28 28Z" fill="url(#needleGradientBottom)" filter="url(#needleShadow)" />
        {/* Center circle */}
        <circle cx="20" cy="25" r="5" fill="#374151" stroke="#1f2937" strokeWidth="1" className="dark:fill-gray-300 dark:stroke-gray-400" />
        <circle cx="20" cy="25" r="2" fill="#6b7280" className="dark:fill-gray-500" />
    </svg>
);

const LocationPinIcon = ({ className = "" }: { className?: string }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="currentColor" />
        <circle cx="12" cy="9" r="2.5" fill="white" />
    </svg>
);

const CheckCircleIcon = ({ className = "" }: { className?: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" fill="currentColor" fillOpacity="0.2" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />
    </svg>
);

const RotateIcon = ({ className = "" }: { className?: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const ShieldIcon = ({ className = "" }: { className?: string }) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const InfoIcon = ({ className = "" }: { className?: string }) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className}>
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
        <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

    useEffect(() => {
        animationRef.current = requestAnimationFrame(animateCompass);
        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [animateCompass]);

    const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
        let heading = 0;

        if ((event as any).webkitCompassHeading !== undefined) {
            heading = (event as any).webkitCompassHeading;
        } else if (event.alpha !== null) {
            heading = (360 - event.alpha) % 360;
        }

        headingHistoryRef.current.push(heading);
        if (headingHistoryRef.current.length > 5) {
            headingHistoryRef.current.shift();
        }
        const filteredHeading = applyMedianFilter(heading, [...headingHistoryRef.current].slice(0, -1));

        targetHeadingRef.current = filteredHeading;
    }, [applyMedianFilter]);

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
    const qiblaAngleOnCompass = qiblaDirection !== null ? qiblaDirection - smoothedHeading : 0;

    // Compass ring ticks
    const compassTicks = useMemo(() => {
        const ticks = [];
        for (let i = 0; i < 360; i += 5) {
            const isCardinal = i % 90 === 0;
            const isMajor = i % 30 === 0;
            const isMinor = i % 15 === 0;

            let length = 6;
            let width = 1;
            let color = 'rgba(156, 163, 175, 0.4)';

            if (isCardinal) {
                length = 16;
                width = 2.5;
                color = '#10b981';
            } else if (isMajor) {
                length = 12;
                width = 2;
                color = 'rgba(107, 114, 128, 0.8)';
            } else if (isMinor) {
                length = 8;
                width = 1.5;
                color = 'rgba(156, 163, 175, 0.6)';
            }

            ticks.push(
                <line
                    key={i}
                    x1="150"
                    y1="20"
                    x2="150"
                    y2={20 + length}
                    stroke={color}
                    strokeWidth={width}
                    strokeLinecap="round"
                    transform={`rotate(${i} 150 150)`}
                />
            );
        }
        return ticks;
    }, []);

    // Cardinal direction labels with icons
    const cardinalLabels = useMemo(() => {
        const labels = [
            { text: 'N', angle: 0, isNorth: true },
            { text: 'E', angle: 90, isNorth: false },
            { text: 'S', angle: 180, isNorth: false },
            { text: 'W', angle: 270, isNorth: false },
        ];

        return labels.map(({ text, angle, isNorth }) => {
            const radians = (angle - 90) * (Math.PI / 180);
            const radius = 110;
            const x = 150 + radius * Math.cos(radians);
            const y = 150 + radius * Math.sin(radians);

            return (
                <g key={text}>
                    {isNorth && (
                        <circle
                            cx={x}
                            cy={y}
                            r="14"
                            fill="#fef2f2"
                            stroke="#ef4444"
                            strokeWidth="2"
                            className="dark:fill-red-900/30"
                        />
                    )}
                    <text
                        x={x}
                        y={y}
                        fill={isNorth ? '#ef4444' : '#6b7280'}
                        fontSize={isNorth ? '16' : '14'}
                        fontWeight="bold"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className={`select-none ${isNorth ? '' : 'dark:fill-gray-400'}`}
                    >
                        {text}
                    </text>
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
                const radius = 110;
                const x = 150 + radius * Math.cos(radians);
                const y = 150 + radius * Math.sin(radians);

                markers.push(
                    <text
                        key={angle}
                        x={x}
                        y={y}
                        fill="#9ca3af"
                        fontSize="10"
                        fontWeight="500"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="select-none dark:fill-gray-500"
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
                <div className="inline-flex items-center gap-4 px-6 py-4 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <KaabaIcon size={16} isAligned={isAligned} />
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                {t('qiblaDirection')}
                            </p>
                        </div>
                        <p className={`text-3xl font-bold tabular-nums tracking-tight transition-colors duration-300 ${isAligned ? 'text-green-500' : 'text-amber-600 dark:text-amber-500'
                            }`}>
                            {qiblaDirection ? `${formatNumber(qiblaDirection.toFixed(0))}°` : '--'}
                        </p>
                    </div>
                    <div className="w-px h-14 bg-gradient-to-b from-transparent via-gray-200 dark:via-gray-700 to-transparent" />
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-gray-400">
                                <path d="M12 2L19 21L12 17L5 21L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                Heading
                            </p>
                        </div>
                        <p className="text-3xl font-bold tabular-nums tracking-tight text-gray-700 dark:text-gray-300">
                            {formatNumber(Math.round(smoothedHeading))}°
                        </p>
                    </div>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center justify-center gap-1.5">
                    <LocationPinIcon className="text-green-500" />
                    {settings.location.address || "Current Location"}
                </p>
            </div>

            {/* Compass Container */}
            <div className="relative w-[320px] h-[320px] sm:w-[360px] sm:h-[360px]">

                {/* Outer decorative rings */}
                <div className="absolute -inset-3 rounded-full bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300 dark:from-gray-700 dark:via-gray-800 dark:to-gray-900 shadow-2xl" />
                <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-white to-gray-100 dark:from-gray-800 dark:to-gray-850" />
                <div className="absolute -inset-1 rounded-full bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 shadow-inner" />

                {/* Main Compass Face */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 dark:from-gray-850 dark:via-gray-900 dark:to-gray-850 shadow-inner overflow-hidden">

                    {/* Concentric circles decoration */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 300">
                        <defs>
                            <radialGradient id="compassGradient" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="transparent" />
                                <stop offset="70%" stopColor="rgba(156, 163, 175, 0.05)" />
                                <stop offset="100%" stopColor="rgba(156, 163, 175, 0.1)" />
                            </radialGradient>
                        </defs>
                        <circle cx="150" cy="150" r="140" fill="url(#compassGradient)" />
                        <circle cx="150" cy="150" r="130" stroke="rgba(156, 163, 175, 0.15)" strokeWidth="1" fill="none" />
                        <circle cx="150" cy="150" r="100" stroke="rgba(156, 163, 175, 0.1)" strokeWidth="1" fill="none" />
                        <circle cx="150" cy="150" r="70" stroke="rgba(156, 163, 175, 0.08)" strokeWidth="1" fill="none" />
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
                        {compassTicks}

                        {/* Degree markers */}
                        {degreeMarkers}

                        {/* Cardinal labels */}
                        {cardinalLabels}

                        {/* Qibla Indicator on compass */}
                        {qiblaDirection !== null && (
                            <g transform={`rotate(${qiblaDirection} 150 150)`}>
                                {/* Qibla direction line */}
                                <line
                                    x1="150"
                                    y1="55"
                                    x2="150"
                                    y2="42"
                                    stroke="#f59e0b"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    className={`transition-opacity duration-300 ${isAligned ? 'opacity-100' : 'opacity-70'}`}
                                />
                                {/* Kaaba icon container */}
                                <g transform={`translate(150, 26)`}>
                                    <circle
                                        cx="0"
                                        cy="0"
                                        r="18"
                                        fill={isAligned ? '#fef3c7' : '#f9fafb'}
                                        stroke={isAligned ? '#f59e0b' : '#d1d5db'}
                                        strokeWidth="2"
                                        className="dark:fill-gray-700 dark:stroke-gray-500 transition-all duration-300"
                                    />
                                    {/* Kaaba symbol - counter-rotate to keep upright */}
                                    <g transform={`rotate(-${qiblaDirection + compassRotation})`}>
                                        <rect x="-8" y="-8" width="16" height="16" rx="2" fill={isAligned ? '#92400e' : '#374151'} className="dark:fill-gray-300" />
                                        <rect x="-6" y="-6" width="12" height="3" rx="1" fill={isAligned ? '#fbbf24' : '#6b7280'} />
                                        <rect x="-2" y="2" width="4" height="6" rx="0.5" fill={isAligned ? '#fbbf24' : '#9ca3af'} />
                                    </g>
                                </g>
                            </g>
                        )}
                    </svg>
                </div>

                {/* Static Direction Pointer (Top) */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20">
                    <div className={`transition-transform duration-300 ${isAligned ? 'scale-110' : 'scale-100'}`}>
                        <svg width="28" height="40" viewBox="0 0 28 40" fill="none" className="drop-shadow-lg">
                            <defs>
                                <linearGradient id="pointerGradient" x1="14" y1="0" x2="14" y2="40" gradientUnits="userSpaceOnUse">
                                    <stop stopColor={isAligned ? '#10b981' : '#3b82f6'} />
                                    <stop offset="1" stopColor={isAligned ? '#059669' : '#2563eb'} />
                                </linearGradient>
                                <filter id="pointerShadow" x="-4" y="-4" width="36" height="48">
                                    <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.4" />
                                </filter>
                            </defs>
                            <path
                                d="M14 0L24 18L14 14L4 18Z"
                                fill="url(#pointerGradient)"
                                filter="url(#pointerShadow)"
                            />
                            <rect x="11" y="16" width="6" height="22" rx="3" fill="url(#pointerGradient)" filter="url(#pointerShadow)" />
                            <circle cx="14" cy="27" r="2" fill="white" fillOpacity="0.5" />
                        </svg>
                    </div>
                </div>

                {/* Center Pivot */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className={`relative transition-all duration-300 ${isAligned ? 'scale-105' : 'scale-100'}`}>
                        {/* Outer glow ring */}
                        <div className={`absolute inset-0 rounded-full blur-md transition-colors duration-300 ${isAligned ? 'bg-green-400/30' : 'bg-gray-400/20'
                            }`} style={{ width: '88px', height: '88px', margin: '-8px' }} />

                        {/* Main center housing */}
                        <div className="w-[72px] h-[72px] sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-100 via-white to-gray-200 dark:from-gray-700 dark:via-gray-750 dark:to-gray-800 shadow-xl border-2 border-gray-200 dark:border-gray-600 flex items-center justify-center">
                            {/* Inner ring */}
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-white to-gray-100 dark:from-gray-800 dark:to-gray-700 shadow-inner flex items-center justify-center border border-gray-200 dark:border-gray-600">
                                {/* Compass needle in center */}
                                <div
                                    className="transition-none"
                                    style={{
                                        transform: `rotate(${qiblaAngleOnCompass}deg)`,
                                    }}
                                >
                                    <CompassNeedleIcon isAligned={isAligned} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alignment glow effect */}
                {isAligned && (
                    <div className="absolute inset-0 rounded-full pointer-events-none">
                        <div className="absolute inset-0 rounded-full bg-green-500/5 animate-pulse" />
                        <div className="absolute inset-3 rounded-full border-2 border-green-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                    </div>
                )}
            </div>

            {/* Status Message */}
            <div className="h-14 flex items-center justify-center">
                {isAligned ? (
                    <div className="inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 text-green-700 dark:text-green-400 text-sm font-semibold rounded-full shadow-lg border border-green-200 dark:border-green-800">
                        <CheckCircleIcon className="text-green-500" />
                        <span>You are facing the Qibla</span>
                        <KaabaIcon size={18} isAligned={true} />
                    </div>
                ) : (
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-sm rounded-full border border-gray-200 dark:border-gray-700">
                        <RotateIcon className="animate-spin-slow" />
                        <span>Rotate to align with Qibla</span>
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
                        <ShieldIcon />
                        Enable Compass
                    </button>
                )}

                {compassError && (
                    <div className="flex items-center justify-center gap-2 text-sm text-red-500 dark:text-red-400">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        {compassError}
                    </div>
                )}

                <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-amber-200/50 dark:border-amber-800/50">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                            <InfoIcon className="text-amber-500" />
                        </div>
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
