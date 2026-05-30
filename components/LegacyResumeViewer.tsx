import React, { useState, useEffect } from 'react';
import { ResumeData, UserProfile, SystemSettings } from '../types';
import {
    FileText,
    User,
    Mail,
    Phone,
    MapPin,
    Briefcase,
    GraduationCap,
    CheckCircle2,
    ChevronLeft,
    Download,
    ExternalLink,
    Sparkles,
    Database
} from 'lucide-react';

interface LegacyResumeViewerProps {
    resume: ResumeData;
    userProfile: UserProfile | null;
    systemSettings: SystemSettings;
    onBack: () => void;
    onConvert: (resume: ResumeData) => void;
    isDarkMode: boolean;
}

export const LegacyResumeViewer: React.FC<LegacyResumeViewerProps> = ({
    resume,
    onBack,
    onConvert,
    isDarkMode
}) => {
    const [activeTab, setActiveTab] = useState<'preview' | 'data'>('preview');
    const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!resume.fileUrl) return;
        
        let isActive = true;
        let blobUrl: string | null = null;
        
        const fetchPdf = async () => {
            try {
                // By fetching the PDF as a blob and setting its type explicitly, 
                // we force the browser to render it inline inside the iframe,
                // bypassing any "Content-Disposition: attachment" headers on Firebase Storage.
                const response = await fetch(resume.fileUrl);
                const blob = await response.blob();
                const pdfBlob = new Blob([blob], { type: 'application/pdf' });
                blobUrl = URL.createObjectURL(pdfBlob);
                if (isActive) {
                    setPdfBlobUrl(blobUrl);
                }
            } catch (err) {
                console.error("Kunde inte hämta PDF som blob:", err);
                if (isActive) {
                    setPdfBlobUrl(resume.fileUrl);
                }
            }
        };
        
        fetchPdf();
        
        return () => {
            isActive = false;
            if (blobUrl) {
                URL.revokeObjectURL(blobUrl);
            }
        };
    }, [resume.fileUrl]);

    // Helper to format HTML content (extracted from AI)
    const renderHtml = (htmlContent?: string) => {
        if (!htmlContent) return null;
        return <div
            className="prose dark:prose-invert prose-sm max-w-none text-slate-600 dark:text-slate-400 font-medium leading-relaxed"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
        />;
    };

    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden font-sans">
            {/* Header */}
            <header className="h-20 px-8 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <button
                        onClick={onBack}
                        className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-500 transition-all active:scale-95"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                                Dokumentgranskning
                            </h1>
                            <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-500 text-[9px] font-black uppercase tracking-widest rounded flex items-center gap-1">
                                <Database className="w-3 h-3" /> Arkiv-CV
                            </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                            {resume.personal.firstName} {resume.personal.lastName} • {resume.sourceFile || "Importerat dokument"}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => onConvert(resume)}
                        className="px-8 py-3 bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all flex items-center gap-2 active:scale-95"
                    >
                        <Sparkles className="w-4 h-4" /> Konvertera till redigerbart CV
                    </button>
                </div>
            </header>

            <main className="flex-1 flex overflow-hidden relative">
                {/* Left: Original PDF */}
                <div className="flex-1 h-full bg-slate-200 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
                    {resume.fileUrl ? (
                        <iframe
                            src={pdfBlobUrl ? `${pdfBlobUrl}#view=FitH` : ''}
                            className="w-full h-full border-none block bg-slate-200 dark:bg-slate-900"
                            style={{ minHeight: 'calc(100vh - 80px)' }}
                            title="PDF Preview"
                        />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400 opacity-50">
                            <FileText className="w-20 h-20" />
                            <p className="font-bold text-sm uppercase tracking-widest">Ingen originalfil tillgänglig</p>
                        </div>
                    )}
                </div>

                {/* Right: Extracted Data */}
                <div className="w-[600px] h-full bg-white dark:bg-slate-900 overflow-y-auto px-10 py-12 custom-scrollbar">
                    <div className="max-w-xl mx-auto space-y-12 pb-20">

                        {/* AI Summary Section */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-500">
                                <Sparkles className="w-5 h-5" />
                                <h2 className="text-xs font-black uppercase tracking-[0.2em]">Savå AI Analys</h2>
                            </div>
                            <div className="bg-indigo-500/5 border border-indigo-500/10 p-6 rounded-3xl">
                                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-2">Profilsammanfattning</p>
                                {renderHtml(resume.profile)}
                            </div>
                        </section>

                        {/* Personal Info */}
                        <section className="space-y-6">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-4">Kontaktuppgifter</h2>
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Namn</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{resume.personal.firstName} {resume.personal.lastName}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yrkesroll</p>
                                    <p className="text-sm font-bold text-brand-500 uppercase tracking-widest">{resume.personal.jobTitle || 'Ej angivet'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-post</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{resume.personal.email || 'Ej angivet'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefon</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{resume.personal.phone || 'Ej angivet'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ort</p>
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{resume.personal.city || 'Ej angivet'}</p>
                                </div>
                            </div>
                        </section>

                        {/* Experience */}
                        <section className="space-y-8">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-4">Arbetslivserfarenhet</h2>
                            <div className="space-y-10">
                                {resume.experience && resume.experience.length > 0 ? (
                                    resume.experience.map((exp, idx) => (
                                        <div key={idx} className="relative pl-8 border-l-2 border-slate-100 dark:border-slate-800 space-y-2">
                                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500" />
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{exp.role}</h3>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{exp.startDate} - {exp.endDate}</span>
                                            </div>
                                            <p className="text-xs font-black text-indigo-500 uppercase tracking-widest">{exp.company}</p>
                                            <div className="mt-4">
                                                {renderHtml(exp.description)}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400 italic">Ingen erfarenhet hittades</p>
                                )}
                            </div>
                        </section>

                        {/* Education */}
                        <section className="space-y-8">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-4">Utbildning</h2>
                            <div className="space-y-8">
                                {resume.education && resume.education.length > 0 ? (
                                    resume.education.map((edu, idx) => (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex items-center justify-between">
                                                <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">{edu.degree}</h3>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{edu.year}</span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{edu.institution}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400 italic">Ingen utbildning hittades</p>
                                )}
                            </div>
                        </section>

                        {/* Skills */}
                        <section className="space-y-6">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-4">Kompetenser</h2>
                            <div className="flex flex-wrap gap-2">
                                {resume.skills && resume.skills.length > 0 ? (
                                    resume.skills.map((skill, idx) => (
                                        <span key={idx} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                                            {skill.name}
                                        </span>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-400 italic">Inga kompetenser hittades</p>
                                )}
                            </div>
                        </section>

                    </div>
                </div>
            </main>
        </div>
    );
};
