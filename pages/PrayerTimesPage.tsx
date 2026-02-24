
import React, { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '../context/Store';
import { getPrayerTimes } from '../services/api';
import { 
    Moon, Sun, CloudSun, Sunrise, Sunset, AlertTriangle
} from 'lucide-react';

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

const PrayerTimesPage = () => {
    const { t, setHeaderTitle, settings, formatNumber } = useAppStore();
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

    // Fetch data when location changes (Note: Islamic API only returns today's times)
    useEffect(() => {
        setLoading(true);
        getPrayerTimes(settings.location.latitude, settings.location.longitude)
            .then(data => {
                if(data) setApiData(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [settings.location.latitude, settings.location.longitude]);

    const formatTime12 = (time24: string) => {
        if (!time24) return '--:--';
        const [h, m] = time24.split(':').map(Number);
        let hours = h;
        const suffix = hours >= 12 ? 'PM' : 'AM'; // Always English
        hours = hours % 12 || 12;
        return `${formatNumber(hours)}:${formatNumber(m)} ${suffix}`;
    };

    // Calculate Next Prayer and Countdown
    const nextPrayerInfo = useMemo(() => {
        if (!apiData) return { name: 'Fajr', time: '00:00:00', percent: 0 };
        
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
    }, [apiData, now, formatNumber]);

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
    const prohibitedTimes = apiData.prohibited_times;
    
    // Check if currently in prohibited time
    const prohibitedStatus = isProhibitedTime(now, prohibitedTimes);
    
    // Combined prayer and prohibited times in chronological order
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
            id: 'prohibited_sunrise',
            label: t('prohibited_sunrise'),
            icon: <AlertTriangle size={20} />,
            startTime: prohibitedTimes?.sunrise?.start,
            endTime: prohibitedTimes?.sunrise?.end,
            type: 'prohibited'
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
            id: 'prohibited_noon',
            label: t('prohibited_noon'),
            icon: <AlertTriangle size={20} />,
            startTime: prohibitedTimes?.noon?.start,
            endTime: prohibitedTimes?.noon?.end,
            type: 'prohibited'
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
            id: 'prohibited_sunset',
            label: t('prohibited_sunset'),
            icon: <AlertTriangle size={20} />,
            startTime: prohibitedTimes?.sunset?.start,
            endTime: prohibitedTimes?.sunset?.end,
            type: 'prohibited'
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
            {/* Prohibited Time Warning Banner */}
            {prohibitedStatus && (
                <div className="bg-red-500 text-white px-4 py-3 rounded-xl mb-4 flex items-center justify-center gap-2 animate-pulse">
                    <AlertTriangle size={20} />
                    <span className="text-sm font-bold uppercase">
                        {t('prohibitedTime')} - {t(`prohibited_${prohibitedStatus.name}`)} ({prohibitedStatus.start} - {prohibitedStatus.end})
                    </span>
                </div>
            )}
            
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
                    <h2 className="text-lg font-medium mb-4">{t('nextPrayer')} : <span className="font-bold">{t(nextPrayerInfo.name.toLowerCase())}</span></h2>
                    
                    {/* Circular Timer */}
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

                    {/* Location */}
                    <div className="text-xs text-gray-500 font-medium mt-2">
                        {settings.location.address || `${settings.location.latitude.toFixed(2)}, ${settings.location.longitude.toFixed(2)}`}
                    </div>

                    {/* Date Display */}
                    <div className="mt-6 w-full bg-white/10 rounded-xl p-3 backdrop-blur-sm text-center">
                        <div className="text-sm font-bold">{formatNumber(dateData.readable)}</div>
                        <div className="text-xs opacity-70">{formatNumber(dateData.hijri.day)} {dateData.hijri.month.en} {formatNumber(dateData.hijri.year)}</div>
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
                        // Skip prohibited times if data is not available
                        if (row.type === 'prohibited' && !row.startTime) return null;
                        
                        // Highlight current prayer
                        const isNext = nextPrayerInfo.name.toLowerCase() === row.id.toLowerCase();
                        
                        // Check if this is a prohibited time and currently active
                        const isProhibitedActive = row.type === 'prohibited' && prohibitedStatus?.name === row.id.replace('prohibited_', '');
                        
                        // Determine background color based on type
                        let bgColor = 'bg-white dark:bg-surface-dark';
                        let borderColor = 'border-gray-100 dark:border-gray-800';
                        let textColor = 'text-gray-900 dark:text-white';
                        let iconBg = 'bg-gray-50 dark:bg-gray-800';
                        let iconColor = 'text-primary dark:text-primary-dark';
                        let timeColor = 'text-gray-700 dark:text-gray-300';
                        
                        if (isNext) {
                            bgColor = 'bg-primary/10 dark:bg-primary/20';
                            borderColor = 'border-l-4 border-primary';
                        }
                        
                        if (row.type === 'prohibited') {
                            bgColor = isProhibitedActive ? 'bg-red-100 dark:bg-red-900/30' : 'bg-red-50 dark:bg-red-900/10';
                            borderColor = isProhibitedActive ? 'border-red-500' : 'border-red-200 dark:border-red-800';
                            textColor = isProhibitedActive ? 'text-red-600 dark:text-red-400' : 'text-red-500 dark:text-red-400';
                            iconBg = isProhibitedActive ? 'bg-red-200 dark:bg-red-800' : 'bg-red-100 dark:bg-red-900/30';
                            iconColor = 'text-red-500';
                            timeColor = isProhibitedActive ? 'text-red-600 dark:text-red-300' : 'text-red-500 dark:text-red-400';
                        }

                        return (
                            <div 
                                key={index}
                                className={`
                                    flex items-center justify-between p-4 rounded-xl shadow-sm border
                                    ${bgColor} ${borderColor}
                                    ${!isNext && row.type !== 'prohibited' ? 'hover:border-primary/50' : ''}
                                    transition-all
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${iconBg} ${iconColor}`}>
                                        {row.icon}
                                    </div>
                                    <span className={`font-semibold ${textColor}`}>
                                        {row.label}
                                    </span>
                                </div>
                                <div className={`text-right font-mono font-medium text-sm ${timeColor}`}>
                                    {row.endTime ? (
                                        <>
                                            {formatTime12(row.startTime?.split(' ')[0] || '')} - {formatTime12(row.endTime?.split(' ')[0] || '')}
                                        </>
                                    ) : (
                                        formatTime12(row.startTime?.split(' ')[0] || '')
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
