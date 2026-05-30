import React, { useState, useEffect } from 'react';
import { X, Search, Image as ImageIcon, Loader2, ChevronRight, Filter } from 'lucide-react';
import { StockService } from '../services/StockService';
import { StockImage } from '../types';
import { useTranslation } from '../utils/translations';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (imageUrl: string) => void;
}

export const ImageLibraryModal: React.FC<Props> = ({ isOpen, onClose, onSelect }) => {
    const { t } = useTranslation();
    const [images, setImages] = useState<StockImage[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState<string>('Alla');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (isOpen) {
            loadImages();
        }
    }, [isOpen]);

    const loadImages = async () => {
        setIsLoading(true);
        try {
            const data = await StockService.getStockImages();
            setImages(data);
        } catch (err) {
            console.error("Kunde inte ladda bilder");
        } finally {
            setIsLoading(false);
        }
    };

    // Keep 'Alla' translated locally or as a standard key. Let's translate 'Alla' to the active language:
    // 'Alla' in Swedish is 'Alla', in English it's 'All' etc. Let's see if we have filter_all:
    // Yes! translations.ts has "filter_all": "Alla" (SV), "filter_all": "All Resumes" (EN) etc.
    // Wait, let's just translate 'Alla' key:
    // Let's check filter_all. If filter_all has "All Resumes" in English, it might be too long for category filter.
    // Let's just define a translation helper: selectedCategory === 'Alla' is the default value, but we can keep selectedCategory as 'Alla' internal state and render t('filter_all', 'Alla') / t('all', 'All') instead. Or simply compare against 'Alla'.
    // Let's see: t('filter_all') or t('all', 'Alla')
    
    const categories = ['Alla', ...Array.from(new Set(images.map(img => img.category))).sort()];

    const filteredImages = images.filter(img => {
        const matchesCat = selectedCategory === 'Alla' || img.category === selectedCategory;
        const matchesSearch = img.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            img.category.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCat && matchesSearch;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                            <ImageIcon className="w-6 h-6 text-brand-400" /> {t('image_library')}
                        </h2>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mt-1">{t('select_professional_image')}</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl transition-all">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-6 border-b dark:border-gray-700 bg-white dark:bg-gray-800 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-brand-400 transition-colors" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={t('search_motifs_or_jobs')}
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400/20 transition-all text-gray-900 dark:text-white"
                            />
                        </div>
                        <div className="flex gap-2 p-1 bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-x-auto custom-scrollbar no-scrollbar">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${selectedCategory === cat ? 'bg-brand-400 text-white shadow-lg shadow-brand-400/20' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
                                >
                                    {cat === 'Alla' ? t('filter_all', 'Alla') : cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {isLoading ? (
                        <div className="h-64 flex flex-col items-center justify-center gap-4 text-gray-400">
                            <Loader2 className="w-10 h-10 animate-spin text-brand-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest">{t('loading_library')}</span>
                        </div>
                    ) : filteredImages.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
                            {filteredImages.map(img => (
                                <button
                                    key={img.id}
                                    onClick={() => onSelect(img.url)}
                                    className="group relative flex flex-col items-start text-left bg-gray-50 dark:bg-gray-900 border border-transparent hover:border-brand-400 rounded-3xl overflow-hidden transition-all shadow-sm hover:shadow-xl hover:-translate-y-1"
                                >
                                    <div className="aspect-square w-full relative overflow-hidden bg-gray-200 dark:bg-gray-800">
                                        <img src={img.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-brand-400/0 group-hover:bg-brand-400/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                            <div className="bg-white text-brand-400 p-2 rounded-xl shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all">
                                                <ChevronRight className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-4 w-full">
                                        <div className="text-[9px] font-black uppercase tracking-[0.2em] text-brand-400 mb-1">{img.category}</div>
                                        <div className="text-xs font-black text-gray-900 dark:text-white truncate">{img.name}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="h-64 flex flex-col items-center justify-center gap-4 text-gray-400 italic">
                            <ImageIcon className="w-12 h-12 opacity-20" />
                            <span className="font-bold">{t('no_images_found')}</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t dark:border-gray-700 flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{filteredImages.length} {t('images_available')}</span>
                    <button onClick={onClose} className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">{t('close')}</button>
                </div>
            </div>
        </div>
    );
};
