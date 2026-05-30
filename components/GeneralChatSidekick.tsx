import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Loader2, Copy, Check, Maximize2, Minimize2 } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { AgnetaAvatar } from './AgnetaAvatar';
import { SettingsService } from '../services/SettingsService';
import { SystemSettings, INITIAL_SYSTEM_SETTINGS } from '../types';
import { useTranslation } from '../utils/translations';

interface Message {
    role: 'user' | 'assistant';
    text: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export const GeneralChatSidekick: React.FC<Props> = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [systemSettings, setSystemSettings] = useState<SystemSettings>(INITIAL_SYSTEM_SETTINGS);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [isMaximized, setIsMaximized] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [pos, setPos] = useState({ x: 80, y: 80 });
    const [size, setSize] = useState({ width: 440, height: 620 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ width: 0, height: 0, mouseX: 0, mouseY: 0 });

    const { t, currentLanguage } = useTranslation();
    const agnetaName = systemSettings.agnetaName || 'Agneta';

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            // Retrieve dynamic greeting in the current language
            const defaultGreetings: Record<string, string> = {
                sv: `Hej! Jag är ${agnetaName} – din allmänna AI-assistent. Ställ vilken fråga som helst!\n\nExempel:\n• "Vad är en formgjutares vanligaste arbetsuppgifter?"\n• "Hur beskriver man ledarskapsförmåga i ett CV?"\n• "Ge mig 5 starka ord för en säljare"\n\nKopierar du ett svar är det bara att klistra in i CV:t!`,
                en: `Hi! I am ${agnetaName} – your general AI assistant. Ask any question!\n\nExample:\n• "What are the most common tasks of a mold maker?"\n• "How do you describe leadership skills in a CV?"\n• "Give me 5 strong words for a salesperson"\n\nIf you copy a reply, just paste it into the CV!`,
                de: `Hallo! Ich bin ${agnetaName} – Ihre allgemeine KI-Assistentin. Stellen Sie jede beliebige Frage!\n\nBeispiel:\n• "Was sind die häufigsten Aufgaben eines Formers?"\n• "Wie beschreibt man Führungsqualitäten in einem Lebenslauf?"\n• "Nennen Sie mir 5 starke Worte für einen Verkäufer"\n\nWenn Sie eine Antwort kopieren, fügen Sie sie einfach in den Lebenslauf ein!`,
                fi: `Hei! Olen ${agnetaName} – yleinen tekoälyavustajasi. Kysy mitä tahansa!\n\nEsimerkki:\n• "Mitkä ovat muotintekijän yleisimmät tehtävät?"\n• "Miten kuvailet johtamistaitoja ansioluettelossa?"\n• "Anna minulle 5 vahvaa sanaa myyjälle"\n\nJos kopioit vastauksen, liitä se vain ansioluetteloon!`,
                da: `Hej! Jeg er ${agnetaName} – din generelle AI-assistent. Stil ethvert spørgsmål!\n\nEksempel:\n• "Hvad er de mest almindelige opgaver for en formstøber?"\n• "Hvordan beskriver man lederegenskaber i et CV?"\n• "Giv mig 5 stærke ord til en sælger"\n\nHvis du kopierer et svar, skal du blot indsætte det i CV'et!`,
                no: `Hei! Jeg er ${agnetaName} – din generelle AI-assistent. Still hvilket som helst spørsmål!\n\nEksempel:\n• "Hva er de vanligste oppgavene til en formstøper?"\n• "Hvordan beskriver man lederegenskaper i en CV?"\n• "Gi meg 5 sterke ord for en selger"\n\nHvis du kopierer et svar, er det bare å lime det inn i CV-en!`,
                fr: `Bonjour ! Je suis ${agnetaName} – votre assistante IA générale. Posez n'importe quelle question !\n\nExemple :\n• "Quelles sont les tâches les plus courantes d'un mouleur ?"\n• "Comment décrire les compétences en leadership dans un CV ?"\n• "Donnez-moi 5 mots forts pour un vendeur"\n\nSi vous copiez une réponse, collez-la simplement dans le CV !`
            };
            setMessages([{
                role: 'assistant',
                text: defaultGreetings[currentLanguage] || defaultGreetings.sv
            }]);
        }
    }, [isOpen, currentLanguage, agnetaName]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isThinking]);

    useEffect(() => {
        const unsub = SettingsService.subscribe(setSystemSettings);
        return unsub;
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, textarea, input')) return;
        e.preventDefault();
        setIsDragging(true);
        dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
        resizeStart.current = { width: size.width, height: size.height, mouseX: e.clientX, mouseY: e.clientY };
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
            if (isResizing) {
                const dx = e.clientX - resizeStart.current.mouseX;
                const dy = e.clientY - resizeStart.current.mouseY;
                setSize({
                    width: Math.max(360, Math.min(800, resizeStart.current.width + dx)),
                    height: Math.max(400, Math.min(900, resizeStart.current.height + dy))
                });
            }
        };
        const handleMouseUp = () => { setIsDragging(false); setIsResizing(false); };
        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing]);

    const handleSend = async () => {
        const apiKey = systemSettings.geminiApiKey || (process.env as any).API_KEY || '';
        if (!inputValue.trim() || isThinking) return;
        if (!apiKey) {
            alert(t('ai_not_configured'));
            return;
        }

        const userText = inputValue.trim();
        setInputValue('');
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        setIsThinking(true);

        try {
            const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
            const model = systemSettings.geminiModel || 'gemini-2.0-flash';

            // Build conversation history for multi-turn chat
            const history = messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));

            // Map standard language codes to their full English names for the model's system instructions
            const languageNames: Record<string, string> = {
                sv: 'Swedish',
                en: 'English',
                de: 'German',
                fi: 'Finnish',
                da: 'Danish',
                no: 'Norwegian',
                fr: 'French'
            };
            const targetLangName = languageNames[currentLanguage] || 'Swedish';

            const chat = ai.chats.create({
                model,
                history,
                config: {
                    systemInstruction: `Du är ${agnetaName}, en hjälpsam AI-assistent för arbetsmarknadsfrågor och CV-skrivande. Du MÅSTE svara på språket "${targetLangName}". Svara kortfattat och konkret. Formatera med radbrytningar för läsbarhet. Svara med vanlig text, inte JSON.`
                }
            });

            const response = await chat.sendMessage({ message: userText });
            const replyText = response.text || (currentLanguage === 'en' ? 'Sorry, I could not generate a reply.' : 'Tyvärr kunde jag inte generera ett svar.');
            setMessages(prev => [...prev, { role: 'assistant', text: replyText }]);
        } catch (err: any) {
            setMessages(prev => [...prev, { role: 'assistant', text: `${t('something_went_wrong')}: ${err.message || t('unknown_error')}` }]);
        } finally {
            setIsThinking(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const handleCopy = (text: string, idx: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(idx);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    if (!isOpen) return null;

    const windowStyle = isMaximized
        ? { position: 'fixed' as const, top: 20, left: 20, right: 20, bottom: 20, width: 'auto', height: 'auto', zIndex: 1000 }
        : { position: 'fixed' as const, top: pos.y, left: pos.x, width: size.width, height: size.height, zIndex: 1000 };

    return (
        <div style={windowStyle} className="flex flex-col bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden select-none">
            {/* Header */}
            <div
                onMouseDown={handleMouseDown}
                className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 cursor-grab active:cursor-grabbing shrink-0 bg-gradient-to-r from-brand-50 to-white dark:from-gray-800 dark:to-gray-900"
            >
                <div className="flex items-center gap-3">
                    <AgnetaAvatar size="sm" />
                    <div>
                        <p className="font-black text-sm text-gray-900 dark:text-white">{agnetaName} – AI-assistent</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('general_chat_title')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button onClick={() => setIsMaximized(m => !m)} className="p-2 rounded-xl text-gray-400 hover:text-brand-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all" title={isMaximized ? t('minimize') : t('maximize')}>
                        {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button onClick={onClose} className="p-2 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 select-text">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && <div className="shrink-0 mt-1"><AgnetaAvatar size="xs" /></div>}
                        <div className={`relative group max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                            msg.role === 'user'
                                ? 'bg-brand-400 text-white rounded-tr-sm'
                                : 'bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm'
                        }`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>
                            {msg.role === 'assistant' && (
                                <button
                                    onClick={() => handleCopy(msg.text, idx)}
                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-white dark:bg-gray-700 text-gray-400 hover:text-brand-400 shadow-sm border border-gray-100 dark:border-gray-600 opacity-0 group-hover:opacity-100 transition-all"
                                    title={t('copy_answer')}
                                >
                                    {copiedIndex === idx ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {isThinking && (
                    <div className="flex gap-3">
                        <AgnetaAvatar size="xs" />
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                            <span className="text-sm text-gray-400 font-medium">{t('thinking')}</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className="flex gap-2 items-end bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-400/20 transition-all">
                    <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('ask_question_placeholder')}
                        rows={2}
                        className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none resize-none p-1 font-medium leading-relaxed"
                    />
                    <button
                        onClick={handleSend}
                        disabled={isThinking || !inputValue.trim()}
                        className="p-2.5 bg-brand-400 text-white rounded-xl hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 shadow-md"
                    >
                        {isThinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                </div>
                <p className="text-[10px] text-gray-400 text-center mt-2 font-bold uppercase tracking-widest">
                    {t('hover_copy_instruction')}
                </p>
            </div>

            {/* Resize handle */}
            {!isMaximized && (
                <div
                    onMouseDown={handleResizeStart}
                    className="absolute bottom-0 right-0 w-5 h-5 cursor-se-resize"
                    style={{ background: 'linear-gradient(135deg, transparent 50%, #d1d5db 50%)' }}
                />
            )}
        </div>
    );
};
