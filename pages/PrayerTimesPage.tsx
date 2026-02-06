import React, { useEffect } from 'react';
import PrayerTimesWidget from '../components/PrayerTimesWidget';
import { useAppStore } from '../context/Store';

const PrayerTimesPage = () => {
    const { t, setHeaderTitle } = useAppStore();

    useEffect(() => {
        setHeaderTitle(t('prayerTimes'));
    }, [t, setHeaderTitle]);

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <PrayerTimesWidget />
            
            <div className="bg-white dark:bg-surface-dark p-6 rounded-2xl border border-gray-200 dark:border-gray-800 text-center text-gray-500">
                <p className="text-sm">
                   Calculations are based on the ISNA method. You can adjust location settings in the Settings page.
                </p>
            </div>
        </div>
    );
};

export default PrayerTimesPage;