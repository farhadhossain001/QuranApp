import React, { useState, useEffect, useCallback } from 'react';
import { Globe, Sun, Moon, MapPin, ChevronRight, Check, Sparkles, Navigation } from 'lucide-react';
import { useAppStore } from '../context/Store';

const TOTAL_STEPS = 4; // Welcome splash + 3 setup steps

const WelcomeScreen: React.FC = () => {
    const { settings, updateSettings } = useAppStore();
    const [step, setStep] = useState(0); // 0 = splash, 1 = lang, 2 = theme, 3 = location
    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [slideDir, setSlideDir] = useState<'right' | 'left'>('right');
    const [locating, setLocating] = useState(false);
    const [locationDone, setLocationDone] = useState(false);

    useEffect(() => {
        const hasSeenWelcome = localStorage.getItem('quran_has_seen_welcome');
        if (!hasSeenWelcome) {
            setIsVisible(true);
        }
    }, []);

    const goNext = useCallback(() => {
        if (step < TOTAL_STEPS - 1) {
            setSlideDir('right');
            setStep(s => s + 1);
        } else {
            setIsExiting(true);
            setTimeout(() => {
                setIsVisible(false);
                localStorage.setItem('quran_has_seen_welcome', 'true');
            }, 600);
        }
    }, [step]);

    const goBack = useCallback(() => {
        if (step > 0) {
            setSlideDir('left');
            setStep(s => s - 1);
        }
    }, [step]);

    const handleGetLocation = () => {
        if (!("geolocation" in navigator)) {
            alert("Geolocation is not supported by your browser.");
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                updateSettings({ location: { latitude, longitude, address: "Locating..." } });
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                    const data = await res.json();
                    const city = data.address.city || data.address.town || data.address.village || data.address.state || "My Location";
                    updateSettings({ location: { latitude, longitude, address: city } });
                } catch {
                    updateSettings({ location: { latitude, longitude, address: "My Location" } });
                }
                setLocating(false);
                setLocationDone(true);
            },
            () => {
                setLocating(false);
                alert("Could not get location. Please allow location access or skip.");
            }
        );
    };

    if (!isVisible) return null;

    // Slide transition helper
    const slideClass = (targetStep: number) => {
        if (step === targetStep) return 'translate-x-0 opacity-100';
        if (step > targetStep) return '-translate-x-full opacity-0 pointer-events-none';
        return 'translate-x-full opacity-0 pointer-events-none';
    };

    return (
        <div className={`fixed inset-0 z-[200] transition-all duration-700 ease-[cubic-bezier(.4,0,.2,1)] ${isExiting ? 'opacity-0 scale-110' : 'opacity-100 scale-100'} overscroll-none`}>
            {/* Full-screen gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-[#0a1a1a] dark:via-[#0d1f1a] dark:to-[#0a1520]" />

            {/* Animated floating orbs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-br from-primary/20 to-teal-400/10 blur-[100px] -top-40 -right-40 animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-br from-cyan-400/15 to-emerald-400/10 blur-[80px] -bottom-32 -left-32 animate-pulse" style={{ animationDuration: '6s' }} />
                <div className="absolute w-[200px] h-[200px] rounded-full bg-gradient-to-br from-amber-300/10 to-orange-300/5 blur-[60px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDuration: '5s' }} />
            </div>

            {/* Geometric Pattern Overlay (Islamic inspired) */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23008080' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
            />

            {/* Content container */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center px-6">
                <div className="w-full max-w-md">

                    {/* =================== STEP 0: SPLASH =================== */}
                    <div className={`absolute inset-0 flex flex-col items-center justify-center px-8 transition-all duration-600 ease-[cubic-bezier(.4,0,.2,1)] ${slideClass(0)}`}>
                        {/* Logo with glow */}
                        <div className="relative mb-8">
                            <div className="absolute inset-0 w-32 h-32 mx-auto bg-primary/30 blur-2xl rounded-full scale-150" />
                            <div className="relative w-32 h-32 rounded-[2.5rem] bg-white/80 dark:bg-white/10 backdrop-blur-xl shadow-2xl shadow-primary/20 border border-white/50 dark:border-white/10 p-3 mx-auto overflow-hidden">
                                <img src="/logo.png" alt="NoorQuran" className="w-full h-full object-contain drop-shadow-lg" />
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 tracking-tight">
                            NoorQuran
                        </h1>
                        <p className="text-base text-gray-500 dark:text-gray-400 text-center max-w-xs leading-relaxed mb-2">
                            Your companion for reading, listening, and learning the Holy Quran
                        </p>

                        {/* Features row */}
                        <div className="flex items-center gap-6 mt-8 mb-12">
                            {[
                                { icon: '📖', label: 'Read' },
                                { icon: '🎧', label: 'Listen' },
                                { icon: '🤲', label: 'Dua' },
                                { icon: '🕌', label: 'Prayer' },
                            ].map((f, i) => (
                                <div key={i} className="flex flex-col items-center gap-1.5 opacity-80">
                                    <span className="text-2xl">{f.icon}</span>
                                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{f.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* Get Started button */}
                        <button
                            onClick={goNext}
                            className="group relative w-full max-w-xs py-4 rounded-2xl bg-gradient-to-r from-primary to-teal-500 text-white font-bold text-lg shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center justify-center gap-2">
                                Get Started
                                <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </button>
                    </div>

                    {/* =================== STEP 1: LANGUAGE =================== */}
                    <div className={`absolute inset-0 flex flex-col items-center justify-center px-6 transition-all duration-500 ease-[cubic-bezier(.4,0,.2,1)] ${slideClass(1)}`}>
                        <div className="w-full max-w-sm">
                            {/* Step icon */}
                            <div className="flex justify-center mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-teal-400/10 dark:from-primary/30 dark:to-teal-400/20 backdrop-blur-sm border border-primary/20 flex items-center justify-center">
                                    <Globe className="text-primary" size={28} />
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-1">Choose Language</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">Select your preferred app language</p>

                            <div className="space-y-3">
                                {[
                                    { code: 'en', label: 'English', sub: 'Default language' },
                                    { code: 'bn', label: 'বাংলা', sub: 'Bangla' },
                                ].map(lang => (
                                    <button
                                        key={lang.code}
                                        onClick={() => updateSettings({ appLanguage: lang.code as 'en' | 'bn' })}
                                        className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all duration-300 backdrop-blur-sm ${settings.appLanguage === lang.code
                                                ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-lg shadow-primary/10 scale-[1.02]'
                                                : 'border-gray-200/60 dark:border-gray-700/60 bg-white/50 dark:bg-white/5 hover:border-primary/40 hover:bg-primary/[0.02]'
                                            }`}
                                    >
                                        <div className="text-left">
                                            <span className={`text-lg font-bold block ${settings.appLanguage === lang.code ? 'text-primary' : 'text-gray-800 dark:text-gray-200'}`}>
                                                {lang.label}
                                            </span>
                                            <span className="text-xs text-gray-400 mt-0.5">{lang.sub}</span>
                                        </div>
                                        <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${settings.appLanguage === lang.code
                                                ? 'bg-primary border-primary text-white scale-100'
                                                : 'border-gray-300 dark:border-gray-600 scale-90'
                                            }`}>
                                            {settings.appLanguage === lang.code && <Check size={14} strokeWidth={3} />}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Nav */}
                            <div className="flex items-center justify-between mt-10">
                                <button onClick={goBack} className="text-sm font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-4 py-2">
                                    Back
                                </button>
                                <div className="flex gap-1.5">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step === i ? 'w-8 bg-primary' : step > i ? 'w-4 bg-primary/40' : 'w-1.5 bg-gray-300 dark:bg-gray-600'}`} />
                                    ))}
                                </div>
                                <button
                                    onClick={goNext}
                                    className="flex items-center gap-1.5 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
                                >
                                    Next <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* =================== STEP 2: THEME =================== */}
                    <div className={`absolute inset-0 flex flex-col items-center justify-center px-6 transition-all duration-500 ease-[cubic-bezier(.4,0,.2,1)] ${slideClass(2)}`}>
                        <div className="w-full max-w-sm">
                            <div className="flex justify-center mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-400/10 dark:from-violet-500/30 dark:to-indigo-400/20 backdrop-blur-sm border border-violet-500/20 flex items-center justify-center">
                                    {settings.theme === 'dark' ? <Moon className="text-violet-500" size={28} /> : <Sun className="text-amber-500" size={28} />}
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-1">Appearance</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">Choose your preferred reading environment</p>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Light */}
                                <button
                                    onClick={() => updateSettings({ theme: 'light' })}
                                    className={`relative flex flex-col items-center p-5 rounded-2xl border-2 transition-all duration-300 ${settings.theme === 'light'
                                            ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-400/10 shadow-lg shadow-amber-400/10 scale-[1.03]'
                                            : 'border-gray-200/60 dark:border-gray-700/60 bg-white/50 dark:bg-white/5 hover:border-amber-300/50'
                                        }`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl mb-3 flex items-center justify-center transition-all ${settings.theme === 'light' ? 'bg-gradient-to-br from-amber-100 to-orange-100 shadow-inner' : 'bg-gray-100 dark:bg-gray-800'
                                        }`}>
                                        <Sun size={24} className={settings.theme === 'light' ? 'text-amber-500' : 'text-gray-400'} />
                                    </div>
                                    <span className={`font-bold text-sm ${settings.theme === 'light' ? 'text-amber-600' : 'text-gray-600 dark:text-gray-400'}`}>Light</span>
                                    {settings.theme === 'light' && (
                                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                    )}
                                </button>

                                {/* Dark */}
                                <button
                                    onClick={() => updateSettings({ theme: 'dark' })}
                                    className={`relative flex flex-col items-center p-5 rounded-2xl border-2 transition-all duration-300 ${settings.theme === 'dark'
                                            ? 'border-violet-400 bg-violet-50/50 dark:bg-violet-400/10 shadow-lg shadow-violet-400/10 scale-[1.03]'
                                            : 'border-gray-200/60 dark:border-gray-700/60 bg-white/50 dark:bg-white/5 hover:border-violet-300/50'
                                        }`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl mb-3 flex items-center justify-center transition-all ${settings.theme === 'dark' ? 'bg-gradient-to-br from-violet-900/50 to-indigo-900/50 shadow-inner' : 'bg-gray-100 dark:bg-gray-800'
                                        }`}>
                                        <Moon size={24} className={settings.theme === 'dark' ? 'text-violet-400' : 'text-gray-400'} />
                                    </div>
                                    <span className={`font-bold text-sm ${settings.theme === 'dark' ? 'text-violet-500 dark:text-violet-400' : 'text-gray-600 dark:text-gray-400'}`}>Dark</span>
                                    {settings.theme === 'dark' && (
                                        <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-violet-500 text-white flex items-center justify-center">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                    )}
                                </button>
                            </div>

                            {/* Nav */}
                            <div className="flex items-center justify-between mt-10">
                                <button onClick={goBack} className="text-sm font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-4 py-2">
                                    Back
                                </button>
                                <div className="flex gap-1.5">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step === i ? 'w-8 bg-primary' : step > i ? 'w-4 bg-primary/40' : 'w-1.5 bg-gray-300 dark:bg-gray-600'}`} />
                                    ))}
                                </div>
                                <button
                                    onClick={goNext}
                                    className="flex items-center gap-1.5 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
                                >
                                    Next <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* =================== STEP 3: LOCATION =================== */}
                    <div className={`absolute inset-0 flex flex-col items-center justify-center px-6 transition-all duration-500 ease-[cubic-bezier(.4,0,.2,1)] ${slideClass(3)}`}>
                        <div className="w-full max-w-sm">
                            <div className="flex justify-center mb-6">
                                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-orange-400/10 dark:from-rose-500/30 dark:to-orange-400/20 backdrop-blur-sm border border-rose-500/20 flex items-center justify-center">
                                    <MapPin className="text-rose-500" size={28} />
                                    {locating && (
                                        <div className="absolute inset-0 rounded-2xl border-2 border-rose-400/50 animate-ping" />
                                    )}
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-1">Your Location</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">For accurate prayer times & Qibla direction</p>

                            <div className="bg-white/60 dark:bg-white/5 backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-gray-700/40 p-6 text-center">
                                {locationDone ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                                            <Check className="text-emerald-500" size={28} />
                                        </div>
                                        <p className="font-bold text-gray-900 dark:text-white">{settings.location?.address || 'Location set!'}</p>
                                        <p className="text-xs text-gray-400">Location saved successfully</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                                            <Navigation className="text-gray-400" size={24} />
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
                                            We use your location only to calculate prayer times and Qibla direction. Your data stays on your device.
                                        </p>
                                        <button
                                            onClick={handleGetLocation}
                                            disabled={locating}
                                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 text-white font-bold shadow-lg shadow-rose-500/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-wait"
                                        >
                                            {locating ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                                    Detecting...
                                                </span>
                                            ) : (
                                                <span className="flex items-center justify-center gap-2">
                                                    <MapPin size={18} /> Use My Location
                                                </span>
                                            )}
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Nav */}
                            <div className="flex items-center justify-between mt-10">
                                <button onClick={goBack} className="text-sm font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-4 py-2">
                                    Back
                                </button>
                                <div className="flex gap-1.5">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${step === i ? 'w-8 bg-primary' : step > i ? 'w-4 bg-primary/40' : 'w-1.5 bg-gray-300 dark:bg-gray-600'}`} />
                                    ))}
                                </div>
                                <button
                                    onClick={goNext}
                                    className="group flex items-center gap-1.5 bg-gradient-to-r from-primary to-teal-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
                                >
                                    <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
                                    Let's Go!
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
