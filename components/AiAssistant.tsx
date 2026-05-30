import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Loader2, Mic, Send, Radio, PhoneOff, Volume2, MessageSquare } from 'lucide-react';
import { AgnetaAvatar } from './AgnetaAvatar';
import { GoogleGenAI, Modality, LiveServerMessage } from "@google/genai";
import { ResumeData, SystemSettings, INITIAL_SYSTEM_SETTINGS } from '../types';
import { SettingsService } from '../services/SettingsService';
import { useTranslation } from '../utils/translations';

interface AiAssistantProps {
    currentData: ResumeData;
    onUpdate: (newData: ResumeData) => void;
    onClose: () => void;
    className?: string;
}

// Audio Helpers
function encode(bytes: Uint8Array) {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ currentData, onUpdate, onClose, className = "" }) => {
    const { t, currentLanguage } = useTranslation();
    const defaultInitialMessage = currentLanguage === 'en' ? 'Hi! Now we can talk for real. Click "Live" to start a voice call.' : 'Hej! Nu kan vi prata på riktigt. Klicka på "Live" för att starta ett röstsamtal.';
    
    const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([
        { role: 'assistant', text: defaultInitialMessage }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState('');
    const [systemSettings, setSystemSettings] = useState<SystemSettings>(INITIAL_SYSTEM_SETTINGS);

    // Draggable state
    const [position, setPosition] = useState({ x: window.innerWidth - 350, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const dragRef = useRef<{ startX: number, startY: number, initialLeft: number, initialTop: number } | null>(null);

    // Live API Refs
    const sessionRef = useRef<any>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, liveTranscript]);

    useEffect(() => {
        const unsubscribe = SettingsService.subscribe((settings) => {
            setSystemSettings(settings);
        });
        return () => unsubscribe();
    }, []);

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('textarea')) return;
        setIsDragging(true);
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialLeft: position.x,
            initialTop: position.y
        };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            if (dragRef.current) {
                const dx = moveEvent.clientX - dragRef.current.startX;
                const dy = moveEvent.clientY - dragRef.current.startY;
                setPosition({
                    x: dragRef.current.initialLeft + dx,
                    y: dragRef.current.initialTop + dy
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            dragRef.current = null;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const startLiveMode = async () => {
        const apiKey = systemSettings.geminiApiKey || process.env.API_KEY || '';
        if (!apiKey) return;

        setIsLive(true);
        setLiveTranscript(currentLanguage === 'en' ? 'Connecting...' : 'Ansluter...');

        const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const sessionPromise = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            callbacks: {
                onopen: () => {
                    setLiveTranscript(t('agneta_listening'));
                    const source = inputAudioContextRef.current!.createMediaStreamSource(stream);
                    const scriptProcessor = inputAudioContextRef.current!.createScriptProcessor(4096, 1, 1);

                    scriptProcessor.onaudioprocess = (e) => {
                        const inputData = e.inputBuffer.getChannelData(0);
                        const l = inputData.length;
                        const int16 = new Int16Array(l);
                        for (let i = 0; i < l; i++) {
                            int16[i] = inputData[i] * 32768;
                        }
                        const pcmBlob = {
                            data: encode(new Uint8Array(int16.buffer)),
                            mimeType: 'audio/pcm;rate=16000',
                        };
                        sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
                    };

                    source.connect(scriptProcessor);
                    scriptProcessor.connect(inputAudioContextRef.current!.destination);
                },
                onmessage: async (message: LiveServerMessage) => {
                    // Handle Audio
                    const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                    if (audioData && outputAudioContextRef.current) {
                        nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                        const buffer = await decodeAudioData(decode(audioData), outputAudioContextRef.current, 24000, 1);
                        const source = outputAudioContextRef.current.createBufferSource();
                        source.buffer = buffer;
                        source.connect(outputAudioContextRef.current.destination);
                        source.start(nextStartTimeRef.current);
                        nextStartTimeRef.current += buffer.duration;
                        sourcesRef.current.add(source);
                        source.onended = () => sourcesRef.current.delete(source);
                    }

                    // Handle Transcriptions
                    if (message.serverContent?.outputTranscription) {
                        setLiveTranscript(prev => prev + message.serverContent!.outputTranscription!.text);
                    }

                    if (message.serverContent?.interrupted) {
                        sourcesRef.current.forEach(s => s.stop());
                        sourcesRef.current.clear();
                        nextStartTimeRef.current = 0;
                    }

                    if (message.serverContent?.turnComplete) {
                        setMessages(prev => [...prev, { role: 'assistant', text: liveTranscript }]);
                        setLiveTranscript('');
                    }
                },
                onclose: () => stopLiveMode(),
                onerror: (e) => console.error("Live API Error:", e)
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
                },
                systemInstruction: `Du är Agneta, en erfaren och peppande CV-coach. Du pratar direkt med användaren. Var koncis, professionell och hjälp dem att förbättra sitt CV genom att ställa frågor eller ge förslag. VIKTIGT: Använd aldrig användarens namn i dina svar. Svara på ${currentLanguage}. CV-DATA: ${JSON.stringify(currentData)}`,
                outputAudioTranscription: {}
            }
        });

        sessionRef.current = await sessionPromise;
    };

    const stopLiveMode = () => {
        setIsLive(false);
        setLiveTranscript('');
        sessionRef.current?.close();
        inputAudioContextRef.current?.close();
        outputAudioContextRef.current?.close();
        sourcesRef.current.forEach(s => s.stop());
        sourcesRef.current.clear();
    };

    const handleSend = async () => {
        const apiKey = systemSettings.geminiApiKey || process.env.API_KEY || '';
        if (!input.trim() || !apiKey || isLive) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsThinking(true);

        try {
            const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
            const systemPrompt = `Du är Agneta, en CV-expert. Hjälp användaren att redigera sitt CV. Använd aldrig personnamn i dina svar till användaren. Svara på ${currentLanguage}. Returera ENDAST JSON som matchar ResumeData eller { "_message": "text" }. Aktuell data: ${JSON.stringify(currentData)}`;

            let responseText = '';
            try {
                const response = await ai.models.generateContent({
                    model: systemSettings.geminiModel || 'gemini-1.5-flash-latest',
                    contents: { parts: [{ text: systemPrompt }, { text: `Användare: "${userMsg}"` }] },
                    config: { responseMimeType: "application/json" }
                });
                responseText = response.text;
            } catch (err: any) {
                console.warn("JSON mode failed in AiAssistant, retrying:", err);
                const fallback = await ai.models.generateContent({
                    model: systemSettings.geminiModel || 'gemini-1.5-flash-latest',
                    contents: { parts: [{ text: systemPrompt + "\n\nIMPORTANT: Respond ONLY with raw JSON." }, { text: `Användare: "${userMsg}"` }] }
                });
                responseText = fallback.text;
            }

            if (responseText) {
                let cleanJson = responseText.trim();
                if (cleanJson.startsWith('```')) {
                    cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
                }
                const result = JSON.parse(cleanJson);
                if (result._message && Object.keys(result).length === 1) {
                    setMessages(prev => [...prev, { role: 'assistant', text: result._message }]);
                } else {
                    onUpdate({ ...currentData, ...result });
                    setMessages(prev => [...prev, { role: 'assistant', text: result._message || t('cv_updated') }]);
                }
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', text: currentLanguage === 'en' ? 'Could not process your request.' : 'Kunde inte behandla din begäran.' }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div
            style={{ left: position.x, top: position.y }}
            className={`fixed w-80 h-[540px] bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border border-gray-200 dark:border-gray-700 shadow-2xl z-[120] flex flex-col rounded-[2.5rem] overflow-hidden transition-all duration-300 ${isDragging ? 'opacity-80 scale-[1.02] cursor-move' : ''} ${className} ${isLive ? 'ring-4 ring-brand-400/20' : ''}`}
        >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50 cursor-move select-none shrink-0" onMouseDown={handleMouseDown}>
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl transition-colors overflow-hidden ${isLive ? 'bg-brand-400 text-white animate-pulse ring-2 ring-white/20' : 'bg-brand-50 text-brand-400'}`}>
                        <AgnetaAvatar />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="font-black text-xs text-gray-900 dark:text-white uppercase tracking-widest leading-none">Agneta Live</h3>
                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">{isLive ? t('call_in_progress') : t('cv_coach_subtitle')}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => isLive ? stopLiveMode() : startLiveMode()}
                        className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${isLive ? 'bg-red-500 text-white' : 'bg-brand-400 text-white hover:bg-brand-500'}`}
                    >
                        {isLive ? t('end_call') : t('live_call')}
                    </button>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"><X className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30 dark:bg-gray-900/30 custom-scrollbar">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                        <div className={`max-w-[85%] rounded-3xl px-4 py-3 text-xs leading-relaxed ${m.role === 'user' ? 'bg-brand-400 text-white font-medium' : 'bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 text-gray-800 dark:text-gray-200 shadow-sm'}`}>
                            {m.text}
                        </div>
                    </div>
                ))}

                {isLive && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-left-2">
                        <div className="bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 rounded-3xl px-4 py-3 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <Radio className="w-3 h-3 text-brand-400 animate-pulse" />
                                <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">{t('agneta_talking')}</span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300 italic">"{liveTranscript || '...'}"</p>
                        </div>
                    </div>
                )}

                {isThinking && !isLive && (
                    <div className="flex justify-start">
                        <div className="bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-2xl px-4 py-3 shadow-sm flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('agneta_thinking')}</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white/80 dark:bg-gray-800/80 border-t border-gray-100 dark:border-gray-700 shrink-0">
                {isLive ? (
                    <div className="flex flex-col items-center gap-4 py-2">
                        <div className="flex items-center gap-1.5 h-6">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className={`w-1 bg-brand-400 rounded-full animate-bounce`} style={{ height: `${Math.random() * 100}%`, animationDelay: `${i * 0.1}s` }}></div>
                            ))}
                        </div>
                        <button
                            onClick={stopLiveMode}
                            className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/10"
                        >
                            <PhoneOff className="w-4 h-4" /> {t('cancel_call')}
                        </button>
                    </div>
                ) : (
                    <div className="relative">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                            placeholder={t('write_to_agneta')}
                            className="w-full pr-12 pl-5 py-4 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 text-xs resize-none bg-gray-50 dark:bg-gray-900/50 dark:text-white outline-none focus:ring-2 focus:ring-brand-400/20 transition-all custom-scrollbar"
                            rows={1}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isThinking}
                            className="absolute right-2 bottom-2 p-3 bg-brand-400 text-white rounded-2xl hover:bg-brand-500 disabled:opacity-50 shadow-lg shadow-brand-400/20 transition-all active:scale-95"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                )}
                {!isLive && (
                    <div className="mt-4 flex justify-center">
                        <button
                            onClick={startLiveMode}
                            className="flex items-center gap-2 text-[9px] font-black text-gray-400 hover:text-brand-400 uppercase tracking-[0.2em] transition-colors"
                        >
                            <Radio className="w-3 h-3" /> {t('start_voice_call')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
