import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { UserProfile, ResumeData, Participant, CustomTemplate, MasterTemplateConfig, DEFAULT_MASTER_CONFIG, INITIAL_RESUME, PhotoPosition, StockImage } from '../types';
import { Shield, ShieldAlert, Check, Search, User, ArrowLeft, TrendingUp, Users, FileText, Ban, Key, Activity, Calendar, MoreHorizontal, UserMinus, UserCheck, Eye, ShieldCheck, Plus, X, Loader2, Trash2, Mail, Phone, ExternalLink, Wand2, Upload, Palette, Layout, Settings, Layers, Save, CheckCircle2, AlertTriangle, Image as ImageIcon, RefreshCcw, Sparkles, MessageSquare, Database, Move, Printer, Download, Mic, MicOff, Sun, Moon, LayoutDashboard, LogOut, Brain, ChevronDown, ChevronRight, Briefcase, GraduationCap } from 'lucide-react';
import { useTranslation } from '../utils/translations';
import { MasterTemplate } from './CvTemplates';
import { BackButton } from './BackButton';
import { AuthService } from '../services/AuthService';
import { StockService } from '../services/StockService';
import { SettingsService } from '../services/SettingsService';
import { LegacyImport } from './LegacyImport';
import { DuplicateScanner } from './DuplicateScanner';
import { AgnetaAvatar } from './AgnetaAvatar';
import { GoogleGenAI } from "@google/genai";
import { saveCustomTemplateToDB, getAllCustomTemplatesFromDB, deleteCustomTemplateFromDB } from '../db';
import { MonitoringService } from '../services/MonitoringService';
import { AgnetaTemplateSidekick } from './AgnetaTemplateSidekick';
import { SystemSettings, INITIAL_SYSTEM_SETTINGS } from '../types';

// ROBUST TEST DATA FOR PREVIEWING
const TEST_RESUME: ResumeData = {
    ...INITIAL_RESUME,
    personal: {
        ...INITIAL_RESUME.personal,
        firstName: 'Alexandra',
        lastName: 'Lindström',
        jobTitle: 'Senior Projektledare & Marknadsstrateg',
        email: 'alexandra.l@exempel.se',
        phone: '070-123 45 67',
        city: 'Stockholm',
        photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400',
    },
    profile: '<p>Resultatorienterad <b>Projektledare</b> med över 10 års erfarenhet av digital transformation och varumärkesutveckling. Expert på att leda tvärfunktionella team och leverera komplexa projekt under tidspress. Brinner för <b>innovation</b> och användarcentrerad design.</p>',
    experience: [
        {
            id: 't1',
            role: 'Senior Projektledare',
            company: 'Tech Solutions AB',
            location: 'Stockholm',
            startDate: 'Januari 2020',
            endDate: 'Nu',
            current: true,
            description: '<ul><li>Ansvarig för global lansering av SaaS-plattform.</li><li>Ledde ett team på 12 personer inom <b>utveckling</b> och <b>design</b>.</li><li>Ökade konverteringsgraden med 25% genom datadriven analys.</li></ul>'
        },
        {
            id: 't2',
            role: 'Marknadskoordinator',
            company: 'Creative Agency',
            location: 'Göteborg',
            startDate: 'Mars 2015',
            endDate: 'December 2019',
            current: false,
            description: '<ul><li>Utvecklade sociala medier-strategier för internationella kunder.</li><li>Hanterade budgetar upp till 2 miljoner SEK.</li></ul>'
        }
    ],
    education: [
        {
            id: 'e1',
            school: 'Handelshögskolan i Stockholm',
            degree: 'Master i Företagsekonomi',
            location: 'Stockholm',
            startDate: '2012',
            endDate: '2014',
            current: false,
            description: 'Fokus på strategisk marknadsföring och ledarskap.'
        }
    ],
    skills: [
        { id: 's1', name: 'Projektledning (Agil)', level: 5 },
        { id: 's2', name: 'Digital Marknadsföring', level: 4 },
        { id: 's3', name: 'Dataanalys & BI', level: 4 },
        { id: 's4', name: 'Svenska (Modersmål)', level: 5 }
    ],
    languages: [
        { id: 'l1', name: 'Svenska', level: 'Modersmål' },
        { id: 'l2', name: 'Engelska', level: 'Flytande' }
    ],
    sectionOrder: ['profile', 'experience', 'education', 'skills', 'languages']
};

interface AdminPanelProps {
    users: UserProfile[];
    resumes: ResumeData[];
    participants: Participant[];
    onUpdateUsers: (users: UserProfile[]) => void;
    onBack: () => void;
    onViewAsCoach?: (coach: UserProfile) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    systemSettings: SystemSettings;
}

type AdminTab = 'overview' | 'coaches' | 'participants' | 'templates' | 'whitelist' | 'stock' | 'settings' | 'import';

