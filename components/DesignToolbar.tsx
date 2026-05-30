import React, { useState, useRef, useEffect } from 'react';
import { Type as TypeIcon, List, ChevronDown, Check, Pipette } from 'lucide-react';
import { ResumeData, DesignSettings, FONT_OPTIONS } from '../types';
import { useTranslation } from '../utils/translations';

interface Props {
    data: ResumeData;
    updateDesign: (field: keyof DesignSettings, value: any) => void;
}

export const DesignToolbar: React.FC<Props> = ({ data, updateDesign }) => {
    const { t } = useTranslation();
    const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
    const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
    const [isSizeInputOpen, setIsSizeInputOpen] = useState(false);
    const [isSpacingInputOpen, setIsSpacingInputOpen] = useState(false);

    const fontMenuRef = useRef<HTMLDivElement>(null);
    const colorMenuRef = useRef<HTMLDivElement>(null);
    const sizeInputRef = useRef<HTMLDivElement>(null);
    const spacingInputRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (fontMenuRef.current && !fontMenuRef.current.contains(e.target as Node)) setIsFontMenuOpen(false);
            if (colorMenuRef.current && !colorMenuRef.current.contains(e.target as Node)) setIsColorMenuOpen(false);
            if (sizeInputRef.current && !sizeInputRef.current.contains(e.target as Node)) setIsSizeInputOpen(false);
            if (spacingInputRef.current && !spacingInputRef.current.contains(e.target as Node)) setIsSpacingInputOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const mainFonts = FONT_OPTIONS.filter(f => f.category === 'main');
    const extraFonts = FONT_OPTIONS.filter(f => f.category === 'extra');

    const quickColors = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#1f2937', '#ffffff'];

    return (
        <div className="w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-2 px-6 z-50 overflow-visible">
            <div className="max-w-[1600px] mx-auto flex items-center justify-center gap-4">

                {/* 1. TYPSNITT */}
                <div className="flex items-center gap-2 relative" ref={fontMenuRef}>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1 shrink-0">{t('font')}</span>
                    <div className="flex bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 p-0.5 shadow-inner items-center">
                        {mainFonts.map(f => (
                            <button
                                key={f.id}
                                onClick={() => updateDesign('font', f.id)}
                                className={`px-2.5 py-1 text-[10px] rounded-md transition-all ${data.design?.font === f.id ? 'bg-white dark:bg-gray-700 text-brand-400 font-black shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                            >
                                {f.name}
                            </button>
                        ))}
                        <div className="w-px h-3 bg-gray-200 dark:bg-gray-700 my-auto mx-1"></div>
                        <button
                            onClick={() => setIsFontMenuOpen(!isFontMenuOpen)}
                            className="p-1 rounded-md transition-all flex items-center shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <ChevronDown className={`w-3.5 h-3.5 text-brand-400 transition-transform ${isFontMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {isFontMenuOpen && (
                        <div className="absolute top-full left-0 mt-1 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 animate-in fade-in zoom-in-95 duration-150 origin-top-left z-[100]">
                            {extraFonts.map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => { updateDesign('font', f.id); setIsFontMenuOpen(false); }}
                                    className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-gray-700 dark:text-gray-200 hover:bg-brand-50 dark:hover:bg-brand-900/20 flex items-center justify-between group transition-colors"
                                >
                                    <span style={{ fontFamily: f.id }}>{f.name}</span>
                                    {data.design?.font === f.id && <Check className="w-3 h-3 text-brand-400" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="h-6 w-px bg-gray-100 dark:bg-gray-700 mx-1"></div>

                {/* 2. FÄRG */}
                <div className="flex items-center gap-2 relative" ref={colorMenuRef}>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest shrink-0">{t('color')}</span>
                    <div className="flex bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 p-0.5 shadow-inner items-center gap-1.5 px-2">
                        <div
                            className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm"
                            style={{ backgroundColor: data.design?.accentColor || '#2563eb' }}
                        />
                        <button
                            onClick={() => setIsColorMenuOpen(!isColorMenuOpen)}
                            className="p-0.5 rounded-md transition-all flex items-center shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <ChevronDown className={`w-3.5 h-3.5 text-brand-400 transition-transform ${isColorMenuOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {isColorMenuOpen && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 animate-in fade-in zoom-in-95 duration-150 origin-top-left z-[100]">
                            <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">{t('quick_select')}</div>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {quickColors.map(color => (
                                    <button
                                        key={color}
                                        onClick={() => updateDesign('accentColor', color)}
                                        className={`w-8 h-8 rounded-lg border transition-all hover:scale-110 flex items-center justify-center ${data.design?.accentColor === color ? 'border-brand-400 ring-2 ring-brand-100' : 'border-gray-100'}`}
                                        style={{ backgroundColor: color }}
                                    >
                                        {data.design?.accentColor === color && <Check className={`w-3 h-3 ${color === '#ffffff' ? 'text-gray-900' : 'text-white'}`} />}
                                    </button>
                                ))}
                                <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-gray-200 group flex items-center justify-center bg-gray-50">
                                    <Pipette className="w-3 h-3 text-gray-400" />
                                    <input
                                        type="color"
                                        value={data.design?.accentColor || '#2563eb'}
                                        onChange={(e) => updateDesign('accentColor', e.target.value)}
                                        className="absolute inset-0 opacity-0 cursor-pointer scale-150"
                                    />
                                </div>
                            </div>
                            <div className="h-px bg-gray-50 dark:bg-gray-700 my-2"></div>
                            <div className="flex items-center justify-between gap-2 px-1">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">{t('color_code')}</span>
                                <input
                                    type="text"
                                    value={data.design?.accentColor}
                                    onChange={(e) => updateDesign('accentColor', e.target.value)}
                                    className="bg-gray-50 dark:bg-gray-900 border-none rounded p-1 text-[10px] font-mono w-20 text-right outline-none focus:ring-1 focus:ring-brand-400"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="h-6 w-px bg-gray-100 dark:bg-gray-700 mx-1"></div>

                {/* 3. STORLEK */}
                <div className="flex items-center gap-2 relative" ref={sizeInputRef}>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest shrink-0">{t('font_size')}</span>
                    <div className="flex bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 p-0.5 shadow-inner items-center gap-2 px-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-gray-300">Aa</span>
                            <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.01"
                                value={data.design?.scale || 1}
                                onChange={(e) => updateDesign('scale', parseFloat(e.target.value))}
                                className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-brand-400"
                            />
                            <span className="text-xs font-black text-gray-600 dark:text-gray-300">Aa</span>
                        </div>
                        <div className="w-px h-3 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>
                        <button
                            onClick={() => setIsSizeInputOpen(!isSizeInputOpen)}
                            className="p-1 rounded-md transition-all flex items-center shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <ChevronDown className={`w-3.5 h-3.5 text-brand-400 transition-transform ${isSizeInputOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {isSizeInputOpen && (
                        <div className="absolute top-full right-0 mt-1 w-24 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 animate-in fade-in zoom-in-95 duration-150 origin-top-right z-[100]">
                            <input
                                type="number"
                                step="0.01"
                                min="0.5"
                                max="1.5"
                                value={data.design?.scale || 1}
                                onChange={(e) => updateDesign('scale', parseFloat(e.target.value))}
                                className="w-full p-1 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-center font-black text-[10px] text-brand-400 outline-none"
                            />
                        </div>
                    )}
                </div>

                <div className="h-6 w-px bg-gray-100 dark:bg-gray-700 mx-1"></div>

                {/* 4. RADAVSTÅND */}
                <div className="flex items-center gap-2 relative" ref={spacingInputRef}>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest shrink-0">{t('line_spacing')}</span>
                    <div className="flex bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 p-0.5 shadow-inner items-center gap-2 px-2">
                        <div className="flex items-center gap-2">
                            <List className="w-3 h-3 text-gray-300" />
                            <input
                                type="range"
                                min="1.0"
                                max="2.0"
                                step="0.05"
                                value={data.design?.spacing || 1.5}
                                onChange={(e) => updateDesign('spacing', parseFloat(e.target.value))}
                                className="w-16 h-1 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-brand-400"
                            />
                            <List className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300 rotate-180" />
                        </div>
                        <div className="w-px h-3 bg-gray-200 dark:bg-gray-700 mx-0.5"></div>
                        <button
                            onClick={() => setIsSpacingInputOpen(!isSpacingInputOpen)}
                            className="p-1 rounded-md transition-all flex items-center shrink-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <ChevronDown className={`w-3.5 h-3.5 text-brand-400 transition-transform ${isSpacingInputOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>

                    {isSpacingInputOpen && (
                        <div className="absolute top-full right-0 mt-1 w-24 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-2 animate-in fade-in zoom-in-95 duration-150 origin-top-right z-[100]">
                            <input
                                type="number"
                                step="0.05"
                                min="1.0"
                                max="3.0"
                                value={data.design?.spacing || 1.5}
                                onChange={(e) => updateDesign('spacing', parseFloat(e.target.value))}
                                className="w-full p-1 bg-gray-50 dark:bg-gray-900 border-none rounded-lg text-center font-black text-[10px] text-brand-400 outline-none"
                            />
                        </div>
                    )}
                </div>
                <div className="h-6 w-px bg-gray-100 dark:bg-gray-700 mx-1"></div>

                {/* 5. SIDANTAL (MANUAL OVERRIDE) */}
                <div className="flex items-center gap-2 relative">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest shrink-0">{t('pages')}</span>
                    <div className="flex bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-700 p-0.5 shadow-inner items-center">
                        {[0, 1, 2, 3].map(pages => (
                            <button
                                key={pages}
                                onClick={() => updateDesign('maxPages', pages)}
                                className={`px-3 py-1 text-[10px] rounded-md transition-all ${(data.design?.maxPages || 0) === pages ? 'bg-white dark:bg-gray-700 text-brand-400 font-black shadow-sm' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'}`}
                            >
                                {pages === 0 ? t('auto') : pages}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
