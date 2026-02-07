
import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../context/Store';
import { getPrayerTimes } from '../services/api';
import { MapPin, Calendar, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

const PrayerTimesWidget = () => {
    const { settings, t, formatNumber } = useAppStore();
    const [apiData, setApiData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

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
    
    // Determine current prayer (the one before next)
    const currentPrayerIndex = nextIndex === 0 ? 4 : nextIndex - 1; 
    const currentPrayerName = PRAYER_NAMES[currentPrayerIndex] || 'Isha'; // Safety fallback

    return (
        <div className="rounded-2xl shadow-lg mb-6 overflow-hidden flex flex-col font-sans bg-white dark:bg-surface-dark">
            
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
                    <Link to="/settings" className="text-[10px] text-primary dark:text-primary-dark flex items-center gap-1 hover:underline">
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
            </div>
        </div>
    );
}

export default PrayerTimesWidget;
