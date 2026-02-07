
import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
}

export const PrayerTimeIcon = ({ size = 60, className = "" }: IconProps) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`text-primary dark:text-primary-dark ${className}`}
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" className="opacity-80"/>
    <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16.5 5.5C17.5 6.5 19.5 7.5 19.5 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-secondary"/>
  </svg>
);

export const QuranIcon = ({ size = 60, className = "" }: IconProps) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`text-primary dark:text-primary-dark ${className}`}
  >
    <path d="M2 6C2 5.44772 2.44772 5 3 5H10C11.6569 5 13 6.34315 13 8V19C13 17.3431 11.6569 16 10 16H3C2.44772 16 2 15.5523 2 15V6Z" stroke="currentColor" strokeWidth="1.5" className="fill-primary/5 dark:fill-primary-dark/10"/>
    <path d="M13 8C13 6.34315 14.3431 5 16 5H21C21.5523 5 22 5.44772 22 6V15C22 15.5523 21.5523 16 21 16H16C14.3431 16 13 17.3431 13 19V8Z" stroke="currentColor" strokeWidth="1.5" className="fill-primary/5 dark:fill-primary-dark/10"/>
    <path d="M6 9H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-secondary opacity-70"/>
    <path d="M6 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-secondary opacity-70"/>
    <path d="M17 9H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-secondary opacity-70"/>
    <path d="M17 12H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-secondary opacity-70"/>
  </svg>
);

export const HadithIcon = ({ size = 60, className = "" }: IconProps) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`text-primary dark:text-primary-dark ${className}`}
  >
    <path d="M15 3H7C5.89543 3 5 3.89543 5 5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7L15 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="fill-primary/5 dark:fill-primary-dark/10"/>
    <path d="M14 3V7H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9 11H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-secondary"/>
    <path d="M9 15H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-secondary"/>
  </svg>
);

export const AsmaUlHusnaIcon = ({ size = 60, className = "" }: IconProps) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={`text-primary dark:text-primary-dark ${className}`}
  >
    <rect x="5.5" y="5.5" width="13" height="13" transform="rotate(45 12 12)" stroke="currentColor" strokeWidth="1.5" className="opacity-80"/>
    <rect x="5.5" y="5.5" width="13" height="13" stroke="currentColor" strokeWidth="1.5" className="opacity-80"/>
    <circle cx="12" cy="12" r="2.5" className="fill-secondary"/>
  </svg>
);
