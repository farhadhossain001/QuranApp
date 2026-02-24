
import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../context/Store';
import { getPrayerTimes } from '../services/api';
import { MapPin, Calendar, Clock, ArrowRight, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// Helper to check if current time is within a prohibited period
const isProhibitedTime = (currentTime: Date, prohibitedTimes: any): { isProhibited: boolean; name: string; start: string; end: string } | null => {
    if (!prohibitedTimes) return null;
    
    const currentHours = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTotalMinutes = currentHours * 60 + currentMinutes;
    
    const checkPeriod = (name: string, period: { start: string; end: string }) => {
        if (!period || !period.start || !period.end) return false;
        const [startH, startM] = period.start.split(':').map(Number);
        const [endH, endM] = period.end.split(':').map(Number);
        const startTotal = startH * 60 + startM;
        const endTotal = endH * 60 + endM;
        
        return currentTotalMinutes >= startTotal && currentTotalMinutes <= endTotal;
    };
    
    if (prohibitedTimes.sunrise && checkPeriod('sunrise', prohibitedTimes.sunrise)) {
        return { isProhibited: true, name: 'sunrise', ...prohibitedTimes.sunrise };
    }
    if (prohibitedTimes.noon && checkPeriod('noon', prohibitedTimes.noon)) {
        return { isProhibited: true, name: 'noon', ...prohibitedTimes.noon };
    }
    if (prohibitedTimes.sunset && checkPeriod('sunset', prohibitedTimes.sunset)) {
        return { isProhibited: true, name: 'sunset', ...prohibitedTimes.sunset };
    }
    
    return null;
};

const PrayerTimesWidget = () => {
    const { settings, t, formatNumber } = useAppStore();
    const navigate = useNavigate();
    const [apiData, setApiData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showProhibited, setShowProhibited] = useState(false);

    // Fetch Data
    useEffect(() => {
        setLoading(true);
        getPrayerTimes(settings.location.latitude, settings.location.longitude)
            .then(data => {
                if(data) {
                    setApiData(data);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [settings.location.latitude, settings.location.longitude]);

    // Timer Logic
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Calculate Next Prayer & Countdown Synchronously
    const { nextIndex, timeRemaining } = useMemo(() => {
        if (!apiData || !apiData.timings) return { nextIndex: 0, timeRemaining: '00:00:00' };

        const timings = apiData.timings;
        const now = currentTime;
        
        let nextIdx = -1;
        let targetTime = new Date(now);
        let found = false;

        for (let i = 0; i < PRAYER_NAMES.length; i++) {
            const prayer = PRAYER_NAMES[i];
            const timeStr = timings[prayer].split(' ')[0]; // remove (EST) etc if present
            const [hours, minutes] = timeStr.split(':').map(Number);
            
            const pTime = new Date(now);
            pTime.setHours(hours, minutes, 0, 0);

            if (pTime > now) {
                nextIdx = i;
                targetTime = pTime;
                found = true;
                break;
            }
        }

        // If after Isha, next is Fajr tomorrow
        if (!found) {
            nextIdx = 0; // Fajr
            const timeStr = timings['Fajr'].split(' ')[0];
            const [hours, minutes] = timeStr.split(':').map(Number);
            targetTime = new Date(now);
            targetTime.setDate(targetTime.getDate() + 1);
            targetTime.setHours(hours, minutes, 0, 0);
        }

        // Calculate Diff
        const diff = targetTime.getTime() - now.getTime();
        let remaining = "00:00:00";
        
        if (diff > 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            remaining = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        return { nextIndex: nextIdx, timeRemaining: remaining };
    }, [apiData, currentTime]);

    // Format time parts
    const formatTimeParts = (time24: string) => {
        if (!time24) return { time: '--:--', ampm: '' };
        const [h, m] = time24.split(':');
        let hours = parseInt(h, 10);
        const suffix = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return {
            time: `${formatNumber(hours)}:${formatNumber(m)}`,
            ampm: suffix
        };
    };

    if(loading) return <div className="animate-pulse h-64 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-6"></div>;
    if(!apiData) return null;

    const timings = apiData.timings;
    const dateData = apiData.date;
    const hijri = dateData.hijri;
    const prohibitedTimes = apiData.prohibited_times;
    
    // Check if currently in prohibited time
    const prohibitedStatus = isProhibitedTime(currentTime, prohibitedTimes);
    
    // Determine current prayer (the one before next)
    const currentPrayerIndex = nextIndex === 0 ? 4 : nextIndex - 1; 
    const currentPrayerName = PRAYER_NAMES[currentPrayerIndex] || 'Isha'; // Safety fallback

    return (
        <div 
            onClick={() => navigate('/prayer-times')}
            className="rounded-2xl shadow-lg mb-6 overflow-hidden flex flex-col font-sans bg-white dark:bg-surface-dark cursor-pointer hover:shadow-xl transition-shadow duration-300"
        >
            
            {/* Prohibited Time Warning Banner */}
            {prohibitedStatus && (
                <div className="bg-red-500 text-white px-4 py-2 flex items-center justify-center gap-2 animate-pulse">
                    <AlertTriangle size={16} />
                    <span className="text-xs font-bold uppercase">
                        {t('prohibitedTime')} - {t(`prohibited_${prohibitedStatus.name}`)} ({prohibitedStatus.start} - {prohibitedStatus.end})
                    </span>
                </div>
            )}
            
            {/* TOP SECTION: Hero / Countdown */}
            <div className="bg-primary dark:bg-primary-dark text-white p-5 relative overflow-hidden">
                {/* Decoration Circles */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-secondary opacity-20 rounded-full blur-xl pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                            <h2 className="text-xs font-medium opacity-90 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <Clock size={14} />
                                {t('currentPrayer')}
                            </h2>
                            <h1 className="text-2xl font-bold">{t(currentPrayerName.toLowerCase())}</h1>
                        </div>
                        <div className="text-right">
                             <div className="text-[10px] opacity-80 mb-1">{t('timeLeft')}</div>
                             <div className="text-2xl font-mono font-bold tracking-tight tabular-nums">
                                 {formatNumber(timeRemaining)}
                             </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-3 border-t border-white/20 mt-2">
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="opacity-80" />
                            <span>{formatNumber(dateData.readable)}</span>
                        </div>
                        <div className="font-medium">
                            {formatNumber(hijri.day)} {t(`hijri_${hijri.month.number}`)} {formatNumber(hijri.year)}
                        </div>
                    </div>
                </div>
            </div>

            {/* BOTTOM SECTION: Prayer List */}
            <div className="p-3">
                <div className="flex justify-between items-center mb-3 px-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('prayerTimes')}</span>
                    <Link 
                        to="/settings" 
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-primary dark:text-primary-dark flex items-center gap-1 hover:underline"
                    >
                        <MapPin size={10} />
                        <span className="max-w-[100px] truncate">{settings.location.address || 'Location'}</span>
                        <ArrowRight size={10} />
                    </Link>
                </div>

                {/* Grid Layout - Forced 5 columns row */}
                <div className="grid grid-cols-5 gap-1 sm:gap-2 text-center">
                    {PRAYER_NAMES.map((prayer, index) => {
                        const isCurrent = index === currentPrayerIndex;
                        const { time, ampm } = formatTimeParts(timings[prayer].split(' ')[0]);
                        
                        return (
                            <div 
                                key={prayer} 
                                className={`
                                    flex flex-col items-center justify-center py-2 sm:py-3 rounded-lg transition-all duration-300
                                    ${isCurrent 
                                        ? 'bg-primary dark:bg-primary-dark text-white shadow-md scale-105 transform z-10' 
                                        : 'bg-transparent text-gray-500 dark:text-gray-400'
                                    }
                                `}
                            >
                                <span className={`text-[9px] sm:text-[10px] uppercase font-bold mb-0.5 ${isCurrent ? 'text-white/90' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {t(prayer.toLowerCase())}
                                </span>
                                <div className="flex flex-col items-center leading-none">
                                    <span className={`font-bold text-xs sm:text-sm whitespace-nowrap ${isCurrent ? 'text-white' : 'text-gray-900 dark:text-gray-200'}`}>
                                        {time}
                                    </span>
                                    <span className={`text-[8px] sm:text-[9px] font-medium mt-0.5 ${isCurrent ? 'text-white/80' : 'text-gray-400'}`}>
                                        {ampm}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
                
                {/* Prohibited Times Section */}
                {prohibitedTimes && (
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowProhibited(!showProhibited);
                            }}
                            className="w-full flex items-center justify-between text-[10px] font-bold text-red-500 uppercase tracking-widest mb-2 hover:text-red-600 transition-colors"
                        >
                            <div className="flex items-center gap-1">
                                <AlertTriangle size={10} />
                                {t('prohibitedTimes')}
                            </div>
                            {showProhibited ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        
                        {showProhibited && (
                            <div className="grid grid-cols-3 gap-2 text-center animate-in fade-in duration-200">
                                {/* Sunrise Prohibited */}
                                <div className={`p-2 rounded-lg text-xs ${prohibitedStatus?.name === 'sunrise' ? 'bg-red-100 dark:bg-red-900/30 border border-red-500' : 'bg-red-50 dark:bg-red-900/10'}`}>
                                    <div className={`font-bold ${prohibitedStatus?.name === 'sunrise' ? 'text-red-600 dark:text-red-400' : 'text-red-500 dark:text-red-400'}`}>
                                        {t('prohibited_sunrise')}
                                    </div>
                                    <div className={`text-[10px] ${prohibitedStatus?.name === 'sunrise' ? 'text-red-500 dark:text-red-300' : 'text-red-400 dark:text-red-500'}`}>
                                        {prohibitedTimes.sunrise?.start} - {prohibitedTimes.sunrise?.end}
                                    </div>
                                </div>
                                {/* Noon Prohibited */}
                                <div className={`p-2 rounded-lg text-xs ${prohibitedStatus?.name === 'noon' ? 'bg-red-100 dark:bg-red-900/30 border border-red-500' : 'bg-red-50 dark:bg-red-900/10'}`}>
                                    <div className={`font-bold ${prohibitedStatus?.name === 'noon' ? 'text-red-600 dark:text-red-400' : 'text-red-500 dark:text-red-400'}`}>
                                        {t('prohibited_noon')}
                                    </div>
                                    <div className={`text-[10px] ${prohibitedStatus?.name === 'noon' ? 'text-red-500 dark:text-red-300' : 'text-red-400 dark:text-red-500'}`}>
                                        {prohibitedTimes.noon?.start} - {prohibitedTimes.noon?.end}
                                    </div>
                                </div>
                                {/* Sunset Prohibited */}
                                <div className={`p-2 rounded-lg text-xs ${prohibitedStatus?.name === 'sunset' ? 'bg-red-100 dark:bg-red-900/30 border border-red-500' : 'bg-red-50 dark:bg-red-900/10'}`}>
                                    <div className={`font-bold ${prohibitedStatus?.name === 'sunset' ? 'text-red-600 dark:text-red-400' : 'text-red-500 dark:text-red-400'}`}>
                                        {t('prohibited_sunset')}
                                    </div>
                                    <div className={`text-[10px] ${prohibitedStatus?.name === 'sunset' ? 'text-red-500 dark:text-red-300' : 'text-red-400 dark:text-red-500'}`}>
                                        {prohibitedTimes.sunset?.start} - {prohibitedTimes.sunset?.end}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default PrayerTimesWidget;
