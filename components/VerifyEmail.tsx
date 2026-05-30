import React, { useState } from 'react';
import { Mail, Loader2, LogOut, CheckCircle2, RefreshCw } from 'lucide-react';
import { AuthService } from '../services/AuthService';
import { SystemSettings } from '../types';

interface Props {
    email: string;
    onVerified: () => void;
    onLogout: () => void;
    systemSettings: SystemSettings;
}

export const VerifyEmail: React.FC<Props> = ({ email, onVerified, onLogout, systemSettings }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleCheckVerification = async () => {
        setIsLoading(true);
        setMessage(null);
        try {
            const user = await AuthService.reloadUser();
            if (user?.emailVerified) {
                onVerified();
            } else {
                setMessage({ type: 'error', text: 'E-postkontot är fortfarande inte verifierat. Klicka på länken i mailet vi skickade.' });
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Kunde inte hämta status. Försök igen.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        setIsResending(true);
        setMessage(null);
        try {
            await AuthService.resendVerificationEmail();
            setMessage({ type: 'success', text: 'Ett nytt verifieringsmail har skickats!' });
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Kunde inte skicka mail. Vänta en stund och försök igen.' });
        } finally {
            setIsResending(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center">
            {/* Background elements to match LandingPage */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl border border-gray-100 dark:border-gray-800 p-10 sm:p-12 animate-in fade-in zoom-in-95 duration-500">
                <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-600/20 text-white">
                    <Mail className="w-10 h-10" />
                </div>

                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">Verifiera din e-post</h1>

                <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium leading-relaxed">
                    Vi har skickat en verifieringslänk till <br />
                    <span className="text-gray-900 dark:text-white font-black">{email}</span>. <br />
                    Klicka på länken i mailet för att få tillgång till verktyget.
                </p>

                {message && (
                    <div className={`mb-8 p-4 rounded-2xl flex items-start gap-3 border animate-in slide-in-from-top-2 ${message.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                        {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <Mail className="w-5 h-5 shrink-0" />}
                        <p className="text-[11px] font-bold text-left leading-relaxed">{message.text}</p>
                    </div>
                )}

                <div className="space-y-4">
                    <button
                        onClick={handleCheckVerification}
                        disabled={isLoading}
                        className="w-full bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 font-black uppercase tracking-widest text-[11px] py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                        Jag har verifierat min e-post
                    </button>

                    <button
                        onClick={handleResend}
                        disabled={isResending}
                        className="w-full bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                    >
                        {isResending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Skicka mailet igen"}
                    </button>

                    <button
                        onClick={onLogout}
                        className="w-full text-xs font-bold text-gray-400 hover:text-red-500 transition-colors flex items-center justify-center gap-2 mt-4"
                    >
                        <LogOut className="w-4 h-4" /> Logga ut och börja om
                    </button>
                </div>
            </div>

            <p className="relative z-10 mt-12 text-[10px] font-black text-gray-300 dark:text-gray-600 uppercase tracking-[0.3em]">
                Säkerhetskontroll • {systemSettings.companyName ? `${systemSettings.companyName}.cv` : 'Aventus.cv'}
            </p>
        </div>
    );
};
