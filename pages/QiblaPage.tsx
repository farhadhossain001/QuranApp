import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAppStore } from '../context/Store';
import { getQiblaDirection } from '../services/api';

// ============================================
// SVG ICON COMPONENTS
// ============================================

const KaabaIcon: React.FC<{ size?: number; className?: string; isAligned?: boolean }> = ({ 
    size = 32, 
    className = "",
    isAligned = false
}) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 64 64" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        {/* Base shadow */}
        <ellipse cx="32" cy="58" rx="20" ry="4" fill="currentColor" opacity="0.1"/>
        
        {/* Main Kaaba structure */}
        <rect x="12" y="16" width="40" height="40" rx="2" fill="currentColor"/>
        
        {/* Gold band (Kiswah belt) */}
        <rect x="12" y="24" width="40" height="8" fill={isAligned ? "#F59E0B" : "#9CA3AF"}/>
        
        {/* Decorative patterns on gold band */}
        <rect x="16" y="26" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.3"/>
        <rect x="24" y="26" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.3"/>
        <rect x="32" y="26" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.3"/>
        <rect x="40" y="26" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.3"/>
        
        {/* Door */}
        <rect x="26" y="36" width="12" height="18" rx="1" fill={isAligned ? "#92400E" : "#4B5563"}/>
        <rect x="28" y="38" width="8" height="14" rx="0.5" fill={isAligned ? "#F59E0B" : "#6B7280"}/>
        
        {/* Top edge highlight */}
        <rect x="12" y="16" width="40" height="2" rx="1" fill="currentColor" opacity="0.2"/>
    </svg>
);

const CompassPointer: React.FC<{ isAligned?: boolean }> = ({ isAligned = false }) => (
    <svg width="32" height="48" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Pointer shadow */}
        <ellipse cx="16" cy="46" rx="6" ry="2" fill="black" opacity="0.1"/>
        
        {/* Main pointer triangle */}
        <path 
            d="M16 0 L24 20 L16 16 L8 20 Z" 
            fill={isAligned ? "#10B981" : "#3B82F6"}
            className="transition-colors duration-300"
        />
        
        {/* Pointer stem */}
        <rect 
            x="13" 
            y="18" 
            width="6" 
            height="26" 
            rx="3" 
            fill={isAligned ? "#10B981" : "#3B82F6"}
            className="transition-colors duration-300"
        />
        
        {/* Highlight */}
        <path 
            d="M16 2 L20 16 L16 14 Z" 
            fill="white" 
            opacity="0.3"
        />
    </svg>
);

// ============================================
// MAIN COMPONENT
// ============================================

