
import React from 'react';

// Expected file structure in public/icons/:
// - prayer.png
// - quran.png
// - hadith.png
// - asma.png

const ICON_BASE_PATH = '/icons';

export const PrayerTimeIcon = ({ size = 60 }: { size?: number }) => (
  <img 
    src={`${ICON_BASE_PATH}/prayer-time.png`} 
    alt="Prayer Times" 
    width={size}
    height={size}
    className="object-contain select-none"
    draggable={false}
  />
);

export const QuranIcon = ({ size = 60 }: { size?: number }) => (
  <img 
    src={`${ICON_BASE_PATH}/quran.png`} 
    alt="Al-Quran" 
    width={size}
    height={size}
    className="object-contain select-none"
    draggable={false}
  />
);

export const HadithIcon = ({ size = 60 }: { size?: number }) => (
  <img 
    src={`${ICON_BASE_PATH}/hadith.png`} 
    alt="Hadith" 
    width={size}
    height={size}
    className="object-contain select-none"
    draggable={false}
  />
);

export const AsmaUlHusnaIcon = ({ size = 60 }: { size?: number }) => (
  <img 
    src={`${ICON_BASE_PATH}/asma.png`} 
    alt="Asma-ul-Husna" 
    width={size}
    height={size}
    className="object-contain select-none"
    draggable={false}
  />
);