const NavItem = ({ icon, label, active, onClick, badge, hasSubItems, isExpanded }: { icon: any, label: string, active: boolean, onClick: () => void, badge?: number, hasSubItems?: boolean, isExpanded?: boolean }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${active
            ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 translate-x-1'
            : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
    >
        <div className={`${active ? 'text-white' : 'text-slate-400 dark:text-slate-600 group-hover:text-brand-400'} transition-colors`}>
            {React.cloneElement(icon, { size: 18 })}
        </div>
        <span className="text-[11px] font-black uppercase tracking-widest">{label}</span>
        {badge !== undefined && (
            <div className={`ml-auto px-2 py-0.5 rounded-full text-[8px] font-black ${active ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                {badge}
            </div>
        )}
        {hasSubItems && (
            <div className="ml-auto">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
        )}
        {active && badge === undefined && !hasSubItems && <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full"></div>}
    </button>
);

const SubNavItem = ({ label, active, onClick }: { label: string, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 pl-12 pr-4 py-2.5 rounded-xl transition-all duration-200 group ${active
            ? 'text-brand-500 dark:text-brand-400 font-black'
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
            }`}
    >
        <div className={`w-1 h-1 rounded-full transition-all ${active ? 'bg-brand-400 scale-125' : 'bg-slate-300 dark:bg-slate-700 group-hover:bg-slate-400'}`}></div>
        <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
);

export const AdminPanel: React.FC<AdminPanelProps> = ({ users, resumes, participants, onUpdateUsers, onBack, onViewAsCoach, isDarkMode, toggleDarkMode, systemSettings }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<AdminTab>('overview');
    const [isSettingsExpanded, setIsSettingsExpanded] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // Custom Templates State
    const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);
    const [editingTemplate, setEditingTemplate] = useState<CustomTemplate | null>(null);
    const [showAgneta, setShowAgneta] = useState(false);
    const [showTestData, setShowTestData] = useState(true);
    const [activeDropZone, setActiveDropZone] = useState<PhotoPosition | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const printRef = useRef<HTMLDivElement>(null);

    // Form state for new coach
    const [newCoach, setNewCoach] = useState({ displayName: '', email: '', password: '', confirmPassword: '' });
    const [whitelist, setWhitelist] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Confirmation Dialog State
    const [confirmDialog, setConfirmDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        onCancel: () => void;
    } | null>(null);

    // Stock Images State
    const [stockImages, setStockImages] = useState<StockImage[]>([]);
    const [newStockImage, setNewStockImage] = useState({ name: '', category: '', url: '' });
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);

    // aiForm is used to hold the state during editing until Spara is clicked
    const [settingsSubTab, setSettingsSubTab] = useState<'avatar' | 'api' | 'prompts' | 'branding' | 'security'>('branding');
    const [aiForm, setAiForm] = useState({
        geminiApiKey: '',
        geminiModel: 'gemini-2.0-flash',
        customModelId: '',
        agnetaSystemPrompt: '',
        agnetaProfilePrompt: '',
        agnetaExperiencePrompt: '',
        agnetaEducationPrompt: '',
        agnetaCoverLetterPrompt: '',
        agnetaGreetingStandard: '',
        savaMatchingPrompt: '',
        importMappingPrompt: '',
        companyName: '',
        landingTitle: '',
        landingSubtitle: '',
        primaryColor: '',
        allowedEmailDomains: '',
        agnetaName: '',
        savaName: '',
        agnetaAvatarUrl: '',
        savaAvatarUrl: '',
        logoUrl: '',
        emailTemplates: {
            simple: { subject: '', body: '' },
            withCV: { subject: '', body: '' },
            withCoverLetter: { subject: '', body: '' }
        },
        allowBulkImportForCoaches: true
    });
    const [isSavingAiSettings, setIsSavingAiSettings] = useState(false);
    const [savingField, setSavingField] = useState<string | null>(null);
    const [saveSuccessField, setSaveSuccessField] = useState<string | null>(null);
    const [isCustomModel, setIsCustomModel] = useState(false);
    const [showSaveSuccess, setShowSaveSuccess] = useState(false);
    const [healthStatus, setHealthStatus] = useState<any>(null);

    // Initialize aiForm from systemSettings ONLY once or when systemSettings changes AND we are NOT in the middle of a major edit
    // (Actually simpler: sync it once on mount and then let user control it)
    useEffect(() => {
        loadTemplates();
        loadWhitelist();
        loadStockImages();

        // Initialize form with current settings
        const isPreset = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-flash-latest', 'gemini-pro-latest', 'gemini-2.0-flash'].includes(systemSettings.geminiModel || '');
        setAiForm({
            geminiApiKey: systemSettings.geminiApiKey || '',
            geminiModel: isPreset ? (systemSettings.geminiModel || 'gemini-flash-latest') : 'custom',
            customModelId: isPreset ? '' : (systemSettings.geminiModel || ''),
            agnetaSystemPrompt: systemSettings.agnetaSystemPrompt || INITIAL_SYSTEM_SETTINGS.agnetaSystemPrompt,
            agnetaProfilePrompt: systemSettings.agnetaProfilePrompt || INITIAL_SYSTEM_SETTINGS.agnetaProfilePrompt,
            agnetaExperiencePrompt: systemSettings.agnetaExperiencePrompt || INITIAL_SYSTEM_SETTINGS.agnetaExperiencePrompt,
            agnetaEducationPrompt: systemSettings.agnetaEducationPrompt || INITIAL_SYSTEM_SETTINGS.agnetaEducationPrompt,
            agnetaCoverLetterPrompt: systemSettings.agnetaCoverLetterPrompt || INITIAL_SYSTEM_SETTINGS.agnetaCoverLetterPrompt,
            agnetaGreetingStandard: systemSettings.agnetaGreetingStandard || INITIAL_SYSTEM_SETTINGS.agnetaGreetingStandard,
            agnetaGreetingJob: systemSettings.agnetaGreetingJob || INITIAL_SYSTEM_SETTINGS.agnetaGreetingJob,
            savaMatchingPrompt: systemSettings.savaMatchingPrompt || INITIAL_SYSTEM_SETTINGS.savaMatchingPrompt,
            importMappingPrompt: systemSettings.importMappingPrompt || INITIAL_SYSTEM_SETTINGS.importMappingPrompt,
            companyName: systemSettings.companyName || 'Aventus',
            landingTitle: systemSettings.landingTitle || 'Aventus CV',
            landingSubtitle: systemSettings.landingSubtitle || 'Stärker individer och matchar talanger',
            primaryColor: systemSettings.primaryColor || '#4f46e5',
            allowedEmailDomains: systemSettings.allowedEmailDomains || '',
            agnetaName: systemSettings.agnetaName || 'Agneta',
            savaName: systemSettings.savaName || 'Savå',
            agnetaAvatarUrl: systemSettings.agnetaAvatarUrl || '',
            savaAvatarUrl: systemSettings.savaAvatarUrl || '',
            logoUrl: systemSettings.logoUrl || '',
            emailTemplates: systemSettings.emailTemplates || {
                simple: { subject: 'Tips från coachen - {{PARTICIPANT_FULLNAME}}', body: 'Hej {{PARTICIPANT_NAME}},\n\nJag har gått igenom ditt material och har några tips att dela med mig av.\n\nVänliga hälsningar,\n{{COACH_NAME}}' },
                withCV: { subject: 'Ditt CV - {{PARTICIPANT_FULLNAME}}', body: 'Hej {{PARTICIPANT_NAME}},\n\nBifogat hittar du ditt CV.\n\nLycka till med jobbsökandet!\n\nVänliga hälsningar,\n{{COACH_NAME}}' },
                withCoverLetter: { subject: 'Ditt personliga brev - {{PARTICIPANT_FULLNAME}}', body: 'Hej {{PARTICIPANT_NAME}},\n\nBifogat hittar du ditt personliga brev.\n\nVänliga hälsningar,\n{{COACH_NAME}}' }
            },
            allowBulkImportForCoaches: systemSettings.allowBulkImportForCoaches !== false,
            disableEmailVerification: systemSettings.disableEmailVerification || false,
            allowOpenAdminRegistration: systemSettings.allowOpenAdminRegistration || false
        });
        setIsCustomModel(!isPreset && !!systemSettings.geminiModel);

        const unsubscribeHealth = MonitoringService.subscribeToHealth((status) => {
            setHealthStatus(status);
        });

        return () => {
            unsubscribeHealth();
        };
    }, [systemSettings]); // Sync when settings update globally


    const loadWhitelist = async () => {
        try {
            const list = await AuthService.getWhitelist();
            setWhitelist(list);
        } catch (err) {
            console.error("Kunde inte ladda väntelistan");
        }
    };

    const loadTemplates = async () => {
        const ts = await getAllCustomTemplatesFromDB();
        setCustomTemplates(ts);
    };

    const loadStockImages = async () => {
        try {
            const imgs = await StockService.getStockImages();
            setStockImages(imgs);
        } catch (err) {
            console.error(t("error_loading_image_library", "Kunde inte ladda bildbiblioteket"));
        }
    };

    const stats = useMemo(() => {
        const totalResumes = resumes.length;
        const activeCoaches = users.filter(u => u.status === 'active' && u.role === 'coach').length;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentResumes = resumes.filter(r => new Date(r.lastEdited) > thirtyDaysAgo).length;
        const perCoach: Record<string, number> = {};
        resumes.forEach(r => { perCoach[r.createdBy] = (perCoach[r.createdBy] || 0) + 1; });
        const coachWorkload = users
            .filter(u => u.role === 'coach')
            .map(u => ({ name: u.displayName || u.email.split('@')[0], count: perCoach[u.uid] || 0 }))
            .sort((a, b) => b.count - a.count);
        return { totalResumes, activeCoaches, recentResumes, coachWorkload };
    }, [users, resumes]);

    const handleExportTestPdf = async () => {
        setIsExporting(true);

        const originalTitle = document.title;
        document.title = `Malltest_${editingTemplate?.name || 'Utkast'}`;

        // Prepare for printing
        document.body.classList.add('is-printing');

        // 3. Trigger print with tiny delay to ensure Portal is rendered
        setTimeout(() => {
            window.print();

            // 4. Cleanup
            setTimeout(() => {
                document.body.classList.remove('is-printing');
                document.title = originalTitle;
                setIsExporting(false);
            }, 500);
        }, 20);
    };

    // CLONE TEMPLATE LOGIC
    const handleCloneDesign = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !process.env.API_KEY) return;
        setIsAnalyzing(true);

        try {
            const apiKey = systemSettings.geminiApiKey || process.env.API_KEY || '';
            const ai = new GoogleGenAI({ apiKey, apiVersion: 'v1beta' });
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];

                const prompt = `
                    Du är en expert på grafisk design och CV - layouter.Analysera bifogad bild och extrahera designinställningar för att klona dess layout.
                    Returnera ENDAST JSON som matchar interfacet MasterTemplateConfig:
{
    "layout": "sidebar-left" | "sidebar-right" | "header-only" | "split-equal",
        "sidebarWidth": "string (ex 30%)",
            "spacing": "compact" | "normal" | "relaxed",
                "headerAlignment": "left" | "center" | "right",
                    "headerStyle": "modern" | "classic" | "minimal" | "serif-elegant",
                        "sectionStyle": "simple" | "underlined" | "boxed" | "side-border",
                            "accentColor": "HEX-kod (ex #2563eb)",
                                "fontHeading": "inter" | "merriweather",
                                    "fontBody": "inter",
                                        "borderRadius": "string (ex 0.75rem)",
                                            "showPhoto": boolean,
                                                "photoShape": "square" | "circle" | "soft-square",
                                                    "photoPosition": "sidebar-top" | "sidebar-bottom" | "header-left" | "header-center" | "header-right",
                                                        "sideStripe": "none" | "left" | "right" | "both",
                                                            "sideStripeWidth": "string",
                                                                "showBorder": boolean,
                                                                    "borderWidth": "string",
                                                                        "borderColor": "string"
}
`;

                try {
                    const response = await ai.models.generateContent({
                        model: systemSettings.geminiModel || 'gemini-flash-latest',
                        contents: {
                            parts: [
                                { inlineData: { mimeType: file.type, data: base64 } },
                                { text: prompt }
                            ]
                        },
                        config: { responseMimeType: "application/json" }
                    });

                    // Sanitize JSON by finding first '{' and last '}'
                    const responseText = response.text;
                    const startIndex = responseText.indexOf('{');
                    const endIndex = responseText.lastIndexOf('}');
                    
                    if (startIndex === -1 || endIndex === -1) {
                        throw new Error("Kunde inte hitta giltig JSON i AI-svaret");
                    }
                    
                    const cleanJson = responseText.substring(startIndex, endIndex + 1);
                    const config = JSON.parse(cleanJson);

                    const newT: CustomTemplate = {
                        id: 'temp_' + Date.now(),
                        name: 'Klonad Mall ' + new Date().toLocaleDateString(),
                        config: config,
                        isPublished: false,
                        createdAt: new Date().toISOString(),
                        createdBy: 'admin'
                    };
                    setEditingTemplate(newT);
                } catch (err) {
                    console.error("AI Analysis error:", err);
                    alert("Kunde inte analysera bilden. Försök med en tydligare bild.");
                } finally {
                    setIsAnalyzing(false);
                }
            };
        } catch (err) {
            console.error("FileReader error:", err);
            setIsAnalyzing(false);
        }
    };

    const handleSaveTemplate = async () => {
        if (!editingTemplate) return;
        setIsSaving(true);
        await saveCustomTemplateToDB(editingTemplate);
        await loadTemplates();
        setIsSaving(false);
        setEditingTemplate(null);
        setShowAgneta(false);
    };

    const handleDeleteTemplate = async (id: string) => {
        if (confirm("Radera denna mall permanent?")) {
            await deleteCustomTemplateFromDB(id);
            await loadTemplates();
        }
    };

    const handleToggleStatus = (userId: string) => {
        const updatedUsers = users.map(u => {
            if (u.uid === userId) {
                const newStatus = u.status === 'active' ? 'suspended' : 'active';
                return { ...u, status: newStatus as any };
            }
            return u;
        });
        onUpdateUsers(updatedUsers);
    };

    const handleToggleInterviewAccess = (userId: string) => {
        const updatedUsers = users.map(u => {
            if (u.uid === userId) {
                return { ...u, canUseInterview: !u.canUseInterview };
            }
            return u;
        });
        onUpdateUsers(updatedUsers);
    };

    const handleToggleRole = (userId: string) => {
        const updatedUsers = users.map(u => {
            if (u.uid === userId) {
                const newRole = u.role === 'admin' ? 'coach' : 'admin';
                return { ...u, role: newRole as any };
            }
            return u;
        });
        onUpdateUsers(updatedUsers);
    };

    const handleToggleMatchingAccess = (userId: string) => {
        const updatedUsers = users.map(u => {
            if (u.uid === userId) {
                return { ...u, canUseMatching: !u.canUseMatching };
            }
            return u;
        });
        onUpdateUsers(updatedUsers);
    };

    const handleResetPassword = async (email: string) => {
        try {
            await AuthService.sendPasswordReset(email);
            alert(`Instruktioner för att återställa lösenord har skickats till ${email} `);
        } catch (err) {
            alert("Kunde inte skicka återställningsmail.");
        }
    };

    const handleAddCoach = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!newCoach.displayName.trim() || !newCoach.email.trim()) { setError("Alla fält måste fyllas i."); return; }

        // If in whitelist mode, require password
        if (activeTab === 'whitelist') {
            if (!newCoach.password.trim()) {
                setError("Lösenord krävs för gästkonton.");
                return;
            }
            if (newCoach.password.length < 6) {
                setError("Lösenordet måste vara minst 6 tecken.");
                return;
            }
            if (newCoach.password !== newCoach.confirmPassword) {
                setError("Lösenorden matchar inte.");
                return;
            }
        }

        setIsSaving(true);
        try {
            if (activeTab === 'whitelist') {
                // Create guest account with AdminAuthService
                const { AdminAuthService } = await import('../services/AdminAuthService');
                await AdminAuthService.createGuestAccount(
                    newCoach.email.trim(),
                    newCoach.password,
                    newCoach.displayName.trim(),
                    'admin'
                );

                // Close modal first
                setIsAddModalOpen(false);
                setNewCoach({ displayName: '', email: '', password: '', confirmPassword: '' });

                // Show success message and inform about re-login
                alert(`Gästkonto skapat!\n\n${newCoach.displayName} kan nu logga in med:\nE-post: ${newCoach.email}\nLösenord: (det du angav)\n\nOBS: Du behöver logga in igen eftersom Firebase endast stödjer en session åt gången.`);

                // Go back to landing page so user can log in again
                onBack();
            } else {
                // Add to Whitelist only (old behavior for coaches)
                await AuthService.addToWhitelist(newCoach.email.trim(), 'admin');
                alert(`E-post ${newCoach.email} har lagts till i väntelistan. De kan nu registrera sig.`);
                loadWhitelist();
                setIsAddModalOpen(false);
                setNewCoach({ displayName: '', email: '', password: '', confirmPassword: '' });
            }
        } catch (err: any) {
            setError(err.message || "Kunde inte skapa gästkonto.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAddStockImage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStockImage.name || !newStockImage.category || !newStockImage.url) {
            setError("Alla fält måste fyllas i.");
            return;
        }

        setIsSaving(true);
        try {
            const admin = users.find(u => u.role === 'admin'); // Fallback for createdBy
            await StockService.uploadStockImage(
                newStockImage.name,
                newStockImage.category,
                newStockImage.url,
                admin?.uid || 'admin'
            );
            setNewStockImage({ name: '', category: '', url: '' });
            setIsStockModalOpen(false);
            loadStockImages();
        } catch (err) {
            setError("Kunde inte spara bilden biblioteket.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteStockImage = async (id: string) => {
        if (!confirm("Är du säker på att du vill ta bort bilden?")) return;
        try {
            await StockService.deleteStockImage(id);
            loadStockImages();
        } catch (err) {
            alert("Kunde inte ta bort bilden.");
        }
    };

    const handleUpdateAgnetaAvatar = async (url: string) => {
        try {
            const updated = { ...systemSettings, agnetaAvatarUrl: url };
            await SettingsService.updateSettings(updated);
            setAiForm(prev => ({ ...prev, agnetaAvatarUrl: url }));
        } catch (err) {
            alert("Kunde inte uppdatera Agnetas avatar.");
        }
    };

    const handleUpdateSavaAvatar = async (url: string) => {
        try {
            const updated = { ...systemSettings, savaAvatarUrl: url };
            await SettingsService.updateSettings(updated);
            setAiForm(prev => ({ ...prev, savaAvatarUrl: url }));
        } catch (err) {
            alert("Kunde inte uppdatera Savås avatar.");
        }
    };

    const handleUpdateLogo = async (url: string) => {
        try {
            const updated = { ...systemSettings, logoUrl: url };
            await SettingsService.updateSettings(updated);
            setAiForm(prev => ({ ...prev, logoUrl: url }));
        } catch (err) {
            alert("Kunde inte uppdatera logotypen.");
        }
    };

    const handleSaveSingleField = async (fieldKey: string, value: any) => {
        setSavingField(fieldKey);
        try {
            await SettingsService.updateSettings({ [fieldKey]: value });
            setSaveSuccessField(fieldKey);
            setTimeout(() => setSaveSuccessField(null), 2000);
        } catch (err) {
            console.error(`Error saving field ${fieldKey}:`, err);
            alert("Kunde inte spara inställningen.");
        } finally {
            setSavingField(null);
        }
    };

    const handleTestAiConnection = async () => {
        const apiKey = aiForm.geminiApiKey || systemSettings.geminiApiKey || process.env.API_KEY || '';
        if (!apiKey) {
            alert("Ange en API-nyckel först.");
            return;
        }

        console.log("--- AI DIAGNOSTICS START ---");
        const versions = ['v1', 'v1beta'];
        for (const v of versions) {
            try {
                console.log(`Checking version: ${v} `);
                const res = await fetch(`https://generativelanguage.googleapis.com/${v}/models?key=${apiKey}`);
                const data = await res.json();
                console.log(`Version ${v} result:`, data);
                if (data.models) {
                    data.models.forEach((m: any) => {
                        console.log(`[${v}] Model: ${m.name} | Methods: ${m.supportedGenerationMethods?.join(', ')}`);
                    });
                }
            } catch (err) {
                console.error(`Version ${v} failed:`, err);
            }
        }
        console.log("--- AI DIAGNOSTICS END ---");
        alert("Diagnostik körd. Kontrollera webbläsarens konsol (F12) för resultat.");
    };

    const handleSaveAiSettings = async () => {
        setIsSavingAiSettings(true);
        try {
            const finalModel = isCustomModel ? aiForm.customModelId : aiForm.geminiModel;
            const updated = {
                ...systemSettings,
                geminiApiKey: aiForm.geminiApiKey,
                geminiModel: finalModel,
                agnetaSystemPrompt: aiForm.agnetaSystemPrompt,
                agnetaProfilePrompt: aiForm.agnetaProfilePrompt,
                agnetaExperiencePrompt: aiForm.agnetaExperiencePrompt,
                agnetaEducationPrompt: aiForm.agnetaEducationPrompt,
                agnetaCoverLetterPrompt: aiForm.agnetaCoverLetterPrompt,
                agnetaGreetingStandard: aiForm.agnetaGreetingStandard,
                agnetaGreetingJob: aiForm.agnetaGreetingJob,
                savaMatchingPrompt: aiForm.savaMatchingPrompt,
                importMappingPrompt: aiForm.importMappingPrompt,
                companyName: aiForm.companyName,
                landingTitle: aiForm.landingTitle,
                landingSubtitle: aiForm.landingSubtitle,
                primaryColor: aiForm.primaryColor,
                allowedEmailDomains: aiForm.allowedEmailDomains,
                agnetaName: aiForm.agnetaName,
                savaName: aiForm.savaName,
                agnetaAvatarUrl: aiForm.agnetaAvatarUrl,
                savaAvatarUrl: aiForm.savaAvatarUrl,
                logoUrl: aiForm.logoUrl,
                emailTemplates: aiForm.emailTemplates,
                allowBulkImportForCoaches: aiForm.allowBulkImportForCoaches,
                disableEmailVerification: aiForm.disableEmailVerification,
                allowOpenAdminRegistration: aiForm.allowOpenAdminRegistration
            };
            console.log("Saving settings:", updated);
            await SettingsService.updateSettings(updated);
            setShowSaveSuccess(true);
            setTimeout(() => setShowSaveSuccess(false), 3000);
        } catch (err: any) {
            console.error("Critical Save Error:", err);
            alert("Kunde inte spara inställningarna! Fel: " + (err.message || String(err)));
        } finally {
            setIsSavingAiSettings(false);
        }
    };

    const handlePhotoDrop = (zone: PhotoPosition) => {
        if (!editingTemplate) return;
        setEditingTemplate({
            ...editingTemplate,
            config: {
                ...editingTemplate.config,
                photoPosition: zone
            }
        });
        setActiveDropZone(null);
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (u.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const printPortal = editingTemplate ? (
        <div className="print-container">
            <MasterTemplate
                data={showTestData ? TEST_RESUME : { ...INITIAL_RESUME, personal: { ...INITIAL_RESUME.personal, firstName: 'Test', lastName: 'Namn' } }}
                containerStyle={{}}
                fontClass=""
                design={{ font: editingTemplate.config.fontBody, accentColor: editingTemplate.config.accentColor, scale: 1, spacing: 1.5 }}
                headerHelper={(k, d) => d}
                config={editingTemplate.config}
            />
        </div>
    ) : null;

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 font-sans selection:bg-brand-400/30 transition-colors duration-300 overflow-hidden">
            {/* Portals for printing */}
            {printPortal && createPortal(printPortal, document.body)}

            {/* ADD COACH MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md max-h-[85vh] overflow-y-auto rounded-[2.5rem] shadow-2xl">
                        <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/20">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em]">
                                {activeTab === 'whitelist' ? 'Godkänn ny e-post' : 'Lägg till ny Coach'}
                            </h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddCoach} className="p-10 space-y-6">
                            {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold flex items-center gap-3"><AlertTriangle className="w-4 h-4" /> {error}</div>}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Namn</label>
                                <input value={newCoach.displayName} onChange={e => setNewCoach({ ...newCoach, displayName: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400 text-slate-900 dark:text-white" placeholder="Ex: Karl Coach" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-post</label>
                                <input type="email" value={newCoach.email} onChange={e => setNewCoach({ ...newCoach, email: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400 text-slate-900 dark:text-white" placeholder="coach@aventus.se" />
                            </div>
                            {activeTab === 'whitelist' && (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Lösenord</label>
                                        <input
                                            type="password"
                                            value={newCoach.password}
                                            onChange={e => setNewCoach({ ...newCoach, password: e.target.value })}
                                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400 text-slate-900 dark:text-white"
                                            placeholder="Minst 6 tecken"
                                        />
                                        {newCoach.password && (
                                            <div className="flex items-center gap-2 ml-1">
                                                <div className={`h-1 flex-1 rounded-full ${newCoach.password.length < 6 ? 'bg-red-400' : newCoach.password.length < 10 ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${newCoach.password.length < 6 ? 'text-red-400' : newCoach.password.length < 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                    {newCoach.password.length < 6 ? 'Svagt' : newCoach.password.length < 10 ? 'Bra' : 'Starkt'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bekräfta lösenord</label>
                                        <input
                                            type="password"
                                            value={newCoach.confirmPassword}
                                            onChange={e => setNewCoach({ ...newCoach, confirmPassword: e.target.value })}
                                            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400 text-slate-900 dark:text-white"
                                            placeholder="Ange lösenordet igen"
                                        />
                                        {newCoach.confirmPassword && (
                                            <div className="flex items-center gap-2 ml-1">
                                                {newCoach.password === newCoach.confirmPassword ? (
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                                                        <Check className="w-3 h-3" /> Matchar
                                                    </span>
                                                ) : (
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1">
                                                        <X className="w-3 h-3" /> Matchar inte
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-brand-400/10 border border-brand-400/20 p-4 rounded-2xl">
                                        <p className="text-[10px] font-bold text-brand-600 dark:text-brand-400 leading-relaxed">
                                            Detta skapar ett komplett gästkonto. Användaren kan logga in direkt utan e-postverifiering.
                                        </p>
                                    </div>
                                </>
                            )}
                            <div className="pt-4 flex gap-4">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-2xl">Avbryt</button>
                                <button type="submit" disabled={isSaving} className="flex-1 py-4 bg-brand-400 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-brand-400/20">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (activeTab === 'whitelist' ? 'Skapa Gästkonto' : 'Spara Coach')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* STOCK IMAGE MODAL */}
            {isStockModalOpen && (
                <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/20">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em]">Lägg till i Biblioteket</h2>
                            <button onClick={() => setIsStockModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleAddStockImage} className="p-10 space-y-6">
                            {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs font-bold flex items-center gap-3"><AlertTriangle className="w-4 h-4" /> {error}</div>}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Beskrivning</label>
                                <input value={newStockImage.name} onChange={e => setNewStockImage({ ...newStockImage, name: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400 text-slate-900 dark:text-white" placeholder="Ex: Lastbil nära horisonten" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kategori</label>
                                <select
                                    value={newStockImage.category}
                                    onChange={e => setNewStockImage({ ...newStockImage, category: e.target.value })}
                                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400 text-slate-900 dark:text-white"
                                >
                                    <option value="">Välj kategori...</option>
                                    <option value="Transport">Transport</option>
                                    <option value="Bygg">Bygg</option>
                                    <option value="Lager">Lager</option>
                                    <option value="Industri">Industri</option>
                                    <option value="Kontor">Kontor</option>
                                    <option value="Vård">Vård</option>
                                    <option value="Övrigt">Övrigt</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bild</label>
                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setIsOptimizing(true);
                                                setError(null);
                                                try {
                                                    const reader = new FileReader();
                                                    reader.onload = async () => {
                                                        try {
                                                            const compressed = await StockService.compressImage(reader.result as string);
                                                            setNewStockImage({ ...newStockImage, url: compressed });
                                                        } catch (err) {
                                                            setError("Kunde inte optimera bilden.");
                                                        } finally {
                                                            setIsOptimizing(false);
                                                        }
                                                    };
                                                    reader.readAsDataURL(file);
                                                } catch (err) {
                                                    setError("Kunde inte läsa filen.");
                                                    setIsOptimizing(false);
                                                }
                                            }
                                        }}
                                        className="hidden"
                                        id="stock-upload-admin"
                                    />
                                    <label htmlFor="stock-upload-admin" className="flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl cursor-pointer hover:border-brand-400 transition-all aspect-video overflow-hidden">
                                        {isOptimizing ? (
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-brand-400">Optimerar...</span>
                                            </div>
                                        ) : newStockImage.url ? (
                                            <img src={newStockImage.url} className="w-full h-full object-cover rounded-xl" />
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Klicka för att ladda upp</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button type="button" onClick={() => setIsStockModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-400 font-black uppercase tracking-widest text-[10px] rounded-2xl">Avbryt</button>
                                <button type="submit" disabled={isSaving || !newStockImage.url} className="flex-1 py-4 bg-brand-400 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-brand-400/20 disabled:opacity-50">
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Spara i Bibliotek'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* TEMPLATE EDIT MODAL */}
            {editingTemplate && (
                <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4 overflow-hidden">
                    <div className="w-full max-w-[1550px] h-full max-h-[90vh] flex gap-4 md:gap-8">
                        <div className="w-[450px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] flex flex-col shadow-2xl overflow-hidden">
                            {showAgneta ? (
                                <AgnetaTemplateSidekick
                                    currentConfig={editingTemplate.config}
                                    onApply={(cfg) => setEditingTemplate({ ...editingTemplate, config: cfg })}
                                    onClose={() => setShowAgneta(false)}
                                />
                            ) : (
                                <div className="flex flex-col h-full">
                                    <div className="p-10 pb-4 flex justify-between items-center shrink-0 border-b border-slate-100 dark:border-slate-800/50">
                                        <div><h2 className="text-2xl font-black text-slate-900 dark:text-white">Mall-Labbet</h2><p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Manuella inställningar</p></div>
                                        <button onClick={() => setEditingTemplate(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-500"><X className="w-6 h-6" /></button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-8 p-10 pt-6 custom-scrollbar text-slate-900 dark:text-slate-100">
                                        <div className="bg-brand-400/5 border border-brand-400/20 rounded-2xl p-4 flex items-center justify-between group">
                                            <div className="flex items-center gap-3">
                                                <Database className={`w-5 h-5 transition-colors ${showTestData ? 'text-brand-400' : 'text-slate-400'}`} />
                                                <div>
                                                    <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest block">Förhandsgranskning</span>
                                                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Testfyll med exempeldata</span>
                                                </div>
                                            </div>
                                            <button onClick={() => setShowTestData(!showTestData)} className={`w-12 h-6 rounded-full transition-all relative ${showTestData ? 'bg-brand-400' : 'bg-slate-300 dark:bg-slate-700'}`}><div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${showTestData ? 'left-7' : 'left-1'}`} /></button>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Namn på mall</label>
                                            <input value={editingTemplate.name} onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })} className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400 text-slate-900 dark:text-white" />
                                        </div>
                                        <div className="space-y-4">
                                            <h3 className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-2">Layout</h3>
                                            <div className="grid grid-cols-2 gap-4 text-[10px] font-black uppercase tracking-widest">
                                                {['sidebar-left', 'sidebar-right', 'header-only', 'split-equal'].map(l => (
                                                    <button key={l} onClick={() => setEditingTemplate({ ...editingTemplate, config: { ...editingTemplate.config, layout: l as any } })} className={`p-4 rounded-2xl border-2 transition-all ${editingTemplate.config.layout === l ? 'border-brand-400 bg-brand-400/5' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'}`}>{l.replace('-', ' ')}</button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-10 pt-4 flex flex-col gap-3 shrink-0 border-t border-slate-100 dark:border-slate-800/50">
                                        <button onClick={() => setShowAgneta(true)} className="w-full py-4 bg-brand-400 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-brand-400/20 flex items-center justify-center gap-2 hover:bg-brand-500 transition-all"><Sparkles className="w-4 h-4" /> Fråga Agneta om design</button>
                                        <div className="flex gap-4">
                                            <button onClick={() => setEditingTemplate(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase tracking-widest text-[10px] rounded-2xl">Avbryt</button>
                                            <button onClick={handleSaveTemplate} className="flex-1 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Spara Mall</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] flex items-center justify-center p-12 relative overflow-hidden">
                            <div className="absolute top-10 left-10 flex items-center gap-3">
                                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Live Preview {showTestData && " - Testfylld"}</span>
                            </div>
                            <div className="scale-[0.55] origin-center shadow-2xl bg-white">
                                <MasterTemplate
                                    data={showTestData ? TEST_RESUME : { ...INITIAL_RESUME, personal: { ...INITIAL_RESUME.personal, firstName: '', lastName: '', jobTitle: 'Exempelroll' } }}
                                    containerStyle={{}} design={{ font: 'inter', accentColor: editingTemplate.config.accentColor, scale: 1, spacing: 1.5 }} headerHelper={(k, d) => d} config={editingTemplate.config}
                                    isEditMode={true} activeDropZone={activeDropZone} onPhotoDragStart={() => { }} onDropZoneOver={(zone) => setActiveDropZone(zone)} onDropZoneLeave={() => setActiveDropZone(null)} onDropOnZone={handlePhotoDrop}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SIDEBAR NAVIGATION */}
            <aside className="w-80 h-screen sticky top-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-[100]">
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand-500/20">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white uppercase">{systemSettings.companyName || 'Aventus'} <span className="text-brand-400">Admin</span></h1>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">Version 2.0</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                    <BackButton onClick={onBack} label={t("go_back") || "Gå tillbaka"} variant="sidebar" />
                </div>

                <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">{t("main_menu", "Huvudmeny")}</div>
                    <NavItem icon={<LayoutDashboard />} label={t("overview", "Översikt")} active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                    <NavItem icon={<Users />} label={t("coaches") || "Coacher"} active={activeTab === 'coaches'} onClick={() => setActiveTab('coaches')} badge={stats.activeCoaches} />

                    <div className="pt-8 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">{t("tools") || "Verktyg"}</div>
                    <NavItem icon={<Palette />} label={t("template_lab") || "Mall-Labbet"} active={activeTab === 'templates'} onClick={() => setActiveTab('templates')} badge={customTemplates.length} />
                    <NavItem icon={<ImageIcon />} label={t("image_library") || "Bildbibliotek"} active={activeTab === 'stock'} onClick={() => setActiveTab('stock')} />

                    <div className="pt-8 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">{t("content_section") || "Innehåll"}</div>
                    <NavItem icon={<ShieldAlert />} label={t("whitelist") || "Väntelista"} active={activeTab === 'whitelist'} onClick={() => setActiveTab('whitelist')} badge={whitelist.length} />
                    <NavItem icon={<Database />} label={t("import_archive") || "Importera Arkiv"} active={activeTab === 'import'} onClick={() => setActiveTab('import')} />

                    <div className="pt-8 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">{t("configuration") || "Konfiguration"}</div>
                    <NavItem
                        icon={<Settings />}
                        label={t("settings") || "Inställningar"}
                        active={activeTab === 'settings'}
                        onClick={() => {
                            setActiveTab('settings');
                            setIsSettingsExpanded(!isSettingsExpanded);
                        }}
                        hasSubItems
                        isExpanded={isSettingsExpanded}
                    />
                    {isSettingsExpanded && (
                        <div className="mt-1 space-y-1 animate-in slide-in-from-top-2 duration-200">
                            <SubNavItem
                                label={t("company_branding") || "Företag & Branding"}
                                active={activeTab === 'settings' && settingsSubTab === 'branding'}
                                onClick={() => {
                                    setActiveTab('settings');
                                    setSettingsSubTab('branding');
                                }}
                            />
                            <SubNavItem
                                label={t("security_access") || "Säkerhet & Åtkomst"}
                                active={activeTab === 'settings' && settingsSubTab === 'security'}
                                onClick={() => {
                                    setActiveTab('settings');
                                    setSettingsSubTab('security');
                                }}
                            />
                            <SubNavItem
                                label={t("ai_profiles") || "AI-Profiler"}
                                active={activeTab === 'settings' && settingsSubTab === 'avatar'}
                                onClick={() => {
                                    setActiveTab('settings');
                                    setSettingsSubTab('avatar');
                                }}
                            />
                            <SubNavItem
                                label={t("ai_instructions") || "AI-Instruktioner"}
                                active={activeTab === 'settings' && settingsSubTab === 'prompts'}
                                onClick={() => {
                                    setActiveTab('settings');
                                    setSettingsSubTab('prompts');
                                }}
                            />
                            <SubNavItem
                                label={t("api_tech") || "API & Teknik"}
                                active={activeTab === 'settings' && settingsSubTab === 'api'}
                                onClick={() => {
                                    setActiveTab('settings');
                                    setSettingsSubTab('api');
                                }}
                            />
                        </div>
                    )}

                    <NavItem icon={<Mail />} label={t("email_templates") || "E-postmallar"} active={activeTab === 'emailTemplates'} onClick={() => setActiveTab('emailTemplates')} />
                </nav>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 min-w-0 h-screen flex flex-col relative overflow-hidden">
                {/* CONTENT HEADER */}
                <header className="h-24 px-6 md:px-10 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shrink-0 z-10 gap-4 overflow-x-auto">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                {activeTab === 'overview' ? (t('aventus_overview') || 'Aventus Översikt') :
                                    activeTab === 'coaches' ? t('manage_coaches', 'Hantera Coacher') :
                                        activeTab === 'whitelist' ? 'Godkända E-post' :
                                            activeTab === 'stock' ? t('image_library', 'Bildbibliotek') :
                                                activeTab === 'templates' ? t('template_lab', 'Mall-Labbet') :
                                                    activeTab === 'settings' ? (
                                                        <div className="flex items-center gap-2">
                                                            {t("settings", "Inställningar")} <ChevronRight className="w-4 h-4 text-slate-400" />
                                                            <span className="text-brand-400">
                                                                {settingsSubTab === 'branding' ? t('branding_tab', 'Branding') :
                                                                    settingsSubTab === 'api' ? t('api_tech', 'API & Teknik') :
                                                                        settingsSubTab === 'prompts' ? t('ai_instructions', 'AI-Instruktioner') :
                                                                            settingsSubTab === 'avatar' ? t('ai_identity', 'AI-Identitet') : t('security', 'Säkerhet')}
                                                            </span>
                                                        </div>
                                                    ) : 'E-postmallar'
                                }
                            </h2>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mt-1">
                                {activeTab === 'overview' ? (t('system_status_realtime') || 'Systemstatus och realtidsdata') :
                                    activeTab === 'coaches' ? t('manage_user_accounts', 'Administrera användarkonton') :
                                        activeTab === 'whitelist' ? 'Hantera access-listan' :
                                            activeTab === 'stock' ? t('publish_images_subtitle', 'Publicera bilder för coacher') :
                                                activeTab === 'templates' ? t('template_lab_subtitle', 'Skapa CV-layouter') :
                                                    activeTab === 'settings' ? t('global_configuration', 'Global konfiguration') : (t('manage_email_templates', 'Hantera e-postmallar'))}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleDarkMode}
                            className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand-400 rounded-2xl transition-all"
                        >
                            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>

                        {activeTab === 'coaches' ? (
                            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"><Plus className="w-4 h-4" /> {t('new_coach', 'Ny Coach')}</button>
                        ) : activeTab === 'whitelist' ? (
                            <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"><Plus className="w-4 h-4" /> Godkänn E-post</button>
                        ) : activeTab === 'stock' ? (
                            <button onClick={() => setIsStockModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-brand-400 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-400/20 hover:bg-brand-500 transition-all"><ImageIcon className="w-4 h-4" /> {t("add_image", "Lägg till bild")}</button>
                        ) : activeTab === 'templates' ? (
                            <div className="flex gap-3">
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleCloneDesign} />
                                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-violet-600/20 hover:bg-violet-700 transition-all">{isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} {t("ai_clone", "AI-Klona")}</button>
                                <button onClick={() => setEditingTemplate({ id: 'temp_' + Date.now(), name: t('new_template', 'Ny Mall'), config: DEFAULT_MASTER_CONFIG, isPublished: false, createdAt: new Date().toISOString(), createdBy: 'admin' })} className="flex items-center gap-2 px-6 py-3 bg-brand-400 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-400/20 hover:bg-brand-500 transition-all"><Plus className="w-4 h-4" /> {t("new_template", "Ny Mall")}</button>
                            </div>
                        ) : null}
                    </div>
                </header>

                {/* HEALTH BANNER */}
                {healthStatus?.hasIssue && (
                    <div className="bg-red-500/10 border-b border-red-500/20 p-4 px-10 flex items-center justify-between animate-in slide-in-from-top duration-500 shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center text-red-600">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-sm font-black text-red-600 uppercase tracking-widest">Systemvarning: AI-störning detekterad</h4>
                                <p className="text-xs font-bold text-red-500 mt-1 max-w-[600px] truncate">
                                    Senaste felet: "{healthStatus.lastError}" (Modell: {healthStatus.lastModel})
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    setActiveTab('settings');
                                    setSettingsSubTab('api');
                                }}
                                className="px-4 py-2 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-red-500/20 hover:bg-red-700 transition-colors"
                            >
                                Åtgärda nu
                            </button>
                            <button
                                onClick={() => MonitoringService.markAsHealthy()}
                                className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 dark:border-slate-700 hover:text-slate-600 transition-colors"
                            >
                                Ignorera tyst
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10">

                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-sm dark:shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 group-hover:opacity-20 transition-opacity text-slate-900 dark:text-white"><FileText className="w-20 h-20" /></div>
                                <h3 className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-4">{t('searchable_cvs') || 'Sökbara CV:n'}</h3>
                                <div className="text-5xl font-black tracking-tighter mb-2 text-slate-900 dark:text-white">{stats.totalResumes}</div>
                                <div className="text-[10px] font-black text-brand-400 uppercase tracking-widest leading-none">{t('self_created_imported') || 'Egenskapade & Importerade'}</div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-sm dark:shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 group-hover:opacity-20 transition-opacity text-slate-900 dark:text-white"><Layers className="w-20 h-20" /></div>
                                <h3 className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-4">{t('own_templates') || 'Egna Mallar'}</h3>
                                <div className="text-5xl font-black tracking-tighter mb-2 text-slate-900 dark:text-white">{customTemplates.length}</div>
                                <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">{t('published_layouts') || 'Publicerade layouter'}</div>
                            </div>
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] shadow-sm dark:shadow-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-5 dark:opacity-10 group-hover:opacity-20 transition-opacity text-slate-900 dark:text-white"><Users className="w-20 h-20" /></div>
                                <h3 className="text-slate-500 font-black text-[10px] uppercase tracking-widest mb-4">{t('active_coaches') || 'Aktiva Coacher'}</h3>
                                <div className="text-5xl font-black tracking-tighter mb-2 text-slate-900 dark:text-white">{stats.activeCoaches}</div>
                                <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest leading-none">{t('licensed_users') || 'Licensierade användare'}</div>
                            </div>
                            <div className="bg-gradient-to-br from-brand-500 to-violet-700 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-6 opacity-20"><TrendingUp className="w-20 h-20" /></div>
                                <h3 className="text-indigo-200 font-black text-[10px] uppercase tracking-widest mb-4">{t('last_30_days') || 'Senaste 30 dagarna'}</h3>
                                <div className="text-5xl font-black tracking-tighter mb-2">{stats.recentResumes}</div>
                                <div className="text-[10px] font-black text-indigo-200 uppercase tracking-widest leading-none">{t('new_cvs_created') || 'Nya CV:n skapade'}</div>
                            </div>
                        </div>
                    )}

                    {activeTab !== 'overview' && (
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-sm dark:shadow-2xl overflow-hidden min-h-[600px]">
                            {activeTab === 'coaches' && (
                                <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/20 flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="flex-1 max-w-md relative group">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-brand-400 transition-colors" />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder={t("search_coach_placeholder", "Sök coach på namn eller e-post...")}
                                            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-medium outline-none focus:ring-2 focus:ring-brand-400/20 focus:border-brand-400 transition-all text-slate-900 dark:text-white shadow-sm"
                                        />
                                    </div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t('coaches', 'Coacher')} ({filteredUsers.length})</div>
                                </div>
                            )}
                            <div className="p-10">
                                {activeTab === 'coaches' ? (
                                    <div className="space-y-4">
                                        {filteredUsers.map(u => (
                                            <div key={u.uid} className={`bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] flex items-center justify-between group hover:bg-white dark:hover:bg-slate-800/40 transition-all ${u.status === 'suspended' ? 'opacity-50' : ''}`}>
                                                <div className="flex items-center gap-6">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl transition-all overflow-hidden ${u.role === 'admin' ? 'bg-brand-400 text-white ring-4 ring-brand-400/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                                                        {u.photoUrl ? (
                                                            <img src={u.photoUrl} className="w-full h-full object-cover" />
                                                        ) : (
                                                            u.displayName?.[0] || <User className="w-6 h-6" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="font-black text-sm text-slate-900 dark:text-white">{u.displayName}</div>
                                                            {u.role === 'admin' && <div className="px-2 py-0.5 bg-brand-400/10 text-brand-500 dark:text-indigo-400 rounded text-[8px] font-black uppercase tracking-widest">{t("admin", "Admin")}</div>}
                                                            {u.status === 'suspended' && <div className="px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 rounded text-[8px] font-black uppercase tracking-widest">{t("suspended", "Avstängd")}</div>}
                                                        </div>
                                                        <div className="text-xs text-slate-500">{u.email}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 mr-6 px-4 py-2 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800/50 shadow-sm">
                                                        <button onClick={() => handleToggleInterviewAccess(u.uid)} title={u.canUseInterview ? t("remove_interview_access", "Ta bort tillgång till Intervju") : t("grant_interview_access", "Ge tillgång till Intervju")} className={`p-2.5 rounded-xl transition-all ${u.canUseInterview ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-400/10' : 'text-slate-400 hover:text-emerald-600'}`}>{u.canUseInterview ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}</button>
                                                        <button onClick={() => handleToggleStatus(u.uid)} title={u.status === 'active' ? t("suspend_account", "Stäng av konto") : t("activate_account", "Aktivera konto")} className={`p-2.5 rounded-xl transition-all ${u.status === 'active' ? 'text-slate-400 hover:text-red-600' : 'text-red-600'}`}>{u.status === 'active' ? <UserMinus className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}</button>
                                                        <button onClick={() => handleToggleRole(u.uid)} title={u.role === 'coach' ? t("make_admin", "Gör till admin") : t("demote_to_coach", "Nedgradera till coach")} className={`p-2.5 rounded-xl transition-all ${u.role === 'admin' ? 'text-brand-500 dark:text-indigo-400' : 'text-slate-400 hover:text-brand-500'}`}><Shield className="w-4 h-4" /></button>
                                                        <button onClick={() => handleToggleMatchingAccess(u.uid)} title={u.canUseMatching ? t("remove_sava_access", "Ta bort Savå-behörighet") : t("grant_sava_access", "Ge Savå-behörighet")} className={`p-2.5 rounded-xl transition-all ${u.canUseMatching ? 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-400/10' : 'text-slate-400 hover:text-purple-600'}`}><Search className="w-4 h-4" /></button>
                                                        <button onClick={() => handleResetPassword(u.email)} title={t("reset_password", "Nollställ lösenord")} className="p-2.5 text-slate-400 hover:text-amber-500 transition-all rounded-xl"><Key className="w-4 h-4" /></button>
                                                        <button
                                                            onClick={() => {
                                                                setConfirmDialog({
                                                                    isOpen: true,
                                                                    title: t('delete_coach_title', 'Radera coach'),
                                                                    message: t('delete_coach_confirm', 'Är du säker på att du vill radera {name} ({email})? Detta tar bort kontot permanent från systemet.').replace('{name}', u.displayName || '').replace('{email}', u.email || ''),
                                                                    onConfirm: async () => {
                                                                        try {
                                                                            // Delete from Firestore (profiles and whitelist)
                                                                            const { AdminAuthService } = await import('../services/AdminAuthService');
                                                                            await AdminAuthService.deleteUserAccount(u.uid, u.email);

                                                                            // Update local state
                                                                            const updatedUsers = users.filter(user => user.uid !== u.uid);
                                                                            onUpdateUsers(updatedUsers);

                                                                            setConfirmDialog(null);
                                                                            alert(t('coach_deleted_success', '{name} har raderats från systemet.').replace('{name}', u.displayName || ''));
                                                                        } catch (error) {
                                                                            console.error('Error deleting coach:', error);
                                                                            alert(`Fel vid radering: ${error instanceof Error ? error.message : 'Okänt fel'}`);
                                                                            setConfirmDialog(null);
                                                                        }
                                                                    },
                                                                    onCancel: () => {
                                                                        setConfirmDialog(null);
                                                                    }
                                                                });
                                                            }}
                                                            title={t("delete_coach", "Radera coach")}
                                                            className="p-2.5 text-slate-400 hover:text-red-600 transition-all rounded-xl"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <button onClick={() => onViewAsCoach?.(u)} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-brand-400 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><Eye className="w-4 h-4" /> {t("view", "Visa")}</button>
                                                </div>
                                            </div>
                                        ))}
                                        {filteredUsers.length === 0 && (
                                            <div className="p-20 text-center flex flex-col items-center gap-4 animate-in fade-in">
                                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300">
                                                    <Search className="w-8 h-8" />
                                                </div>
                                                <div className="text-slate-400 font-medium italic">{t("no_coaches_found", 'Hittade inga coacher som matchar "{searchTerm}"').replace("{searchTerm}", searchTerm)}</div>
                                                <button onClick={() => setSearchTerm('')} className="text-xs font-black uppercase tracking-widest text-brand-400 hover:text-brand-500 transition-colors">{t("clear_search", "Rensa sökning")}</button>
                                            </div>
                                        )}
                                    </div>
                                ) : activeTab === 'whitelist' ? (
                                    <div className="space-y-4">
                                        <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl mb-8">
                                            <div className="flex items-center gap-4 text-amber-600 dark:text-amber-400">
                                                <ShieldAlert className="w-6 h-6" />
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-widest">Gästkonton</h4>
                                                    <p className="text-xs font-medium opacity-80">Skapa kompletta gästkonton för tillfällig åtkomst. Användare kan logga in direkt utan e-postverifiering.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {whitelist.map(item => (
                                            <div key={item.email} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 flex items-center justify-between group">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl transition-all overflow-hidden ${item.isGuestAccount ? 'bg-brand-400/10 text-brand-500 ring-2 ring-brand-400/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                        {item.displayName ? item.displayName[0].toUpperCase() : <Mail className="w-6 h-6" />}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="font-black text-sm text-slate-900 dark:text-white">{item.displayName || 'Ingen namn'}</div>
                                                            {item.isGuestAccount && <div className="px-2 py-0.5 bg-brand-400/10 text-brand-500 dark:text-brand-400 rounded text-[8px] font-black uppercase tracking-widest">Gästkonto</div>}
                                                        </div>
                                                        <div className="font-medium text-xs text-slate-600 dark:text-slate-400">{item.email}</div>
                                                        <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Tillagd {item.addedAt?.toDate ? new Date(item.addedAt.toDate()).toLocaleDateString() : 'nyss'}</div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {item.isGuestAccount && (
                                                        <>
                                                            <button
                                                                onClick={() => alert('Lösenordsändring kommer snart!')}
                                                                className="p-3 text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-xl transition-all"
                                                                title="Ändra lösenord"
                                                            >
                                                                <Key className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => alert('Namnändring kommer snart!')}
                                                                className="p-3 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl transition-all"
                                                                title="Ändra namn"
                                                            >
                                                                <User className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            console.log('🔴 DELETE CLICKED:', item.email, 'isGuest:', item.isGuestAccount);
                                                            const confirmMsg = item.isGuestAccount
                                                                ? `Ta bort gästkontot för ${item.displayName || item.email}? Detta raderar både kontot och åtkomsten.`
                                                                : `Ta bort ${item.email} från väntelistan?`;

                                                            setConfirmDialog({
                                                                isOpen: true,
                                                                title: 'Bekräfta borttagning',
                                                                message: confirmMsg,
                                                                onConfirm: async () => {
                                                                    console.log('🔴 User confirmed!');
                                                                    try {
                                                                        if (item.isGuestAccount && item.uid) {
                                                                            const { AdminAuthService } = await import('../services/AdminAuthService');
                                                                            await AdminAuthService.deleteUserAccount(item.uid, item.email);
                                                                        } else {
                                                                            await AuthService.removeFromWhitelist(item.email);
                                                                        }
                                                                        loadWhitelist();
                                                                        setConfirmDialog(null);
                                                                    } catch (error) {
                                                                        console.error('🔴 Error:', error);
                                                                        alert(`Fel: ${error instanceof Error ? error.message : 'Okänt fel'}`);
                                                                        setConfirmDialog(null);
                                                                    }
                                                                },
                                                                onCancel: () => {
                                                                    console.log('🔴 User cancelled');
                                                                    setConfirmDialog(null);
                                                                }
                                                            });
                                                        }}
                                                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                                        title="Ta bort"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {whitelist.length === 0 && (
                                            <div className="p-20 text-center text-slate-400 font-medium italic">Väntelistan är tom.</div>
                                        )}
                                    </div>
                                ) : activeTab === 'stock' ? (
                                    <div className="space-y-12">
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                                            {stockImages.map(img => (
                                                <div key={img.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden group relative shadow-sm hover:shadow-xl transition-all h-48 flex flex-col">
                                                    <div className="flex-1 bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
                                                        <img src={img.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <button onClick={() => handleDeleteStockImage(img.id)} className="p-3 bg-red-500 text-white rounded-2xl shadow-xl hover:scale-110 transition-all"><Trash2 className="w-5 h-5" /></button>
                                                        </div>
                                                    </div>
                                                    <div className="p-4 bg-white dark:bg-slate-900">
                                                        <div className="text-[10px] font-black uppercase tracking-widest text-brand-400 mb-1">{img.category}</div>
                                                        <div className="text-[11px] font-bold text-slate-900 dark:text-white truncate">{img.name}</div>
                                                    </div>
                                                </div>
                                            ))}
                                            {stockImages.length === 0 && (
                                                <div className="col-span-full p-20 text-center bg-slate-50 dark:bg-slate-800/10 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
                                                    <ImageIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                                    <p className="text-slate-400 font-medium italic">{t("image_library_empty", "Bildbiblioteket är tomt.")}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : activeTab === 'templates' ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                        {customTemplates.map(t => (
                                            <div key={t.id} className="bg-slate-50 dark:bg-slate-800/20 border border-slate-200 dark:border-slate-800 p-6 rounded-[2rem] flex flex-col group hover:bg-white dark:hover:bg-slate-800/40 transition-all">
                                                <div className="aspect-[210/297] bg-white rounded-xl mb-6 overflow-hidden relative shadow-inner border border-slate-100 dark:border-slate-800">
                                                    <div className="scale-[0.25] origin-top-left p-0 pointer-events-none w-[794px]"><MasterTemplate data={INITIAL_RESUME} fontClass="" containerStyle={{}} design={{ font: 'inter', accentColor: t.config.accentColor, scale: 1, spacing: 1.5 }} headerHelper={(k, d) => d} config={t.config} /></div>
                                                    <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-all flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100"><button onClick={() => setEditingTemplate(t)} className="p-4 bg-brand-400 text-white rounded-2xl shadow-xl hover:scale-110 transition-all"><Edit2 className="w-6 h-6" /></button><button onClick={() => handleDeleteTemplate(t.id)} className="p-4 bg-red-500 text-white rounded-2xl shadow-xl hover:scale-110 transition-all"><Trash2 className="w-6 h-6" /></button></div>
                                                </div>
                                                <div className="flex justify-between items-center px-2">
                                                    <div><h4 className="font-black text-sm text-slate-900 dark:text-white">{t.name}</h4><p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">{t.isPublished ? 'Publicerad' : 'Utkast'}</p></div>
                                                    {t.isPublished && <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg"><CheckCircle2 className="w-4 h-4" /></div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : activeTab === 'settings' ? (
                                    <div className="space-y-8">
                                        <div className="max-w-4xl">
                                            {settingsSubTab === 'avatar' ? (
                                                <div className="space-y-12">
                                                    <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                                                        <div className="p-3 bg-brand-400/10 text-brand-400 rounded-2xl">
                                                            <Sparkles className="w-6 h-6" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="text-xl font-black text-slate-900 dark:text-white">AI Identitet</h3>
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Namnge dina assistenter och anpassa deras profilbilder</p>
                                                        </div>
                                                    </div>

                                                    {/* Agneta Settings */}
                                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] space-y-8 shadow-sm">
                                                        <div className="flex flex-col md:flex-row gap-8 items-start">
                                                            <div className="relative group shrink-0">
                                                                <AgnetaAvatar url={aiForm.agnetaAvatarUrl || systemSettings.agnetaAvatarUrl} size="xl" />
                                                                {(aiForm.agnetaAvatarUrl || systemSettings.agnetaAvatarUrl) && (
                                                                    <button
                                                                        onClick={() => handleUpdateAgnetaAvatar('')}
                                                                        className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-xl shadow-lg hover:scale-110 transition-all z-10"
                                                                        title="Ta bort bild"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="flex-1 space-y-6">
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assistentens Namn (T.ex. Agneta)</label>
                                                                    <input
                                                                        type="text"
                                                                        value={aiForm.agnetaName}
                                                                        onChange={(e) => setAiForm({ ...aiForm, agnetaName: e.target.value })}
                                                                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 dark:text-white shadow-inner"
                                                                        placeholder="Ex: Agneta"
                                                                    />
                                                                </div>
                                                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                                    Ladda upp en bild för att ersätta standard-illustrationen. Denna bild kommer att visas i chatten och i design-assistenten.
                                                                </p>
                                                                <div className="flex gap-4">
                                                                    <input
                                                                        type="file"
                                                                        id="agneta-avatar-upload"
                                                                        className="hidden"
                                                                        accept="image/*"
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) {
                                                                                setIsSaving(true);
                                                                                try {
                                                                                    const reader = new FileReader();
                                                                                    reader.onload = async () => {
                                                                                        try {
                                                                                            const optimized = await StockService.compressImage(reader.result as string, 400, 0.8);
                                                                                            await handleUpdateAgnetaAvatar(optimized);
                                                                                        } catch (err) {
                                                                                            console.error("Avatar upload error:", err);
                                                                                            alert("Kunde inte ladda upp bilden.");
                                                                                        } finally {
                                                                                            setIsSaving(false);
                                                                                        }
                                                                                    };
                                                                                    reader.readAsDataURL(file);
                                                                                } catch (err) {
                                                                                    setIsSaving(false);
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                    <button
                                                                        onClick={() => document.getElementById('agneta-avatar-upload')?.click()}
                                                                        disabled={isSaving}
                                                                        className="px-6 py-3 bg-brand-400 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-400/20 hover:bg-brand-500 transition-all flex items-center gap-2"
                                                                    >
                                                                        <Upload className="w-4 h-4" />
                                                                        {isSaving ? 'Laddar upp...' : 'Ladda upp bild'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Sava Settings */}
                                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] space-y-8 shadow-sm">
                                                        <div className="flex flex-col md:flex-row gap-8 items-start">
                                                            <div className="relative group shrink-0">
                                                                <AgnetaAvatar url={aiForm.savaAvatarUrl || systemSettings.savaAvatarUrl} size="xl" gradient="bg-gradient-to-br from-purple-500 to-indigo-600" />
                                                                {(aiForm.savaAvatarUrl || systemSettings.savaAvatarUrl) && (
                                                                    <button
                                                                        onClick={() => handleUpdateSavaAvatar('')}
                                                                        className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-xl shadow-lg hover:scale-110 transition-all z-10"
                                                                        title="Ta bort bild"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="flex-1 space-y-6">
                                                                <div className="space-y-2">
                                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Matcherings-AI Namn (T.ex. Savå)</label>
                                                                    <input
                                                                        type="text"
                                                                        value={aiForm.savaName}
                                                                        onChange={(e) => setAiForm({ ...aiForm, savaName: e.target.value })}
                                                                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white shadow-inner"
                                                                        placeholder="Ex: Savå"
                                                                    />
                                                                </div>
                                                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                                    Ladda upp en bild för att ersätta standard-illustrationen för Savå. Denna bild kommer att visas vid matchning och analys.
                                                                </p>
                                                                <div className="flex gap-4">
                                                                    <input
                                                                        type="file"
                                                                        id="sava-avatar-upload"
                                                                        className="hidden"
                                                                        accept="image/*"
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) {
                                                                                setIsSaving(true);
                                                                                try {
                                                                                    const reader = new FileReader();
                                                                                    reader.onload = async () => {
                                                                                        try {
                                                                                            const optimized = await StockService.compressImage(reader.result as string, 400, 0.8);
                                                                                            await handleUpdateSavaAvatar(optimized);
                                                                                        } catch (err) {
                                                                                            console.error("Avatar upload error:", err);
                                                                                            alert("Kunde inte ladda upp bilden.");
                                                                                        } finally {
                                                                                            setIsSaving(false);
                                                                                        }
                                                                                    };
                                                                                    reader.readAsDataURL(file);
                                                                                } catch (err) {
                                                                                    setIsSaving(false);
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                    <button
                                                                        onClick={() => document.getElementById('sava-avatar-upload')?.click()}
                                                                        disabled={isSaving}
                                                                        className="px-6 py-3 bg-purple-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-500/20 hover:bg-purple-600 transition-all flex items-center gap-2"
                                                                    >
                                                                        <Upload className="w-4 h-4" />
                                                                        {isSaving ? 'Laddar upp...' : 'Ladda upp bild'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-4 flex items-center justify-between">
                                                        <button
                                                            onClick={handleSaveAiSettings}
                                                            disabled={isSaving}
                                                            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl ${showSaveSuccess ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-brand-400 text-white hover:bg-brand-500 shadow-brand-400/20'}`}
                                                        >
                                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : showSaveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                                            {showSaveSuccess ? t('settings_saved', 'Inställningar sparade') : t('save_ai_settings', 'Spara AI Inställningar')}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : settingsSubTab === 'api' ? (
                                                <div className="space-y-8">
                                                    <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                                                        <div className="p-3 bg-brand-400/10 text-brand-400 rounded-2xl">
                                                            <Database className="w-6 h-6" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="text-xl font-black text-slate-900 dark:text-white">Gemini AI Konfiguration</h3>
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hantera API-nyckel och AI-modell</p>
                                                        </div>
                                                        <button
                                                            onClick={handleTestAiConnection}
                                                            className="flex items-center gap-2 px-6 h-12 bg-slate-800 text-slate-400 hover:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/5 active:scale-95"
                                                        >
                                                            <Activity className="w-4 h-4" />
                                                            Testa
                                                        </button>
                                                    </div>

                                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] space-y-8 shadow-sm">
                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Gemini API Nyckel</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="password"
                                                                    value={aiForm.geminiApiKey}
                                                                    onChange={(e) => setAiForm({ ...aiForm, geminiApiKey: e.target.value })}
                                                                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400 text-slate-900 dark:text-white"
                                                                    placeholder="Klistra in din API-nyckel här..."
                                                                />
                                                                <Key className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                            </div>
                                                            <p className="text-[9px] text-slate-400 font-medium ml-1">Hämta din nyckel från <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline text-brand-400">Google AI Studio</a>.</p>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">AI Modell</label>
                                                            <div className="relative">
                                                                <select
                                                                    value={isCustomModel ? 'custom' : aiForm.geminiModel}
                                                                    onChange={(e) => {
                                                                        if (e.target.value === 'custom') {
                                                                            setIsCustomModel(true);
                                                                            setAiForm({ ...aiForm, geminiModel: 'custom' });
                                                                        } else {
                                                                            setIsCustomModel(false);
                                                                            setAiForm({ ...aiForm, geminiModel: e.target.value });
                                                                        }
                                                                    }}
                                                                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400 text-slate-900 dark:text-white appearance-none"
                                                                >
                                                                    <option value="gemini-flash-latest">Gemini Flash Latest (Rekommenderas)</option>
                                                                    <option value="gemini-2.0-flash-001">Gemini 2.0 Flash (Stabil)</option>
                                                                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Nyhet)</option>
                                                                    <option value="custom">Annan modell (Ange ID)...</option>
                                                                </select>
                                                                <Database className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                                            </div>
                                                            {isCustomModel && (
                                                                <input
                                                                    type="text"
                                                                    value={aiForm.customModelId}
                                                                    onChange={(e) => setAiForm({ ...aiForm, customModelId: e.target.value })}
                                                                    className="w-full mt-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400 text-slate-900 dark:text-white"
                                                                    placeholder="Ex: gemini-1.5-flash-latest"
                                                                />
                                                            )}
                                                        </div>

                                                        <div className="pt-4 flex items-center justify-between">
                                                            <button
                                                                onClick={handleSaveAiSettings}
                                                                disabled={isSaving}
                                                                className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl ${showSaveSuccess ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-brand-400 text-white hover:bg-brand-500 shadow-brand-400/20'}`}
                                                            >
                                                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : showSaveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                                                {showSaveSuccess ? t('settings_saved', 'Inställningar sparade') : t('save_api_settings', 'Spara API-inställningar')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : settingsSubTab === 'prompts' ? (
                                                <div className="space-y-8">
                                                    <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                                                        <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl">
                                                            <Wand2 className="w-6 h-6" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="text-xl font-black text-slate-900 dark:text-white">AI Instruktioner</h3>
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Finslipa hur Savå och Agneta beter sig</p>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-8">
                                                        {[
                                                            { id: 'agnetaSystemPrompt', label: 'Agneta: System / Hjärna (Global)', icon: Brain, placeholder: 'Lägg till globala systeminstruktioner...', desc: 'Definierar Agnetas grundläggande personlighet.' },
                                                            { id: 'agnetaProfilePrompt', label: 'Agneta: Profil / Sammanfattning', icon: Wand2, placeholder: 'Instruktioner för profil-sektionen...' },
                                                            { id: 'agnetaExperiencePrompt', label: 'Agneta: Arbetslivserfarenhet', icon: Briefcase, placeholder: 'Instruktioner för erfarenheter...' },
                                                            { id: 'agnetaEducationPrompt', label: 'Agneta: Utbildning', icon: GraduationCap, placeholder: 'Instruktioner för utbildning...' },
                                                            { id: 'agnetaCoverLetterPrompt', label: 'Agneta: Personligt Brev', icon: FileText, placeholder: 'Instruktioner för personligt brev...' },
                                                            { id: 'agnetaGreetingStandard', label: 'Agneta: Hälsning (Standard)', icon: MessageSquare, placeholder: 'Hej! Vad kan jag hjälpa dig med idag?' },
                                                            { id: 'agnetaGreetingJob', label: 'Agneta: Hälsning (Jobbansökan)', icon: Briefcase, placeholder: 'Jag ser att du vill söka jobbet som...' },
                                                            { id: 'savaMatchingPrompt', label: 'Savå: Matchningsmotor', icon: Search, placeholder: 'Hur Savå matchar kandidater...' },
                                                            { id: 'importMappingPrompt', label: 'Import: CV-Tolkning', icon: Database, placeholder: 'Hur AI ska tolka CV-råtext...' }
                                                        ].map(item => (
                                                            <div key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] space-y-4 shadow-sm relative group overflow-hidden">
                                                                <div className="flex items-center justify-between gap-4">
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <item.icon className="w-4 h-4 text-purple-500" />
                                                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.label}</label>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleSaveSingleField(item.id, (aiForm as any)[item.id])}
                                                                        disabled={savingField === item.id}
                                                                        className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg ${saveSuccessField === item.id ? 'bg-emerald-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105 active:scale-95'}`}
                                                                    >
                                                                        {savingField === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : saveSuccessField === item.id ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                                                                        {saveSuccessField === item.id ? 'Sparat' : 'Spara'}
                                                                    </button>
                                                                </div>
                                                                <textarea
                                                                    value={(aiForm as any)[item.id]}
                                                                    onChange={(e) => setAiForm({ ...aiForm, [item.id]: e.target.value })}
                                                                    className="w-full h-48 bg-slate-50 dark:bg-slate-800/50 border-none rounded-2xl p-6 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-500 dark:text-white resize-y shadow-inner"
                                                                    placeholder={item.placeholder}
                                                                />
                                                                {item.desc && <p className="text-[9px] text-slate-400 font-medium">{item.desc}</p>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : settingsSubTab === 'security' ? (
                                                <div className="space-y-8">
                                                    <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                                                        <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl">
                                                            <ShieldCheck className="w-6 h-6" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="text-xl font-black text-slate-900 dark:text-white">{t("security_access", "Säkerhet & Åtkomst")}</h3>
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("manage_login_access", "Hantera inloggning och åtkomstbegränsningar")}</p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] space-y-8 shadow-sm">
                                                        <div className="space-y-4">
                                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("auto_approval_domains", "Automatisk Godkännande (Domäner)")}</h4>
                                                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                                {t("auto_approval_domains_desc", "Ange e-postdomäner som automatiskt får registrera sig. Separera med komma (t.ex. @foretag.se, @kund.com).")}
                                                            </p>
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    value={aiForm.allowedEmailDomains}
                                                                    onChange={(e) => setAiForm({ ...aiForm, allowedEmailDomains: e.target.value })}
                                                                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-red-400 text-slate-900 dark:text-white"
                                                                    placeholder="@foretag.se, @partner.se"
                                                                />
                                                            </div>
                                                            <p className="text-[9px] text-slate-400 font-medium italic">{t("domain_whitelist_info", "Användare med dessa domäner behöver inte finnas i väntelistan för att skapa ett konto.")}</p>
                                                        </div>

                                                        <div className="pt-8 border-t border-slate-50 dark:border-slate-800 space-y-4">
                                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("feature_limits", "Funktionsbegränsningar")}</h4>
                                                            <label className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group">
                                                                <div className={`w-12 h-6 rounded-full relative transition-colors ${aiForm.allowBulkImportForCoaches ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${aiForm.allowBulkImportForCoaches ? 'left-7' : 'left-1'}`}></div>
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    className="hidden"
                                                                    checked={aiForm.allowBulkImportForCoaches}
                                                                    onChange={(e) => setAiForm({ ...aiForm, allowBulkImportForCoaches: e.target.checked })}
                                                                />
                                                                <div className="flex-1">
                                                                    <div className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">{t("allow_bulk_import_coaches", "Tillåt Massimport för Coacher")}</div>
                                                                    <div className="text-[10px] text-slate-500 font-medium">{t("allow_bulk_import_coaches_desc", "Låter coacher ladda upp hela arkiv av CV:n direkt från sin dashboard.")}</div>
                                                                </div>
                                                            </label>

                                                            <label className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group mt-4">
                                                                <div className={`w-12 h-6 rounded-full relative transition-colors ${aiForm.disableEmailVerification ? 'bg-amber-500' : 'bg-slate-300'}`}>
                                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${aiForm.disableEmailVerification ? 'left-7' : 'left-1'}`}></div>
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    className="hidden"
                                                                    checked={aiForm.disableEmailVerification}
                                                                    onChange={(e) => setAiForm({ ...aiForm, disableEmailVerification: e.target.checked })}
                                                                />
                                                                <div className="flex-1">
                                                                    <div className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">{t("disable_email_verification", "Inaktivera E-postverifiering (Demo-läge)")}</div>
                                                                    <div className="text-[10px] text-slate-500 font-medium">{t("disable_email_verification_desc", "Godkänner alla nya konton direkt utan att de behöver klicka på en bekräftelselänk i sin e-post. Perfekt för presentationer.")}</div>
                                                                </div>
                                                            </label>

                                                            <label className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group mt-4">
                                                                <div className={`w-12 h-6 rounded-full relative transition-colors ${aiForm.allowOpenAdminRegistration ? 'bg-amber-500' : 'bg-slate-300'}`}>
                                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${aiForm.allowOpenAdminRegistration ? 'left-7' : 'left-1'}`}></div>
                                                                </div>
                                                                <input
                                                                    type="checkbox"
                                                                    className="hidden"
                                                                    checked={aiForm.allowOpenAdminRegistration}
                                                                    onChange={(e) => setAiForm({ ...aiForm, allowOpenAdminRegistration: e.target.checked })}
                                                                />
                                                                <div className="flex-1">
                                                                    <div className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">{t('allow_open_admin') || 'Tillåt öppen Admin-registrering (Demo)'}</div>
                                                                    <div className="text-[10px] text-slate-500 font-medium">{t('allow_open_admin_desc') || 'När detta är påslaget får alla nya användare automatiskt admin-rättigheter.'}</div>
                                                                </div>
                                                            </label>
                                                        </div>

                                                        <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
                                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("other_settings", "Övriga Inställningar")}</h4>
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 opacity-50 pointer-events-none">
                                                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                                    <div className="text-[10px] font-black uppercase text-slate-400">{t("two_factor_auth", "Tvåfaktorsautentisering")}</div>
                                                                    <div className="text-xs font-bold mt-1 text-slate-500">{t("coming_soon", "Kommer snart...")}</div>
                                                                </div>
                                                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                                    <div className="text-[10px] font-black uppercase text-slate-400">{t("session_timeout", "Session Timeout")}</div>
                                                                    <div className="text-xs font-bold mt-1 text-slate-500">{t("coming_soon", "Kommer snart...")}</div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="pt-4 flex items-center justify-between">
                                                            <button
                                                                onClick={handleSaveAiSettings}
                                                                disabled={isSaving}
                                                                className={`px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl ${showSaveSuccess ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-red-600 text-white hover:bg-red-700 shadow-red-500/20'}`}
                                                            >
                                                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : showSaveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                                                {showSaveSuccess ? t('settings_saved', 'Inställningar sparade') : t('save_security', 'Spara Säkerhet')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-8">
                                                    <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                                                        <div className="p-3 bg-brand-400/10 text-brand-400 rounded-2xl">
                                                            <Palette className="w-6 h-6" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="text-xl font-black text-slate-900 dark:text-white">{t("company_profile_branding", "Företagsprofil & Branding")}</h3>
                                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("customize_system_identity", "Anpassa systemets identitet för din organisation")}</p>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] space-y-8 shadow-sm">
                                                        {/* Logo Upload Section */}
                                                        <div className="flex flex-col md:flex-row gap-8 items-start mb-4">
                                                            <div className="relative group shrink-0">
                                                                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center overflow-hidden">
                                                                    {aiForm.logoUrl ? (
                                                                        <img src={aiForm.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                                                                    ) : (
                                                                        <ImageIcon className="w-8 h-8 text-slate-300" />
                                                                    )}
                                                                </div>
                                                                {aiForm.logoUrl && (
                                                                    <button
                                                                        onClick={() => handleUpdateLogo('')}
                                                                        className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-xl shadow-lg hover:scale-110 transition-all z-10"
                                                                        title="Ta bort logotyp"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="flex-1 space-y-4">
                                                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("company_logo") || "Företagets Logotyp"}</h4>
                                                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                                    {t("company_logo_desc") || "Ladda upp din logotyp för att ersätta standard-ikonen på startsidan och i programmet."}
                                                                </p>
                                                                <div className="flex gap-4">
                                                                    <input
                                                                        type="file"
                                                                        id="logo-upload-admin"
                                                                        className="hidden"
                                                                        accept="image/*"
                                                                        onChange={async (e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) {
                                                                                setIsSaving(true);
                                                                                try {
                                                                                    const reader = new FileReader();
                                                                                    reader.onload = async () => {
                                                                                        try {
                                                                                            const optimized = await StockService.compressImage(reader.result as string, 400, 0.82);
                                                                                            await handleUpdateLogo(optimized);
                                                                                        } catch (err) {
                                                                                            console.error("Logo upload error:", err);
                                                                                            alert("Kunde inte ladda upp logotypen.");
                                                                                        } finally {
                                                                                            setIsSaving(false);
                                                                                        }
                                                                                    };
                                                                                    reader.readAsDataURL(file);
                                                                                } catch (err) {
                                                                                    setIsSaving(false);
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                    <button
                                                                        onClick={() => document.getElementById('logo-upload-admin')?.click()}
                                                                        disabled={isSaving}
                                                                        className="px-6 py-3 bg-brand-400 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-brand-400/20 hover:bg-brand-500 transition-all flex items-center gap-2"
                                                                    >
                                                                        <Upload className="w-4 h-4" />
                                                                        {isSaving ? (t('uploading') || 'Laddar upp...') : (t('upload_logo') || 'Ladda upp logotyp')}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("company_name") || "Företagsnamn"}</label>
                                                                <input
                                                                    type="text"
                                                                    value={aiForm.companyName}
                                                                    onChange={(e) => setAiForm({ ...aiForm, companyName: e.target.value })}
                                                                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400 text-slate-900 dark:text-white"
                                                                    placeholder="Ex: Aventus"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("primary_color") || "Primärfärg (Hex)"}</label>
                                                                <div className="flex gap-3">
                                                                    <div className="w-14 h-14 rounded-2xl border border-slate-200 dark:border-slate-700 shrink-0" style={{ backgroundColor: aiForm.primaryColor }}></div>
                                                                    <input
                                                                        type="text"
                                                                        value={aiForm.primaryColor}
                                                                        onChange={(e) => setAiForm({ ...aiForm, primaryColor: e.target.value })}
                                                                        className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400 text-slate-900 dark:text-white"
                                                                        placeholder="#4f46e5"
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t("landing_page") || "Startsida (Landing Page)"}</h4>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("main_heading") || "Huvudrubrik"}</label>
                                                                <input
                                                                    type="text"
                                                                    value={aiForm.landingTitle}
                                                                    onChange={(e) => setAiForm({ ...aiForm, landingTitle: e.target.value })}
                                                                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400 text-slate-900 dark:text-white"
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t("sub_text") || "Undertext"}</label>
                                                                <textarea
                                                                    value={aiForm.landingSubtitle}
                                                                    onChange={(e) => setAiForm({ ...aiForm, landingSubtitle: e.target.value })}
                                                                    className="w-full h-24 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400 text-slate-900 dark:text-white resize-none"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="pt-4">
                                                            <button
                                                                onClick={handleSaveAiSettings}
                                                                disabled={isSaving}
                                                                className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-xl ${showSaveSuccess ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-brand-500 text-white hover:bg-indigo-700 shadow-brand-500/20'}`}
                                                            >
                                                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : showSaveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                                                {showSaveSuccess ? 'Sparat' : t('save_branding') || 'Spara Branding'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : activeTab === 'import' ? (
                                    <div className="space-y-12 pb-20">
                                        <LegacyImport
                                            apiKey={systemSettings?.geminiApiKey}
                                            geminiModel={systemSettings?.geminiModel}
                                            importMappingPrompt={systemSettings?.importMappingPrompt}
                                            existingResumes={resumes}
                                        />

                                        <div className="border-t border-slate-200 dark:border-slate-800 pt-12">
                                            <div className="px-4">
                                                <DuplicateScanner resumes={resumes} />
                                            </div>
                                        </div>
                                    </div>
                                ) : activeTab === 'emailTemplates' ? (
                                    <div className="p-10 space-y-8">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
                                            <h3 className="text-sm font-black text-blue-900 dark:text-blue-100 uppercase tracking-widest mb-2">{t('available_variables', 'Tillgängliga Variabler')}</h3>
                                            <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">{t('use_variables_info', 'Använd dessa variabler i dina mallar - de ersätts automatiskt:')}</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-white dark:bg-slate-800 rounded-xl p-3">
                                                    <code className="text-xs font-bold text-brand-600">{'{{PARTICIPANT_NAME}}'}</code>
                                                    <p className="text-[10px] text-slate-500 mt-1">{t('participant_first_name', 'Deltagarens förnamn')}</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-800 rounded-xl p-3">
                                                    <code className="text-xs font-bold text-brand-600">{'{{PARTICIPANT_FULLNAME}}'}</code>
                                                    <p className="text-[10px] text-slate-500 mt-1">{t('participant_full_name', 'För- och efternamn')}</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-800 rounded-xl p-3">
                                                    <code className="text-xs font-bold text-brand-600">{'{{COACH_NAME}}'}</code>
                                                    <p className="text-[10px] text-slate-500 mt-1">{t('coach_name', 'Coachens namn')}</p>
                                                </div>
                                                <div className="bg-white dark:bg-slate-800 rounded-xl p-3">
                                                    <code className="text-xs font-bold text-brand-600">{'{{COMPANY_NAME}}'}</code>
                                                    <p className="text-[10px] text-slate-500 mt-1">{t("company_name") || "Företagsnamn"}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Simple Email Template */}
                                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                                                <Mail className="w-5 h-5 text-brand-400" />
                                                {t('empty_mail_simple_contact', 'Tomt Mail (Enkel Kontakt)')}
                                            </h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">{t('subject_line', 'Ämnesrad')}</label>
                                                    <input
                                                        type="text"
                                                        value={aiForm.emailTemplates?.simple.subject || ''}
                                                        onChange={(e) => setAiForm({
                                                            ...aiForm,
                                                            emailTemplates: {
                                                                ...aiForm.emailTemplates,
                                                                simple: { ...aiForm.emailTemplates?.simple, subject: e.target.value },
                                                                withCV: aiForm.emailTemplates?.withCV || { subject: '', body: '' },
                                                                withCoverLetter: aiForm.emailTemplates?.withCoverLetter || { subject: '', body: '' }
                                                            }
                                                        })}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400"
                                                        placeholder="Tips från coachen - {{PARTICIPANT_FULLNAME}}"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">{t('message_body', 'Meddelande')}</label>
                                                    <textarea
                                                        value={aiForm.emailTemplates?.simple.body || ''}
                                                        onChange={(e) => setAiForm({
                                                            ...aiForm,
                                                            emailTemplates: {
                                                                ...aiForm.emailTemplates,
                                                                simple: { ...aiForm.emailTemplates?.simple, body: e.target.value },
                                                                withCV: aiForm.emailTemplates?.withCV || { subject: '', body: '' },
                                                                withCoverLetter: aiForm.emailTemplates?.withCoverLetter || { subject: '', body: '' }
                                                            }
                                                        })}
                                                        rows={6}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400 resize-none font-mono"
                                                        placeholder="Hej {{PARTICIPANT_NAME}},..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* CV Email Template */}
                                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                                                <FileText className="w-5 h-5 text-blue-400" />
                                                {t('mail_with_cv_attached', 'Mail med CV Bifogat')}
                                            </h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">{t('subject_line', 'Ämnesrad')}</label>
                                                    <input
                                                        type="text"
                                                        value={aiForm.emailTemplates?.withCV.subject || ''}
                                                        onChange={(e) => setAiForm({
                                                            ...aiForm,
                                                            emailTemplates: {
                                                                ...aiForm.emailTemplates,
                                                                simple: aiForm.emailTemplates?.simple || { subject: '', body: '' },
                                                                withCV: { ...aiForm.emailTemplates?.withCV, subject: e.target.value },
                                                                withCoverLetter: aiForm.emailTemplates?.withCoverLetter || { subject: '', body: '' }
                                                            }
                                                        })}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400"
                                                        placeholder="Ditt CV - {{PARTICIPANT_FULLNAME}}"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">{t('message_body', 'Meddelande')}</label>
                                                    <textarea
                                                        value={aiForm.emailTemplates?.withCV.body || ''}
                                                        onChange={(e) => setAiForm({
                                                            ...aiForm,
                                                            emailTemplates: {
                                                                ...aiForm.emailTemplates,
                                                                simple: aiForm.emailTemplates?.simple || { subject: '', body: '' },
                                                                withCV: { ...aiForm.emailTemplates?.withCV, body: e.target.value },
                                                                withCoverLetter: aiForm.emailTemplates?.withCoverLetter || { subject: '', body: '' }
                                                            }
                                                        })}
                                                        rows={6}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400 resize-none font-mono"
                                                        placeholder="Hej {{PARTICIPANT_NAME}},\n\nBifogat hittar du ditt CV..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Cover Letter Email Template */}
                                        <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                                            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                                                <Mail className="w-5 h-5 text-purple-400" />
                                                {t('mail_with_cover_letter_attached', 'Mail med Personligt Brev Bifogat')}
                                            </h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">{t('subject_line', 'Ämnesrad')}</label>
                                                    <input
                                                        type="text"
                                                        value={aiForm.emailTemplates?.withCoverLetter.subject || ''}
                                                        onChange={(e) => setAiForm({
                                                            ...aiForm,
                                                            emailTemplates: {
                                                                ...aiForm.emailTemplates,
                                                                simple: aiForm.emailTemplates?.simple || { subject: '', body: '' },
                                                                withCV: aiForm.emailTemplates?.withCV || { subject: '', body: '' },
                                                                withCoverLetter: { ...aiForm.emailTemplates?.withCoverLetter, subject: e.target.value }
                                                            }
                                                        })}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400"
                                                        placeholder="Ditt personliga brev - {{PARTICIPANT_FULLNAME}}"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">{t('message_body', 'Meddelande')}</label>
                                                    <textarea
                                                        value={aiForm.emailTemplates?.withCoverLetter.body || ''}
                                                        onChange={(e) => setAiForm({
                                                            ...aiForm,
                                                            emailTemplates: {
                                                                ...aiForm.emailTemplates,
                                                                simple: aiForm.emailTemplates?.simple || { subject: '', body: '' },
                                                                withCV: aiForm.emailTemplates?.withCV || { subject: '', body: '' },
                                                                withCoverLetter: { ...aiForm.emailTemplates?.withCoverLetter, body: e.target.value }
                                                            }
                                                        })}
                                                        rows={6}
                                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-4 text-sm font-bold outline-none focus:ring-2 focus:ring-brand-400 resize-none font-mono"
                                                        placeholder="Hej {{PARTICIPANT_NAME}},\n\nBifogat hittar du ditt personliga brev..."
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Save Button */}
                                        <div className="flex justify-end">
                                            <button
                                                onClick={handleSaveAiSettings}
                                                disabled={isSavingAiSettings}
                                                className="px-8 py-4 bg-brand-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-500/20 hover:bg-brand-600 transition-all disabled:opacity-50 flex items-center gap-3"
                                            >
                                                {isSavingAiSettings ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        {t('saving', 'Sparar...')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="w-4 h-4" />
                                                        {t('save_email_templates', 'Spara E-postmallar')}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    )
                    }
                </div >

                {/* Confirmation Dialog Modal */}
                {
                    confirmDialog && confirmDialog.isOpen && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                            <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl border border-gray-200 dark:border-gray-800 max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
                                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-4">
                                    {confirmDialog.title}
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                                    {confirmDialog.message}
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={confirmDialog.onCancel}
                                        className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                                    >
                                        Avbryt
                                    </button>
                                    <button
                                        onClick={confirmDialog.onConfirm}
                                        className="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                                    >
                                        Ta bort
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                }
            </main >
        </div >
    );
};
const Edit2 = (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit-2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>;
