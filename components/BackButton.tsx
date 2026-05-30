import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
    onClick: () => void;
    label?: string;
    className?: string; // Allow overriding styles if absolutely necessary
    variant?: 'default' | 'minimal' | 'sidebar';
}

export const BackButton: React.FC<BackButtonProps> = ({ 
    onClick, 
    label = 'Tillbaka', 
    className = '',
    variant = 'default' 
}) => {
    
    // Base styles for the button container
    const baseStyles = "group flex items-center gap-2 transition-all duration-300 ease-out active:scale-95";
    
    // Variants for different contexts
    const variants = {
        default: "text-brand-600 dark:text-white bg-brand-50/50 dark:bg-brand-500 border border-brand-100 dark:border-brand-400 px-4 py-2.5 rounded-2xl hover:bg-brand-100 dark:hover:bg-brand-600 hover:shadow-sm transition-all",
        minimal: "p-2.5 bg-brand-50/50 dark:bg-brand-500 border border-brand-100 dark:border-brand-400 rounded-xl text-brand-600 dark:text-white hover:bg-brand-100 dark:hover:bg-brand-600 transition-all shadow-sm",
        sidebar: "w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-300 hover:border-brand-400 hover:text-brand-500 hover:shadow-md shadow-sm"
    };

    // Text styles
    const textBase = "font-black uppercase tracking-widest";
    const textSizes = {
        default: "text-[11px]",
        minimal: "hidden", 
        sidebar: "text-[11px]"
    };

    return (
        <button 
            onClick={onClick} 
            className={`${baseStyles} ${variants[variant]} ${className}`}
            aria-label={label}
        >
            <ArrowLeft className={`w-5 h-5 transition-transform group-hover:-translate-x-1 ${variant === 'sidebar' ? 'w-[18px] h-[18px]' : ''}`} />
            {variant !== 'minimal' && (
                <span className={`${textBase} ${textSizes[variant]}`}>
                    {label}
                </span>
            )}
        </button>
    );
};