const QiblaPage = () => {
    const { t, setHeaderTitle, settings, formatNumber } = useAppStore();
    const [qiblaDirection, setQiblaDirection] = useState<number | null>(null);
    const [displayHeading, setDisplayHeading] = useState<number>(0);
    const [permissionGranted, setPermissionGranted] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isAligned, setIsAligned] = useState(false);
    const [compassError, setCompassError] = useState<string | null>(null);

    // Refs for smooth rotation
    const currentHeadingRef = useRef<number>(0);
    const targetHeadingRef = useRef<number>(0);
    const animationFrameRef = useRef<number | null>(null);
    const headingBufferRef = useRef<number[]>([]);
    const lastTimestampRef = useRef<number>(0);

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================

    // Normalize angle to 0-360 range
    const normalizeAngle = useCallback((angle: number): number => {
        while (angle < 0) angle += 360;
        while (angle >= 360) angle -= 360;
        return angle;
    }, []);

    // Get shortest rotation path between two angles
    const getShortestRotation = useCallback((from: number, to: number): number => {
        const diff = normalizeAngle(to) - normalizeAngle(from);
        if (diff > 180) return diff - 360;
        if (diff < -180) return diff + 360;
        return diff;
    }, [normalizeAngle]);

    // Apply low-pass filter for smoothing
    const applyLowPassFilter = useCallback((newValue: number, buffer: number[], bufferSize: number = 8): number => {
        // Handle angle wraparound
        if (buffer.length > 0) {
            const lastValue = buffer[buffer.length - 1];
            const diff = newValue - lastValue;
            
            // Adjust for wraparound
            if (diff > 180) newValue -= 360;
            else if (diff < -180) newValue += 360;
        }

        buffer.push(newValue);
        if (buffer.length > bufferSize) buffer.shift();

        // Weighted average (more recent values have more weight)
        let sum = 0;
        let weightSum = 0;
        buffer.forEach((val, index) => {
            const weight = index + 1;
            sum += val * weight;
            weightSum += weight;
        });

        return normalizeAngle(sum / weightSum);
    }, [normalizeAngle]);

    // ============================================
    // ANIMATION LOOP
    // ============================================

    const animate = useCallback(() => {
        const now = performance.now();
        const deltaTime = Math.min((now - lastTimestampRef.current) / 1000, 0.1);
        lastTimestampRef.current = now;

        const current = currentHeadingRef.current;
        const target = targetHeadingRef.current;
        const diff = getShortestRotation(current, target);

        // Smooth interpolation with spring-like easing
        const smoothingFactor = 1 - Math.pow(0.001, deltaTime);
        const newHeading = normalizeAngle(current + diff * smoothingFactor * 0.3);

        if (Math.abs(diff) > 0.01) {
            currentHeadingRef.current = newHeading;
            setDisplayHeading(newHeading);
        }

        animationFrameRef.current = requestAnimationFrame(animate);
    }, [getShortestRotation, normalizeAngle]);

    // Start animation loop
    useEffect(() => {
        lastTimestampRef.current = performance.now();
        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [animate]);

    // ============================================
    // DEVICE ORIENTATION HANDLER
    // ============================================

    const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
        let heading = 0;

        // iOS Safari
        if ((event as any).webkitCompassHeading !== undefined) {
            heading = (event as any).webkitCompassHeading;
        }
        // Android / Others
        else if (event.alpha !== null) {
            heading = (360 - event.alpha) % 360;
        }

        // Apply smoothing filter
        const smoothedHeading = applyLowPassFilter(heading, headingBufferRef.current);
        targetHeadingRef.current = smoothedHeading;
    }, [applyLowPassFilter]);

    // ============================================
    // COMPASS INITIALIZATION
    // ============================================

    const startCompass = useCallback(() => {
        const requestPermission = async () => {
            try {
                if (typeof DeviceOrientationEvent !== 'undefined' &&
                    typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
                    const response = await (DeviceOrientationEvent as any).requestPermission();
                    if (response === 'granted') {
                        setPermissionGranted(true);
                        setCompassError(null);
                        window.addEventListener('deviceorientation', handleOrientation, true);
                    } else {
                        setCompassError('Permission denied. Please enable compass access.');
                    }
                } else {
                    setPermissionGranted(true);
                    // Prefer absolute orientation for better accuracy on Android
                    if ('ondeviceorientationabsolute' in window) {
                        window.addEventListener('deviceorientationabsolute' as any, handleOrientation, true);
                    } else {
                        window.addEventListener('deviceorientation', handleOrientation, true);
                    }
                }
            } catch (error) {
                console.error('Compass error:', error);
                setCompassError('Failed to initialize compass');
            }
        };

        requestPermission();
    }, [handleOrientation]);

    // ============================================
    // EFFECTS
    // ============================================

    useEffect(() => {
        setHeaderTitle(t('qibla'));

        // Fetch Qibla direction
        const fetchQibla = async () => {
            try {
                const dir = await getQiblaDirection(
                    settings.location.latitude,
                    settings.location.longitude
                );
                if (dir !== null) setQiblaDirection(dir);
            } catch (error) {
                console.error('Failed to fetch Qibla:', error);
            }
        };
        fetchQibla();

        // Detect iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        setIsIOS(isIOSDevice);

        // Auto-start on non-iOS
        if (!isIOSDevice) {
            startCompass();
        }

        return () => {
            window.removeEventListener('deviceorientationabsolute' as any, handleOrientation);
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, [t, setHeaderTitle, settings.location, handleOrientation, startCompass]);

    // Check alignment
    useEffect(() => {
        if (qiblaDirection === null) return;

        const diff = Math.abs(getShortestRotation(displayHeading, qiblaDirection));
        const nowAligned = diff < 5;

        if (nowAligned !== isAligned) {
            if (nowAligned && navigator.vibrate) {
                navigator.vibrate([50, 30, 50]);
            }
            setIsAligned(nowAligned);
        }
    }, [displayHeading, qiblaDirection, isAligned, getShortestRotation]);

    // ============================================
    // COMPASS DIAL ELEMENTS
    // ============================================

    const compassRotation = -displayHeading;

    // Generate tick marks
    const tickMarks = useMemo(() => {
        const ticks = [];
        const totalTicks = 72;

        for (let i = 0; i < totalTicks; i++) {
            const angle = i * (360 / totalTicks);
            const isCardinal = angle % 90 === 0;
            const isMajor = angle % 30 === 0;
            const isMinor = angle % 15 === 0;

            let length, width, color;
            if (isCardinal) {
                length = 18;
                width = 3;
                color = '#10B981';
            } else if (isMajor) {
                length = 14;
                width = 2;
                color = 'currentColor';
            } else if (isMinor) {
                length = 10;
                width = 1.5;
                color = 'currentColor';
            } else {
                length = 6;
                width = 1;
                color = 'currentColor';
            }

            ticks.push(
                <line
                    key={i}
                    x1="150"
                    y1="15"
                    x2="150"
                    y2={15 + length}
                    stroke={color}
                    strokeWidth={width}
                    strokeLinecap="round"
                    opacity={isCardinal ? 1 : isMajor ? 0.7 : isMinor ? 0.4 : 0.2}
                    transform={`rotate(${angle} 150 150)`}
                />
            );
        }
        return ticks;
    }, []);

    // Cardinal direction labels
    const cardinalLabels = useMemo(() => {
        const labels = [
            { text: 'N', angle: 0, color: '#EF4444' },
            { text: 'E', angle: 90, color: 'currentColor' },
            { text: 'S', angle: 180, color: 'currentColor' },
            { text: 'W', angle: 270, color: 'currentColor' },
        ];

        return labels.map(({ text, angle, color }) => {
            const radians = ((angle - 90) * Math.PI) / 180;
            const radius = 100;
            const x = 150 + radius * Math.cos(radians);
            const y = 150 + radius * Math.sin(radians);

            return (
                <text
                    key={text}
                    x={x}
                    y={y}
                    fill={color}
                    fontSize="24"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontFamily="system-ui, -apple-system, sans-serif"
                >
                    {text}
                </text>
            );
        });
    }, []);

    // Degree numbers
    const degreeNumbers = useMemo(() => {
        const numbers = [];
        for (let angle = 30; angle < 360; angle += 30) {
            if (angle % 90 !== 0) {
                const radians = ((angle - 90) * Math.PI) / 180;
                const radius = 100;
                const x = 150 + radius * Math.cos(radians);
                const y = 150 + radius * Math.sin(radians);

                numbers.push(
                    <text
                        key={angle}
                        x={x}
                        y={y}
                        fill="currentColor"
                        fontSize="12"
                        fontWeight="500"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        opacity="0.5"
                        fontFamily="system-ui, -apple-system, sans-serif"
                    >
                        {angle}°
                    </text>
                );
            }
        }
        return numbers;
    }, []);

    // ============================================
    // RENDER
    // ============================================

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-8 pb-20 px-4">

            {/* Header Info */}
            <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-4 px-6 py-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
                    <div className="text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
                            {t('qiblaDirection')}
                        </p>
                        <p className={`text-3xl font-bold tabular-nums transition-colors duration-300 ${
                            isAligned ? 'text-green-500' : 'text-primary dark:text-primary-dark'
                        }`}>
                            {qiblaDirection !== null ? `${formatNumber(Math.round(qiblaDirection))}°` : '--'}
                        </p>
                    </div>

                    <div className="w-px h-14 bg-gradient-to-b from-transparent via-gray-200 dark:via-gray-700 to-transparent" />

                    <div className="text-center">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-1">
                            Heading
                        </p>
                        <p className="text-3xl font-bold tabular-nums text-gray-600 dark:text-gray-300">
                            {formatNumber(Math.round(displayHeading))}°
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="truncate max-w-[200px]">
                        {settings.location.address || "Current Location"}
                    </span>
                </div>
            </div>

            {/* Compass Container */}
            <div className="relative w-[300px] h-[300px] sm:w-[340px] sm:h-[340px]">

                {/* Outer decorative rings */}
                <div className="absolute -inset-3 rounded-full bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 shadow-2xl" />
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850" />

                {/* Main compass face */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-850 dark:to-gray-800 shadow-inner overflow-hidden">

                    {/* Subtle grid pattern */}
                    <div 
                        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
                        style={{
                            backgroundImage: `
                                linear-gradient(currentColor 1px, transparent 1px),
                                linear-gradient(90deg, currentColor 1px, transparent 1px)
                            `,
                            backgroundSize: '20px 20px'
                        }}
                    />

                    {/* Rotating SVG Dial */}
                    <svg
                        viewBox="0 0 300 300"
                        className="absolute inset-0 w-full h-full text-gray-500 dark:text-gray-400"
                        style={{ transform: `rotate(${compassRotation}deg)` }}
                    >
                        {/* Tick marks */}
                        {tickMarks}

                        {/* Degree numbers */}
                        {degreeNumbers}

                        {/* Cardinal labels */}
                        {cardinalLabels}

                        {/* Qibla direction indicator */}
                        {qiblaDirection !== null && (
                            <g transform={`rotate(${qiblaDirection} 150 150)`}>
                                {/* Direction line */}
                                <line
                                    x1="150"
                                    y1="45"
                                    x2="150"
                                    y2="70"
                                    stroke="#F59E0B"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    className={`transition-opacity duration-300 ${isAligned ? 'opacity-100' : 'opacity-60'}`}
                                />

                                {/* Kaaba icon container */}
                                <g transform={`translate(150, 26) rotate(-${qiblaDirection})`}>
                                    <circle
                                        cx="0"
                                        cy="0"
                                        r="22"
                                        fill={isAligned ? '#FEF3C7' : '#F3F4F6'}
                                        className="dark:fill-gray-700 transition-colors duration-300"
                                    />
                                    <circle
                                        cx="0"
                                        cy="0"
                                        r="22"
                                        fill="none"
                                        stroke={isAligned ? '#F59E0B' : '#9CA3AF'}
                                        strokeWidth="2"
                                        className="transition-colors duration-300"
                                    />
                                    
                                    {/* Mini Kaaba */}
                                    <rect
                                        x="-10"
                                        y="-10"
                                        width="20"
                                        height="20"
                                        rx="2"
                                        fill={isAligned ? '#1F2937' : '#4B5563'}
                                        className="dark:fill-gray-300"
                                    />
                                    <rect
                                        x="-10"
                                        y="-4"
                                        width="20"
                                        height="4"
                                        fill={isAligned ? '#F59E0B' : '#9CA3AF'}
                                    />
                                    <rect
                                        x="-4"
                                        y="2"
                                        width="8"
                                        height="8"
                                        rx="1"
                                        fill={isAligned ? '#92400E' : '#6B7280'}
                                    />
                                </g>
                            </g>
                        )}
                    </svg>
                </div>

                {/* Static top pointer */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <CompassPointer isAligned={isAligned} />
                </div>

                {/* Center pivot */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="relative">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-white to-gray-100 dark:from-gray-700 dark:to-gray-800 shadow-xl border border-gray-200 dark:border-gray-600 flex items-center justify-center">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 shadow-inner flex items-center justify-center">
                                <div className={`w-5 h-5 rounded-full shadow-lg transition-all duration-500 ${
                                    isAligned 
                                        ? 'bg-gradient-to-br from-green-400 to-green-600 shadow-green-500/50 scale-110' 
                                        : 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-500/30'
                                }`} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Alignment glow */}
                {isAligned && (
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 rounded-full bg-green-500/5 animate-pulse" />
                        <div className="absolute inset-4 rounded-full border-2 border-green-500/20" />
                    </div>
                )}
            </div>

            {/* Status Message */}
            <div className="h-12 flex items-center">
                {isAligned ? (
                    <div className="flex items-center gap-3 px-6 py-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full shadow-lg animate-bounce-slow">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-bold text-sm">You are facing the Qibla</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 px-5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-full text-sm">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        <span>Rotate to align with Qibla</span>
                    </div>
                )}
            </div>

            {/* Permission & Instructions */}
            <div className="text-center max-w-sm space-y-4">
                {!permissionGranted && isIOS && (
                    <button
                        onClick={startCompass}
                        className="w-full bg-gradient-to-r from-primary to-blue-600 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:shadow-2xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-3"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Enable Compass
                    </button>
                )}

                {compassError && (
                    <p className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
                        {compassError}
                    </p>
                )}

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        💡 <strong>Tip:</strong> Hold your phone flat and move it in a figure-8 pattern to calibrate the compass for better accuracy.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QiblaPage;
