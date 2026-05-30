import React, { useState } from 'react';
import { X, Sparkles, Loader2, AlertCircle, CheckCircle2, FileText, Linkedin } from 'lucide-react';
import { useTranslation } from '../utils/translations';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onImport: (text: string) => Promise<void>;
}

export const AIImportModal: React.FC<Props> = ({ isOpen, onClose, onImport }) => {
    const { t } = useTranslation();
    const [text, setText] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleImport = async () => {
        if (!text.trim()) {
            setError(t('import_error_empty'));
            return;
        }

        setIsImporting(true);
        setError(null);

        try {
            await onImport(text);
            setText('');
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : t('import_error_title'));
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        if (!isImporting) {
            setText('');
            setError(null);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-white/20">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gradient-to-r from-brand-50 to-white dark:from-brand-900/10 dark:to-gray-900">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-400 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-400/20">
                            <Sparkles className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">
                                {t('import_with_ai')}
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                {t('import_subtitle')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        disabled={isImporting}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Instructions Grid */}
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-6 shrink-0">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-brand-500">
                            <Linkedin className="w-4 h-4" />
                            <span className="text-xs font-black uppercase tracking-widest">{t('from_linkedin')}</span>
                        </div>
                        <ol className="text-xs space-y-2 text-gray-600 dark:text-gray-400 font-medium">
                            <li className="flex gap-2">
                                <span className="text-brand-400 font-black">1.</span>
                                <span>{t('linkedin_step1')}</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-400 font-black">2.</span>
                                <span>{t('linkedin_step2')}</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-400 font-black">3.</span>
                                <span>{t('linkedin_step3')}</span>
                            </li>
                        </ol>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-brand-500">
                            <FileText className="w-4 h-4" />
                            <span className="text-xs font-black uppercase tracking-widest">{t('from_old_cv')}</span>
                        </div>
                        <ol className="text-xs space-y-2 text-gray-600 dark:text-gray-400 font-medium">
                            <li className="flex gap-2">
                                <span className="text-brand-400 font-black">1.</span>
                                <span>{t('cv_step1')}</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-400 font-black">2.</span>
                                <span>{t('cv_step2')}</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-brand-400 font-black">3.</span>
                                <span>{t('cv_step3')}</span>
                            </li>
                        </ol>
                    </div>
                </div>

                {/* Text Area */}
                <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-gray-900">
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={t('import_textarea_placeholder')}
                        disabled={isImporting}
                        className="w-full h-full min-h-[350px] p-5 bg-gray-50 dark:bg-gray-950 border-2 border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-brand-400 focus:border-brand-400 outline-none resize-none text-sm font-medium transition-all disabled:opacity-50"
                    />
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mx-6 mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-bold text-red-900 dark:text-red-100">
                                {t('import_error_title')}
                            </p>
                            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                                {error}
                            </p>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50 dark:bg-gray-800/30">
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${text.length > 100 ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="font-bold">{text.length.toLocaleString()}</span> {t('chars_pasted')}
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleClose}
                            disabled={isImporting}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                            {t('cancel')}
                        </button>
                        <button
                            onClick={handleImport}
                            disabled={isImporting || !text.trim()}
                            className="px-8 py-3 bg-brand-400 hover:bg-brand-500 text-white rounded-xl text-sm font-black uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-400/20"
                        >
                            {isImporting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('ai_analyzing')}
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" />
                                    {t('create_cv_with_ai')}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
