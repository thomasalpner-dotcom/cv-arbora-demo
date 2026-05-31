import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ResumeData, DesignSettings, INITIAL_RESUME, MasterTemplateConfig, Experience, Education, Skill, Language, LANGUAGE_LEVELS, Participant, DocType, SystemSettings, JobAd } from '../types';
import { generateSampleCV } from '../utils/sampleData';
import { CvPreview } from './CvPreview';
import { ImageCropModal } from './ImageCropModal';
import { InterviewModal } from './InterviewModal';
import { AgnetaChatSidekick } from './AgnetaChatSidekick';
import { GeneralChatSidekick } from './GeneralChatSidekick';
import { AIImportModal } from './AIImportModal';
import {
    Download, Eye, User, Briefcase, GraduationCap, Wrench, Languages, BookOpen,
    Plus, Trash2, Award, Star, Phone, Camera, Edit2, Palette, Save,
    GripVertical, X, Check, Loader2, Mail, MapPin, Car, Linkedin, PlusCircle, ArrowLeft, ZoomIn, ZoomOut, Sparkles,
    ChevronUp, ChevronDown, RotateCcw, Maximize2, CheckCircle2, Building2, School, MapPinned, CalendarDays, AlertCircle, Info, Lightbulb, StickyNote, Wand2,
    Mic, Pause, Play, Square, HelpCircle, ListChecks, Globe, Link, MoreVertical, AlertTriangle, Calendar, Award as CertificateIcon, Heart, Moon, Sun, Scissors, FileText, Minimize2, Search, ExternalLink
} from 'lucide-react';
import { useTranslation } from '../utils/translations';
import { JobSearchService } from '../services/JobSearchService';
import { PdfService } from '../services/PdfService';
import { BackButton } from './BackButton';
import { RichTextEditor } from './RichTextEditor';
import { TemplateSelector } from './TemplateSelector';
import { DesignToolbar } from './DesignToolbar';
import { AccordionItem } from './AccordionItem';
import { AddSectionMenu, SectionMenu } from './SectionMenus';
import { ImportService } from '../services/ImportService';

interface Props {
    resume: ResumeData;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    onLogout: () => void;
    onSave: (data: ResumeData) => void;
    onBack: () => void;
    onDelete?: (id: string) => void;
    initialDocType?: DocType;
    userProfile: any;
    systemSettings: SystemSettings;
    participants?: Participant[];
    onUpdateParticipant?: (p: Participant) => void;
}

interface AgnetaState {
    isOpen: boolean;
    context: string;
    currentHtml: string;
    sectionId: string;
    itemId?: string;
    jobContext?: JobAd;
}


