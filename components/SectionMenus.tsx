import React, { useEffect } from 'react';
import { Edit2, Scissors, Trash2, Columns, Check, Briefcase, GraduationCap, Award, Star, Phone, BookOpen, RotateCcw, User, Globe, ArrowUp, ArrowDown } from 'lucide-react';
import { ResumeData } from '../types';
import { useTranslation } from '../utils/translations';

interface SectionMenuProps {
    sectionId: string;
    currentColumn: 'left' | 'right';
    hasPageBreak: boolean;
    onRename: () => void;
    onToggleColumn: () => void;
    onTogglePageBreak: () => void;
    onClear?: () => void;
    onDelete?: () => void;
    onClose: () => void;
}

interface AddSectionMenuProps {
    currentOrder: string[];
    resumeData: ResumeData;
    onAdd: (id: string) => void;
    onClose: () => void;
}

export const SectionMenu: React.FC<SectionMenuProps> = ({
    sectionId, currentColumn, hasPageBreak,
    onRename, onToggleColumn, onTogglePageBreak, onClear, onDelete, onClose
}) => {
    const { t } = useTranslation();
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.section-menu-container')) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleAction = (e: React.MouseEvent, action: () => void) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        setTimeout(() => action(), 10);
    };

    return (
        <div className="section-menu-container absolute right-0 top-10 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-[100] animate-in fade-in zoom-in-95 duration-100 overflow-hidden cursor-default">
            <div className="py-2">
                <button type="button" onClick={(e) => handleAction(e, onRename)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors">
                    <Edit2 className="w-4 h-4 text-gray-400" /> {t('rename_section')}
                </button>
                <button type="button" onClick={(e) => handleAction(e, onTogglePageBreak)} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors">
                    <Scissors className={`w-4 h-4 ${hasPageBreak ? 'text-brand-500' : 'text-gray-400'}`} />
                    {hasPageBreak ? t('remove_page_break') : t('add_page_break')}
                </button>

                <div className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 dark:bg-gray-900/50 my-1">{t('placement')}</div>

                <button type="button" onClick={(e) => handleAction(e, onToggleColumn)} className="w-full text-left px-4 py-2.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center justify-between transition-colors">
                    <span className="flex items-center gap-3"><Columns className={`w-4 h-4 ${currentColumn === 'left' ? 'text-brand-400' : 'text-gray-400'}`} /> {t('move_to_' + (currentColumn === 'left' ? 'right' : 'left'))}</span>
                    <span className="text-[10px] font-black text-gray-300 uppercase">{currentColumn === 'left' ? '←' : '→'}</span>
                </button>

                <div className="h-px bg-gray-100 dark:bg-gray-700 my-2 mx-4"></div>

                {onClear && (
                    <button type="button" onClick={(e) => handleAction(e, onClear)} className="w-full text-left px-4 py-2.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-3 transition-colors">
                        <RotateCcw className="w-4 h-4" /> {t('clear_all_content')}
                    </button>
                )}

                {onDelete && (
                    <button type="button" onClick={(e) => handleAction(e, onDelete)} className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors" title="Flytta till arkivet">
                        <Trash2 className="w-4 h-4" /> {t('delete_section')}
                    </button>
                )}
            </div>
        </div>
    );
};

export const AddSectionMenu: React.FC<AddSectionMenuProps> = ({ currentOrder, resumeData, onAdd, onClose }) => {
    const { t } = useTranslation();
    const options = [
        { id: 'profile', name: t('section_profile'), icon: User },
        { id: 'experience', name: t('experience'), icon: Briefcase },
        { id: 'education', name: t('education'), icon: GraduationCap },
        { id: 'skills', name: t('skills'), icon: Award },
        { id: 'languages', name: t('languages'), icon: Globe },
        { id: 'internships', name: t('section_internships'), icon: Briefcase },
        { id: 'courses', name: t('section_courses'), icon: BookOpen },
        { id: 'certificates', name: t('section_certificates'), icon: Award },
        { id: 'hobbies', name: t('section_hobbies'), icon: Star },
        { id: 'references', name: t('section_references'), icon: Phone },
    ].filter(opt => !currentOrder.includes(opt.id));

    return (
        <div className="add-section-menu-container w-full bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4">
                <div className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 dark:border-gray-700 mb-2">{t('add_more_sections')}</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-2">
                    {options.length > 0 ? options.map(opt => {
                        return (
                            <button key={opt.id} onClick={() => onAdd(opt.id)} className="text-left px-4 py-4 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-3xl flex flex-col gap-3 transition-all group relative border border-transparent hover:border-brand-100">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-gray-50 dark:bg-gray-700 rounded-2xl group-hover:bg-white dark:group-hover:bg-gray-600 shadow-sm transition-colors">
                                        {/* @ts-ignore */}
                                        <opt.icon className="w-4 h-4 text-brand-400" />
                                    </div>
                                    <span className="flex-1 leading-tight">{opt.name}</span>
                                </div>
                            </button>
                        );
                    }) : (
                        <div className="col-span-full p-8 text-xs text-gray-400 italic text-center font-medium">{t('all_sections_added')}</div>
                    )}
                </div>
            </div>
        </div>
    );
};
