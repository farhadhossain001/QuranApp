import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAppStore } from '../context/Store';
import { getQiblaDirection } from '../services/api';
import { KaabaIcon } from '../components/CustomIcons';

// Normalize angle to [0, 360)
const normalizeAngle = (angle: number): number => {
  return ((angle % 360) + 360) % 360;
};

// Calculate shortest rotation path to avoid 360/0 jumps
const shortestRotation = (from: number, to: number): number => {
  const diff = normalizeAngle(to - from + 180) - 180;
  return from + diff;
};

const QiblaPage = () => {
  const { t, setHeaderTitle, settings, formatNumber } = useAppStore();
  const [qiblaDirection, setQiblaDirection] = useState<number | null>(null);
  const [smoothHeading, setSmoothHeading] = useState<number>(0);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAligned, setIsAligned] = useState(false);

  // Refs for smooth filtering
  const rawHeadingRef = useRef<number>(0);
  const smoothHeadingRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);

  // Low-pass filter coefficient (0 = no smoothing, 1 = frozen)
  const SMOOTHING_FACTOR = 0.85;
  // Alignment threshold in degrees
  const ALIGNMENT_THRESHOLD = 5;

  useEffect(() => {
    setHeaderTitle(t('qibla'));

    const fetchQibla = async () => {
      const dir = await getQiblaDirection(
        settings.location.latitude,
        settings.location.longitude
      );
      if (dir) setQiblaDirection(dir);
    };
    fetchQibla();

    const isIOSDevice =
      ['iPad Simulator', 'iPhone Simulator', 'iPod Simulator', 'iPad', 'iPhone', 'iPod'].includes(
        navigator.platform
      ) ||
      (navigator.userAgent.includes('Mac') && 'ontouchend' in document);

    setIsIOS(isIOSDevice);

    if (!isIOSDevice) {
      startCompass();
    }

    // Start the animation loop for smooth updates
    const animate = (timestamp: number) => {
      if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;

      const currentSmooth = smoothHeadingRef.current;
      const target = rawHeadingRef.current;

      // Use shortest path to avoid 360/0 boundary jump
      const targetAdjusted = shortestRotation(currentSmooth, target);

      // Apply low-pass filter
      const newSmooth = currentSmooth + (1 - SMOOTHING_FACTOR) * (targetAdjusted - currentSmooth);
      const normalized = normalizeAngle(newSmooth);

      smoothHeadingRef.current = newSmooth;

      // Only update state at ~30fps to reduce renders
      if (timestamp - lastTimestampRef.current > 33) {
        setSmoothHeading(normalized);
        lastTimestampRef.current = timestamp;
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('deviceorientationabsolute' as any, handleOrientation as any);
      window.removeEventListener('deviceorientation', handleOrientation as any);
    };
  }, [t, setHeaderTitle, settings.location]);

  // Alignment detection
  useEffect(() => {
    if (qiblaDirection === null) return;

    const diff = Math.abs(normalizeAngle(smoothHeading - qiblaDirection));
    const aligned = diff < ALIGNMENT_THRESHOLD || diff > 360 - ALIGNMENT_THRESHOLD;

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
    if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null) {
      // @ts-ignore
      heading = event.webkitCompassHeading;
    } else if (event.alpha !== null) {
      // For absolute orientation, check if `absolute` is true
      if ((event as any).absolute === true || event.alpha !== null) {
        heading = normalizeAngle(360 - (event.alpha || 0));
      }
    }
    rawHeadingRef.current = heading;
  }, []);

  const startCompass = useCallback(() => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      // @ts-ignore
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      // @ts-ignore
      DeviceOrientationEvent.requestPermission()
        .then((response: string) => {
          if (response === 'granted') {
            setPermissionGranted(true);
            window.addEventListener('deviceorientation', handleOrientation as any);
          } else {
            alert('Permission required to use compass');
          }
        })
        .catch(console.error);
    } else {
      setPermissionGranted(true);
      if ('ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute' as any, handleOrientation as any);
      } else {
        window.addEventListener('deviceorientation', handleOrientation as any);
      }
    }
  }, [handleOrientation]);

  const compassRotation = -smoothHeading;

  // Generate tick marks with SVG for crisp rendering
  const compassSVG = useMemo(() => {
    const size = 300;
    const center = size / 2;
    const outerRadius = center - 8;
    const ticks: React.ReactNode[] = [];

    for (let i = 0; i < 360; i += 5) {
      const isCardinal = i % 90 === 0;
      const isMajor = i % 30 === 0;
      const isMinor = i % 10 === 0;

      if (!isCardinal && !isMajor && !isMinor && i % 5 !== 0) continue;

      const tickLength = isCardinal ? 20 : isMajor ? 14 : isMinor ? 10 : 6;
      const strokeWidth = isCardinal ? 2.5 : isMajor ? 1.5 : 1;
      const color = isCardinal ? '#DC2626' : isMajor ? '#6B7280' : '#D1D5DB';

      const rad = (i * Math.PI) / 180;
      const x1 = center + (outerRadius - tickLength) * Math.sin(rad);
      const y1 = center - (outerRadius - tickLength) * Math.cos(rad);
      const x2 = center + outerRadius * Math.sin(rad);
      const y2 = center - outerRadius * Math.cos(rad);

      ticks.push(
        <line
          key={`tick-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={isCardinal ? '' : isMajor ? 'dark:stroke-gray-500' : 'dark:stroke-gray-700'}
        />
      );

      // Degree numbers at every 30°
      if (isMajor && !isCardinal) {
        const labelRadius = outerRadius - 28;
        const lx = center + labelRadius * Math.sin(rad);
        const ly = center - labelRadius * Math.cos(rad);
        ticks.push(
          <text
            key={`label-${i}`}
            x={lx}
            y={ly}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="11"
            fontWeight="500"
            className="fill-gray-400 dark:fill-gray-500"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            {i}
          </text>
        );
      }
    }

    // Cardinal direction labels
    const cardinals = [
      { label: 'N', angle: 0, color: '#DC2626' },
      { label: 'E', angle: 90, color: '#6B7280' },
      { label: 'S', angle: 180, color: '#6B7280' },
      { label: 'W', angle: 270, color: '#6B7280' },
    ];

    cardinals.forEach(({ label, angle, color }) => {
      const labelRadius = outerRadius - 32;
      const rad = (angle * Math.PI) / 180;
      const lx = center + labelRadius * Math.sin(rad);
      const ly = center - labelRadius * Math.cos(rad);
      ticks.push(
        <text
          key={`cardinal-${label}`}
          x={lx}
          y={ly}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="18"
          fontWeight="700"
          fill={color}
          className={label !== 'N' ? 'dark:fill-gray-400' : ''}
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          {label}
        </text>
      );
    });

    return ticks;
  }, []);

  // Qibla indicator on compass dial (SVG)
  const qiblaIndicatorSVG = useMemo(() => {
    if (qiblaDirection === null) return null;
    const size = 300;
    const center = size / 2;
    const indicatorRadius = center - 8;
    const rad = (qiblaDirection * Math.PI) / 180;

    const tipX = center + indicatorRadius * Math.sin(rad);
    const tipY = center - indicatorRadius * Math.cos(rad);

    // Line from center area to the qibla direction
    const lineStartRadius = 50;
    const lineStartX = center + lineStartRadius * Math.sin(rad);
    const lineStartY = center - lineStartRadius * Math.cos(rad);

    return (
      <g>
        {/* Qibla direction line */}
        <line
          x1={lineStartX}
          y1={lineStartY}
          x2={tipX}
          y2={tipY}
          stroke={isAligned ? '#F59E0B' : '#D97706'}
          strokeWidth={2}
          strokeDasharray="6 4"
          opacity={0.6}
        />
        {/* Kaaba icon container - we'll position it with HTML overlay instead */}
      </g>
    );
  }, [qiblaDirection, isAligned]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] space-y-8 pb-20">
      {/* Top Info Header */}
      <div className="text-center space-y-2 mt-4">
        <div className="inline-flex items-center justify-center gap-3 px-5 py-2.5 bg-white dark:bg-surface-dark rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400">
            {t('qiblaDirection')}
          </span>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
          <span
            className={`text-xl font-mono font-bold tabular-nums transition-colors duration-300 ${
              isAligned ? 'text-amber-500' : 'text-primary dark:text-primary-dark'
            }`}
          >
            {qiblaDirection ? formatNumber(qiblaDirection.toFixed(0)) : '--'}°
          </span>
        </div>
        <p className="text-[10px] text-gray-400 max-w-[200px] mx-auto truncate">
          {settings.location.address || 'Current Location'}
        </p>
      </div>

      {/* Main Compass */}
      <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] flex items-center justify-center select-none">
        {/* Outer decorative ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]" />
        <div className="absolute inset-[3px] rounded-full bg-white dark:bg-gray-900 shadow-inner" />
        <div className="absolute inset-[6px] rounded-full border border-gray-100 dark:border-gray-800" />

        {/* Static top pointer / lubber line */}
        <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
          <div
            className={`w-3 h-3 rotate-45 rounded-sm transition-all duration-300 ${
              isAligned
                ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.7)]'
                : 'bg-primary dark:bg-primary-dark'
            }`}
          />
          <div
            className={`w-[2px] h-4 -mt-[2px] rounded-b transition-colors duration-300 ${
              isAligned ? 'bg-amber-500' : 'bg-primary dark:bg-primary-dark'
            }`}
          />
        </div>

        {/* Rotating compass dial */}
        <div
          className="absolute inset-[6px] rounded-full z-10"
          style={{
            transform: `rotate(${compassRotation}deg)`,
            // Use NO CSS transition — the animation loop handles smoothing
          }}
        >
          <svg
            viewBox="0 0 300 300"
            className="w-full h-full"
            style={{ overflow: 'visible' }}
          >
            {/* Compass ticks and labels */}
            {compassSVG}

            {/* Qibla direction line */}
            {qiblaIndicatorSVG}

            {/* North pointer triangle */}
            <polygon
              points="150,18 145,35 155,35"
              fill="#DC2626"
              stroke="#DC2626"
              strokeWidth="0.5"
            />

            {/* Inner decorative circle */}
            <circle
              cx="150"
              cy="150"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              className="text-gray-200 dark:text-gray-700"
            />
            <circle
              cx="150"
              cy="150"
              r="44"
              fill="white"
              fillOpacity="0.02"
              className="dark:fill-black"
            />
          </svg>

          {/* Kaaba Icon (HTML overlay on the rotating dial) */}
          {qiblaDirection !== null && (
            <div
              className="absolute top-0 left-1/2 h-1/2 pointer-events-none"
              style={{
                transform: `translateX(-50%) rotate(${qiblaDirection}deg)`,
                transformOrigin: 'bottom center',
              }}
            >
              <div
                className="absolute -top-1"
                style={{
                  transform: `translateX(-50%) rotate(${-qiblaDirection}deg)`,
                  left: '50%',
                }}
              >
                <div
                  style={{
                    // Counter-rotate so icon stays upright relative to device
                    transform: `rotate(${-compassRotation}deg)`,
                  }}
                >
                  <div
                    className={`flex flex-col items-center transition-all duration-500 ${
                      isAligned
                        ? 'scale-110 drop-shadow-[0_0_12px_rgba(245,158,11,0.6)]'
                        : 'scale-100'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-full transition-colors duration-300 ${
                        isAligned
                          ? 'bg-amber-50 dark:bg-amber-900/30'
                          : 'bg-white dark:bg-gray-800'
                      } shadow-md`}
                    >
                      <KaabaIcon
                        size={24}
                        className={`transition-colors duration-300 ${
                          isAligned
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      />
                    </div>
                    <div
                      className={`w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] mt-0.5 transition-colors duration-300 ${
                        isAligned ? 'border-t-amber-500' : 'border-t-gray-400 dark:border-t-gray-500'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div
            className={`w-3 h-3 rounded-full transition-all duration-300 shadow-sm ${
              isAligned
                ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                : 'bg-primary dark:bg-primary-dark'
            }`}
          />
        </div>

        {/* Current heading display at bottom of compass */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20">
          <div className="px-3 py-1 bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-100 dark:border-gray-700">
            <span className="text-xs font-mono font-bold text-gray-600 dark:text-gray-300 tabular-nums">
              {formatNumber(Math.round(smoothHeading).toString())}°
            </span>
          </div>
        </div>
      </div>

      {/* Alignment feedback */}
      <div className="text-center h-10 flex items-center justify-center">
        {isAligned ? (
          <div className="inline-flex items-center gap-2 px-5 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400 text-sm font-semibold rounded-full">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            You are facing the Qibla
          </div>
        ) : (
          <p className="text-xs text-gray-400 max-w-[240px]">
            Rotate your phone until the Kaaba aligns with the top marker
          </p>
        )}
      </div>

      {/* iOS Permission Button */}
      {!permissionGranted && isIOS && (
        <div className="text-center px-6 max-w-xs">
          <button
            onClick={startCompass}
            className="bg-primary text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:opacity-90 active:scale-[0.98] transition-all w-full"
          >
            {t('compassPermission')}
          </button>
          <p className="text-xs text-gray-400 mt-3 leading-relaxed">{t('calibrateDesc')}</p>
        </div>
      )}
    </div>
  );
};

export default QiblaPage;
