import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, Square, Loader2, CheckCircle2, Circle, ChevronRight, Wand2, Pause, Play } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { ResumeData, SystemSettings, INITIAL_SYSTEM_SETTINGS } from '../types';
import { SettingsService } from '../services/SettingsService';
import { MonitoringService } from '../services/MonitoringService';
import { useTranslation } from '../utils/translations';

interface Props {
    onClose: () => void;
    onAnalysisComplete: (data: Partial<ResumeData>) => void;
    currentName: string;
}

const INTERVIEW_GUIDE = [
    {
        id: 'personal',
        title: 'Personuppgifter',
        questions: [
            "Vad är ditt för- och efternamn?",
            "Var bor du (stad/ort)?",
            "Vad är ditt telefonnummer och mailadress?",
            "När är du född (år-månad-dag)?"
        ]
    },
    {
        id: 'intro',
        title: 'Mål & Inriktning',
        questions: [
            "Vad för typ av jobb söker du just nu?",
            "Vilken yrkestitel skulle du säga passar dig bäst?",
            "Har du någon speciell bransch du vill jobba inom?",
            "Vad är din främsta styrka som anställd?"
        ]
    },
    {
        id: 'experience',
        title: 'Arbetslivserfarenhet',
        questions: [
            "Låt oss gå igenom dina jobb. Vi börjar med det senaste: Vad hette arbetsgivaren och vilken roll hade du?",
            "När startade du och när slutade du? (Ange år och gärna månad)",
            "Vad gjorde du rent konkret om dagarna? Beskriv dina huvudsakliga arbetsuppgifter.",
            "Uppnådde du några specifika resultat eller genomförde du några projekt du är stolt över?",
            "Vilka system eller verktyg använde du?",
            "Har du fler relevanta jobb innan dess? Berätta samma sak om dem (Företag, roll, datum och vad du gjorde)."
        ]
    },
    {
        id: 'education',
        title: 'Utbildning & Certifikat',
        questions: [
            "Vilken är din högsta avslutade utbildning? (Skola, program och år)",
            "Gjorde du något examensarbete eller praktik under utbildningen som är värt att nämna?",
            "Har du några körkort (B-körkort, Truckkort, C-kort)?",
            "Har du gått några fristående kurser eller certifieringar (t.ex. Heta Arbeten, Ledarskap, HLR)?"
        ]
    },
    {
        id: 'skills',
        title: 'Kompetenser & Personligt',
        questions: [
            "Vilka språk talar du och på vilken nivå?",
            "Är du duktig på några specifika dataprogram (Office-paketet, Adobe, bokföringssystem)?",
            "Hur skulle en kollega beskriva dig med tre ord?",
            "Vad gör du helst på fritiden? (Detta ger en personlig touch)"
        ]
    }
];

