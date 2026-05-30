import React, { useState } from 'react';
import { X, Mail, Lock, User, Loader2, AlertCircle, RefreshCw, ArrowLeft, Check, Eye, EyeOff } from 'lucide-react';
import { AuthService } from '../services/AuthService';
import { useTranslation } from '../utils/translations';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    companyName?: string;
    logoUrl?: string;
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, companyName = 'Arbora', logoUrl }) => {
    const { t } = useTranslation();
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (mode === 'login') {
                await AuthService.login(email, password);
                onClose();
            } else if (mode === 'register') {
                if (!name) throw new Error('Ange ditt namn');
                await AuthService.register(email, password, name);
                setMessage('Konto skapat! Ett verifieringsmail har skickats till dig. Du MÅSTE klicka på länken i mailet för att kunna logga in.');
                // We stay in Register mode or switch to Login? 
                // Let's switch to login so they see the form when they come back
                setMode('login');
            } else if (mode === 'forgot') {
                await AuthService.sendPasswordReset(email);
                setMessage('En återställningslänk har skickats! Kontrollera din inkorg (och skräppost) för instruktioner.');
                setMode('login');
            }
        } catch (err: any) {
            console.error("Auth Error:", err);
            let userMsg = 'Ett fel uppstod. Försök igen.';

            // Translate common Firebase errors
            if (err.code === 'auth/wrong-password') userMsg = 'Fel lösenord.';
            else if (err.code === 'auth/user-not-found') userMsg = 'Ingen användare hittades med denna e-post.';
            else if (err.code === 'auth/email-already-in-use') userMsg = 'E-postkursen används redan.';
            else if (err.code === 'auth/invalid-email') userMsg = 'Ogiltig e-postadress.';
            else if (err.code === 'auth/weak-password') userMsg = 'Lösenordet är för svagt.';
            else if (err.message) userMsg = err.message;

            setError(userMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-5 sm:p-6">
                    <div className="text-center mb-5">
                        <div className="w-10 h-10 bg-brand-50 dark:bg-brand-900/30 rounded-xl flex items-center justify-center mx-auto mb-2 text-brand-500 dark:text-brand-400 overflow-hidden">
                            {mode === 'forgot' ? (
                                <RefreshCw className="w-5 h-5" />
                            ) : logoUrl ? (
                                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                                <Lock className="w-5 h-5" />
                            )}
                        </div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">
                            {mode === 'login' ? t('welcome_back') : mode === 'register' ? t('create_account') : t('reset_password')}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {mode === 'login' 
                                ? t('login_subtitle') 
                                : mode === 'register' 
                                    ? (t('language') === 'en' ? `Access ${companyName}'s CV tool` : `Få tillgång till ${companyName}s CV-verktyg`)
                                    : t('reset_subtitle')}
                        </p>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-start gap-2 animate-in slide-in-from-top-2">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs font-bold text-red-600 dark:text-red-400 leading-relaxed">{error}</p>
                        </div>
                    )}

                    {message && (
                        <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-start gap-2 animate-in slide-in-from-top-2">
                            <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="w-2.5 h-2.5 text-white" />
                            </div>
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 leading-relaxed">{message}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-2.5">
                        {mode === 'register' && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('name', 'Namn')}</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        tabIndex={1}
                                        className="w-full pl-10 pr-3 py-2 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
                                        placeholder={t('name_placeholder')}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-0.5">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-0.5">{t('email', 'E-post')}</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    tabIndex={mode === 'register' ? 2 : 1}
                                    className="w-full pl-10 pr-3 py-1.5 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-bold text-[13px] focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
                                    placeholder={t('language') === 'en' ? 'name@company.com' : 'namn@foretag.se'}
                                />
                            </div>
                        </div>

                        {mode !== 'forgot' && (
                            <div className="space-y-1">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('password')}</label>
                                    {mode === 'login' && (
                                        <button
                                            type="button"
                                            onClick={() => setMode('forgot')}
                                            tabIndex={4}
                                            className="text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                                        >
                                            {t('forgot_password_q')}
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        tabIndex={mode === 'register' ? 3 : 2}
                                        className="w-full pl-10 pr-10 py-2 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white font-bold text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600"
                                        placeholder="••••••••"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={5}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
                                        title={showPassword ? 'Dölj lösenord' : 'Visa lösenord'}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            tabIndex={mode === 'forgot' ? 2 : (mode === 'register' ? 4 : 3)}
                            className="w-full bg-brand-500 hover:bg-brand-500/90 disabled:bg-brand-300 text-white font-black uppercase tracking-widest text-[11px] py-3 rounded-xl shadow-xl shadow-brand-500/20 transition-all flex items-center justify-center gap-2 mt-3 active:scale-95"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                                mode === 'login' ? t('login') : mode === 'register' ? t('create_account') : t('send_link')
                            )}
                        </button>
                    </form>

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-center">
                        {mode === 'forgot' ? (
                            <button
                                onClick={() => setMode('login')}
                                className="text-sm font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center gap-2 mx-auto transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" /> {t('back_to_login')}
                            </button>
                        ) : (
                            <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                {mode === 'login' ? t('no_account') : t('already_have_account')}
                                <button
                                    onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}
                                    className="ml-2 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                                >
                                    {mode === 'login' ? t('create_one_here') : t('login')}
                                </button>
                            </div>
                        )}
                    </div>
                </div >
            </div >
        </div >
    );
};
