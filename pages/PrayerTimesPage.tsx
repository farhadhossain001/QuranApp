
import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../context/Store';
import { getPrayerTimes } from '../services/api';
import { 
    ChevronLeft, ChevronRight, Moon, Sun, CloudSun, Sunrise, Sunset
} from 'lucide-react';

const PrayerTimesPage = () => {
    const { t, setHeaderTitle, settings, formatNumber } = useAppStore();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [apiData, setApiData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Timer state for countdown
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        setHeaderTitle(t('prayerTimes'));
    }, [t, setHeaderTitle]);

    // Update timer every second
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Check if viewing today
    const isToday = useMemo(() => {
        return currentDate.getDate() === now.getDate() &&
               currentDate.getMonth() === now.getMonth() &&
               currentDate.getFullYear() === now.getFullYear();
    }, [currentDate, now]);

    // Fetch data when currentDate or location changes
    useEffect(() => {
        setLoading(true);
        // Ensure we pass the date object correctly
        getPrayerTimes(settings.location.latitude, settings.location.longitude, currentDate)
            .then(data => {
                if(data) setApiData(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [currentDate, settings.location.latitude, settings.location.longitude]);

    const handlePrevDay = () => {
        const prev = new Date(currentDate);
        prev.setDate(prev.getDate() - 1);
        setCurrentDate(prev);
    };

    const handleNextDay = () => {
        const next = new Date(currentDate);
        next.setDate(next.getDate() + 1);
        setCurrentDate(next);
    };

    const formatTime12 = (time24: string) => {
        if (!time24) return '--:--';
        const [h, m] = time24.split(':').map(Number);
        let hours = h;
        const suffix = hours >= 12 ? 'PM' : 'AM'; // Always English
        hours = hours % 12 || 12;
        return `${formatNumber(hours)}:${formatNumber(m)} ${suffix}`;
    };

    // Calculate Next Prayer and Countdown (Only relevant if isToday)
    const nextPrayerInfo = useMemo(() => {
        if (!apiData || !isToday) return { name: 'Fajr', time: '00:00:00', percent: 0 };
        
        const timings = apiData.timings;
        const currentTime = now; 
        
        let nextName = '';
        let targetTime = new Date(currentTime);
        let found = false;

        const prayersToCheck = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

        for (const p of prayersToCheck) {
             const tStr = timings[p].split(' ')[0];
             const [h, m] = tStr.split(':').map(Number);
             const pTime = new Date(currentTime);
             pTime.setHours(h, m, 0, 0);

             if (pTime > currentTime) {
                 nextName = p;
                 targetTime = pTime;
                 found = true;
                 break;
             }
        }

        if (!found) {
             nextName = 'Fajr';
             // For countdown to tomorrow's Fajr, we ideally need tomorrow's time
             // But for simplicity/continuity we use today's Fajr time + 1 day
             // Or better, just 0 percent to indicate cycle reset
             const tStr = timings['Fajr'].split(' ')[0];
             const [h, m] = tStr.split(':').map(Number);
             targetTime = new Date(currentTime);
             targetTime.setDate(targetTime.getDate() + 1);
             targetTime.setHours(h, m, 0, 0);
        }

        const diff = targetTime.getTime() - currentTime.getTime();
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        const timeStr = `${formatNumber(hours.toString().padStart(2, '0'))}:${formatNumber(minutes.toString().padStart(2, '0'))}:${formatNumber(seconds.toString().padStart(2, '0'))}`;

        const totalMs = 6 * 60 * 60 * 1000; 
        const percent = Math.max(0, Math.min(100, (diff / totalMs) * 100));

        return { name: nextName, time: timeStr, percent };
    }, [apiData, now, isToday, formatNumber]);

    if (loading || !apiData) {
        return (
            <div className="max-w-md mx-auto p-4 space-y-6">
                <div className="h-64 bg-gray-800 rounded-3xl animate-pulse"></div>
                <div className="space-y-3">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    const timings = apiData.timings;
    const dateData = apiData.date;
    
    // Only API supported prayers
    const rows = [
        {
            id: 'fajr',
            label: t('fajr'),
            icon: <CloudSun size={20} />,
            startTime: timings.Fajr,
            endTime: timings.Sunrise,
            type: 'prayer'
        },
        {
            id: 'sunrise',
            label: t('sunrise'),
            icon: <Sunrise size={20} />,
            startTime: timings.Sunrise,
            endTime: null,
            type: 'event'
        },
        {
            id: 'dhuhr',
            label: t('dhuhr'),
            icon: <Sun size={20} />,
            startTime: timings.Dhuhr,
            endTime: timings.Asr,
            type: 'prayer'
        },
        {
            id: 'asr',
            label: t('asr_hanafi'),
            icon: <CloudSun size={20} />,
            startTime: timings.Asr,
            endTime: timings.Maghrib,
            type: 'prayer'
        },
        {
            id: 'maghrib',
            label: t('maghrib'),
            icon: <Sunset size={20} />,
            startTime: timings.Maghrib,
            endTime: timings.Isha,
            type: 'prayer'
        },
        {
            id: 'isha',
            label: t('isha'),
            icon: <Moon size={20} />,
            startTime: timings.Isha,
            endTime: timings.Fajr,
            type: 'prayer'
        }
    ];

    return (
        <div className="max-w-md mx-auto pb-10">
            {/* Header Section */}
            <div className="bg-[#1A1F2C] text-white rounded-3xl p-6 shadow-xl mb-6 relative overflow-hidden transition-all duration-300">
                {/* Background Art */}
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                     <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black to-transparent"></div>
                     <svg className="absolute bottom-0 w-full text-white" viewBox="0 0 1440 320" preserveAspectRatio="none">
                         <path fill="currentColor" d="M0,288L48,272C96,256,192,224,288,197.3C384,171,480,149,576,165.3C672,181,768,235,864,250.7C960,267,1056,245,1152,224C1248,203,1344,181,1392,170.7L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
                     </svg>
                </div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    
                    {isToday ? (
                        <>
                            <h2 className="text-lg font-medium mb-4">{t('nextPrayer')} : <span className="font-bold">{t(nextPrayerInfo.name.toLowerCase())}</span></h2>
                            
                            {/* Circular Timer - Added viewBox to fix clipping */}
                            <div className="relative w-40 h-40 mb-6 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-gray-700" />
                                    <circle 
                                        cx="80" cy="80" r="70" 
                                        stroke="white" strokeWidth="6" fill="transparent" 
                                        strokeDasharray={440} 
                                        strokeDashoffset={440 * (nextPrayerInfo.percent / 100)}
                                        strokeLinecap="round"
                                        className="transition-all duration-1000 ease-linear"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className="text-xs uppercase opacity-70 mb-1">{t('timeLeft')}</span>
                                    <span className="text-2xl font-mono font-bold">{nextPrayerInfo.time}</span>
                                    <span className="text-xs uppercase opacity-70 mt-1">{t('wakib')}</span>
                                </div>
                            </div>
                            
                            {/* Rakat Info */}
                            <p className="text-xs text-gray-400 mb-2 max-w-[80%]">
                                {t(nextPrayerInfo.name.toLowerCase())} - {t(`rakats_${nextPrayerInfo.name.toLowerCase()}`)}
                            </p>
                        </>
                    ) : (
                        <div className="py-6">
                            <h2 className="text-3xl font-bold mb-2">{formatNumber(dateData.readable)}</h2>
                            <p className="text-lg opacity-80">{formatNumber(dateData.hijri.day)} {dateData.hijri.month.en} {formatNumber(dateData.hijri.year)}</p>
                        </div>
                    )}

                    {/* Location */}
                    <div className="text-xs text-gray-500 font-medium mt-2">
                        {settings.location.address || `${settings.location.latitude.toFixed(2)}, ${settings.location.longitude.toFixed(2)}`}
                    </div>

                    {/* Date Navigation */}
                    <div className="mt-6 flex items-center justify-between w-full bg-white/10 rounded-xl p-2 backdrop-blur-sm">
                         <button onClick={handlePrevDay} className="p-2 hover:bg-white/10 rounded-lg transition">
                             <ChevronLeft size={20} />
                         </button>
                         <div className="text-center">
                             {isToday ? (
                                 <>
                                     <div className="text-sm font-bold">{formatNumber(dateData.readable)}</div>
                                     <div className="text-xs opacity-70">{formatNumber(dateData.hijri.day)} {dateData.hijri.month.en} {formatNumber(dateData.hijri.year)}</div>
                                 </>
                             ) : (
                                 <span className="text-sm font-bold">{t('prayerTimes')}</span>
                             )}
                         </div>
                         <button onClick={handleNextDay} className="p-2 hover:bg-white/10 rounded-lg transition">
                             <ChevronRight size={20} />
                         </button>
                    </div>
                </div>
            </div>

            {/* Prayer List */}
            <div>
                <div className="flex justify-between px-4 mb-3 text-sm font-bold text-gray-500 uppercase tracking-wide">
                    <span>{t('prayer')}</span>
                    <span>{t('wakt_times')}</span>
                </div>

                <div className="space-y-3">
                    {rows.map((row, index) => {
                        // Highlight current prayer only if it is Today
                        const isNext = isToday && nextPrayerInfo.name.toLowerCase() === row.id.toLowerCase();
                        
                        let bgColor = 'bg-white dark:bg-surface-dark';
                        if (isNext) bgColor = 'bg-primary/10 dark:bg-primary/20 border-l-4 border-primary';

                        return (
                            <div 
                                key={index}
                                className={`
                                    flex items-center justify-between p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800
                                    ${bgColor}
                                    ${!isNext ? 'hover:border-primary/50' : ''}
                                    transition-all
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${isNext ? 'text-primary dark:text-primary-dark bg-white dark:bg-surface-dark' : 'text-primary dark:text-primary-dark bg-gray-50 dark:bg-gray-800'}`}>
                                        {row.icon}
                                    </div>
                                    <span className="font-semibold text-gray-900 dark:text-white">
                                        {row.label}
                                    </span>
                                </div>
                                <div className="text-right font-mono font-medium text-sm text-gray-700 dark:text-gray-300">
                                    {row.endTime ? (
                                        <>
                                            {formatTime12(row.startTime.split(' ')[0])} - {formatTime12(row.endTime.split(' ')[0])}
                                        </>
                                    ) : (
                                        formatTime12(row.startTime.split(' ')[0])
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    );
};

export default PrayerTimesPage;
