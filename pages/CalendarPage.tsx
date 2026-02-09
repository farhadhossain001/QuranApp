
import React, { useState, useEffect } from 'react';
import { useAppStore } from '../context/Store';
import { getCalendar } from '../services/api';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin } from 'lucide-react';

const CalendarPage = () => {
    const { t, setHeaderTitle, formatNumber, settings } = useAppStore();
    const [viewDate, setViewDate] = useState(new Date()); // The month being viewed
    const [selectedDate, setSelectedDate] = useState(new Date()); // The specific day selected
    const [calendarData, setCalendarData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNamesEn = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    useEffect(() => {
        setHeaderTitle(t('calendar'));
    }, [t, setHeaderTitle]);

    useEffect(() => {
        setLoading(true);
        // API uses month index 1-12
        const month = viewDate.getMonth() + 1;
        const year = viewDate.getFullYear();

        getCalendar(month, year)
            .then(data => {
                setCalendarData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [viewDate]);

    const handlePrevMonth = () => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() - 1);
        setViewDate(newDate);
    };

    const handleNextMonth = () => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + 1);
        setViewDate(newDate);
    };

    // Calculate Grid Padding
    let startDayIndex = 0;
    if (calendarData.length > 0) {
        // Aladhan returns weekday.en like "Sunday"
        const firstDayName = calendarData[0].gregorian.weekday.en;
        const map: Record<string, number> = { 
            "Sunday": 0, "Monday": 1, "Tuesday": 2, "Wednesday": 3, 
            "Thursday": 4, "Friday": 5, "Saturday": 6 
        };
        startDayIndex = map[firstDayName] || 0;
    }

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getFullYear() === d2.getFullYear();
    };

    const handleDayClick = (dayData: any) => {
        const d = dayData.gregorian;
        // Parse date from API string DD-MM-YYYY to avoid timezone issues
        const [day, month, year] = d.date.split('-').map(Number);
        const newDate = new Date(year, month - 1, day);
        setSelectedDate(newDate);
    };

    const getMonthName = (date: Date) => {
        return date.toLocaleString(settings.appLanguage === 'bn' ? 'bn-BD' : 'en-US', { month: 'long', year: 'numeric' });
    };

    // Filter events for the month
    const monthlyEvents = calendarData.filter(d => d.hijri.holidays && d.hijri.holidays.length > 0);

    // Get Hijri Month Name for current view
    const currentHijriMonth = calendarData.length > 0 
        ? calendarData[Math.floor(calendarData.length/2)].hijri.month.en 
        : '';

    return (
        <div className="pb-24 space-y-6 max-w-md mx-auto">
            
            {/* Calendar Card */}
            <div className="bg-white dark:bg-surface-dark rounded-[2rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden relative">
                
                {/* Header */}
                <div className="p-6 flex items-center justify-between relative z-10">
                    <button 
                        onClick={handlePrevMonth} 
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    
                    <div className="text-center">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                            {getMonthName(viewDate)}
                        </h2>
                        {!loading && (
                            <p className="text-xs text-primary dark:text-primary-dark font-medium mt-1 opacity-80">
                                {currentHijriMonth}
                            </p>
                        )}
                    </div>

                    <button 
                        onClick={handleNextMonth} 
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>

                {/* Weekdays */}
                <div className="grid grid-cols-7 mb-2 px-4">
                    {weekDays.map((day, i) => (
                        <div key={i} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 px-4 pb-4 gap-y-2">
                    {loading ? (
                        [...Array(35)].map((_, i) => (
                            <div key={i} className="h-14 flex items-center justify-center">
                                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse" />
                            </div>
                        ))
                    ) : (
                        <>
                            {/* Empty Slots */}
                            {[...Array(startDayIndex)].map((_, i) => (
                                <div key={`empty-${i}`} />
                            ))}

                            {/* Date Slots */}
                            {calendarData.map((day, i) => {
                                const [d, m, y] = day.gregorian.date.split('-').map(Number);
                                const currentDayDate = new Date(y, m - 1, d);
                                const isSelected = isSameDay(currentDayDate, selectedDate);
                                const isToday = isSameDay(currentDayDate, new Date());
                                const hasHolidays = day.hijri.holidays.length > 0;
                                
                                return (
                                    <button 
                                        key={i}
                                        onClick={() => handleDayClick(day)}
                                        className={`
                                            h-14 w-full rounded-2xl flex flex-col items-center justify-center relative transition-all duration-300 group
                                            ${isSelected 
                                                ? 'bg-primary text-white shadow-lg shadow-primary/30 transform scale-105 z-10' 
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                            }
                                        `}
                                    >
                                        <span className={`font-bold text-lg leading-none mb-0.5 ${isToday && !isSelected ? 'text-primary dark:text-primary-dark' : ''}`}>
                                            {formatNumber(parseInt(day.gregorian.day))}
                                        </span>
                                        <span className={`text-[9px] font-medium ${isSelected ? 'text-white/80' : 'text-gray-400 group-hover:text-gray-500'}`}>
                                            {formatNumber(parseInt(day.hijri.day))}
                                        </span>
                                        
                                        {/* Holiday Dot */}
                                        {hasHolidays && (
                                            <div className={`w-1 h-1 rounded-full absolute bottom-1.5 ${isSelected ? 'bg-white' : 'bg-secondary'}`} />
                                        )}
                                    </button>
                                );
                            })}
                        </>
                    )}
                </div>

                {/* Legend Footer */}
                <div className="px-6 pb-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-center gap-8 opacity-60">
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-xl font-bold text-gray-900 dark:text-white leading-none">{formatNumber(23)}</span>
                            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Gregorian</span>
                        </div>
                        <div className="w-px h-8 bg-gray-200 dark:bg-gray-700"></div>
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 leading-none">{formatNumber(14)}</span>
                            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Hijri</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Events List Section */}
            <div className="bg-white dark:bg-surface-dark rounded-[2rem] shadow-xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 p-6 animate-fade-in">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6 flex justify-between items-center">
                    <span>Events in {monthNamesEn[viewDate.getMonth()]}</span>
                    {monthlyEvents.length > 0 && <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">{monthlyEvents.length}</span>}
                </h3>
                
                {monthlyEvents.length > 0 ? (
                    <div className="space-y-4">
                        {monthlyEvents.map((day, i) => {
                            const [d, m, y] = day.gregorian.date.split('-').map(Number);
                            const eventDate = new Date(y, m - 1, d);
                            const isSelected = isSameDay(eventDate, selectedDate);

                            return (
                                <div 
                                    key={i} 
                                    onClick={() => {
                                        setSelectedDate(eventDate);
                                        // Scroll to top or handle interaction if needed
                                    }}
                                    className={`flex items-start gap-4 p-3 rounded-2xl transition cursor-pointer border ${isSelected ? 'bg-primary/5 border-primary/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-transparent'}`}
                                >
                                    {/* Date Badge */}
                                    <div className={`
                                        rounded-2xl p-3 text-center min-w-[70px] flex flex-col justify-center
                                        ${isSelected 
                                            ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}
                                    `}>
                                        <span className="block text-xl font-bold leading-none mb-1">
                                            {formatNumber(parseInt(day.gregorian.day))}
                                        </span>
                                        <span className={`block text-[9px] font-bold uppercase ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>
                                            {day.gregorian.weekday.en.substring(0, 3)}
                                        </span>
                                    </div>

                                    {/* Event Info */}
                                    <div className="flex-1 py-1">
                                        <h4 className="font-bold text-gray-900 dark:text-white leading-tight mb-1 text-sm">
                                            {day.hijri.holidays.join(', ')}
                                        </h4>
                                        <p className="text-xs text-primary dark:text-primary-dark font-medium mt-1">
                                            {formatNumber(parseInt(day.hijri.day))} {day.hijri.month.en} {formatNumber(parseInt(day.hijri.year))} AH
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-400 flex flex-col items-center">
                        <CalendarIcon size={32} className="mb-2 opacity-20" />
                        <p className="text-sm">No Islamic holidays this month</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CalendarPage;
