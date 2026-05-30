import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ZoomIn, ZoomOut, Download, Loader2, Save, CheckCircle2, Send, MessageSquare, Sparkles, Maximize, GripHorizontal, RotateCcw, Briefcase, MapPin, Search, ExternalLink, Wand2
} from 'lucide-react';
import { ResumeData } from '../types';
import { CvPreview } from './CvPreview';
import { GoogleGenAI } from "@google/genai";
import { AgnetaAvatar } from './AgnetaAvatar';
import { SystemSettings, INITIAL_SYSTEM_SETTINGS } from '../types';
import { SettingsService } from '../services/SettingsService';
import { JobSearchService, JobAd } from '../services/JobSearchService';
import { PdfService } from '../services/PdfService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: ResumeData;
  onUpdate: (newData: ResumeData) => void;
  onDownload: () => void;
  onManualSave: () => Promise<void>;
  isExporting: boolean;
  isSaving: boolean;
  saveSuccess: boolean;
  docType: { type: 'cv' | 'pb'; id?: string };
  onDocTypeChange: (newType: { type: 'cv' | 'pb'; id?: string }) => void;
}

export const FullPreviewModal: React.FC<Props> = ({
  isOpen, onClose, data, onUpdate, onDownload, onManualSave,
  isExporting, isSaving, saveSuccess, docType, onDocTypeChange
}) => {
  const [scale, setScale] = useState(0.85);
  const [agnetaScale, setAgnetaScale] = useState(1.0);
  const [isAgnetaOpen, setIsAgnetaOpen] = useState(false);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(INITIAL_SYSTEM_SETTINGS);

  // DRAG STATE
  const getStartPosition = () => ({
    x: window.innerWidth - 110,
    y: window.innerHeight - 130
  });

  const [agnetaPos, setAgnetaPos] = useState(getStartPosition());
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const [aiInput, setAiInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', text: string }[]>([]);
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const cvContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<boolean>(false);

  // JOB SEARCH STATE
  const [activeTab, setActiveTab] = useState<'chat' | 'jobs'>('chat');
  const [jobQuery, setJobQuery] = useState(data.personal.jobTitle || '');
  const [jobLocation, setJobLocation] = useState(data.personal.city || '');
  const [jobs, setJobs] = useState<JobAd[]>([]);
  const [isSearchingJobs, setIsSearchingJobs] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    const unsubscribe = SettingsService.subscribe((settings) => {
      setSystemSettings(settings);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAgnetaOpen && isOpen) {
      setAgnetaPos(getStartPosition());
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('textarea')) return;

    setIsDragging(true);
    dragOffset.current = {
      x: e.clientX - agnetaPos.x,
      y: e.clientY - agnetaPos.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setAgnetaPos({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleCancelAi = () => {
    abortControllerRef.current = true;
    setIsAiThinking(false);
    setMessages(prev => [...prev, { role: 'assistant', text: 'Okej, jag avbröt tanken. Vad kan jag hjälpa dig med istället?' }]);
  };

  const handleAiAction = async () => {
    const apiKey = systemSettings.geminiApiKey || process.env.API_KEY || '';
    if (!aiInput.trim() || isAiThinking || !apiKey) return;

    const userMsg = aiInput;
    setAiInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsAiThinking(true);
    abortControllerRef.current = false;

    try {
      const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });

      // OPTIMIZATION: Strip image data to reduce payload size to Gemini
      const dataForAi = { ...data };
      const originalPhoto = dataForAi.personal.photoUrl;
      dataForAi.personal.photoUrl = ""; // Remove heavy image

      const systemPrompt = `
        Du är AGNETA - CV-expert. 
        Användaren tittar på sin förhandsgranskning och vill göra ändringar.
        Ditt mål är att hjälpa användaren att få CV:t perfekt.
        Returnera ALLTID JSON med uppdaterad ResumeData.
        Inkludera fältet "_message" för att svara användaren peppande på svenska.
        VIKTIGT: Du får en version av datan utan profilbild för att spara tid. Returnera INTE en 'photoUrl' i ditt svar om du inte blir specifikt ombedd att ta bort den helt.
        VIKTIGT: Använd aldrig användarens namn i ditt svar.
        DATA: ${JSON.stringify(dataForAi)}
      `;

      let responseText = '';
      try {
        const response = await ai.models.generateContent({
          model: systemSettings.geminiModel || 'gemini-1.5-flash-latest',
          contents: { parts: [{ text: systemPrompt }, { text: userMsg }] },
          config: { responseMimeType: "application/json" }
        });
        responseText = response.text;
      } catch (jsonErr: any) {
        console.warn("JSON mode failed in FullPreviewModal, retrying:", jsonErr);
        const fallback = await ai.models.generateContent({
          model: systemSettings.geminiModel || 'gemini-1.5-flash-latest',
          contents: { parts: [{ text: systemPrompt + "\n\nIMPORTANT: Respond ONLY with raw JSON." }, { text: userMsg }] }
        });
        responseText = fallback.text;
      }

      if (abortControllerRef.current) return;

      let cleanJson = responseText.trim();
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();
      }

      const result = JSON.parse(cleanJson);

      // Extract message and data separately
      const aiMessage = result._message || 'Ändringarna är gjorda!';
      setMessages(prev => [...prev, { role: 'assistant', text: aiMessage }]);

      // Create a copy without the _message field
      const { _message, ...aiData } = result;

      // Merge back the original photo if it exists
      if (aiData.personal && originalPhoto) {
        aiData.personal.photoUrl = originalPhoto;
      }

      // Apply the AI's changes - this is the full updated ResumeData
      if (Object.keys(aiData).length > 0) {
        console.log('Applying AI updates:', aiData);
        onUpdate(aiData as ResumeData);
      }
    } catch (error) {
      if (!abortControllerRef.current) {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Förlåt, jag fick lite problem med anslutningen. Kan du prova att skriva igen?' }]);
      }
    } finally {
      if (!abortControllerRef.current) {
        setIsAiThinking(false);
      }
    }
  };

  const handleSearchJobs = async () => {
    if (!jobQuery.trim() && !jobLocation.trim()) return;

    console.log('🔍 Söker jobb:', { jobQuery, jobLocation });

    setIsSearchingJobs(true);
    setSearchError(null);
    try {
      const resp = await JobSearchService.searchJobs(jobQuery, jobLocation);
      console.log('✅ Jobb hittade:', resp);
      setJobs(resp.hits);

      if (resp.hits.length === 0) {
        setSearchError('Inga jobb hittades. Försök med andra sökord.');
      }
    } catch (err) {
      console.error('❌ Jobbsökning misslyckades:', err);
      setSearchError(`Kunde inte hämta jobb: ${err instanceof Error ? err.message : 'Okänt fel'}`);
    } finally {
      setIsSearchingJobs(false);
    }
  };

  const triggerAiCustomPrompt = async (customPrompt: string) => {
    const apiKey = systemSettings.geminiApiKey || process.env.API_KEY || '';
    if (!apiKey) return;

    setIsAiThinking(true);
    abortControllerRef.current = false;

    try {
      const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
      const dataForAi = { ...data };
      dataForAi.personal.photoUrl = "";

      const systemPrompt = `
        Du är AGNETA - CV-expert. 
        Användaren vill söka ett specifikt jobb.
        Din uppgift är att skriva ett utkast till ett personligt brev som matchar användarens CV mot det sökta jobbet.
        Var personlig, engagerad och professionell. Skriv på svenska.
        
        Viktigt för formatet i "coverLetters":
        Varje brev MÅSTE ha fälten:
        - "id": Ett unikt id (t.ex. "pb_" + tidsstämpel)
        - "title": En passande titel för brevet
        - "content": Själva textinnehållet (använd HTML-paragrafer <p>)
        - "lastEdited": Dagens datum i ISO-format

        Returnera JSON med det uppdaterade ResumeData (du kan lägga till brevet i data.coverLetters).
        Inkludera fältet "_message" för att peppa användaren och förklara vad du gjort.
        DATA: ${JSON.stringify(dataForAi)}
      `;

      const response = await ai.models.generateContent({
        model: systemSettings.geminiModel || 'gemini-1.5-flash-latest',
        contents: { parts: [{ text: systemPrompt }, { text: customPrompt }] },
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text.replace(/```json\s?|```/g, '').trim());
      const aiMessage = result._message || 'Jag har tagit fram ett utkast på en ansökan till dig!';
      setMessages(prev => [...prev, { role: 'assistant', text: aiMessage }]);

      const { _message, ...aiData } = result;

      // Normalize casing for coverLetters
      if ((aiData as any).coverletters && !aiData.coverLetters) {
        aiData.coverLetters = (aiData as any).coverletters;
        delete (aiData as any).coverletters;
      }

      // Normalize content field (Agneta might use 'text' or 'body' sometimes)
      if (aiData.coverLetters && Array.isArray(aiData.coverLetters)) {
        aiData.coverLetters = aiData.coverLetters.map((l: any) => ({
          ...l,
          content: l.content || l.text || l.body || l.message || ''
        }));
      }

      if (Object.keys(aiData).length > 0) {
        // If AI returned coverLetters, we want to APPEND them if they are new
        if (aiData.coverLetters && Array.isArray(aiData.coverLetters)) {
          const existingIds = (data.coverLetters || []).map(l => l.id);
          const newLetters = aiData.coverLetters.filter((l: any) => !existingIds.includes(l.id));

          if (newLetters.length > 0) {
            // We found new letters! Merge them with existing ones
            const mergedLetters = [...(data.coverLetters || []), ...newLetters];
            onUpdate({ ...aiData, coverLetters: mergedLetters } as ResumeData);

            // Automatically switch view to the first new letter
            onDocTypeChange({ type: 'pb', id: newLetters[0].id });
          } else {
            // No new IDs? AI might have returned the WHOLE list including the new one with an ID we don't know
            // Or it just updated existing ones. Treat as is.
            onUpdate(aiData as ResumeData);
          }
        } else {
          onUpdate(aiData as ResumeData);
        }
      }
    } catch (error) {
      console.error("AI Letter Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', text: 'Hoppsan, jag fick problem med att skriva brevet. Kan du prova att be mig igen?' }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleApplyForJob = (job: JobAd) => {
    setActiveTab('chat');

    // Preparation message
    const promptText = `Jag vill söka jobbet som "${job.headline}" hos "${job.company_name}". Kan du hjälpa mig att skriva ett förslag på en ansökan/personligt brev baserat på mitt CV?`;

    // We don't just set the input, we trigger the action directly with a special context
    setMessages(prev => [...prev, { role: 'user', text: promptText }]);

    // Call AI action with this specific request
    triggerAiCustomPrompt(promptText);
  };

  const handleDownloadPdfInternal = async () => {
    if (!cvContainerRef.current) return;

    // 1. Prepare filename
    const firstName = data.personal.firstName || '';
    const lastName = data.personal.lastName || '';
    const today = new Date().toISOString().split('T')[0];
    let fileName = '';
    if (docType.type === 'cv') {
      const name = `${firstName} ${lastName}`.trim() || 'CV';
      fileName = `${name} - CV - ${today}`;
    } else {
      const pb = data.coverLetters?.find(l => l.id === docType.id);
      const name = `${firstName} ${lastName}`.trim() || 'Brev';
      let company = '';
      if (pb?.title) {
        company = pb.title.replace(/^(Personligt\s)?Brev\s*-?\s*/i, '').trim() || today;
      } else {
        company = today;
      }
      fileName = `${name} - Brev - ${company}`;
    }

    // Clean up filename for Windows compatibility
    fileName = fileName.replace(/[<>:"/\\|?*]/g, '-').trim();

    try {
      // Use the visible CV container that the user is actually looking at
      const element = cvContainerRef.current;
      if (!element) throw new Error('Kunde inte hitta CV-behållaren.');

      // Temporarily disable scale to ensure 1:1 capture
      const parentElement = element.parentElement;
      let originalTransform = '';
      if (parentElement) {
        originalTransform = parentElement.style.transform;
        parentElement.style.transform = 'scale(1)';
        // Give the browser a moment to apply the transform
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      try {
        // 3. Generate and download PDF with metadata
        await PdfService.downloadPdf(data, fileName, element);
      } finally {
        // Always restore the scale, even if export fails
        if (parentElement) {
          parentElement.style.transform = originalTransform;
        }
      }
      
    } catch (error) {
      console.error('PDF Generation failed:', error);
      alert('Det gick inte att skapa PDF:en. Kontrollera din internetanslutning och försök igen.');
    } finally {
        document.body.classList.remove('is-exporting');
    }
  };

  const openAgneta = () => {
    setIsAgnetaOpen(true);
    setAgnetaPos(prev => ({
      x: Math.min(prev.x, window.innerWidth - 480),
      y: Math.max(100, Math.min(prev.y, window.innerHeight - 700))
    }));
  };

  const closeAgneta = () => {
    setIsAgnetaOpen(false);
    setAgnetaPos(getStartPosition());
  };

  if (!isOpen) return null;

  // Render the print container unconditionally when the modal is open
    const printPortal = (
    <div className="print-container">
      <CvPreview
        data={data}
        template={data.template || 'classic-sidebar'}
        brevId={docType.type === 'pb' ? docType.id : undefined}
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-[200] bg-[#f1f5f9] flex flex-col animate-in fade-in duration-500 overflow-hidden font-sans text-slate-900">
      {/* HEADER */}
      <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-8 shrink-0 z-50">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl text-slate-400 transition-all hover:text-slate-900 hover:scale-110 active:scale-95">
            <X className="w-6 h-6" />
          </button>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="flex flex-col">
            <h2 className="text-slate-400 font-black uppercase tracking-[0.3em] text-[10px]">{systemSettings.companyName || 'Aventus'} Förhandsgranskning</h2>
            <span className="text-slate-600 text-xs font-medium">{data.title || 'Namnlöst dokument'}</span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
            <button onClick={() => setScale(s => Math.max(0.4, s - 0.1))} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all shadow-none hover:shadow-sm"><ZoomOut className="w-4 h-4" /></button>
            <span className="text-[11px] font-black text-slate-600 w-14 text-center tabular-nums">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(1.5, s + 0.1))} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-white rounded-lg transition-all shadow-none hover:shadow-sm"><ZoomIn className="w-4 h-4" /></button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onManualSave}
              disabled={isSaving}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border shadow-sm ${saveSuccess ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : (saveSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />)}
              {saveSuccess ? 'Dokumentet Sparat' : 'Spara ändringar'}
            </button>
            <button onClick={handleDownloadPdfInternal} disabled={isExporting} className="bg-brand-400 hover:bg-brand-500 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-brand-400/20 hover:scale-[1.02] active:scale-95">
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <div className="flex items-center gap-2"><Download className="w-4 h-4" /> Exportera PDF</div>}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 relative overflow-hidden bg-slate-100">
        {/* PREVIEW AREA */}
        <div ref={previewAreaRef} className="absolute inset-0 overflow-auto flex items-start justify-start p-10 lg:p-20 lg:pl-40 xl:pl-60 custom-scrollbar scroll-smooth">
          <div
            className={`relative transition-all duration-500 origin-top mb-40 text-black bg-transparent`}
            style={{
              transform: `scale(${scale})`,
              width: '794px'
            }}
          >
            <div ref={cvContainerRef} className="relative bg-transparent">
              <CvPreview
                data={data}
                template={data.template || 'classic-sidebar'}
                brevId={docType.type === 'pb' ? docType.id : undefined}
              />
            </div>
          </div>
        </div>

        {/* FLYTANDE OCH DRAGBAR AGNETA AI */}
        <div
          className={`fixed z-[100] flex flex-col items-end gap-6 ${!isDragging ? 'transition-all duration-500 ease-out' : ''}`}
          style={{
            left: agnetaPos.x,
            top: agnetaPos.y,
            cursor: isDragging ? 'grabbing' : 'default'
          }}
        >
          {isAgnetaOpen && (
            <div
              onMouseDown={handleMouseDown}
              className={`h-[calc(100vh-250px)] bg-white/95 backdrop-blur-3xl border border-slate-200 rounded-[3rem] shadow-[0_40px_100px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden ring-1 ring-black/5 transition-all ${isDragging ? 'opacity-80 scale-[1.02] rotate-1 shadow-[0_60px_120px_rgba(0,0,0,0.2)]' : ''}`}
              style={{
                width: isWide ? '800px' : '450px',
                transform: `scale(${agnetaScale})`,
                transformOrigin: 'top left',
                transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.3s'
              }}
            >
              <div className="p-8 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-transparent flex items-center justify-between cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-[1.5rem] overflow-hidden bg-brand-50 p-1.5 shadow-sm border border-brand-100 ring-4 ring-brand-50/50">
                    <AgnetaAvatar />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] text-brand-400 font-bold uppercase tracking-widest mt-0.5">CV-Coach</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-white text-brand-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Chatt
                    </button>
                    <button
                      onClick={() => setActiveTab('jobs')}
                      className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'jobs' ? 'bg-white text-brand-400 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Sök Jobb
                    </button>
                  </div>

                  <div className="w-px h-6 bg-slate-200"></div>

                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 group">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:text-brand-400 transition-colors">Storlek</span>
                    <input
                      type="range"
                      min="0.8"
                      max="1.5"
                      step="0.05"
                      value={agnetaScale}
                      onChange={(e) => setAgnetaScale(parseFloat(e.target.value))}
                      className="w-16 h-1 bg-slate-200 rounded-full appearance-none cursor-pointer accent-brand-400"
                    />
                  </div>

                  <button
                    onClick={() => setIsWide(!isWide)}
                    className={`p-2 rounded-xl transition-all ${isWide ? 'bg-brand-50 text-brand-400' : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100'}`}
                    title={isWide ? "Minska" : "Förstora"}
                  >
                    <Maximize className="w-5 h-5" />
                  </button>

                  <button onClick={closeAgneta} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-0 flex flex-col custom-scrollbar bg-slate-50/50 relative">
                {/* Large Background Avatar */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.03] overflow-hidden">
                  <div className="w-[120%] aspect-square">
                    <AgnetaAvatar />
                  </div>
                </div>

                {activeTab === 'chat' ? (
                  <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {messages.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center text-center px-8 relative z-10">
                        <div className="w-32 h-32 mb-8 shadow-2xl rounded-[2.5rem] p-4 bg-white border border-slate-100 transform -rotate-3 hover:rotate-0 transition-transform duration-500">
                          <AgnetaAvatar />
                        </div>
                        <h3 className="text-slate-900 text-sm font-black uppercase tracking-widest mb-3">Hej! Behöver du hjälp?</h3>
                        <p className="text-[11px] text-slate-500 leading-relaxed font-medium max-w-[240px]">Jag kan hjälpa dig att flytta sektioner, skriva om texter eller svara på frågor om ditt CV.</p>
                      </div>
                    )}
                    {messages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300 relative z-10`}>
                        <div className={`max-w-[90%] px-5 py-4 rounded-[1.8rem] text-[12px] leading-relaxed shadow-sm ${m.role === 'user' ? 'bg-brand-400 text-white font-medium shadow-brand-400/10' : 'bg-white text-slate-700 border border-slate-100'}`}>
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {isAiThinking && (
                      <div className="flex justify-start animate-pulse relative z-10">
                        <div className="bg-white border border-slate-100 rounded-[1.8rem] px-5 py-4 shadow-sm flex items-center gap-3">
                          <div className="flex gap-1">
                            <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce"></div>
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agneta analyserar...</span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                    <div className="p-6 bg-white border-b border-slate-100 space-y-3 shadow-sm">
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            value={jobQuery}
                            onChange={(e) => setJobQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchJobs()}
                            placeholder="Yrke eller sökord..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-400/10 transition-all"
                          />
                        </div>
                        <div className="w-1/3 relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                          <input
                            value={jobLocation}
                            onChange={(e) => setJobLocation(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearchJobs()}
                            placeholder="Ort..."
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-brand-400/10 transition-all"
                          />
                        </div>
                        <button
                          onClick={handleSearchJobs}
                          disabled={isSearchingJobs}
                          className="px-4 py-2.5 bg-brand-400 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-500 transition-all shadow-lg shadow-brand-400/20 active:scale-95 disabled:opacity-50"
                        >
                          {isSearchingJobs ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : 'Sök'}
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                      {jobs.length === 0 && !isSearchingJobs && !searchError && (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                          <Briefcase className="w-12 h-12 mb-4 text-slate-300" />
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Hitta drömjobbet</h4>
                          <p className="text-[10px] text-slate-400 mt-1">Sök på yrke och plats för att se aktuella annonser.</p>
                        </div>
                      )}

                      {searchError && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-[11px] text-red-500 flex items-center gap-2">
                          {searchError}
                        </div>
                      )}

                      {jobs.map(job => (
                        <div key={job.id} className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-brand-400/30 transition-all group">
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              <h4 className="text-[13px] font-bold text-slate-800 leading-tight group-hover:text-brand-400 transition-colors line-clamp-2">{job.headline}</h4>
                              <p className="text-[11px] font-medium text-slate-500 mt-2">{job.company_name}</p>
                            </div>
                            <a
                              href={job.webpage_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2.5 bg-slate-50 text-slate-400 hover:text-brand-400 hover:bg-brand-50 rounded-xl transition-all shadow-sm"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </div>

                          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-slate-50">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{job.workplace_address.city || job.workplace_address.municipality}</span>
                            </div>
                            <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                            <span className="text-[10px] font-bold text-brand-400 uppercase tracking-widest truncate">{job.occupation}</span>
                          </div>

                          <div className="mt-4">
                            <button
                              onClick={() => handleApplyForJob(job)}
                              className="w-full py-3 bg-brand-50 text-brand-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-400 hover:text-white transition-all border border-brand-100 flex items-center justify-center gap-2 group/btn"
                            >
                              <Wand2 className="w-3.5 h-3.5" />
                              Ansök till detta jobb med Agneta
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {activeTab === 'chat' && (
                <div className="p-6 bg-white border-t border-slate-100">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-brand-400/5 rounded-[2.5rem] blur opacity-0 group-focus-within:opacity-100 transition duration-500"></div>
                    <textarea
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiAction(); } }}
                      placeholder="Skriv till Agneta..."
                      className="relative w-full bg-slate-50 border border-slate-100 rounded-[2rem] pl-6 pr-14 py-4 text-[12px] text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-brand-400/30 transition-all resize-none min-h-[66px] custom-scrollbar"
                      rows={1}
                    />
                    <button
                      onClick={isAiThinking ? handleCancelAi : handleAiAction}
                      disabled={!aiInput.trim() && !isAiThinking}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-3.5 rounded-2xl transition-all shadow-lg active:scale-95 ${isAiThinking ? 'bg-red-500 hover:bg-red-600 shadow-red-500/10' : 'bg-brand-400 hover:bg-brand-500 shadow-brand-400/20'} disabled:opacity-20`}
                    >
                      {isAiThinking ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Send className="w-4 h-4 text-white" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!isAgnetaOpen && (
            <button
              onClick={openAgneta}
              onMouseDown={handleMouseDown}
              className="w-16 h-16 rounded-[1.8rem] overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.2)] bg-white/10 backdrop-blur-md border border-slate-200 hover:scale-110 transition-all active:scale-90 group relative"
              title="Behöver du hjälp? Fråga Agneta"
            >
              <div className="absolute inset-0 bg-brand-400/10 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>
              <div className="p-2 relative z-10"><AgnetaAvatar /></div>
            </button>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes pulse-slow {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
          }
          .animate-pulse-slow {
            animation: pulse-slow 4s ease-in-out infinite;
          }
        `}} />
    </div>
  );
};