export const InterviewModal: React.FC<Props> = ({ onClose, onAnalysisComplete, currentName }) => {
    const { t, currentLanguage } = useTranslation();
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [activeSection, setActiveSection] = useState(0);
    const [systemSettings, setSystemSettings] = useState<SystemSettings>(INITIAL_SYSTEM_SETTINGS);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        const unsubscribe = SettingsService.subscribe((settings) => {
            setSystemSettings(settings);
        });
        return () => unsubscribe();
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setIsPaused(false);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Microphone access denied", err);
            alert(t('mic_access_denied'));
        }
    };

    const pauseRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const resumeRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setIsPaused(false);
            if (timerRef.current) clearInterval(timerRef.current);

            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: mimeType });
                analyzeAudio(blob, mimeType);
            };
        }
    };

    const analyzeAudio = async (audioBlob: Blob, mimeType: string) => {
        const apiKey = systemSettings.geminiApiKey || process.env.API_KEY || '';
        if (!apiKey) {
            alert(t('ai_not_configured_interview'));
            setIsAnalyzing(false);
            return;
        }

        setIsAnalyzing(true);

        try {
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64data = (reader.result as string).split(',')[1];
                const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

                const prompt = `
                    Du är en professionell CV-coach. Du har lyssnat på en deltagare (${currentName || "Deltagaren"}).
                    
                    UPPGIFT:
                    1. Extrahera CV-data till JSON. Output MÅSTE skrivas på språket "${currentLanguage}".
                    2. SKRIV EN PROFILTEXT: Använd <b>-taggar för att markera 3-4 nyckelkompetenser direkt i texten.
                    3. JOBDBESKRIVNINGAR: Använd HTML-punktlistor (<ul><li>). 
                    4. VIKTIGT: Använd <b>-taggar inuti <li> för att markera system, verktyg eller specifika resultat. Det ska se proffsigt ut.
                    5. Se till att texten är redo att visas i CV-mallen utan extra handpåläggning.

                    JSON Output Format:
                    {
                        "personal": { ... },
                        "profile": "Text med <b>nyckelord</b>...",
                        "experience": [
                            { "role": "", "company": "", "description": "<ul><li>Ansvarade för <b>orderplock</b> och <b>logistikplanering</b></li></ul>", ... }
                        ],
                        "education": [...],
                        "skills": [...],
                        "languages": [...]
                    }
                `;

                const response = await ai.models.generateContent({
                    model: systemSettings.geminiModel || 'gemini-flash-latest',
                    contents: {
                        parts: [
                            { inlineData: { mimeType: mimeType, data: base64data } },
                            { text: prompt }
                        ]
                    },
                    config: { responseMimeType: "application/json" }
                });

                const text = response.text;
                if (text) {
                    // Sanitize JSON
                    const startIndex = text.indexOf('{');
                    const endIndex = text.lastIndexOf('}');
                    if (startIndex === -1 || endIndex === -1) {
                        throw new Error("Kunde inte hitta giltig JSON i AI-svaret");
                    }
                    const cleanJson = text.substring(startIndex, endIndex + 1);
                    const data = JSON.parse(cleanJson);
                    if (data.experience) data.experience = data.experience.map((i: any) => ({ ...i, id: Date.now().toString() + Math.random() }));
                    if (data.education) data.education = data.education.map((i: any) => ({ ...i, id: Date.now().toString() + Math.random() }));
                    if (data.skills) data.skills = data.skills.map((i: any) => ({ ...i, id: Date.now().toString() + Math.random() }));
                    if (data.languages) data.languages = data.languages.map((i: any) => ({ ...i, id: Date.now().toString() + Math.random() }));

                    onAnalysisComplete(data);
                    onClose();
                }
            };
        } catch (error: any) {
            console.error("Analysis failed", error);

            // Log failure to monitoring system
            MonitoringService.logAIError(
                systemSettings.geminiModel || 'gemini-flash-latest',
                error?.message || "Unknown error",
                'interview'
            );

            alert(t('analysis_failed'));
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex overflow-hidden border border-gray-200">

                {/* LEFT: COACH GUIDE */}
                <div className="w-1/3 bg-gray-50 border-r border-gray-200 flex flex-col">
                    <div className="p-6 border-b border-gray-200 bg-white">
                        <h2 className="text-lg font-bold text-gray-900">{t('interview_guide')}</h2>
                        <p className="text-sm text-gray-500">{t('ask_questions_desc')}</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {INTERVIEW_GUIDE.map((section, idx) => (
                            <div
                                key={section.id}
                                className={`rounded-lg border transition-all duration-200 cursor-pointer group ${activeSection === idx
                                    ? 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-100'
                                    : 'bg-white border-transparent hover:border-gray-200 hover:shadow-sm'
                                    }`}
                                onClick={() => setActiveSection(idx)}
                            >
                                <div className="p-4 flex justify-between items-center">
                                    <h3 className={`font-semibold text-sm ${activeSection === idx ? 'text-blue-800' : 'text-gray-700'}`}>{section.title}</h3>
                                    {activeSection === idx ? (
                                        <ChevronRight className="w-4 h-4 text-blue-500 transform rotate-90 transition-transform" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                                    )}
                                </div>
                                {activeSection === idx && (
                                    <div className="px-4 pb-4 pt-0 space-y-3">
                                        {section.questions.map((q, qIdx) => (
                                            <div key={qIdx} className="flex gap-3 text-sm text-gray-700">
                                                <div className="mt-0.5 min-w-[16px]">
                                                    <Circle className="w-4 h-4 text-blue-300" />
                                                </div>
                                                <span>{q}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="p-4 border-t border-gray-200 bg-white">
                        <div className="flex justify-between items-center text-xs text-gray-500 font-medium">
                            <button onClick={() => setActiveSection(Math.max(0, activeSection - 1))} disabled={activeSection === 0} className="disabled:opacity-30 hover:text-gray-900 px-3 py-2 rounded hover:bg-gray-100 transition-colors">{t('previous')}</button>
                            <span>{t('step_x_of_y').replace('{current}', (activeSection + 1).toString()).replace('{total}', INTERVIEW_GUIDE.length.toString())}</span>
                            <button onClick={() => setActiveSection(Math.min(INTERVIEW_GUIDE.length - 1, activeSection + 1))} disabled={activeSection === INTERVIEW_GUIDE.length - 1} className="disabled:opacity-30 hover:text-gray-900 px-3 py-2 rounded hover:bg-gray-100 transition-colors">{t('next')}</button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: RECORDING INTERFACE */}
                <div className="flex-1 bg-white flex flex-col relative">
                    <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors z-10">
                        <X className="w-6 h-6" />
                    </button>

                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                        {isAnalyzing ? (
                            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
                                <div className="relative">
                                    <div className="w-24 h-24 bg-violet-100 rounded-full flex items-center justify-center animate-pulse">
                                        <Wand2 className="w-10 h-10 text-violet-600" />
                                    </div>
                                    <div className="absolute inset-0 border-4 border-violet-200 rounded-full border-t-violet-600 animate-spin"></div>
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('analyzing_call')}</h3>
                                    <p className="text-gray-500 max-w-md mx-auto">{t('ai_transcribing')}</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className={`w-40 h-40 rounded-full flex items-center justify-center mb-8 transition-all duration-500 ${isRecording && !isPaused ? 'bg-red-50 ring-4 ring-red-100 scale-110' : isPaused ? 'bg-amber-50 ring-4 ring-amber-100' : 'bg-gray-50 ring-4 ring-gray-100'}`}>
                                    {isRecording ? (
                                        isPaused ? (
                                            <Pause className="w-16 h-16 text-amber-500" />
                                        ) : (
                                            <div className="relative w-full h-full flex items-center justify-center">
                                                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-20 animate-ping"></span>
                                                <Mic className="w-16 h-16 text-red-500" />
                                            </div>
                                        )
                                    ) : (
                                        <Mic className="w-16 h-16 text-gray-400" />
                                    )}
                                </div>

                                <div className="space-y-2 mb-12">
                                    <h2 className="text-4xl font-mono font-bold text-gray-900 tabular-nums">
                                        {formatTime(recordingTime)}
                                    </h2>
                                    <p className={`text-sm font-medium uppercase tracking-widest ${isRecording && !isPaused ? 'text-red-500 animate-pulse' : isPaused ? 'text-amber-500' : 'text-gray-400'}`}>
                                        {isRecording && !isPaused ? `• ${t('recording_call')}` : isPaused ? `|| ${t('paused')}` : t('ready_to_record')}
                                    </p>
                                </div>

                                {!isRecording ? (
                                    <button
                                        onClick={startRecording}
                                        className="group relative flex items-center justify-center gap-3 bg-gray-900 hover:bg-black text-white px-8 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105 hover:shadow-xl shadow-lg shadow-gray-200"
                                    >
                                        <div className="w-3 h-3 bg-red-500 rounded-full group-hover:animate-pulse"></div>
                                        {t('start_recording')}
                                    </button>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        {!isPaused ? (
                                            <button
                                                onClick={pauseRecording}
                                                className="flex items-center justify-center gap-2 bg-amber-100 text-amber-700 hover:bg-amber-200 px-6 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105"
                                            >
                                                <Pause className="w-5 h-5 fill-current" />
                                                {t('pause')}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={resumeRecording}
                                                className="flex items-center justify-center gap-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-6 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105"
                                            >
                                                <Play className="w-5 h-5 fill-current" />
                                                {t('resume')}
                                            </button>
                                        )}

                                        <button
                                            onClick={stopRecording}
                                            className="flex items-center justify-center gap-2 bg-white border-2 border-red-100 text-red-600 hover:bg-red-50 px-6 py-4 rounded-full text-lg font-semibold transition-all hover:scale-105 shadow-lg"
                                        >
                                            <Square className="w-5 h-5 fill-current" />
                                            {t('finish')}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
