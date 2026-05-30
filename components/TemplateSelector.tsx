import React, { useState, useRef, useEffect } from 'react';
import { Layout, ChevronDown, Check, X, Sparkles } from 'lucide-react';
import { TemplateType, ResumeData, INITIAL_RESUME, CustomTemplate } from '../types';
import { CvPreview } from './CvPreview';
import { useTranslation } from '../utils/translations';
import { getAllCustomTemplatesFromDB } from '../db';

interface TemplateSelectorProps {
    currentTemplate: TemplateType;
    onSelect: (template: TemplateType, config?: any) => void;
    data: ResumeData;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ currentTemplate, onSelect, data }) => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            loadCustomTemplates();
        }
    }, [isOpen]);

    const loadCustomTemplates = async () => {
        const ts = await getAllCustomTemplatesFromDB();
        setCustomTemplates(ts.filter(t => t.isPublished));
    };

    // Use actual data but with some fallback for empty fields to keep thumbnails pretty
    const previewData: ResumeData = {
        ...data,
        personal: {
            ...data.personal,
            firstName: data.personal.firstName || t("first_name", "Namn"),
            lastName: data.personal.lastName || t("last_name", "Efternamn"),
            jobTitle: data.personal.jobTitle || t("role", "Yrkestitel")
        }
    };

    const coreTemplates: { id: TemplateType, name: string, color: string, badge?: string }[] = [
        { id: 'classic-sidebar', name: 'Klassisk', color: '#334155' },
        { id: 'modern-header', name: 'Modern', color: '#2563eb' },
        { id: 'minimalist', name: 'Minimalistisk', color: '#171717' },
        { id: 'creative-profile', name: 'Kreativ', color: '#7c3aed' },
        { id: 'executive-serif', name: 'Executive', color: '#1e293b' },
        { id: 'aventus-classic', name: 'Aventus Classic', color: '#2563eb', badge: 'Nyhet' },
        { id: 'professional-wave', name: 'Wave', color: '#4f46e5', badge: 'Nyhet' }
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${isOpen ? 'bg-brand-400 text-white border-brand-400 shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
            >
                <Layout className="w-4 h-4" />
                {t('template')}
                <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[980px] max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 z-[100] p-10 animate-in fade-in zoom-in-95 duration-200 origin-top overflow-y-auto max-h-[85vh] custom-scrollbar">
                    <div className="flex justify-between items-center mb-10">
                        <div className="flex flex-col">
                            <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-widest text-base">{t('select_template')}</h3>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">{t('find_matching_style')}</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-2xl transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border border-transparent hover:border-gray-100 dark:hover:border-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="space-y-12">
                        {/* CORE TEMPLATES */}
                        <div>
                            <h4 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em] mb-8 border-b border-gray-50 dark:border-gray-700 pb-3 flex items-center justify-between">
                                {t('standard_templates', 'Standardmallar')}
                                <span className="bg-gray-50 dark:bg-gray-900 px-3 py-1 rounded-full text-[8px] text-gray-400 border border-gray-100 dark:border-gray-800 tracking-normal">{coreTemplates.length} {t('pieces', 'stycken')}</span>
                            </h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8">
                                {coreTemplates.map((t) => (
                                    <div key={t.id} className="flex flex-col gap-4 group">
                                        <div
                                            className={`relative w-full aspect-[210/297] rounded-2xl overflow-hidden border-2 cursor-pointer transition-all shadow-sm hover:shadow-2xl hover:-translate-y-2 ${currentTemplate === t.id ? 'border-brand-400 ring-[6px] ring-brand-50' : 'border-gray-100 dark:border-gray-700 hover:border-brand-200'}`}
                                            onClick={() => { onSelect(t.id); setIsOpen(false); }}
                                        >
                                            <div className="absolute top-0 left-0 w-[210mm] origin-top-left transform scale-[0.165] pointer-events-none bg-white select-none">
                                                <CvPreview
                                                    data={{
                                                        ...previewData,
                                                        design: { ...previewData.design, accentColor: t.color }
                                                    }}
                                                    template={t.id}
                                                />
                                            </div>

                                            {t.badge && (
                                                <div className={`absolute top-3 left-3 px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest text-white shadow-lg ${t.badge === 'Nyhet' ? 'bg-violet-600 shadow-violet-600/20' : 'bg-brand-500 shadow-brand-500/20'}`}>
                                                    {t.badge}
                                                </div>
                                            )}

                                            {currentTemplate === t.id && (
                                                <div className="absolute top-3 right-3 bg-brand-400 text-white p-1.5 rounded-full shadow-lg border-2 border-white scale-110">
                                                    <Check className="w-3 h-3" />
                                                </div>
                                            )}

                                            {/* Hover overlay hint */}
                                            <div className="absolute inset-0 bg-brand-400/0 group-hover:bg-brand-400/5 transition-colors pointer-events-none" />
                                        </div>
                                        <div className="flex flex-col items-center">
                                            <span className={`text-center text-[10px] font-black uppercase tracking-widest ${currentTemplate === t.id ? 'text-brand-400' : 'text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors'}`}>
                                                {t.name}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CUSTOM TEMPLATES */}
                        {customTemplates.length > 0 && (
                            <div>
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-8 border-b border-indigo-50/50 dark:border-indigo-900/20 pb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-3.5 h-3.5" /> {t('custom_templates_admin')}
                                    </div>
                                    <span className="bg-indigo-50/50 dark:bg-indigo-900/10 px-3 py-1 rounded-full text-[8px] text-indigo-400 border border-indigo-100/50 dark:border-indigo-800/30 tracking-normal">{customTemplates.length} stycken</span>
                                </h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-8">
                                    {customTemplates.map((t) => (
                                        <div key={t.id} className="flex flex-col gap-4 group">
                                            <div
                                                className={`relative w-full aspect-[210/297] rounded-2xl overflow-hidden border-2 cursor-pointer transition-all shadow-sm hover:shadow-2xl hover:-translate-y-2 ${currentTemplate === t.id ? 'border-indigo-500 ring-[6px] ring-indigo-50' : 'border-gray-100 dark:border-gray-700 hover:border-indigo-200'}`}
                                                onClick={() => { onSelect('master', t.config); setIsOpen(false); }}
                                            >
                                                <div className="absolute top-0 left-0 w-[210mm] origin-top-left transform scale-[0.165] pointer-events-none bg-white select-none">
                                                    <CvPreview
                                                        data={{
                                                            ...previewData,
                                                            template: 'master',
                                                            customTemplateConfig: t.config
                                                        }}
                                                        template={'master'}
                                                    />
                                                </div>

                                                <div className="absolute top-3 left-3 px-2 py-1 bg-indigo-600 shadow-lg shadow-indigo-600/20 rounded-lg text-[8px] font-black uppercase tracking-widest text-white">
                                                    {t('special_label', 'Special')}
                                                </div>

                                                {currentTemplate === t.id && (
                                                    <div className="absolute top-3 right-3 bg-indigo-500 text-white p-1.5 rounded-full shadow-lg border-2 border-white scale-110">
                                                        <Check className="w-3 h-3" />
                                                    </div>
                                                )}

                                                {/* Hover overlay hint */}
                                                <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/5 transition-colors pointer-events-none" />
                                            </div>
                                            <div className="flex flex-col items-center">
                                                <span className={`text-center text-[10px] font-black uppercase tracking-widest ${currentTemplate === t.id ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white transition-colors'}`}>
                                                    {t.name}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