export const Editor: React.FC<Props> = ({ resume, onSave, onBack, isDarkMode, toggleDarkMode, onDelete, onLogout, initialDocType, userProfile, systemSettings, participants, onUpdateParticipant }) => {
    const { t, currentLanguage } = useTranslation();
    const getSectionHeader = (sectionId: string) => {
        const customHeader = data.headers?.[sectionId];
        const defaultSwedishHeaders = {
            profile: 'Profil',
            experience: 'Arbetslivserfarenhet',
            education: 'Utbildning',
            skills: 'Färdigheter',
            languages: 'Språk',
            internships: 'Praktik',
            courses: 'Kurser',
            certificates: 'Certifikat',
            hobbies: 'Fritidsaktiviteter',
            references: 'Referenser'
        };
        if (!customHeader) {
            return t('section_' + sectionId) || t(sectionId) || sectionId;
        }
        if (defaultSwedishHeaders[sectionId] === customHeader || customHeader === 'Profil / Sammanfattning') {
            if (sectionId === 'experience') return t('experience');
            if (sectionId === 'education') return t('education');
            if (sectionId === 'skills') return t('skills');
            if (sectionId === 'languages') return t('languages');
            return t('section_' + sectionId) || customHeader;
        }
        return customHeader;
    };
    // DATA SANITIZATION: Fix corrupted data IMMEDIATELY before any rendering
    // Using useMemo to ensure this runs exactly once when the component mounts
    const sanitizedResume = useMemo(() => {
        let needsFixing = false;
        const sanitized = { ...resume };

        // Fix profile field if it's an array instead of string
        if (Array.isArray(sanitized.profile)) {
            console.warn('⚠️ Corrupted profile data detected (array instead of string). Auto-fixing...');
            sanitized.profile = '';
            needsFixing = true;
        }

        // Fix any other string fields that might be corrupted
        const stringFields: (keyof ResumeData)[] = ['profile'];
        stringFields.forEach(field => {
            if (Array.isArray(sanitized[field])) {
                console.warn(`⚠️ Corrupted ${field} data detected (array instead of string). Auto-fixing...`);
                (sanitized as any)[field] = '';
                needsFixing = true;
            }
        });

        if (needsFixing) {
            console.log('✅ Data sanitized. Saving fixed data to Firebase...');
            sanitized.lastEdited = new Date().toISOString();
            // Save asynchronously to not block rendering
            setTimeout(() => onSave(sanitized), 100);
        }

        return sanitized;
    }, [resume.id]); // Only re-run if the resume ID changes (i.e., different participant)

    const [data, setData] = useState<ResumeData>(sanitizedResume);
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [docType, setDocType] = useState<DocType>(initialDocType || { type: 'cv' });
    const [showDesignToolbar, setShowDesignToolbar] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [previewScale, setPreviewScale] = useState(0.85);
    const [isExporting, setIsExporting] = useState(false);
    const [isSavingDoc, setIsSavingDoc] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
    const [isPbMenuOpen, setIsPbMenuOpen] = useState(false);
    const [showAdminMenu, setShowAdminMenu] = useState(false);
    const [isPreviewZoomed, setIsPreviewZoomed] = useState(false);
    const [isAIImportModalOpen, setIsAIImportModalOpen] = useState(false);
    const [leftWidth, setLeftWidth] = useState(50); // Bredden på editorn i procent
    const [isResizing, setIsResizing] = useState(false);

    // Job Search State
    const [jobQuery, setJobQuery] = useState(resume.personal.jobTitle || '');
    const [jobLocation, setJobLocation] = useState(resume.personal.city || '');
    const [jobs, setJobs] = useState<JobAd[]>([]);
    const [isSearchingJobs, setIsSearchingJobs] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const pbMenuRef = useRef<HTMLDivElement>(null);

    const [agneta, setAgneta] = useState<AgnetaState>({
        isOpen: false,
        context: '',
        currentHtml: '',
        sectionId: ''
    });
    const [isGeneralChatOpen, setIsGeneralChatOpen] = useState(false);

    const sidePreviewRef = useRef<HTMLDivElement>(null);
    const cvRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

    useEffect(() => {
        if (activeSection && sectionRefs.current[activeSection] && scrollContainerRef.current) {
            const container = scrollContainerRef.current;
            const element = sectionRefs.current[activeSection];
            const timer = setTimeout(() => {
                if (element && container) {
                    const offset = 100;
                    const elementRect = element.getBoundingClientRect();
                    const containerRect = container.getBoundingClientRect();
                    const scrollTop = elementRect.top - containerRect.top + container.scrollTop - offset;
                    container.scrollTo({ top: Math.max(0, scrollTop), behavior: 'smooth' });
                }
            }, 150);
            return () => clearTimeout(timer);
        }
    }, [activeSection]);

    // Navigation Guard: Prevent accidental back/close
    useEffect(() => {
        // 1. Handle browser back button
        const handlePopState = (e: PopStateEvent) => {
            // Push a new state immediately to "stay" on the page while the dialog is open
            window.history.pushState(null, '', window.location.pathname);
            
            if (window.confirm(t('leave_editor_confirm'))) {
                onBack();
            }
        };

        // 2. Handle tab close/refresh
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = ''; // Required for Chrome
            return '';
        };

        // Push an initial state so we have something to "pop" back from
        window.history.pushState(null, '', window.location.pathname);
        window.addEventListener('popstate', handlePopState);
        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [onBack]);

    useEffect(() => {
        const calculateScale = () => {
            if (sidePreviewRef.current) {
                if (isPreviewZoomed) {
                    const containerWidth = sidePreviewRef.current.offsetWidth - 96; // p-12 is 48px on each side
                    const scale = containerWidth / 794;
                    setPreviewScale(Math.max(0.4, scale));
                } else {
                    setPreviewScale(0.85);
                }
            }
        };
        calculateScale();
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
    }, [isPreviewZoomed]);

    // Resizing Logic
    const startResizing = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = (e.clientX / window.innerWidth) * 100;
            // Begränsa så att man inte kan dra för långt (mellan 20% och 80%)
            if (newWidth > 20 && newWidth < 80) {
                setLeftWidth(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
        } else {
            document.body.style.cursor = 'default';
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pbMenuRef.current && !pbMenuRef.current.contains(event.target as Node)) {
                setIsPbMenuOpen(false);
            }
        };
        if (isPbMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isPbMenuOpen]);

    const updateField = (field: keyof ResumeData, value: any) => {
        setData(prev => {
            const newData = { ...prev, [field]: value, lastEdited: new Date().toISOString() };
            onSave(newData);
            return newData;
        });
    };

    const addItem = (sectionKey: keyof ResumeData) => {
        const newItemId = 'item_' + Date.now().toString();
        const defaultLevel = sectionKey === 'languages' ? 'Goda kunskaper' : 3;
        const newItem = { id: newItemId, role: '', company: '', school: '', degree: '', name: '', startDate: '', endDate: '', current: false, description: '', location: '', level: defaultLevel, email: '', phone: '', issuer: '' };

        setData(prev => {
            const currentList = (prev[sectionKey] as any[] || []);
            const updatedList = [...currentList, newItem];
            const newData = { ...prev, [sectionKey]: updatedList, lastEdited: new Date().toISOString() };
            onSave(newData);
            return newData;
        });
    };

    const handleToggleItemPageBreak = (itemId: string) => {
        setData(prev => {
            const currentBreaks = prev.itemPageBreaks || [];
            const newBreaks = currentBreaks.includes(itemId)
                ? currentBreaks.filter(id => id !== itemId)
                : [...currentBreaks, itemId];
            const newData = { ...prev, itemPageBreaks: newBreaks, lastEdited: new Date().toISOString() };
            onSave(newData);
            return newData;
        });
    };

    const handleToggleSection = (sectionId: string) => {
        if (activeSection === sectionId) {
            setActiveSection(null);
        } else {
            setActiveSection(sectionId);
            if (sectionId !== 'personal' && sectionId !== 'profile') {
                const items = (data[sectionId as keyof ResumeData] as any[]) || [];
                if (items.length === 0) {
                    addItem(sectionId as keyof ResumeData);
                }
            }
        }
    };

    const handleDragStart = (index: number) => {
        setDraggedSectionIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedSectionIndex === null || draggedSectionIndex === index) return;

        const newOrder = [...data.sectionOrder];
        const item = newOrder.splice(draggedSectionIndex, 1)[0];
        newOrder.splice(index, 0, item);

        setDraggedSectionIndex(index);
        setData(prev => ({ ...prev, sectionOrder: newOrder }));
    };

    const handleDrop = () => {
        setDraggedSectionIndex(null);
        onSave(data);
    };

    const handleOpenAgneta = (sectionId: string, itemId: string | undefined, currentHtml: string, context: string) => {
        setAgneta({ isOpen: true, sectionId, itemId, currentHtml, context });
    };

    const handleSelectTemplate = (template: string, config?: MasterTemplateConfig) => {
        const newData = { ...data, template: template as any, customTemplateConfig: config, lastEdited: new Date().toISOString() };
        setData(newData);
        onSave(newData);
    };

    const updatePersonal = (field: string, value: string) => {
        setData(prev => {
            const newPersonal = { ...prev.personal, [field]: value };
            let newTitle = prev.title;
            const dateStr = new Date().toISOString().split('T')[0];

            // Uppdatera bara titeln automatiskt om den INTE är ett anpassat namn
            // T.ex. "Ansökan Volvo" ska ALDRIG skrivas över automatiskt
            const isAutoTitle = !prev.title || prev.title === 'Mitt CV'
                || prev.title.startsWith('CV -')
                || prev.title.includes('Mitt CV -');
            if (isAutoTitle) {
                const firstName = newPersonal.firstName || '';
                const lastName = newPersonal.lastName || '';
                if (firstName || lastName) {
                    newTitle = `CV - ${firstName} ${lastName} - ${dateStr}`;
                } else {
                    newTitle = `Mitt CV - ${dateStr}`;
                }
            }

            const newData = {
                ...prev,
                personal: newPersonal,
                title: newTitle,
                lastEdited: new Date().toISOString()
            };
            onSave(newData);
            return newData;
        });
    };

    const updateDesign = (field: keyof DesignSettings, value: any) => {
        setData(prev => {
            const newData = { ...prev, design: { ...prev.design, [field]: value }, lastEdited: new Date().toISOString() };
            onSave(newData);
            return newData;
        });
    };

    const handleApplyAgneta = (newHtml: string) => {
        if (agneta.sectionId === 'profile') updateField('profile', newHtml);
        else if (agneta.itemId) {
            const sectionItems = (data[agneta.sectionId as keyof ResumeData] as any[]) || [];
            updateField(agneta.sectionId as keyof ResumeData, sectionItems.map((item: any) => item.id === agneta.itemId ? { ...item, description: newHtml } : item));
        }
        setAgneta(prev => ({ ...prev, isOpen: false }));
    };

    const handleManualSave = async () => {
        setIsSavingDoc(true);
        const newData = { ...data, lastEdited: new Date().toISOString() };
        setData(newData);
        onSave(newData);
        setTimeout(() => {
            setIsSavingDoc(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        }, 600);
    };


    const handleSearchJobs = async () => {
        if (!jobQuery.trim() && !jobLocation.trim()) return;

        console.log('🔍 Söker jobb:', { jobQuery, jobLocation });

        setIsSearchingJobs(true);
        setSearchError(null);
        try {
            const resp = await JobSearchService.searchAllSources(jobQuery, jobLocation);
            console.log('✅ Jobb hittade:', resp.total.value);
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

    const handleApplyForJob = (job: JobAd) => {
        // Create a new cover letter for this job
        const newPb = {
            id: 'pb_' + Date.now(),
            title: `Ansökan: ${job.headline}`,
            content: '',
            lastEdited: new Date().toISOString()
        };
        const updatedPbs = [...(data.coverLetters || []), newPb];
        updateField('coverLetters', updatedPbs);
        setDocType({ type: 'pb', id: newPb.id });

        // Open Agneta with job context
        setAgneta({
            isOpen: true,
            sectionId: 'coverLetter',
            itemId: newPb.id,
            currentHtml: '',
            context: 'Personligt Brev',
            jobContext: job
        });
    };

    const handleDownloadPdf = async () => {
        setIsDownloading(true);
        // 1. Prepare filename
        const firstName = data.personal.firstName || '';
        const lastName = data.personal.lastName || '';
        const today = new Date().toISOString().split('T')[0];
        let fileName = '';
        if (docType.type === 'cv') {
            // Använd data.title direkt om det är ett anpassat namn (inte ett auto-genererat namn)
            const isAutoTitle = !data.title || data.title.startsWith('CV - ') || data.title.startsWith('Mitt CV');
            if (!isAutoTitle) {
                // Anpassat namn som "Ansökan Volvo" – använd det direkt
                fileName = data.title;
            } else {
                // Auto-genererat namn – bygg som förut
                const name = `${firstName} ${lastName}`.trim() || 'CV';
                fileName = `${name} - CV - ${today}`;
                const kopiaMatch = (data.title || '').match(/ \(kopia( \d+)?\)$/);
                if (kopiaMatch) fileName += kopiaMatch[0];
            }
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
            // 2. Prepare for printing
            document.body.classList.add('is-exporting');
            
            // Give portal a moment to ensure it's rendered
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const element = document.querySelector('.print-container') as HTMLElement;
            if (!element) throw new Error(t('print_container_not_found'));

            // 3. Generate and download {t('pdf')} with metadata
            await PdfService.downloadPdf(data, fileName, element);
            
        } catch (error) {
            console.error('PDF Generation failed:', error);
            alert(t('pdf_failed'));
        } finally {
            document.body.classList.remove('is-exporting');
            setIsDownloading(false);
        }
    };

    const handlePhotoSave = (base64: string) => {
        updatePersonal('photoUrl', base64);
        setIsImageModalOpen(false);
    };

    const handleFillDemoData = () => {
        if (!confirm(t('fill_demo_confirm'))) return;

        const sampleData = generateSampleCV(currentLanguage);
        const updatedData = {
            ...data,
            ...sampleData,
            id: data.id,
            participantId: data.participantId,
            createdBy: data.createdBy,
            title: data.title,
            lastEdited: new Date().toISOString()
        };

        // Uppdatera BÅDE lokalt tillstånd (för att se det direkt) och databasen
        setData(updatedData as ResumeData);
        onSave(updatedData as ResumeData);

        // Om det finns en deltagare och vi har tillgång till deltagarlistan, uppdatera även deltagarens namn & kontaktinfo
        if (data.participantId && participants && onUpdateParticipant) {
            const currentParticipant = participants.find(p => p.id === data.participantId);
            if (currentParticipant) {
                const updatedParticipant: Participant = {
                    ...currentParticipant,
                    firstName: sampleData.personal?.firstName || 'Anna',
                    lastName: sampleData.personal?.lastName || 'Andersson',
                    email: sampleData.personal?.email || 'anna.andersson@exempel.se',
                    phone: sampleData.personal?.phone || '070-123 45 67',
                    lastActivity: new Date().toISOString()
                };
                onUpdateParticipant(updatedParticipant);
            }
        }

        setShowAdminMenu(false);
// Öppna första sektionen så man ser att det hände något
        setActiveSection('personal');
    };

    const renderItemEditor = (sectionId: string, item: any) => {
        const updateItem = (updates: any) => {
            const list = ((data[sectionId as keyof ResumeData] as any[]) || []).map(i => i.id === item.id ? { ...i, ...updates } : i);
            updateField(sectionId as keyof ResumeData, list);
        };

        const removeItem = () => {
            const list = ((data[sectionId as keyof ResumeData] as any[]) || []).filter(i => i.id !== item.id);
            updateField(sectionId as keyof ResumeData, list);
        };

        if (sectionId === 'experience' || sectionId === 'internships') {
            return (
                <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl space-y-4 relative group border border-gray-100 dark:border-gray-800">
                    <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={removeItem} className="absolute top-4 right-4 p-2.5 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('job_title_roll')}</label>
                            <input
                                value={item.role}
                                onChange={e => updateItem({ role: e.target.value })}
                                placeholder="Ex: Projektledare"
                                className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm font-bold"
                            />
                        </div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('employer_company')}</label><input value={item.company} onChange={e => updateItem({ company: e.target.value })} placeholder="Ex: Företaget AB" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm font-bold" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('city', 'Ort')}</label><input value={item.location} onChange={e => updateItem({ location: e.target.value })} placeholder="Ex: Stockholm" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm" /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('start_date', 'Startdatum')}</label><input value={item.startDate} onChange={e => updateItem({ startDate: e.target.value })} placeholder="Ex: Mars 2020" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm" /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('end_date', 'Slutdatum')}</label><input value={item.endDate} disabled={item.current} onChange={e => updateItem({ endDate: e.target.value })} placeholder={item.current ? "Nu" : "Ex: Jan 2023"} className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm disabled:opacity-50" /></div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer w-fit">
                        <input type="checkbox" checked={item.current} onChange={e => updateItem({ current: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-brand-400 focus:ring-brand-400" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{t('currently_work_here_label')}</span>
                    </label>
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('description', 'Beskrivning')}</label><RichTextEditor value={item.description} onChange={v => updateItem({ description: v })} onOpenAgneta={(html, ctx) => handleOpenAgneta(sectionId, item.id, html, ctx)} /></div>
                </div>
            );
        }

        if (sectionId === 'education') {
            return (
                <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl space-y-4 relative group border border-gray-100 dark:border-gray-800">
                    <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={removeItem} className="absolute top-4 right-4 p-2.5 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Examen / Utbildning</label><input value={item.degree} onChange={e => updateItem({ degree: e.target.value })} placeholder="Ex: Kandidatexamen i Ekonomi" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm font-bold" /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('school_university')}</label><input value={item.school} onChange={e => updateItem({ school: e.target.value })} placeholder="Ex: Stockholms Universitet" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm font-bold" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('city', 'Ort')}</label><input value={item.location} onChange={e => updateItem({ location: e.target.value })} placeholder="Ex: Stockholm" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm" /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('start_year')}</label><input value={item.startDate} onChange={e => updateItem({ startDate: e.target.value })} placeholder="Ex: 2018" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm" /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('end_year_expected')}</label><input value={item.endDate} onChange={e => updateItem({ endDate: e.target.value })} placeholder="Ex: 2021" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm" /></div>
                    </div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('description_optional')}</label><RichTextEditor value={item.description} onChange={v => updateItem({ description: v })} onOpenAgneta={(html, ctx) => handleOpenAgneta(sectionId, item.id, html, ctx)} /></div>
                </div>
            );
        }

        if (sectionId === 'courses' || sectionId === 'certificates') {
            return (
                <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl space-y-4 relative group border border-gray-100 dark:border-gray-800">
                    <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={removeItem} className="absolute top-4 right-4 p-2.5 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all shadow-sm border border-slate-200 dark:border-slate-700 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{sectionId === 'courses' ? t('course_name_label') : t('certificate_name_label')}</label><input value={item.name} onChange={e => updateItem({ name: e.target.value })} placeholder="Ex: Digital Marknadsföring" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm font-bold" /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Utfärdare / Organisation</label><input value={item.issuer} onChange={e => updateItem({ issuer: e.target.value })} placeholder="Ex: Google" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('start_date', 'Startdatum')}</label><input value={item.startDate} onChange={e => updateItem({ startDate: e.target.value })} placeholder="Ex: 2022" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm" /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('end_date', 'Slutdatum')}</label><input value={item.endDate} onChange={e => updateItem({ endDate: e.target.value })} placeholder="Ex: 2023" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm" /></div>
                    </div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('description', 'Beskrivning')}</label><RichTextEditor value={item.description} onChange={v => updateItem({ description: v })} onOpenAgneta={(html, ctx) => handleOpenAgneta(sectionId, item.id, html, ctx)} /></div>
                </div>
            );
        }

        if (sectionId === 'languages') {
            return (
                <div className="flex flex-col gap-4 bg-gray-50 dark:bg-gray-900 p-6 rounded-3xl group border border-gray-100 dark:border-gray-800 relative">
                    <button onClick={removeItem} className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('language', 'Språk')}</label>
                        <input value={item.name} onChange={e => updateItem({ name: e.target.value })} placeholder="Ex: Svenska" className="w-full bg-white dark:bg-gray-800 p-3 rounded-xl border-none text-sm font-bold focus:ring-2 focus:ring-brand-400 outline-none shadow-sm" />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('level_1_5', 'Nivå (1-5)')}</label>
                        <div className="flex gap-1.5 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            {[1, 2, 3, 4, 5].map(lv => (
                                <button
                                    key={lv}
                                    onClick={() => updateItem({ level: LANGUAGE_LEVELS[5 - lv] })}
                                    className={`w-7 h-7 rounded-lg transition-all font-black text-[10px] ${LANGUAGE_LEVELS.indexOf(item.level) <= (5 - lv) ? 'bg-brand-400 text-white shadow-md shadow-brand-400/20' : 'bg-gray-100 dark:bg-gray-700 text-gray-300'}`}
                                >
                                    {lv}
                                </button>
                            ))}
                        </div>
                        <div className="text-[9px] font-bold text-gray-400 mt-1 ml-1">{item.level}</div>
                    </div>
                </div>
            );
        }

        if (sectionId === 'skills') {
            return (
                <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900 p-6 rounded-3xl group border border-gray-100 dark:border-gray-800 relative">
                    <button onClick={removeItem} className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                    <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('skill', 'Färdighet')}</label>
                        <input
                            value={item.name}
                            onChange={e => updateItem({ name: e.target.value })}
                            placeholder="Ex: Digitalisering"
                            className="w-full bg-white dark:bg-gray-800 p-3 rounded-xl border-none text-sm font-bold focus:ring-2 focus:ring-brand-400 outline-none shadow-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('level_1_5', 'Nivå (1-5)')}</label>
                        <div className="flex gap-1.5 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                            {[1, 2, 3, 4, 5].map(lv => (
                                <button key={lv} onClick={() => updateItem({ level: lv })} className={`w-7 h-7 rounded-lg transition-all font-black text-[10px] ${item.level >= lv ? 'bg-brand-400 text-white shadow-md shadow-brand-400/20' : 'bg-gray-100 dark:bg-gray-700 text-gray-300'}`}>{lv}</button>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        if (sectionId === 'references') {
            return (
                <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl space-y-4 relative group border border-gray-100 dark:border-gray-800">
                    <button onClick={removeItem} className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('reference_name', 'Namn på referens')}</label><input value={item.name} onChange={e => updateItem({ name: e.target.value })} placeholder="Ex: Erik Andersson" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm font-bold" /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('reference_company', 'Företag / Roll')}</label><input value={item.company} onChange={e => updateItem({ company: e.target.value })} placeholder="Ex: Tidigare chef på Bolaget AB" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('email', 'E-post')}</label><input value={item.email} onChange={e => updateItem({ email: e.target.value })} placeholder="erik@exempel.se" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm" /></div>
                        <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('phone', 'Telefon')}</label><input value={item.phone} onChange={e => updateItem({ phone: e.target.value })} placeholder="070-123 45 67" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm" /></div>
                    </div>
                </div>
            );
        }

        if (sectionId === 'hobbies') {
            return (
                <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl space-y-4 relative group border border-gray-100 dark:border-gray-800">
                    <button onClick={removeItem} className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('activity')}</label><input value={item.name} onChange={e => updateItem({ name: e.target.value })} placeholder="Ex: Bergsklättring" className="w-full p-3 bg-white dark:bg-gray-800 rounded-xl border-none focus:ring-2 focus:ring-brand-400 outline-none text-sm font-bold" /></div>
                    <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('short_description_optional')}</label><RichTextEditor value={item.description} onChange={v => updateItem({ description: v })} onOpenAgneta={(html, ctx) => handleOpenAgneta(sectionId, item.id, html, ctx)} /></div>
                </div>
            );
        }

        return null;
    };


    // The Interactive Divider for Item-level page breaks
    const PageBreakDivider = ({ isActive, onToggle }: { isActive: boolean, onToggle: () => void }) => (
        <div className="relative h-12 group flex items-center justify-center -my-3 z-20">
            {/* The dashed line */}
            <div className={`absolute inset-x-4 h-px transition-all border-t-2 border-dashed ${isActive ? 'border-amber-400/60 opacity-100' : 'border-gray-200 dark:border-gray-700 opacity-0 group-hover:opacity-100'}`} />

            {/* The interactive button */}
            <button
                onClick={onToggle}
                className={`relative px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 border shadow-lg ${isActive ? 'bg-amber-400 text-white border-amber-500 scale-105 shadow-amber-400/20' : 'bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 opacity-0 group-hover:opacity-100 hover:scale-105 hover:text-amber-500 hover:border-amber-200'}`}
            >
                <Scissors className={`w-3.5 h-3.5 ${isActive ? 'animate-pulse' : ''}`} />
                {isActive ? t('page_break_active') : t('page_break_here')}
            </button>
        </div>
    );

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
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {/* Portals for printing */}
            {createPortal(printPortal, document.body)}

            <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 h-16 shrink-0 z-[60] flex items-center justify-between px-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <BackButton onClick={onBack} variant="default" label={t('back_button')} />
                    <div className="flex flex-col">
                        <h1 className="font-black text-brand-400 leading-none text-base tracking-tight">{systemSettings.companyName ? `${systemSettings.companyName}.cv` : 'Aventus.cv'}</h1>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-0.5">{data.title || t('nameless_cv')}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setDocType({ type: 'cv' })}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${docType.type === 'cv' ? 'bg-brand-400 text-white border-brand-400 shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            <FileText className="w-4 h-4" />
                            CV
                        </button>
                        <div className="relative" ref={pbMenuRef}>
                            <button
                                onClick={() => setIsPbMenuOpen(!isPbMenuOpen)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${docType.type === 'pb' ? 'bg-brand-400 text-white border-brand-400 shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                            >
                                <Mail className="w-4 h-4" />
                                {t('letter')}
                                <ChevronDown className={`w-3 h-3 transition-transform ${isPbMenuOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {isPbMenuOpen && (
                                <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 animate-in fade-in zoom-in-95 duration-150 z-[100]">
                                    {data.coverLetters?.map(l => (
                                        <div key={l.id} className="group relative flex items-center px-1">
                                            <button
                                                onClick={() => {
                                                    setDocType({ type: 'pb', id: l.id });
                                                    setIsPbMenuOpen(false);
                                                }}
                                                className={`flex-1 text-left px-3 py-3 text-[10px] font-bold flex items-center justify-between rounded-lg transition-colors ${docType.id === l.id ? 'bg-brand-50 text-brand-400' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50'}`}
                                            >
                                                <span className="truncate pr-16">{l.title}</span>
                                                {docType.id === l.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />}
                                            </button>
                                            <div className="absolute right-3 opacity-0 group-hover:opacity-100 flex items-center gap-1">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        const newTitle = prompt('Namnge brevet:', l.title);
                                                        if (newTitle && newTitle.trim()) {
                                                            const updated = (data.coverLetters || []).map(item => item.id === l.id ? { ...item, title: newTitle } : item);
                                                            updateField('coverLetters', updated);
                                                        }
                                                    }}
                                                    className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-600 rounded-lg text-[8px] font-black uppercase tracking-widest text-gray-400 hover:text-brand-400 transition-all"
                                                >
                                                    <Edit2 className="w-2.5 h-2.5" />
                                                    Namnge
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (confirm('Är du säker på att du vill radera detta brev?')) {
                                                            const updated = (data.coverLetters || []).filter(item => item.id !== l.id);
                                                            updateField('coverLetters', updated);
                                                            if (docType.id === l.id) {
                                                                setDocType({ type: 'cv' });
                                                            }
                                                        }
                                                    }}
                                                    className="p-1 px-2 bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-600 rounded-lg text-gray-400 hover:text-red-500 transition-all"
                                                    title="Radera brev"
                                                >
                                                    <Trash2 className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="h-px bg-gray-50 dark:bg-gray-700 my-1 mx-2" />
                                    <button
                                        onClick={() => {
                                            const newPb = { id: 'pb_' + Date.now(), title: 'Personligt Brev', content: '', lastEdited: new Date().toISOString() };
                                            const updatedPbs = [...(data.coverLetters || []), newPb];
                                            updateField('coverLetters', updatedPbs);
                                            setDocType({ type: 'pb', id: newPb.id });
                                            setIsPbMenuOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-2 text-[10px] font-black uppercase tracking-widest text-brand-400 hover:bg-brand-50 flex items-center gap-2"
                                    >
                                        <Plus className="w-3 h-3" /> {t('new_letter')}
                                    </button>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => setDocType({ type: 'jobs' })}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${docType.type === 'jobs' ? 'bg-brand-400 text-white border-brand-400 shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                        >
                            <Briefcase className="w-4 h-4" />
                            {t('search_jobs')}
                        </button>
                    </div>
                    <TemplateSelector currentTemplate={data.template || 'classic-sidebar'} onSelect={handleSelectTemplate} data={data} />
                    <button
                        onClick={() => setShowDesignToolbar(!showDesignToolbar)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${showDesignToolbar ? 'bg-brand-400 text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}
                    >
                        <Palette className="w-4 h-4" /> {t('design')}
                    </button>
                    <button
                        onClick={() => setIsGeneralChatOpen(o => !o)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isGeneralChatOpen ? 'bg-brand-400 text-white shadow-lg' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'}`}
                    >
                        <Sparkles className={`w-4 h-4 ${isGeneralChatOpen ? 'animate-pulse' : ''}`} />
                        {t('ai_assistant')}
                    </button>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={toggleDarkMode} className="p-2.5 text-gray-400 hover:text-brand-400 transition-all">{isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
                    <div className="relative">
                        <button
                            onClick={() => setShowAdminMenu(!showAdminMenu)}
                            className="p-2.5 text-amber-500 hover:text-amber-600 transition-all"
                            title="Testverktyg"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>
                        {showAdminMenu && (
                            <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in zoom-in-95 origin-top-right">
                                <button
                                    onClick={handleFillDemoData}
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-amber-600 hover:bg-amber-50 flex items-center gap-3"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                    {t('fill_demo_data')}
                                </button>
                            </div>
                        )}
                    </div>
                    <button onClick={handleManualSave} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 border ${saveSuccess ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600 dark:text-green-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200'}`}>{isSavingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : (saveSuccess ? <><CheckCircle2 className="w-4 h-4" /> {t('saved')}</> : <><Save className="w-4 h-4" /> {t('save')}</>)}</button>
                    <button onClick={handleDownloadPdf} disabled={isDownloading} className="bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-100 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase shadow-xl transition-all flex items-center gap-2">{isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Download className="w-4 h-4" /> PDF</>}</button>
                </div>
            </header >

            {showDesignToolbar && <DesignToolbar data={data} updateDesign={updateDesign} />}

            <div className="flex-1 overflow-hidden flex relative">
                <div 
                    ref={scrollContainerRef} 
                    className="bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col overflow-y-auto custom-scrollbar transition-all duration-75"
                    style={{ width: `${leftWidth}%` }}
                >
                    <div className="p-8 pb-32 space-y-4 w-full">
                        {docType.type === 'cv' ? (
                            <>
                                <AccordionItem id="personal" title={t('personal_details')} icon={User} isOpen={activeSection === 'personal'} onToggle={() => handleToggleSection('personal')}>
                                    <div className="space-y-6 pt-2">
                                        <div className="flex items-center gap-6 mb-8">
                                            <button onClick={() => setIsImageModalOpen(true)} className="relative group shrink-0">
                                                <div className="w-24 h-24 rounded-2xl bg-gray-50 dark:bg-gray-950 border-2 border-dashed border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden transition-all group-hover:border-brand-400 group-hover:bg-brand-50/50">
                                                    {data.personal.photoUrl ? <img src={data.personal.photoUrl} className="w-full h-full object-cover" alt="Profile" /> : <Camera className="w-8 h-8 text-gray-300 group-hover:text-brand-400" />}
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Edit2 className="w-5 h-5 text-white" /></div>
                                                </div>
                                                <div className="absolute -bottom-2 -right-2 bg-white dark:bg-gray-800 p-1.5 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 group-hover:scale-110 transition-transform"><PlusCircle className="w-4 h-4 text-brand-400" /></div>
                                            </button>
                                            <div className="flex-1 space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('first_name', 'Förnamn')}</label>
                                                        <input
                                                            value={data.personal.firstName}
                                                            onChange={e => updatePersonal('firstName', e.target.value)}
                                                            className="w-full p-3 bg-gray-50 dark:bg-gray-950 border-none rounded-2xl focus:ring-2 focus:ring-brand-400 outline-none font-bold text-lg"
                                                            placeholder="Ex: Anna"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('last_name', 'Efternamn')}</label>
                                                        <input
                                                            value={data.personal.lastName}
                                                            onChange={e => updatePersonal('lastName', e.target.value)}
                                                            className="w-full p-3 bg-gray-50 dark:bg-gray-950 border-none rounded-2xl focus:ring-2 focus:ring-brand-400 outline-none font-bold text-lg"
                                                            placeholder="Ex: Andersson"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('job_title', 'Yrkestitel eller Pitch')}</label>
                                                    <input
                                                        value={data.personal.jobTitle}
                                                        onChange={e => updatePersonal('jobTitle', e.target.value)}
                                                        placeholder="Ex: Senior Projektledare"
                                                        className="w-full p-3 bg-gray-50 dark:bg-gray-950 border-none rounded-2xl focus:ring-2 focus:ring-brand-400 outline-none font-bold text-lg"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('email', 'E-post')}</label><input type="email" value={data.personal.email} onChange={e => updatePersonal('email', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-950 border-none rounded-2xl focus:ring-2 focus:ring-brand-400 outline-none font-medium" /></div>
                                            <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('phone', 'Telefon')}</label><input value={data.personal.phone} onChange={e => updatePersonal('phone', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-950 border-none rounded-2xl focus:ring-2 focus:ring-brand-400 outline-none font-medium" /></div>
                                        </div>

                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('address', 'Adress')}</label>
                                            <input value={data.personal.address || ''} onChange={e => updatePersonal('address', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-950 border-none rounded-2xl focus:ring-2 focus:ring-brand-400 outline-none font-medium" placeholder="Ex: Kungsgatan 1" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('zip_code', 'Postnummer')}</label><input value={data.personal.zipCode || ''} onChange={e => updatePersonal('zipCode', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-950 border-none rounded-2xl focus:ring-2 focus:ring-brand-400 outline-none font-medium" placeholder="Ex: 111 22" /></div>
                                            <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('city', 'Ort')}</label><input value={data.personal.city} onChange={e => updatePersonal('city', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-950 border-none rounded-2xl focus:ring-2 focus:ring-brand-400 outline-none font-medium" placeholder="Ex: Stockholm" /></div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('linkedin', 'LinkedIn')}</label><input value={data.personal.linkedin || ''} onChange={e => updatePersonal('linkedin', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-950 border-none rounded-2xl focus:ring-2 focus:ring-brand-400 outline-none font-medium" placeholder="linkedin.com/in/..." /></div>
                                            <div className="space-y-1"><label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('website', 'Hemsida')}</label><input value={data.personal.website || ''} onChange={e => updatePersonal('website', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-950 border-none rounded-2xl focus:ring-2 focus:ring-brand-400 outline-none font-medium" placeholder="www.exempel.se" /></div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('drivers_license', 'Körkort')}</label>
                                            <input value={data.personal.driversLicense || ''} onChange={e => updatePersonal('driversLicense', e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-950 border-none rounded-2xl focus:ring-2 focus:ring-brand-400 outline-none font-medium" placeholder="Ex: B-körkort" />
                                        </div>
                                    </div>
                                </AccordionItem>

                                {data.sectionOrder.map((sectionId, idx) => {
                                    const getIcon = () => {
                                        switch (sectionId) {
                                            case 'experience': return Briefcase;
                                            case 'education': return GraduationCap;
                                            case 'skills': return Award;
                                            case 'languages': return Globe;
                                            case 'internships': return Briefcase;
                                            case 'courses': return BookOpen;
                                            case 'certificates': return CertificateIcon;
                                            case 'hobbies': return Heart;
                                            case 'references': return Phone;
                                            default: return StickyNote;
                                        }
                                    };

                                    return (
                                        <div
                                            key={sectionId}
                                            ref={el => sectionRefs.current[sectionId] = el}
                                            onDragStart={() => handleDragStart(idx)}
                                            onDragOver={(e) => handleDragOver(e, idx)}
                                            onDrop={handleDrop}
                                        >
                                            <AccordionItem
                                                id={sectionId}
                                                title={getSectionHeader(sectionId)}
                                                icon={getIcon()}
                                                isOpen={activeSection === sectionId}
                                                onToggle={() => handleToggleSection(sectionId)}
                                                draggable={true}
                                                columnSetting={data.columnSettings[sectionId] || 'right'}
                                                hasPageBreak={data.pageBreaks.includes(sectionId)}
                                                onTitleChange={(newTitle) => {
                                                    const newHeaders = { ...data.headers, [sectionId]: newTitle };
                                                    updateField('headers', newHeaders);
                                                }}
                                                onDelete={() => {
                                                    setData(prev => {
                                                        const newOrder = prev.sectionOrder.filter(id => id !== sectionId);
                                                        const newData = { ...prev, sectionOrder: newOrder, lastEdited: new Date().toISOString() };
                                                        onSave(newData);
                                                        return newData;
                                                    });
                                                }}
                                                onToggleColumn={() => {
                                                    const current = data.columnSettings[sectionId] || 'right';
                                                    const next = current === 'left' ? 'right' : 'left';
                                                    updateField('columnSettings', { ...data.columnSettings, [sectionId]: next });
                                                }}
                                                onTogglePageBreak={() => {
                                                    const currentBreaks = data.pageBreaks || [];
                                                    const nextBreaks = currentBreaks.includes(sectionId)
                                                        ? currentBreaks.filter(b => b !== sectionId)
                                                        : [...currentBreaks, sectionId];
                                                    updateField('pageBreaks', nextBreaks);
                                                }}
                                            >
                                                <div className="pt-2">
                                                    {sectionId === 'profile' ? (
                                                        <div className="space-y-4">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">{t('summary_helper_text') || 'Sammanfattande text om dig'}</label>
                                                            <RichTextEditor
                                                                value={data.profile}
                                                                onChange={v => updateField('profile', v)}
                                                                onOpenAgneta={(html, ctx) => handleOpenAgneta('profile', undefined, html, ctx)}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-6">
                                                        {(() => {
                                                            const rawList = data[sectionId as keyof ResumeData];
                                                            const list = Array.isArray(rawList) ? rawList : [];
                                                            return list.map((item, i, arr) => (
                                                                <React.Fragment key={item.id}>
                                                                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                                                        {renderItemEditor(sectionId, item)}
                                                                    </div>
                                                                    {i < arr.length - 1 && (
                                                                        <PageBreakDivider
                                                                            isActive={data.itemPageBreaks?.includes(item.id)}
                                                                            onToggle={() => handleToggleItemPageBreak(item.id)}
                                                                        />
                                                                    )}
                                                                </React.Fragment>
                                                            ));
                                                        })()}
                                                            <button onClick={() => addItem(sectionId as keyof ResumeData)} className="w-full py-5 border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-3xl text-gray-400 font-black uppercase tracking-widest text-[10px] hover:border-brand-400 hover:text-brand-400 hover:bg-brand-50/20 transition-all flex items-center justify-center gap-2">
                                                                <Plus className="w-4 h-4" /> {t('add_label')} {getSectionHeader(sectionId)}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </AccordionItem>
                                        </div>
                                    );
                                })}

                                <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
                                    <AddSectionMenu
                                        currentOrder={data.sectionOrder}
                                        resumeData={data}
                                        onAdd={(id) => {
                                            setData(prev => {
                                                if (prev.sectionOrder.includes(id)) return prev;
                                                const newOrder = [...prev.sectionOrder, id];
                                                return { ...prev, sectionOrder: newOrder, lastEdited: new Date().toISOString() };
                                            });
                                            setActiveSection(id);
                                            const sectionKey = id as keyof ResumeData;
                                            if (id !== 'profile' && Array.isArray(data[sectionKey]) && (data[sectionKey] as any[]).length === 0) {
                                                addItem(sectionKey);
                                            }
                                        }}
                                        onClose={() => { }}
                                    />
                                </div>
                            </>
                        ) : docType.type === 'pb' ? (
                            <div className="space-y-8 animate-in fade-in duration-500">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex flex-col">
                                        <h3 className="text-xl font-black text-brand-400">Personligt Brev</h3>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Redigerar brev</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const letterId = docType.id;
                                            const updatedLetters = (data.coverLetters || []).filter(l => l.id !== letterId);
                                            updateField('coverLetters', updatedLetters);
                                            setDocType({ type: 'cv' });
                                        }}
                                        className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-all"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('letter_title')}</label>
                                        <input
                                            value={data.coverLetters?.find(l => l.id === docType.id)?.title || ''}
                                            onChange={(e) => {
                                                const updated = (data.coverLetters || []).map(l => l.id === docType.id ? { ...l, title: e.target.value } : l);
                                                updateField('coverLetters', updated);
                                            }}
                                            className="w-full p-4 bg-gray-50 dark:bg-gray-950 border-none rounded-2xl focus:ring-2 focus:ring-brand-400 outline-none text-sm font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('sign_off', 'Avslutningsfras')}</label>
                                        <input
                                            value={data.coverLetters?.find(l => l.id === docType.id)?.signOff || t('sign_off_default')}
                                            onChange={(e) => {
                                                const updated = (data.coverLetters || []).map(l => l.id === docType.id ? { ...l, signOff: e.target.value } : l);
                                                updateField('coverLetters', updated);
                                            }}
                                            className="w-full p-4 bg-gray-50 dark:bg-gray-950 border-none rounded-2xl focus:ring-2 focus:ring-brand-400 outline-none text-sm font-bold"
                                            placeholder="Vänliga hälsningar,"
                                        />
                                    </div>
                                    <div className="space-y-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 block">{t('content')}</label>
                                        <div className="mx-auto max-w-4xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-12" style={{ aspectRatio: '210/297' }}>
                                            <RichTextEditor
                                                value={data.coverLetters?.find(l => l.id === docType.id)?.content || ''}
                                                onChange={(v) => {
                                                    const updated = (data.coverLetters || []).map(l => l.id === docType.id ? { ...l, content: v } : l);
                                                    updateField('coverLetters', updated);
                                                }}
                                                onOpenAgneta={(html, ctx) => handleOpenAgneta('coverLetter', docType.id, html, ctx)}
                                                maxLength={3200}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                                <div className="flex flex-col">
                                    <h3 className="text-2xl font-black text-brand-400">Platsannonser</h3>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mt-1">{t('match_job_desc')}</span>
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl shadow-brand-400/5 border border-gray-100 dark:border-gray-700 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('job_keyword_label')}</label>
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                                <input
                                                    value={jobQuery}
                                                    onChange={e => setJobQuery(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleSearchJobs()}
                                                    placeholder="Ex: Lagerarbetare"
                                                    className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-brand-400 outline-none font-bold"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('city', 'Ort')}</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                                                <input
                                                    value={jobLocation}
                                                    onChange={e => setJobLocation(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleSearchJobs()}
                                                    placeholder="Ex: Stockholm"
                                                    className="w-full pl-11 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl focus:ring-2 focus:ring-brand-400 outline-none font-bold"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSearchJobs}
                                        disabled={isSearchingJobs}
                                        className="w-full py-5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl disabled:opacity-50"
                                    >
                                        {isSearchingJobs ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Search className="w-5 h-5" /> t('search_matches')</>}
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {searchError && (
                                        <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-xs font-bold flex items-center gap-2">
                                            <AlertTriangle className="w-4 h-4" /> {searchError}
                                        </div>
                                    )}

                                    {jobs.length === 0 && !isSearchingJobs && (
                                        <div className="py-20 flex flex-col items-center justify-center text-center opacity-20">
                                            <Briefcase className="w-16 h-16 mb-4 text-gray-300" />
                                            <p className="font-black uppercase tracking-widest text-sm text-gray-400">{t('no_searches_made')}</p>
                                        </div>
                                    )}

                                    {jobs.map(job => (
                                        <div key={job.id} className="group bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-6 rounded-[2rem] hover:shadow-2xl hover:border-brand-100 transition-all duration-300">
                                            <div className="flex justify-between items-start gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                        <span className="px-2 py-0.5 bg-brand-50 text-brand-400 rounded-md text-[8px] font-black uppercase tracking-widest">{job.occupation}</span>
                                                        <span className="flex items-center gap-1 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                            <MapPin className="w-3 h-3" /> {job.workplace_address.city || job.workplace_address.municipality}
                                                        </span>
                                                        {job.source && (
                                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${job.isExternal
                                                                ? 'bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                                                                : 'bg-green-50 text-green-600 border border-green-200 dark:bg-green-900/30 dark:text-green-400'
                                                                }`}>
                                                                {job.source}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h4 className="text-lg font-black text-gray-800 dark:text-gray-100 leading-tight group-hover:text-brand-400 transition-colors uppercase tracking-tight">{job.headline}</h4>
                                                    <p className="text-sm font-bold text-gray-400 mt-1">{job.company_name}</p>
                                                </div>
                                                <a
                                                    href={job.webpage_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-3 bg-gray-50 dark:bg-gray-900 text-gray-400 hover:text-brand-400 hover:bg-brand-50 rounded-2xl transition-all"
                                                >
                                                    <ExternalLink className="w-5 h-5" />
                                                </a>
                                            </div>

                                            <div className="mt-6">
                                                <button
                                                    onClick={() => handleApplyForJob(job)}
                                                    className="w-full py-4 bg-gray-50 dark:bg-gray-900 text-gray-500 hover:bg-brand-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-gray-100 dark:border-gray-700 flex items-center justify-center gap-2 group/btn"
                                                >
                                                    <Wand2 className="w-4 h-4" />
                                                    {t('help_me_apply')}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div >

                {/* Draggable Divider */}
                <div
                    onMouseDown={startResizing}
                    className={`absolute top-0 bottom-0 z-50 w-1.5 cursor-col-resize group transition-all hover:bg-brand-400/30 ${isResizing ? 'bg-brand-400/50' : 'bg-transparent'}`}
                    style={{ left: `calc(${leftWidth}% - 3px)` }}
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 bg-gray-200 dark:bg-gray-700 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                <div 
                    ref={sidePreviewRef} 
                    className="hidden lg:flex bg-slate-100 dark:bg-gray-950 flex-col relative transition-all duration-75 overflow-hidden"
                    style={{ width: `${100 - leftWidth}%` }}
                >
                    <button
                        onClick={() => setIsPreviewZoomed(!isPreviewZoomed)}
                        className="absolute top-6 right-10 z-30 p-3 bg-white dark:bg-gray-800 text-gray-400 hover:text-brand-400 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 transition-all hover:scale-110 active:scale-95 group"
                        title={isPreviewZoomed ? "t('zoom_out_preview')" : "t('zoom_in_preview')"}
                    >
                        {isPreviewZoomed ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </button>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-12 flex justify-center items-start">
                        {/* Visual Sheet Engine Engine */}
                        <div
                            className="origin-top flex flex-col gap-10 pb-40 transition-all duration-500"
                            style={{ transform: `scale(${previewScale})`, width: '794px' }}
                        >
                            <div ref={cvRef} className="relative transition-all duration-500 bg-transparent">
                                <CvPreview
                                    data={data}
                                    template={data.template || 'classic-sidebar'}
                                    brevId={docType.type === 'pb' ? docType.id : undefined}
                                />
                            </div>
                        </div>
                    </div>

                    <AgnetaChatSidekick
                        isOpen={agneta.isOpen}
                        onClose={() => setAgneta(prev => ({ ...prev, isOpen: false }))}
                        context={agneta.context}
                        sectionId={agneta.sectionId}
                        currentHtml={agneta.currentHtml}
                        data={data}
                        jobContext={agneta.jobContext}
                        onApply={(html, sectionId, itemId) => {
                            const sid = sectionId || agneta.sectionId;
                            const iid = itemId || agneta.itemId;

                            if (sid === 'coverLetter' && iid) {
                                const updated = (data.coverLetters || []).map(l => l.id === iid ? { ...l, content: html } : l);
                                updateField('coverLetters', updated);
                            } else if (sid === 'profile') {
                                updateField('profile', html);
                            } else if (iid) {
                                const sectionItems = (data[sid as keyof ResumeData] as any[]) || [];
                                updateField(sid as keyof ResumeData, sectionItems.map((item: any) => item.id === iid ? { ...item, description: html } : item));
                            }
                            setAgneta(prev => ({ ...prev, isOpen: false }));
                        }}
                    />
                    <GeneralChatSidekick
                        isOpen={isGeneralChatOpen}
                        onClose={() => setIsGeneralChatOpen(false)}
                    />
                </div>
            </div >

            <ImageCropModal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} onSave={handlePhotoSave} initialImage={data.personal.photoUrl} />
            <AIImportModal isOpen={isAIImportModalOpen} onClose={() => setIsAIImportModalOpen(false)} onImport={async (text) => {
                const result = await ImportService.mapTextToResume(text, systemSettings.geminiApiKey, systemSettings.geminiModel);
                if (result) {
                    setData(prev => ({ ...prev, ...result }));
                }
            }} />
        </div >
    );
};
