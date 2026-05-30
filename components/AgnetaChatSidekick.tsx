import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2, Sparkles, Check, Info, Wand2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { AgnetaAvatar } from './AgnetaAvatar';
import { SettingsService } from '../services/SettingsService';
import { MonitoringService } from '../services/MonitoringService';
import { JobAd } from '../services/JobSearchService';
import { SystemSettings, INITIAL_SYSTEM_SETTINGS, ResumeData } from '../types';
import { RichTextEditor } from './RichTextEditor';
import { Maximize2, Minimize2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { useTranslation } from '../utils/translations';

interface Message {
    role: 'user' | 'assistant';
    text: string;
    htmlSuggestion?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    context: string;
    currentHtml: string;
    data: ResumeData;
    onApply: (newHtml: string, sectionId?: string, itemId?: string) => void;
    inline?: boolean;
    jobContext?: JobAd;
    sectionId?: string;
}

export const AgnetaChatSidekick: React.FC<Props> = ({ isOpen, onClose, context, currentHtml, data, onApply, inline, jobContext, sectionId }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [systemSettings, setSystemSettings] = useState<SystemSettings>(INITIAL_SYSTEM_SETTINGS);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState({ x: 80, y: 80 });
    const [size, setSize] = useState({ width: 440, height: 650 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ width: 0, height: 0, mouseX: 0, mouseY: 0 });
    
    const { t, currentLanguage } = useTranslation();

    // Reset messages whenever the sidekick is opened or the context (section/item) changes
    useEffect(() => {
        if (isOpen) {
            if (jobContext) {
                setMessages([{
                    role: 'assistant',
                    text: systemSettings.agnetaGreetingJob || (currentLanguage === 'en' ? `Hi! I have now read the ad for the position as "${jobContext.headline}" at "${jobContext.company_name}" and I have also read through your CV. Do you want me to write a draft for an application for you?` : `Hej! Nu har jag läst annonsen för tjänsten som "${jobContext.headline}" hos "${jobContext.company_name}" och jag har även läst igenom ditt CV. Vill du att jag skriver ett utkast till en ansökan åt dig?`)
                }]);
            } else {
                setMessages([{
                    role: 'assistant',
                    text: systemSettings.agnetaGreetingStandard || (currentLanguage === 'en' ? `I'd love to help you with your ${context.toLowerCase()}. What do you want to improve?` : `Jag hjälper dig gärna med din ${context.toLowerCase()}. Vad vill du förbättra?`)
                }]);
            }
        }
    }, [isOpen, context, jobContext, currentLanguage]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) return;
        e.preventDefault();
        setIsDragging(true);
        dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
        resizeStart.current = {
            width: size.width,
            height: size.height,
            mouseX: e.clientX,
            mouseY: e.clientY
        };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
            }
            if (isResizing) {
                const deltaX = e.clientX - resizeStart.current.mouseX;
                const deltaY = e.clientY - resizeStart.current.mouseY;
                setSize({
                    width: Math.max(380, Math.min(800, resizeStart.current.width + deltaX)),
                    height: Math.max(500, Math.min(900, resizeStart.current.height + deltaY))
                });
            }
        };
        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        const unsubscribeSettings = SettingsService.subscribe((settings) => {
            setSystemSettings(settings);
        });

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            unsubscribeSettings();
        };
    }, [isDragging, isResizing]);

    const handleSendMessage = async () => {
        const apiKey = systemSettings.geminiApiKey || process.env.API_KEY || '';
        if (!inputValue.trim() || isThinking || !apiKey) {
            if (!apiKey && inputValue.trim()) {
                alert(t('ai_not_configured'));
            }
            return;
        }

        const userText = inputValue;
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setIsThinking(true);

        try {
            const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

            // Collect resume context for the AI
            const resumeContext = `
                PERSONUPPGIFTER: ${data.personal.firstName} ${data.personal.lastName}, ${data.personal.jobTitle}.
                SAMMANFATTNING: ${data.profile || 'Ingen sammanfattning angiven.'}
                ERFARENHET: ${data.experience?.map(e => `${e.role} på ${e.company} (${e.startDate}-${e.endDate})`).join(', ')}
                KOMPETENSER: ${data.skills?.map(s => s.name).join(', ')}
            `;

            // Select the most specific prompt available
            let specificPrompt = '';
            if (jobContext) {
                specificPrompt = systemSettings.agnetaCoverLetterPrompt || '';
            } else if (sectionId === 'profile') {
                specificPrompt = systemSettings.agnetaProfilePrompt || '';
            } else if (sectionId === 'experience' || sectionId === 'internships') {
                specificPrompt = systemSettings.agnetaExperiencePrompt || '';
            } else if (sectionId === 'education') {
                specificPrompt = systemSettings.agnetaEducationPrompt || '';
            }

            const baseSystemPrompt = systemSettings.agnetaSystemPrompt || '';

            const prompt = (specificPrompt || baseSystemPrompt) ? `
                ${baseSystemPrompt}
                ${specificPrompt ? `\nSPECIFIK INSTRUKTION FÖR ${context.toUpperCase()}:\n${specificPrompt}` : ''}
                
                ANVÄNDARENS INSTRUKTION: "${userText}"
                AKTUELL TEXT I SEKTIONEN: "${currentHtml}"
                
                DELTAGARENS CV-DATA:
                ${resumeContext}

                ${jobContext ? `MÅL: Söka jobbet som "${jobContext.headline}" hos "${jobContext.company_name}".` : ''}
                ${jobContext ? `JOBBESKRIVNING: ${jobContext.description.text.substring(0, 3000)}` : ''}

                KRAV PÅ SVAR (JSON):
                { 
                  "reply": "Kort kommentar om vad du gjort (MÅSTE VARA PÅ SPRÅKKOD: ${currentLanguage})", 
                  "htmlSuggestion": "Den genererade texten som HTML (MÅSTE VARA PÅ SPRÅKKOD: ${currentLanguage})" 
                }
            ` : `
                IDENTITET: Du är ${systemSettings.agnetaName || 'Agneta'}, en CV-coach.
                
                KONTEXT:
                Användaren arbetar med: "${context}".
                ${jobContext ? `MÅL: Söka jobbet som "${jobContext.headline}" hos "${jobContext.company_name}".` : ''}
                ${jobContext ? `JOBBESKRIVNING: ${jobContext.description.text.substring(0, 3000)}` : ''}
                
                DELTAGARENS CV-DATA:
                ${resumeContext}

                ${currentHtml ? `AKTUELL TEXT I SEKTIONEN: "${currentHtml}"` : ''}
                
                ANVÄNDARENS INSTRUKTION: "${userText}"
                
                INSTRUKTION:
                1. Om det är en jobbansökan, skriv ett personligt och professionellt brev som matchar CV-datan mot jobbet.
                2. Använd <b>-taggar för viktiga ord.
                3. Håll en engagerande och proffsig ton.
                4. VIKTIGT: Du MÅSTE svara på språkkoden "${currentLanguage}" om inte användaren uttryckligen ber om ett annat språk.
                
                KRAV PÅ SVAR (JSON):
                { 
                  "reply": "Kort kommentar om vad du gjort (på rätt språk: ${currentLanguage})", 
                  "htmlSuggestion": "Den genererade texten som HTML (på rätt språk: ${currentLanguage})" 
                }
            `;

            let response;
            try {
                response = await ai.models.generateContent({
                    model: systemSettings.geminiModel || 'gemini-flash-latest',
                    contents: prompt,
                    config: { responseMimeType: "application/json" }
                });
            } catch (initialError: any) {
                // If it's a 503 error (model overloaded), try a stable fallback model
                if (initialError?.status === 503 || initialError?.message?.includes('503')) {
                    console.warn(`Primary model (${systemSettings.geminiModel}) unavailable (503). Retrying with fallback: gemini-2.0-flash`);
                    response = await ai.models.generateContent({
                        model: 'gemini-2.0-flash',
                        contents: prompt,
                        config: { responseMimeType: "application/json" }
                    });
                } else {
                    throw initialError; // Re-throw if it's some other error
                }
            }

            const result = JSON.parse(response.text);
            setMessages(prev => [...prev, {
                role: 'assistant',
                text: result.reply,
                htmlSuggestion: result.htmlSuggestion
            }]);
        } catch (error: any) {
            console.error("Agneta analysis failed", error);

            // Log failure to monitoring system
            MonitoringService.logAIError(
                systemSettings.geminiModel || 'gemini-flash-latest',
                error?.message || "Unknown error",
                'chat'
            );

            setMessages(prev => [...prev, {
                role: 'assistant',
                text: currentLanguage === 'en' ? "Could not generate suggestion right now. This might be because the AI model is unavailable." : "Kunde inte generera förslag just nu. Detta kan bero på att AI-modellen inte är tillgänglig."
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            style={inline ? {} : (isMaximized ? { left: '2.5vw', top: '2.5vh', width: '95vw', height: '95vh' } : { left: pos.x, top: pos.y, width: size.width, height: size.height })}
            className={`${inline ? 'relative w-full h-full' : 'fixed z-[200]'} flex flex-col bg-white/95 backdrop-blur-3xl border border-slate-200 rounded-[2.5rem] shadow-[0_40px_120px_rgba(0,0,0,0.15)] overflow-hidden transition-all ${(isDragging || isResizing) && !inline ? 'opacity-80 scale-[1.02]' : ''} ${isMaximized ? 'rounded-2xl' : ''}`}
        >
            {/* HEADER */}
            <div
                onMouseDown={inline ? undefined : handleMouseDown}
                className={`p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-transparent flex items-center justify-between ${inline ? '' : 'cursor-grab active:cursor-grabbing'} shrink-0`}
            >
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-brand-50 p-1 border border-brand-100 ring-4 ring-brand-50/50 flex items-center justify-center">
                        <AgnetaAvatar url={systemSettings.agnetaAvatarUrl} size="md" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none">{systemSettings.agnetaName || 'Agneta'}</h3>
                        <span className="text-[9px] font-bold text-brand-400 uppercase tracking-tight">{jobContext ? t('application_assistant') : t('sidekick')}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {!inline && (
                        <button
                            onClick={() => setIsMaximized(!isMaximized)}
                            className="p-2 text-slate-400 hover:text-brand-400 hover:bg-brand-50 rounded-xl transition-all"
                            title={isMaximized ? t('minimize') : t('maximize')}
                        >
                            {isMaximized ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </button>
                    )}
                    {!inline && (
                        <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2 px-6 shrink-0">
                <Wand2 className="w-3.5 h-3.5 text-brand-300" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] truncate">{jobContext ? `${t('application')}: ${jobContext.headline}` : context}</span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/30 relative">
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] overflow-hidden p-20">
                    <div className="w-full h-full flex items-center justify-center">
                        <AgnetaAvatar url={systemSettings.agnetaAvatarUrl} size="xl" className="w-full h-full scale-[3]" />
                    </div>
                </div>

                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300 relative z-10`}>
                        <div className={`w-full max-w-[95%] px-0 py-0 rounded-3xl overflow-hidden flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>

                            {m.role === 'user' ? (
                                <div className="px-5 py-4 rounded-[1.8rem] text-[13px] leading-relaxed shadow-md bg-brand-500 text-white font-medium ml-12 whitespace-pre-wrap">
                                    {m.text}
                                </div>
                            ) : (
                                <div 
                                    className="px-5 py-4 rounded-[1.8rem] text-[13px] leading-relaxed shadow-md bg-white text-slate-800 border-2 border-slate-200 font-medium"
                                    dangerouslySetInnerHTML={{ 
                                        __html: DOMPurify.sanitize(
                                            m.text
                                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                                .replace(/\n/g, '<br/>')
                                        )
                                    }}
                                />
                            )}

                            {m.htmlSuggestion && (
                                <div className="w-full mt-4 animate-in fade-in zoom-in-95 duration-500">
                                    <div className="bg-white border-2 border-brand-100 rounded-[2.5rem] p-4 shadow-2xl relative group ring-4 ring-brand-400/5">
                                        <div className="mb-3 flex items-center justify-between px-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
                                                <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">{t('agneta_sandbox')}</span>
                                            </div>
                                            <span className="text-[9px] font-bold text-slate-300 uppercase italic">{t('click_to_refine')}</span>
                                        </div>

                                        <div className="text-[15px] text-slate-900 leading-relaxed rich-text selection:bg-brand-400/20">
                                            <RichTextEditor
                                                value={m.htmlSuggestion}
                                                onChange={(newVal) => {
                                                    setMessages(prev => prev.map((msg, idx) => idx === i ? { ...msg, htmlSuggestion: newVal } : msg));
                                                }}
                                                hideAgnetaButton={true}
                                                minHeight="150px"
                                            />
                                        </div>

                                        <div className="mt-4 flex gap-2">
                                            <button
                                                onClick={() => onApply(m.htmlSuggestion!, sectionId, (m as any).itemId)}
                                                className="flex-1 py-4 bg-brand-500 hover:bg-brand-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-brand-500/30 transition-all active:scale-95 group/btn"
                                            >
                                                <Check className="w-4 h-4 group-hover/btn:scale-125 transition-transform" />
                                                {t('paste_into_cv')}
                                            </button>
                                            <button
                                                onClick={() => setMessages(prev => prev.map((msg, idx) => idx === i ? { ...msg, htmlSuggestion: undefined } : msg))}
                                                className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
                                            >
                                                {t('discard')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {isThinking && (
                    <div className="flex justify-start animate-in slide-in-from-bottom-2 duration-300 relative z-10">
                        <div className="bg-white border-2 border-slate-200 px-5 py-4 rounded-[1.8rem] flex items-center gap-3 shadow-md">
                            <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t('thinking')}</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* RESIZE HANDLE */}
            {!inline && (
                <div
                    onMouseDown={handleResizeStart}
                    className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize group z-50"
                    title="Dra för att ändra storlek"
                >
                    <div className="absolute bottom-2 right-2 w-4 h-4 flex flex-col items-end justify-end gap-0.5 opacity-30 group-hover:opacity-60 transition-opacity">
                        <div className="w-3 h-0.5 bg-slate-400 rounded-full"></div>
                        <div className="w-2 h-0.5 bg-slate-400 rounded-full"></div>
                        <div className="w-1 h-0.5 bg-slate-400 rounded-full"></div>
                    </div>
                </div>
            )}

            <div className="p-5 border-t border-slate-100 bg-white/80 backdrop-blur-xl shrink-0">
                <div className="flex gap-3 relative">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        placeholder={t('write_your_message')}
                        className="flex-1 px-5 py-3.5 pr-14 bg-white border-2 border-slate-300 rounded-2xl text-[13px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-all shadow-sm"
                        disabled={isThinking}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isThinking}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 disabled:opacity-20 transition-all shadow-xl shadow-brand-500/30"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};
