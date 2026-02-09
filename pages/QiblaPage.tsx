
import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
        const aligned = diff < 5 || diff > 355; 

        if (aligned && !isAligned) {
            if (navigator.vibrate) navigator.vibrate(50);
            setIsAligned(true);
        } else if (!aligned && isAligned) {
            setIsAligned(false);
        }
    }, [deviceHeading, qiblaDirection, isAligned]);

    const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
        let heading = 0;
        // @ts-ignore
        if (event.webkitCompassHeading) {
            // @ts-ignore
            heading = event.webkitCompassHeading;
        } else if (event.alpha !== null) {
            heading = 360 - event.alpha;
        }
        setDeviceHeading(heading);
    }, []);

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

    // Generate Compass Ticks - Reduced density (Every 15 degrees = 24 ticks)
    const ticks = useMemo(() => {
        return Array.from({ length: 24 }).map((_, i) => {
            const angle = i * 15;
            const isCardinal = angle % 90 === 0;
            const isMajor = angle % 45 === 0;
            
            return (
                <div
                    key={i}
                    className={`absolute top-0 left-1/2 origin-bottom
                        ${isCardinal ? 'h-5 w-[3px] bg-gray-900 dark:bg-white' : 
                          isMajor ? 'h-3 w-[2px] bg-gray-500 dark:bg-gray-400' : 
                          'h-2 w-[1.5px] bg-gray-300 dark:bg-gray-700'}
                    `}
                    style={{ 
                        transform: `translateX(-50%) rotate(${angle}deg) translateY(0px)`, 
                        height: '50%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start',
                        alignItems: 'center',
                        pointerEvents: 'none'
                    }}
                >
                    {/* The tick mark itself */}
                    <div 
                        className={`
                            ${isCardinal ? 'h-5 w-[3px]' : isMajor ? 'h-3 w-[2px]' : 'h-2 w-[1.5px]'}
                            ${isCardinal ? 'bg-primary dark:bg-primary-dark' : 'bg-gray-300 dark:bg-gray-600'}
                        `}
                    />
                </div>
            );
        });
    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-[75vh] space-y-12 pb-20">
            
            {/* Top Info Header */}
            <div className="text-center space-y-2 mt-4">
                <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-surface-dark rounded-full shadow-sm border border-gray-100 dark:border-gray-800">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-500">
                        {t('qiblaDirection')}
                    </span>
                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-700"></div>
                    <span className={`text-lg font-mono font-bold ${isAligned ? 'text-secondary' : 'text-primary dark:text-primary-dark'}`}>
                        {qiblaDirection ? formatNumber(qiblaDirection.toFixed(0)) : '--'}°
                    </span>
                </div>
                <p className="text-[10px] text-gray-400 max-w-[200px] mx-auto truncate">
                    {settings.location.address || "Current Location"}
                </p>
            </div>

            {/* Main Compass UI - Responsive Size */}
            <div className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] flex items-center justify-center">
                
                {/* 1. Static Outer Bezel (Decorative) */}
                <div className="absolute inset-0 rounded-full border-[8px] border-white dark:border-surface-dark shadow-[0_10px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] z-0"></div>
                <div className="absolute inset-2 rounded-full border border-gray-100 dark:border-gray-800 z-0 bg-white/50 dark:bg-black/20 backdrop-blur-sm"></div>

                {/* 2. Rotating Dial */}
                <div 
                    className="w-full h-full rounded-full relative transition-transform duration-300 ease-out will-change-transform z-10"
                    style={{ transform: `rotate(${compassRotation}deg)` }}
                >
                    {/* Ticks Container - Pushed in slightly */}
                    <div className="absolute inset-4 sm:inset-5">
                        {ticks}
                    </div>

                    {/* Cardinal Labels - Explicitly Positioned */}
                    {/* North */}
                    <div className="absolute top-[1%] left-1/2 -translate-x-1/2">
                        <span className="text-3xl font-bold text-red-500 drop-shadow-sm">N</span>
                    </div>
                    {/* East */}
                    <div className="absolute top-1/2 right-[1%] -translate-y-1/2">
                        <span className="text-3xl font-bold text-gray-600 dark:text-gray-300">E</span>
                    </div>
                    {/* South */}
                    <div className="absolute bottom-[1%] left-1/2 -translate-x-1/2">
                        <span className="text-3xl font-bold text-gray-600 dark:text-gray-300">S</span>
                    </div>
                    {/* West */}
                    <div className="absolute top-1/2 left-[1%] -translate-y-1/2">
                        <span className="text-3xl font-bold text-gray-600 dark:text-gray-300">W</span>
                    </div>

                    {/* Kaaba Indicator (Fixed to Dial at Qibla Angle) */}
                    {qiblaDirection !== null && (
                        <div 
                            className="absolute top-0 left-1/2 -translate-x-1/2 h-full w-10 pointer-events-none"
                            style={{ transform: `rotate(${qiblaDirection}deg)` }}
                        >
                            {/* The Kaaba Icon placed on the rim */}
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 transform -rotate-[0deg]">
                                <div className={`relative transition-all duration-500 ${isAligned ? 'scale-110 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'scale-90 opacity-90'}`}>
                                    <KaabaIcon size={32} className="text-gray-900 dark:text-white" />
                                    {/* Small arrow below Kaaba pointing to center */}
                                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-secondary mx-auto mt-1"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. Static Top Indicator (Lubber Line) */}
                <div className="absolute top-[-12px] left-1/2 -translate-x-1/2 z-20">
                    <div className={`w-2 h-4 sm:h-5 rounded-full transition-colors duration-300 ${isAligned ? 'bg-secondary shadow-[0_0_10px_rgba(245,158,11,0.8)]' : 'bg-primary dark:bg-primary-dark'}`}></div>
                    {/* Small triangle pointing down */}
                    <div className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] mx-auto ${isAligned ? 'border-t-secondary' : 'border-t-primary dark:border-t-primary-dark'}`}></div>
                </div>

                {/* 4. Center Ornament */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5 dark:to-transparent backdrop-blur-md rounded-full border border-white/20 dark:border-white/10 flex items-center justify-center shadow-inner">
                        <div className="w-3 h-3 bg-red-500 rounded-full shadow-md border-2 border-white dark:border-gray-900"></div>
                    </div>
                </div>

            </div>

            {/* Feedback Message */}
            <div className="text-center h-8">
                {isAligned && (
                    <div className="inline-block px-4 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full animate-pulse shadow-sm">
                        You are facing the Qibla
                    </div>
                )}
            </div>

            {/* Instructions / Permission Button */}
            <div className="text-center px-6 max-w-xs">
                {!permissionGranted && isIOS && (
                    <button 
                        onClick={startCompass}
                        className="bg-primary text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:bg-primary-dark transition mb-4 w-full"
                    >
                        {t('compassPermission')}
                    </button>
                )}
                
                <p className="text-xs text-gray-400 leading-relaxed max-w-[240px] mx-auto">
                    {!isIOS && !permissionGranted 
                        ? t('calibrateDesc') 
                        : isAligned 
                            ? "Perfect! Perform your Salah." 
                            : "Rotate your phone until the Kaaba icon aligns with the top indicator."
                    }
                </p>
            </div>
        </div>
    );
};

export default QiblaPage;
