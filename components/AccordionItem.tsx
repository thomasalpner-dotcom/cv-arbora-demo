
import React, { useState, useRef, useEffect } from 'react';
import { GripVertical, Scissors, ChevronUp, ChevronDown, MoreVertical, RotateCcw } from 'lucide-react';
import { SectionMenu } from './SectionMenus';
import { useTranslation } from '../utils/translations';

interface AccordionItemProps {
    id: string;
    title: string;
    icon: any; // Lucide icon
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
    draggable?: boolean;
    onDragStart?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
    onTitleChange?: (newTitle: string) => void;
    onDelete?: () => void;
    onClear?: () => void;
    columnSetting?: 'left' | 'right';
    onToggleColumn?: () => void;
    hasPageBreak?: boolean;
    onTogglePageBreak?: () => void;
}

export const AccordionItem: React.FC<AccordionItemProps> = ({
    id, title, icon: Icon, children, isOpen, onToggle,
    draggable, onDragStart, onDragOver, onDrop,
    onTitleChange, onDelete, onClear, columnSetting, onToggleColumn, hasPageBreak, onTogglePageBreak
}) => {
    const { t } = useTranslation();
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditingTitle && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditingTitle]);

    const handleSaveTitle = () => {
        if (inputRef.current && onTitleChange) {
            onTitleChange(inputRef.current.value);
        }
        setIsEditingTitle(false);
    };

    return (
        <div
            className={`border-b border-gray-100 dark:border-gray-700 last:border-0 relative bg-white dark:bg-gray-800 first:rounded-t-[2rem] last:rounded-b-[2rem] transition-all ${isOpen ? 'shadow-md z-10' : ''}`}
            onDragOver={onDragOver}
            onDrop={onDrop}
        >
            {hasPageBreak && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-brand-50 dark:bg-brand-900 text-brand-400 dark:text-brand-200 text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-brand-100 dark:border-border-800 z-20 flex items-center gap-2 shadow-sm">
                    <Scissors className="w-3 h-3" /> {t('page_break_active', 'Sidbrytning aktiv')}
                </div>
            )}
            <div
                className={`w-full flex items-center justify-between p-4 transition-colors group ${isOpen ? 'bg-brand-50/30 dark:bg-brand-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {draggable && (
                        <div
                            className="shrink-0 text-slate-400 dark:text-slate-500 hover:text-brand-500 dark:hover:text-brand-400 cursor-grab active:cursor-grabbing p-1.5 transition-colors bg-slate-100 dark:bg-slate-700/50 rounded-lg shadow-sm border border-slate-200/50 dark:border-slate-600/50"
                            draggable={true}
                            onDragStart={onDragStart}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <GripVertical className="w-4 h-4" />
                        </div>
                    )}
                    <div
                        className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                        onClick={onToggle}
                    >
                        <div className={`shrink-0 p-2 rounded-xl transition-all ${isOpen ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700'}`}>
                            <Icon className="w-4.5 h-4.5" />
                        </div>
                        {isEditingTitle ? (
                            <input
                                ref={inputRef}
                                defaultValue={title}
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveTitle();
                                    if (e.key === 'Escape') setIsEditingTitle(false);
                                }}
                                onBlur={handleSaveTitle}
                                className="font-black text-gray-900 dark:text-white bg-white dark:bg-gray-700 border-2 border-brand-400 rounded-xl px-3 py-1.5 focus:outline-none shadow-sm w-full max-w-[240px]"
                            />
                        ) : (
                            <div className="flex flex-col items-start min-w-0 overflow-hidden">
                                <span className={`font-black tracking-tight text-base truncate w-full ${isOpen ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {title}
                                </span>
                                <div className="flex gap-1.5 mt-0.5">
                                    {columnSetting && (
                                        <span className="text-[8px] text-brand-400 font-black uppercase tracking-widest px-1 py-0.5 bg-brand-50 dark:bg-brand-900/20 rounded-md whitespace-nowrap">
                                            {columnSetting === 'left' ? t('column_left_normal', 'Vänster') : t('column_right_normal', 'Höger')}
                                        </span>
                                    )}
                                    {hasPageBreak && <span className="text-[8px] text-amber-500 font-black uppercase tracking-widest px-1 py-0.5 bg-amber-50 dark:bg-amber-900/20 rounded-md whitespace-nowrap">{t('page_break_label', 'Sidbrytning')}</span>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {onTitleChange && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
                                className={`p-2 rounded-xl transition-all shadow-sm border ${isMenuOpen ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-450 dark:text-slate-400 border-slate-200/50 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-750'}`}
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>
                            {isMenuOpen && (
                                <SectionMenu
                                    sectionId={id}
                                    currentColumn={columnSetting || 'right'}
                                    hasPageBreak={hasPageBreak || false}
                                    onRename={() => setIsEditingTitle(true)}
                                    onToggleColumn={() => onToggleColumn && onToggleColumn()}
                                    onTogglePageBreak={() => onTogglePageBreak && onTogglePageBreak()}
                                    onClear={onClear}
                                    onDelete={onDelete}
                                    onClose={() => setIsMenuOpen(false)}
                                />
                            )}
                        </div>
                    )}
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onToggle(); }}
                        className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700 transition-all hover:bg-slate-200 dark:hover:bg-slate-700"
                    >
                        {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                </div>
            </div>
            {isOpen && (
                <div className="p-8 bg-white dark:bg-gray-800 border-t border-gray-50 dark:border-gray-700 animate-in slide-in-from-top-2 duration-300">
                    {children}
                </div>
            )}
        </div>
    );
};
