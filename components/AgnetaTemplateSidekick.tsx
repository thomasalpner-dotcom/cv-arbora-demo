import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2, Sparkles, Check, Info, Wand2, RefreshCcw } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { AgnetaAvatar } from './AgnetaAvatar';
import { MasterTemplateConfig, SystemSettings, INITIAL_SYSTEM_SETTINGS } from '../types';
import { SettingsService } from '../services/SettingsService';
import { useTranslation } from '../utils/translations';

interface Message {
    role: 'user' | 'assistant';
    text: string;
    suggestion?: MasterTemplateConfig;
}

interface Props {
    currentConfig: MasterTemplateConfig;
    onApply: (newConfig: MasterTemplateConfig) => void;
    onClose: () => void;
}

export const AgnetaTemplateSidekick: React.FC<Props> = ({ currentConfig, onApply, onClose }) => {
    const { t, currentLanguage } = useTranslation();
    const defaultInitialMessage = currentLanguage === 'en' ? 
        'Hi! I am your Design Assistant. Tell me how you want the template to look, and I will fix the settings for you. For example, try "Add a dark blue stripe on the right side" or "Make the sidebar wider".' : 
        'Hej! Jag är din Design-assistent. Berätta hur du vill att mallen ska se ut, så fixar jag inställningarna åt dig. Prova t.ex. "Lägg till en mörkblå rand på höger sida" eller "Gör sidopanelen bredare".';

    const [messages, setMessages] = useState<Message[]>([{
        role: 'assistant',
        text: defaultInitialMessage
    }]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [systemSettings, setSystemSettings] = useState<SystemSettings>(INITIAL_SYSTEM_SETTINGS);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    useEffect(() => {
        const unsubscribe = SettingsService.subscribe((settings) => {
            setSystemSettings(settings);
        });
        return () => unsubscribe();
    }, []);

    const handleSendMessage = async () => {
        const apiKey = systemSettings.geminiApiKey || process.env.API_KEY || '';
        if (!inputValue.trim() || isThinking || !apiKey) return;

        const userText = inputValue;
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setIsThinking(true);

        try {
            const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
            const prompt = `
                IDENTITET: Du är Agneta, en expert på grafisk design och CV-layouter.
                UPPGIFT: Uppdatera CV-mallens konfiguration baserat på användarens önskemål.
                
                AKTUELL KONFIGURATION: ${JSON.stringify(currentConfig)}
                INSTRUKTION: "${userText}"
                
                KRAV:
                1. Du ska returnera en kort kommentar om vad du gjort på språket "${currentLanguage}".
                2. Du ska returnera det fullständiga MasterTemplateConfig-objektet med dina ändringar applicerade.
                3. Var kreativ! Om användaren vill ha en "rand", använd sideStripe: 'left' eller 'right'.
                
                Returnera JSON: { "reply": "Din kommentar", "config": MasterTemplateConfig }
            `;

            let responseText = '';
            try {
                const response = await ai.models.generateContent({
                    model: systemSettings.geminiModel === 'gemini-1.5-flash-latest' ? 'gemini-1.5-flash' : (systemSettings.geminiModel || 'gemini-1.5-flash'),
                    contents: { parts: [{ text: prompt }] },
                    config: { responseMimeType: "application/json" }
                });
                responseText = response.text;
            } catch (err: any) {
                console.warn("JSON mode failed in TemplateSidekick, retrying:", err);
                const fallback = await ai.models.generateContent({
                    model: systemSettings.geminiModel || 'gemini-1.5-flash-latest',
                    contents: { parts: [{ text: prompt + "\n\nIMPORTANT: Respond ONLY with raw JSON." }] }
                });
                responseText = fallback.text;
            }

            let cleanJson = responseText.trim();
            if (cleanJson.startsWith('```')) {
                cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
            }

            const result = JSON.parse(cleanJson);
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: result.reply,
                suggestion: result.config
            }]);

            // Auto-apply if it's a valid config
            if (result.config) {
                onApply(result.config);
            }
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', text: currentLanguage === 'en' ? "Sorry, I couldn't interpret that design instruction. Try being a bit more specific!" : "Förlåt, jag kunde inte tolka den design-instruktionen. Prova att vara lite mer specifik!" }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-slate-100">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-brand-50 p-1 border border-brand-100 ring-4 ring-brand-50/50">
                        <AgnetaAvatar />
                    </div>
                    <div>
                        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em]">Agneta Designer</h3>
                        <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">{t('layout_specialist')}</span>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-600 transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30 relative">
                {/* Large Background Avatar */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] overflow-hidden">
                    <div className="w-[150%] aspect-square">
                        <AgnetaAvatar />
                    </div>
                </div>

                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10`}>
                        <div className={`max-w-[90%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${m.role === 'user' ? 'bg-indigo-500 text-white font-medium shadow-sm' : 'bg-white text-slate-600 border border-slate-100 shadow-sm'}`}>
                            {m.text}
                            {m.suggestion && (
                                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2 text-[10px] text-emerald-500 font-black uppercase tracking-widest">
                                    <Check className="w-3 h-3" /> {t('layout_updated')}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div className="flex justify-start relative z-10">
                        <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 flex items-center gap-3 animate-pulse shadow-sm">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('agneta_sketching')}</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-6 border-t border-slate-100 bg-white">
                <div className="relative">
                    <input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(); }}
                        placeholder={t('write_design_instruction')}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-4 pr-12 py-4 text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:bg-white focus:border-indigo-500/20 transition-all shadow-inner"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isThinking}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 disabled:opacity-20 transition-all shadow-lg shadow-indigo-500/20"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
