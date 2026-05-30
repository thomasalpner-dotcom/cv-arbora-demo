

import React, { useRef, useState, useEffect } from 'react';
import { flushSync, createPortal } from 'react-dom';
import { Plus, FileText, Search, User, ArrowLeft, Sun, Moon, X, Check, Loader2, Sparkles, ShieldCheck, Edit2, Upload, Mail, Phone, MoreVertical, Copy, Trash2, Tag, Archive, RotateCcw, AlertTriangle, Mic, LayoutGrid, List as ListIcon, LogOut, Camera, CheckSquare, Linkedin, Zap } from 'lucide-react';
import { BackButton } from './BackButton';
import { ImageCropModal } from './ImageCropModal';
import { ResumeData, Participant, ParticipantStatus, INITIAL_RESUME, UserProfile, SystemSettings } from '../types';
import { AIImportModal } from './AIImportModal';
import { CvPreview } from './CvPreview';
import { AuthService } from '../services/AuthService';
import { SettingsService } from '../services/SettingsService';
import { PdfService } from '../services/PdfService';
import { InterviewModal } from './InterviewModal';
import { LegacyImport } from './LegacyImport';
import { ImportService } from '../services/ImportService';
import { GoogleGenAI } from "@google/genai";
import mammoth from 'mammoth';
import { generateSampleCV } from '../utils/sampleData';
import { useTranslation, LANGUAGES, Language } from '../utils/translations';


interface Props {
    systemSettings: SystemSettings;
    resumes: ResumeData[];
    participants: Participant[];
    userProfile: UserProfile;
    selectedParticipantId: string | null;
    onSelectParticipant: (id: string | null) => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    onLogout: () => void;
    onEdit: (resume: ResumeData, docType?: { type: 'cv' | 'pb', id?: string }) => void;
    onCreate: (participantId?: string) => void;
    onImport?: (data: ResumeData) => void;
    onDelete?: (id: string) => void;
    onUpdateResume?: (resume: ResumeData) => void;
    onDuplicate?: (resume: ResumeData) => void;
    onAddParticipant: (p: Participant) => void;
    onUpdateParticipant: (p: Participant) => void;
    onClaimParticipant: (p: Participant) => Promise<boolean>;
    onDeleteParticipant: (id: string) => void;
    onOpenAdmin?: () => void;
    onOpenMatching?: () => void;
    isImpersonating?: boolean;
    onStopImpersonation?: () => void;
}

export const Dashboard: React.FC<Props> = ({
    systemSettings,
    resumes, participants, userProfile, selectedParticipantId, onSelectParticipant, isDarkMode, toggleDarkMode, onLogout,
    onEdit, onCreate, onImport, onDelete, onUpdateResume, onDuplicate, onAddParticipant, onUpdateParticipant, onDeleteParticipant, onClaimParticipant, onOpenAdmin, onOpenMatching,
    isImpersonating, onStopImpersonation
}) => {
    const { t, currentLanguage, setLanguage } = useTranslation();
    const [activeTab, setActiveTab] = useState<'participants' | 'documents'>('participants');

    const [participantStatusFilter, setParticipantStatusFilter] = useState<ParticipantStatus>('active');
    const [searchQuery, setSearchQuery] = useState('');
    const [docSearchQuery, setDocSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showParticipantModal, setShowParticipantModal] = useState(false);
    const [showInterviewModal, setShowInterviewModal] = useState(false);
    const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importStatus, setImportStatus] = useState('');
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [isAIImportModalOpen, setIsAIImportModalOpen] = useState(false);
    const [showMassImportModal, setShowMassImportModal] = useState(false);
    const [exportingDoc, setExportingDoc] = useState<{ resume: ResumeData, type: 'cv' | 'pb', brevId?: string } | null>(null);

    // Change password state
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passError, setPassError] = useState('');
    const [passSuccess, setPassSuccess] = useState('');
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [showPhotoModal, setShowPhotoModal] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formP, setFormP] = useState({
        firstName: '', lastName: '', email: '', phone: '', tags: ''
    });
    const [gdprConsent, setGdprConsent] = useState(false);
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [emailDropdownOpen, setEmailDropdownOpen] = useState(false);
    const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
    const [editingTitleValue, setEditingTitleValue] = useState('');

    useEffect(() => {
        const handleGlobalClick = () => {
            setActiveMenuId(null);
            setEmailDropdownOpen(false);
        };
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

    // Check if current user has access to Interview feature
    const canUseInterview = userProfile.role === 'admin' || userProfile.canUseInterview === true;

    // Admins should only see their own participants within the Dashboard view.
    // To see other coaches' participants, they must use the "View as Coach" feature in Admin Panel.
    const myParticipants = participants.filter(p => p.createdBy === userProfile.uid);
    const myResumes = resumes.filter(r => r.createdBy === userProfile.uid);

    const getParticipantPhoto = (participantId: string) => {
        const pResumes = myResumes.filter(r => r.participantId === participantId);
        if (pResumes.length === 0) return null;
        const sorted = [...pResumes].sort((a, b) => new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime());
        const resumeWithPhoto = sorted.find(r => r.personal.photoUrl);
        return resumeWithPhoto?.personal.photoUrl || null;
    };

    // Email helper functions
    const handleSendEmail = (participant: Participant, type: 'simple' | 'cv' | 'pb' = 'simple') => {
        if (!participant.email) {
            alert('Deltagaren har ingen e-postadress registrerad.');
            return;
        }

        // Get the appropriate template
        const templateKey = type === 'simple' ? 'simple' : type === 'cv' ? 'withCV' : 'withCoverLetter';
        const template = systemSettings.emailTemplates?.[templateKey];

        // Function to replace variables in template
        const replaceVariables = (text: string) => {
            return text
                .replace(/\{\{PARTICIPANT_NAME\}\}/g, participant.firstName)
                .replace(/\{\{PARTICIPANT_FULLNAME\}\}/g, `${participant.firstName} ${participant.lastName}`)
                .replace(/\{\{COACH_NAME\}\}/g, userProfile.displayName)
                .replace(/\{\{COMPANY_NAME\}\}/g, systemSettings.companyName || 'Aventus');
        };

        const subject = encodeURIComponent(replaceVariables(template?.subject || 'Tips från coachen'));
        const body = encodeURIComponent(replaceVariables(template?.body || ''));

        const mailtoLink = `mailto:${participant.email}?subject=${subject}&body=${body}`;
        window.location.href = mailtoLink;
    };

    const selectedParticipant = myParticipants.find(p => p.id === selectedParticipantId);
    const selectedParticipantPhoto = selectedParticipantId ? getParticipantPhoto(selectedParticipantId) : null;

    // START of NEW export logic
    useEffect(() => {
        const performExport = async () => {
            if (!exportingDoc) return;
            const { type: docType, brevId, resume } = exportingDoc;
            const selectedParticipant = myParticipants.find(p => p.id === resume.participantId);

            // 1. Prepare filename
            const firstName = resume.personal?.firstName || selectedParticipant?.firstName || '';
            const lastName = resume.personal?.lastName || selectedParticipant?.lastName || '';
            const today = new Date().toISOString().split('T')[0];
            const displayName = `${firstName} ${lastName}`.trim() || 'Dokument';

            let filename = '';
            if (docType === 'cv') {
                filename = `${displayName} - CV - ${today}`;
            } else {
                const brev = resume.coverLetters?.find(l => l.id === brevId);
                let company = '';
                if (brev?.title) {
                    company = brev.title.replace(/^(Personligt\s)?Brev\s*-?\s*/i, '').trim() || today;
                } else {
                    company = today;
                }
                filename = `${displayName} - Brev - ${company}`;
            }

            // Clean up filename
            filename = filename.replace(/[<>:"/\\|?*]/g, '-').trim();

            try {
                // 2. Prepare for printing/capture
                document.body.classList.add('is-exporting');

                // Wait for the portal to render
                await new Promise(resolve => setTimeout(resolve, 100));

                const element = document.querySelector('.print-container') as HTMLElement;
                if (!element) throw new Error('Utskriftsbehållaren hittades inte.');

                // 3. Generate and download PDF with metadata
                await PdfService.downloadPdf(resume, filename, element);

                // 4. Cleanup and open email
                setExportingDoc(null);
                
                // Give a bit of time before opening email so the download starts
                setTimeout(() => {
                    handleSendEmail(selectedParticipant!, docType);
                }, 1000);

            } catch (error) {
                console.error('Export failed:', error);
                alert('Det gick inte att skapa PDF:en. Försök igen.');
                setExportingDoc(null);
            } finally {
                document.body.classList.remove('is-exporting');
            }
        };

        performExport();
    }, [exportingDoc, selectedParticipant]);


    const handleSendEmailWithDocument = async (participant: Participant, resume: ResumeData, docType: 'cv' | 'pb', brevId?: string) => {
        // Just set the state, the useEffect will handle the rest
        if (participant.id !== selectedParticipantId) {
            console.warn("Participant mismatch in export");
        }
        setExportingDoc({ resume, type: docType, brevId });
    };

    const filteredParticipants = myParticipants
        .filter(p => {
            const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
            const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || (p.email?.toLowerCase().includes(searchQuery.toLowerCase()));
            if (searchQuery.trim() !== '') return matchesSearch;
            return matchesSearch && p.status === participantStatusFilter;
        })
        .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());

    const participantResumes = (selectedParticipantId ? myResumes.filter(r => r.participantId === selectedParticipantId) : myResumes)
        .filter(r => r.title.toLowerCase().includes(docSearchQuery.toLowerCase()))
        .sort((a, b) => new Date(b.lastEdited).getTime() - new Date(a.lastEdited).getTime());

    // FLATTEN DOCUMENTS (CV + Cover Letters)
    const allDocuments = (participantResumes || []).flatMap(r => {
        const docs = [];
        // Add CV
        docs.push({
            type: 'cv',
            id: r.id,
            resume: r,
            title: r.title,
            lastEdited: r.lastEdited,
            displayDate: new Date(r.lastEdited),
            brevId: undefined as string | undefined
        });
        // Add Cover Letters
        if (r.coverLetters) {
            r.coverLetters.forEach(l => {
                docs.push({
                    type: 'pb',
                    id: l.id,
                    resume: r,
                    title: l.title || 'Namnlöst brev',
                    lastEdited: l.lastEdited || r.lastEdited,
                    displayDate: new Date(l.lastEdited || r.lastEdited),
                    brevId: l.id
                });
            });
        }
        return docs;
    }).sort((a, b) => b.displayDate.getTime() - a.displayDate.getTime());

    // Filter documents based on search
    const filteredDocuments = allDocuments.filter(d => d.title.toLowerCase().includes(docSearchQuery.toLowerCase()));


    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (!file || !selectedParticipantId || !onImport) return;

        setIsImporting(true);
        setImportStatus('Förbereder fil...');
        console.log("Starting import for file:", file.name, "type:", file.type);

        const fileName = file.name.toLowerCase();

        try {
            // 1. DIRECT JSON IMPORT SUPPORT
            if (fileName.endsWith('.json')) {
                setImportStatus('Läser JSON-data...');
                try {
                    const text = await file.text();
                    const importedData = JSON.parse(text);

                    if (importedData.id && importedData.personal) {
                        onImport({ ...INITIAL_RESUME, ...importedData, id: 'res_' + Date.now(), participantId: selectedParticipantId, createdBy: userProfile.uid, lastEdited: new Date().toISOString() });
                        setIsImporting(false);
                        return;
                    } else {
                        throw new Error("Ogiltigt JSON-format för CV.");
                    }
                } catch (err: any) {
                    alert("Kunde inte läsa JSON-filen: " + err.message);
                    setIsImporting(false);
                    return;
                }
            }

            // 2. SMART EXPORT DETECTION (PDF Metadata)
            if (fileName.endsWith('.pdf')) {
                setImportStatus('Söker efter Aventus-data...');
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const { PDFDocument } = await import('pdf-lib');
                    const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
                    const keywords = pdfDoc.getKeywords() || "";
                    const match = keywords.match(/(?:AVENTUS_DATA|SYSTEM_DATA)[:_]([A-Za-z0-9+/=]+)/);

                    if (match) {
                        setImportStatus('Aventus-data hittad! Dekrypterar...');
                        try {
                            const binString = atob(match[1]);
                            const bytes = new Uint8Array(binString.length);
                            for (let i = 0; i < binString.length; i++) {
                                bytes[i] = binString.charCodeAt(i);
                            }
                            const decodedJson = new TextDecoder().decode(bytes);
                            const importedData = JSON.parse(decodedJson);
                            
                            onImport({ ...importedData, id: 'res_' + Date.now(), participantId: selectedParticipantId, createdBy: userProfile.uid, lastEdited: new Date().toISOString() });
                            setIsImporting(false);
                            return;
                        } catch (e) {
                            // Fallback decoding for older formats
                            const jsonStr = decodeURIComponent(escape(atob(match[1])));
                            const importedData = JSON.parse(jsonStr);
                            onImport({ ...importedData, id: 'res_' + Date.now(), participantId: selectedParticipantId, createdBy: userProfile.uid, lastEdited: new Date().toISOString() });
                            setIsImporting(false);
                            return;
                        }
                    }
                } catch (pdfErr) {
                    console.warn("Could not read PDF metadata, proceeding to AI extraction", pdfErr);
                }
            }

            // 3. AI EXTRACTION (Regular PDF/DOCX)
            setImportStatus('Konverterar fil för analys...');

            // FETCH SETTINGS
            const settings = await SettingsService.getSettings();
            const apiKey = settings.geminiApiKey || process.env.API_KEY || '';
            const modelId = settings.geminiModel || 'gemini-1.5-flash-latest';

            if (!apiKey) {
                alert("Ingen API-nyckel konfigurerad. Gå till administration för att sätta upp AI.");
                setIsImporting(false);
                return;
            }

            const ai = new GoogleGenAI({ apiKey });
            let aiParts: any[] = [];

            if (fileName.endsWith('.docx')) {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.extractRawText({ arrayBuffer });
                aiParts.push({ text: `Här är textinnehållet från ett CV. Extrahera all relevant information:\n\n${result.value}` });
            } else {
                setImportStatus('Kodar bild/PDF...');
                const base64 = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = (err) => reject(new Error("Kunde inte läsa filen: " + err));
                    reader.readAsDataURL(file);
                });
                aiParts.push({
                    inlineData: {
                        mimeType: file.type || 'application/pdf',
                        data: base64
                    }
                });
            }

            setImportStatus('Agneta analyserar CV:t... (detta kan ta 10-20 sekunder)');

            const schemaPrompt = settings.importMappingPrompt || `
              Du ska agera som en expert på CV-analys. Din uppgift är att läsa det bifogade dokumentet och extrahera informationen till en strikt JSON-struktur som följer detta schema:
              {
                "personal": {
                  "firstName": "Sträng",
                  "lastName": "Sträng",
                  "email": "Sträng",
                  "phone": "Sträng",
                  "address": "Sträng",
                  "city": "Sträng",
                  "zipCode": "Sträng",
                  "jobTitle": "Sträng",
                  "birthDate": "Sträng"
                },
                "profile": "En sammanfattande HTML-text (p-taggar) om personen",
                "experience": [
                  { "id": "unikt_id", "role": "Titel", "company": "Företag", "startDate": "Datum", "endDate": "Datum", "current": true/false, "description": "HTML-lista på arbetsuppgifter", "location": "Ort" }
                ],
                "education": [
                  { "id": "unikt_id", "school": "Skola", "degree": "Examen", "startDate": "Datum", "endDate": "Datum", "current": true/false, "description": "Beskrivning", "location": "Ort" }
                ],
                "skills": [
                  { "id": "unikt_id", "name": "Kompetens", "level": 1-5 }
                ],
                "languages": [
                   { "id": "unikt_id", "name": "Språk", "level": "Grundläggande/Goda kunskaper/Flytande/Modersmål" }
                ]
              }

              VIKTIGT: 
              1. Returnera ENDAST JSON. Inga förklarande texter.
              2. Om en sektion saknas, returnera en tom lista [].
              3. Använd svenska för alla texter du genererar.
              4. Se till att alla objekt i listor har ett unikt "id" (t.ex. exp_1, edu_1).
            `;

            try {
                // @ts-ignore
                const result = await ai.models.generateContent({
                    model: modelId,
                    contents: {
                        parts: [
                            ...aiParts,
                            { text: schemaPrompt }
                        ]
                    },
                    config: { responseMimeType: "application/json" }
                });

                const text = typeof result.text === 'string' ? result.text : JSON.stringify(result);

                setImportStatus('Slutför import...');
                const parsed = JSON.parse(text);
                console.log("AI Extraction Successful:", parsed);

                onImport({
                    ...INITIAL_RESUME,
                    ...parsed,
                    id: 'res_' + Date.now(),
                    participantId: selectedParticipantId,
                    createdBy: userProfile.uid,
                    lastEdited: new Date().toISOString()
                });

            } catch (aiError: any) {
                console.warn("AI JSON Mode failed or timed out, retrying simple mode...", aiError);
                setImportStatus('Försöker en alternativ analysmetod...');

                // @ts-ignore
                const result = await ai.models.generateContent({
                    model: modelId,
                    contents: {
                        parts: [
                            ...aiParts,
                            { text: schemaPrompt + "\n\nSvara med rå JSON utan markdown-taggar." }
                        ]
                    }
                });

                const rawText = typeof result.text === 'string' ? result.text : "";
                const text = rawText.replace(/```json/g, '').replace(/```/g, '').trim();

                onImport({
                    ...INITIAL_RESUME,
                    ...JSON.parse(text),
                    id: 'res_' + Date.now(),
                    participantId: selectedParticipantId,
                    createdBy: userProfile.uid,
                    lastEdited: new Date().toISOString()
                });
            }

        } catch (err: any) {
            console.error("Import error:", err);
            setImportStatus('');
            setIsImporting(false);
            alert("Tyvärr uppstod ett fel vid importen: " + (err.message || 'Okänt fel'));
        }
    };

    const handleAIImport = async (text: string) => {
        if (!systemSettings.geminiApiKey) {
            alert("Vänligen lägg till en Gemini API-nyckel i inställningarna först.");
            return;
        }

        try {
            setIsImporting(true);
            setImportStatus('Analyserar text...');
            const result = await ImportService.mapTextToResume(text, systemSettings.geminiApiKey, systemSettings.geminiModel);
            if (result) {
                const newResume: ResumeData = {
                    ...INITIAL_RESUME,
                    ...result,
                    id: 'res_' + Date.now(),
                    participantId: selectedParticipantId || undefined,
                    createdBy: userProfile.uid,
                    lastEdited: new Date().toISOString()
                } as ResumeData;
                onImport?.(newResume);
            }
            setIsAIImportModalOpen(false);
        } catch (error: any) {
            console.error("AI Import failed:", error);
            alert("Tyvärr uppstod ett fel vid importen: " + error.message);
        } finally {
            setIsImporting(false);
            setImportStatus('');
        }
    };

    const handleSaveParticipantForm = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        if (editingParticipant) {
            onUpdateParticipant({ ...editingParticipant, firstName: formP.firstName, lastName: formP.lastName, email: formP.email, phone: formP.phone, tags: formP.tags.split(',').map(t => t.trim()) });
        } else {
            onAddParticipant({
                id: 'p_' + Date.now(),
                firstName: formP.firstName,
                lastName: formP.lastName,
                email: formP.email,
                phone: formP.phone,
                status: 'active',
                lastActivity: new Date().toISOString(),
                createdBy: userProfile.uid,
                tags: formP.tags.split(',').map(t => t.trim()),
                gdprConsent: true,
                gdprConsentDate: new Date().toISOString(),
                gdprConsentBy: userProfile.uid
            });
        }
        setTimeout(() => { setIsSaving(false); setShowParticipantModal(false); }, 500);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPassError('');
        setPassSuccess('');

        if (newPassword.length < 6) { setPassError("Lösenordet måste vara minst 6 tecken."); return; }
        if (newPassword !== confirmPassword) { setPassError("Lösenorden matchar inte."); return; }

        setIsSavingSettings(true);
        try {
            await AuthService.updatePassword(newPassword);
            setPassSuccess("Lösenordet har ändrats!");
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setShowSettingsModal(false), 2000);
        } catch (err: any) {
            setPassError("Kunde inte ändra lösenord. Du kan behöva logga in igen.");
        } finally {
            setIsSavingSettings(false);
        }
    };

    const handleProfilePhotoSave = async (base64: string) => {
        if (!userProfile?.uid) return;
        console.log("Dashboard: Saving profile photo for", userProfile.uid, "length:", base64.length);
        try {
            await AuthService.updateProfilePhoto(userProfile.uid, base64);
            // App.tsx listener will update userProfile automatically
            setShowPhotoModal(false);
        } catch (err) {
            console.error("Failed to save profile photo", err);
            alert("Kunde inte spara profilbilden.");
        }
    };

    const handleOpenAddModal = () => {
        setEditingParticipant(null);
        setFormP({ firstName: '', lastName: '', email: '', phone: '', tags: '' });
        setGdprConsent(false);
        setShowParticipantModal(true);
    };

    const handleCreateDemoCV = async () => {
        if (!userProfile?.uid) return;

        const demoParticipantId = 'p_demo_' + Date.now();
        const demoParticipant: Participant = {
            id: demoParticipantId,
            firstName: 'Anna',
            lastName: 'Andersson',
            email: 'anna.andersson@exempel.se',
            phone: '070-123 45 67',
            status: 'active',
            lastActivity: new Date().toISOString(),
            createdBy: userProfile.uid,
            tags: ['demo']
        };

        const sampleData = generateSampleCV();
        const today = new Date().toISOString().split('T')[0];
        const firstName = sampleData.personal?.firstName || 'Demo';
        const lastName = sampleData.personal?.lastName || 'CV';
        const demoResumeId = 'res_' + Date.now();

        const newR = {
            ...INITIAL_RESUME,
            ...sampleData,
            id: demoResumeId,
            participantId: demoParticipantId,
            createdBy: userProfile.uid,
            title: `${firstName} ${lastName} - CV - ${today}`,
            lastEdited: new Date().toISOString()
        };

        // 1. Skapa deltagaren i databasen & lokalt state
        await onAddParticipant?.(demoParticipant);

        // 2. Spara det färdiga CV-dokumentet i databasen & lokalt state
        await onUpdateResume?.(newR as ResumeData);

        // 3. Öppna CV:t direkt i redigeraren
        onEdit(newR as ResumeData, { type: 'cv' });
    };

    const handleToggleParticipantStatus = (e: React.MouseEvent, p: Participant) => {
        e.stopPropagation();
        onUpdateParticipant({ ...p, status: p.status === 'active' ? 'archived' : 'active' });
    };

    const handleBulkDelete = async () => {
        if (selectedParticipants.length === 0) return;

        const participantsToDelete = myParticipants.filter(p => selectedParticipants.includes(p.id));
        const totalCVs = myResumes.filter(r => selectedParticipants.includes(r.participantId)).length;

        const participantNames = participantsToDelete.map(p => {
            const cvCount = myResumes.filter(r => r.participantId === p.id).length;
            return `- ${p.firstName} ${p.lastName} (${cvCount} CV)`;
        }).join('\n');

        const confirmMessage = `⚠️ RADERA ${participantsToDelete.length} DELTAGARE PERMANENT?\n\nDetta kommer att radera:\n• ${participantsToDelete.length} deltagare\n• ${totalCVs} CV:n totalt\n• All persondata\n\nDeltagare som kommer raderas:\n${participantNames}\n\nDenna åtgärd kan INTE ångras!\n\nÄr du säker?`;

        if (!confirm(confirmMessage)) return;

        // Delete all CVs and participants
        for (const participantId of selectedParticipants) {
            const cvs = myResumes.filter(r => r.participantId === participantId);
            for (const cv of cvs) {
                await onDelete?.(cv.id);
            }
            await onDeleteParticipant?.(participantId);
        }

        setSelectedParticipants([]);
        setIsSelectionMode(false);
    };

    const printPortal = exportingDoc ? (
        <div className="print-container">
            <CvPreview
                data={exportingDoc.resume}
                template={exportingDoc.resume.template || 'classic-sidebar'}
                brevId={exportingDoc.brevId}
            />
        </div>
    ) : null;

    return (
        <div className="h-screen flex flex-col bg-slate-200 dark:bg-slate-950 overflow-hidden font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
            {/* Portals for printing - render unconditionally if possible or as soon as exportingDoc is set */}
            {printPortal && createPortal(printPortal, document.body)}

            {/* IMPERSONATION BANNER */}
            {isImpersonating && (
                <div className="bg-brand-500 text-white px-6 py-2.5 flex items-center justify-between shadow-lg z-[100] animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Du skuggar nu coach: <strong>{userProfile.displayName}</strong></span>
                    </div>
                    <button
                        onClick={onStopImpersonation}
                        className="bg-white/20 hover:bg-white/40 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all"
                    >
                        Avsluta skuggning
                    </button>
                </div>
            )}

            {isImporting && (
                <div className="fixed inset-0 z-[200] bg-white/90 dark:bg-gray-950/90 backdrop-blur-md flex items-center justify-center">
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-10 h-10 text-brand-400 animate-spin mb-4" />
                        <p className="font-black text-xs uppercase tracking-widest text-gray-400">{importStatus}</p>
                    </div>
                </div>
            )}

            {showParticipantModal && (
                <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em]">{editingParticipant ? t('edit_participant') : t('new_participant')}</h2>
                            <button onClick={() => setShowParticipantModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSaveParticipantForm} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('first_name')}</label><input required value={formP.firstName} onChange={e => setFormP({ ...formP, firstName: e.target.value })} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-brand-400 rounded-xl outline-none font-bold shadow-sm" /></div>
                                <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('last_name')}</label><input required value={formP.lastName} onChange={e => setFormP({ ...formP, lastName: e.target.value })} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-brand-400 rounded-xl outline-none font-bold shadow-sm" /></div>
                            </div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('email')}</label><input type="email" value={formP.email} onChange={e => setFormP({ ...formP, email: e.target.value })} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-brand-400 rounded-xl outline-none font-bold shadow-sm" placeholder="namn@exempel.se" /></div>
                            <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('phone')}</label><input value={formP.phone} onChange={e => setFormP({ ...formP, phone: e.target.value })} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-brand-400 rounded-xl outline-none font-bold shadow-sm" placeholder="070-000 00 00" /></div>

                            {!editingParticipant && (
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={gdprConsent}
                                            onChange={(e) => setGdprConsent(e.target.checked)}
                                            className="mt-1 w-4 h-4 text-brand-400 border-gray-300 rounded focus:ring-brand-400"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                            {t('gdpr_consent_text')}
                                        </span>
                                    </label>
                                </div>
                            )}

                            <div className="pt-2 flex gap-4">
                                <button type="button" onClick={() => setShowParticipantModal(false)} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-xl font-black uppercase tracking-widest text-[10px]">{t('cancel')}</button>
                                <button
                                    type="submit"
                                    disabled={isSaving || (!editingParticipant && !gdprConsent)}
                                    className={`flex-1 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all ${isSaving || (!editingParticipant && !gdprConsent)
                                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                                        : 'bg-brand-400 text-white shadow-brand-400/20 hover:bg-brand-500'
                                        }`}
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t('save_participant')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showSettingsModal && (
                <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                            <h2 className="text-xs font-black uppercase tracking-[0.2em]">{t('settings')}</h2>
                            <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleChangePassword} className="p-6 space-y-4">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-500 border-b pb-2">{t('change_password')}</h3>


                            {passError && <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3"><AlertTriangle className="w-4 h-4" /> {passError}</div>}
                            {passSuccess && <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3"><Check className="w-4 h-4" /> {passSuccess}</div>}

                            <div className="space-y-4 border-b border-gray-100 dark:border-gray-700 pb-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">{t('profile_image')}</h3>
                                <div className="flex items-center gap-6">
                                    <div className="w-20 h-20 rounded-full bg-brand-50 dark:bg-gray-700 flex items-center justify-center text-3xl font-black text-brand-400 overflow-hidden border-2 border-white dark:border-gray-600 shadow-lg relative group">
                                        {userProfile.photoUrl ? (
                                            <img src={userProfile.photoUrl} className="w-full h-full object-cover" alt="Profile" />
                                        ) : (
                                            userProfile.displayName?.[0]
                                        )}
                                        <div onClick={() => setShowPhotoModal(true)} className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <Edit2 className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <button type="button" onClick={() => setShowPhotoModal(true)} className="px-5 py-3 bg-brand-50 hover:bg-brand-100 text-brand-500 rounded-xl font-black uppercase tracking-widest text-[10px] flex items-center gap-2 transition-colors">
                                            <Camera className="w-4 h-4" /> {t('change_image')}
                                        </button>
                                        <p className="text-[10px] text-gray-400 mt-2 max-w-[150px] leading-tight">{t('profile_image_tip')}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('new_password')}</label>
                                <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-brand-400 rounded-xl outline-none font-bold shadow-sm" placeholder="••••••••" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('confirm_password')}</label>
                                <input type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-brand-400 rounded-xl outline-none font-bold shadow-sm" placeholder="••••••••" />
                            </div>
                            <div className="pt-2 flex gap-4">
                                <button type="button" onClick={() => setShowSettingsModal(false)} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-xl font-black uppercase tracking-widest text-[10px]">{t('close')}</button>
                                <button type="submit" disabled={isSavingSettings} className="flex-1 py-3 bg-brand-400 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-brand-400/20">{isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : t('save_new_password')}</button>
                            </div>

                        </form>
                    </div>
                </div>
            )}

            {showInterviewModal && selectedParticipantId && (
                <InterviewModal
                    onClose={() => setShowInterviewModal(false)}
                    currentName={`${selectedParticipant?.firstName} ${selectedParticipant?.lastName}`}
                    onAnalysisComplete={(importedData) => {
                        if (onImport) {
                            const today = new Date().toISOString().split('T')[0];
                            const firstName = selectedParticipant?.firstName || '';
                            const lastName = selectedParticipant?.lastName || '';
                            const name = `${firstName} ${lastName}`.trim() || 'Intervju';

                            onImport({
                                ...INITIAL_RESUME,
                                ...importedData,
                                id: 'res_' + Date.now(),
                                participantId: selectedParticipantId,
                                createdBy: userProfile.uid,
                                lastEdited: new Date().toISOString(),
                                title: `${name} - CV - ${today}`
                            });
                        }
                    }}
                />
            )}

            <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.txt" onChange={handleFileImport} />

            <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 h-20 shrink-0 flex items-center justify-between px-10 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-brand-400 rounded-2xl flex items-center justify-center text-white shadow-lg overflow-hidden">
                        {systemSettings.logoUrl ? (
                            <img src={systemSettings.logoUrl} alt="Logo" className="w-full h-full object-contain p-1.5" />
                        ) : (
                            <FileText className="w-6 h-6" />
                        )}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-black text-brand-400 leading-none">
                            {systemSettings.companyName ? `${systemSettings.companyName}.cv` : 'Aventus.cv'}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Coach Portal</span>
                    </div>
                </div>

                <div className="flex items-center gap-8">
                    {/* Language Selector Dropdown */}
                    <div className="flex items-center">
                        <select
                            value={currentLanguage}
                            onChange={(e) => setLanguage(e.target.value as Language)}
                            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-full px-3 py-1.5 text-xs font-bold focus:outline-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                        >
                            {LANGUAGES.map(lang => (
                                <option key={lang.code} value={lang.code} className="bg-white dark:bg-gray-800">
                                    {lang.flag} {lang.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-4">
                        {!isImpersonating && userProfile.role === 'admin' && (
                            <button onClick={onOpenAdmin} className="flex items-center gap-2 px-4 py-2 bg-brand-50 text-brand-500 border border-brand-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-brand-100 transition-all shadow-sm">
                                <ShieldCheck className="w-4 h-4" /> {t('admin')}
                            </button>
                        )}

                        <button onClick={toggleDarkMode} className="p-2.5 text-gray-400 hover:text-brand-400 transition-all">{isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setUserMenuOpen(!userMenuOpen); }}
                                className={`w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center text-brand-400 font-black border border-brand-100 hover:bg-brand-100 transition-all overflow-hidden ${userMenuOpen ? 'ring-2 ring-brand-400' : ''}`}
                            >
                                {userProfile.photoUrl ? <img src={userProfile.photoUrl} className="w-full h-full object-cover" alt="Avatar" /> : userProfile.displayName?.[0]}
                            </button>
                            {userMenuOpen && (
                                <div className="absolute right-0 mt-3 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 z-50 animate-in fade-in zoom-in-95 origin-top-right overflow-hidden">
                                    <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-700 mb-1">
                                        <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Inloggad som</p>
                                        <p className="text-xs font-bold truncate">{userProfile.displayName}</p>
                                    </div>
                                    <button onClick={() => { setShowSettingsModal(true); setUserMenuOpen(false); }} className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 flex items-center gap-3"><Edit2 className="w-4 h-4 text-gray-400" /> Inställningar</button>
                                    <button onClick={onLogout} className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-3"><Trash2 className="w-4 h-4" /> Logga ut</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                {activeTab === 'participants' && selectedParticipantId ? (
                    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <BackButton onClick={() => onSelectParticipant(null)} label={t('back_to_list') || 'Tillbaka till listan'} />

                        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-10 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-8">
                            <div className="flex items-center gap-8">
                                <div className="w-28 h-28 bg-gray-50 dark:bg-gray-700 rounded-3xl flex items-center justify-center text-5xl font-black text-brand-400 overflow-hidden shadow-inner border border-gray-100 dark:border-gray-600">
                                    {selectedParticipantPhoto ? <img src={selectedParticipantPhoto} className="w-full h-full object-cover" /> : selectedParticipant?.firstName[0]}
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">{selectedParticipant?.firstName} {selectedParticipant?.lastName}</h2>
                                    <div className="flex flex-wrap gap-4 text-xs font-bold text-gray-400">
                                        {selectedParticipant?.email && <span className="flex items-center gap-2"><Mail className="w-4 h-4" /> {selectedParticipant.email}</span>}
                                        {selectedParticipant?.phone && <span className="flex items-center gap-2"><Phone className="w-4 h-4" /> {selectedParticipant.phone}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                {selectedParticipant?.email && (
                                    <div className="relative">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEmailDropdownOpen(!emailDropdownOpen);
                                            }}
                                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 transition-all"
                                        >
                                            <Mail className="w-5 h-5" /> {t('send_email') || 'Skicka Mail'}
                                            <svg className={`w-3 h-3 transition-transform ${emailDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                        </button>
                                        {emailDropdownOpen && (
                                            <div onClick={(e) => e.stopPropagation()} className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in zoom-in-95">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSendEmail(selectedParticipant, 'simple');
                                                        setEmailDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                                                >
                                                    <Mail className="w-4 h-4 text-gray-400" />
                                                    {t('open_email_client') || 'Öppna e-postprogram'}
                                                </button>
                                                {participantResumes.length > 0 && (
                                                    <>
                                                        <div className="h-px bg-gray-100 dark:bg-gray-700 my-1" />
                                                        <button
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                const latestResume = participantResumes[0];
                                                                await handleSendEmailWithDocument(selectedParticipant, latestResume, 'cv');
                                                                setEmailDropdownOpen(false);
                                                            }}
                                                            className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                                                        >
                                                            <FileText className="w-4 h-4 text-blue-400" />
                                                            {t('send_with_latest_cv') || 'Skicka med senaste CV'}
                                                        </button>
                                                        {participantResumes[0]?.coverLetters && participantResumes[0].coverLetters.length > 0 && (
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    const latestResume = participantResumes[0];
                                                                    const latestLetter = latestResume.coverLetters![0];
                                                                    await handleSendEmailWithDocument(selectedParticipant, latestResume, 'pb', latestLetter.id);
                                                                    setEmailDropdownOpen(false);
                                                                }}
                                                                className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                                                            >
                                                                <Mail className="w-4 h-4 text-purple-400" />
                                                                {t('send_with_latest_cover_letter') || 'Skicka med senaste Personligt Brev'}
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {/* 
                                {canUseInterview && (
                                    <button onClick={() => setShowInterviewModal(true)} className="bg-brand-50 hover:bg-brand-100 text-brand-500 border border-brand-100 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 transition-all relative">
                                        <Mic className="w-5 h-5" /> {t('agneta_interview') || 'Agneta Intervju'}
                                        <span className="absolute -top-2 -right-2 bg-brand-400 text-white text-[7px] px-1.5 py-0.5 rounded-md shadow-sm">BETA</span>
                                    </button>
                                )}
                                */}
                                <button 
                                    onClick={() => setIsAIImportModalOpen(true)} 
                                    className="bg-brand-50 hover:bg-brand-100 text-brand-500 border border-brand-100 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 transition-all shadow-sm hover:shadow-md"
                                    >
                                    <Sparkles className="w-5 h-5" /> {t('import_with_ai') || 'Importera med AI'}
                                </button>
                                <button 
                                    onClick={() => fileInputRef.current?.click()} 
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('ring-4', 'ring-brand-400', 'ring-offset-2', 'bg-brand-50', 'dark:bg-brand-900/30'); }}
                                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('ring-4', 'ring-brand-400', 'ring-offset-2', 'bg-brand-50', 'dark:bg-brand-900/30'); }}
                                    onDrop={(e) => {
                                        e.preventDefault(); 
                                        e.stopPropagation();
                                        e.currentTarget.classList.remove('ring-4', 'ring-brand-400', 'ring-offset-2', 'bg-brand-50', 'dark:bg-brand-900/30');
                                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                            handleFileImport({ target: { files: e.dataTransfer.files } } as any);
                                        }
                                    }}
                                    className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 transition-all"
                                >
                                    <Upload className="w-5 h-5 pointer-events-none" /> <span className="pointer-events-none">{t('import_file') || 'Importera fil'}</span>
                                </button>
                                <div className="flex gap-2">
                                    <button onClick={() => onCreate(selectedParticipantId)} className="bg-brand-400 hover:bg-brand-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-brand-400/20 flex items-center gap-3 transition-all active:scale-95">
                                        <Plus className="w-5 h-5" /> {t('new_cv') || 'Nytt CV'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-baseline gap-4">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">{t('cv_and_letters') || 'CV & Brev'}</h3>
                                <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800"></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {filteredDocuments.map(doc => {
                                    const r = doc.resume;
                                    const isBrev = doc.type === 'pb';

                                    return (
                                        <div key={doc.id} className="group relative">
                                            <div
                                                onClick={() => onEdit(r, isBrev ? { type: 'pb', id: doc.brevId } : { type: 'cv' })}
                                                className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm cursor-pointer group hover:shadow-2xl transition-all flex flex-col relative overflow-hidden"
                                            >
                                                <div className="aspect-[210/297] bg-gray-50 dark:bg-gray-900 rounded-2xl mb-6 overflow-hidden relative border border-gray-50 dark:border-gray-700 flex items-center justify-center shadow-inner">
                                                    <div className="scale-[0.3] origin-center w-[794px] h-[1123px] shrink-0 pointer-events-none">
                                                        <CvPreview
                                                            data={r}
                                                            template={r.template || 'classic-sidebar'}
                                                            brevId={doc.brevId}
                                                        />
                                                    </div>
                                                    {/* Badge for Type */}
                                                    <div className={`absolute bottom-2 right-2 px-3 py-1.5 rounded-lg shadow-sm border flex items-center gap-2 backdrop-blur-sm ${isBrev ? 'bg-indigo-50/90 border-indigo-100 text-brand-500' : 'bg-white/90 border-gray-100 text-gray-600'}`}>
                                                        {isBrev ? <Mail className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                                            {isBrev ? (t('letter') || 'Brev') : 'CV'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {/* Klickbar titel – byt namn direkt */}
                                                {editingTitleId === doc.id ? (
                                                    <input
                                                        autoFocus
                                                        value={editingTitleValue}
                                                        onChange={e => setEditingTitleValue(e.target.value)}
                                                        onBlur={() => {
                                                            if (editingTitleValue.trim()) {
                                                                const updated = { ...r, title: editingTitleValue.trim(), lastEdited: new Date().toISOString() };
                                                                onUpdateResume?.(updated);
                                                            }
                                                            setEditingTitleId(null);
                                                        }}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                                            if (e.key === 'Escape') setEditingTitleId(null);
                                                        }}
                                                        onClick={e => e.stopPropagation()}
                                                        className="w-full font-black text-gray-900 dark:text-white text-lg mb-1 bg-gray-50 dark:bg-gray-700 border border-brand-400 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-brand-400"
                                                    />
                                                ) : (
                                                    <h3
                                                        className="font-black text-gray-900 dark:text-white text-lg truncate mb-1 cursor-text hover:text-brand-400 transition-colors group/title flex items-center gap-1"
                                                        onClick={e => { e.stopPropagation(); setEditingTitleId(doc.id); setEditingTitleValue(doc.title); }}
                                                        title={t('click_to_rename') || 'Klicka för att byta namn'}
                                                    >
                                                        {doc.title}
                                                        <Edit2 className="w-3 h-3 opacity-0 group-hover/title:opacity-40 shrink-0 transition-opacity" />
                                                    </h3>
                                                )}
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{t('updated') || 'Ändrad'} {doc.displayDate.toLocaleDateString()}</p>
                                            </div>
                                            <div className="absolute top-4 right-4 z-10 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === doc.id ? null : doc.id); }} className="p-2 bg-white/80 backdrop-blur-md rounded-xl text-gray-500 hover:text-brand-400 shadow-sm border border-gray-100 transition-all"><MoreVertical className="w-5 h-5" /></button>
                                                {activeMenuId === doc.id && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 animate-in fade-in zoom-in-95 duration-150 origin-top-right overflow-hidden z-20">
                                                        <button onClick={(e) => { e.stopPropagation(); onEdit(r, isBrev ? { type: 'pb', id: doc.brevId } : { type: 'cv' }); }} className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 flex items-center gap-3"><Edit2 className="w-4 h-4 text-gray-400" /> {t('open') || 'Öppna'}</button>
                                                        {!isBrev && <button onClick={(e) => { e.stopPropagation(); onDuplicate?.(r); setActiveMenuId(null); }} className="w-full text-left px-4 py-3 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"><Copy className="w-4 h-4 text-gray-400" /> {t('copy_cv') || 'Kopiera CV'}</button>}
                                                        <div className="h-px bg-gray-50 dark:bg-gray-700 mx-4 my-1"></div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (isBrev) {
                                                                    if (confirm(t('confirm_delete_letter') || 'Är du säker på att du vill radera detta brev?')) {
                                                                        // Update resume logic to remove letter
                                                                        const updated = { ...r, coverLetters: (r.coverLetters || []).filter(l => l.id !== doc.id) };
                                                                        onUpdateResume?.(updated);
                                                                    }
                                                                } else {
                                                                    if (confirm(t('confirm_delete_cv') || 'Är du säker på att du vill radera detta CV? Åtgärden kan inte ångras.')) {
                                                                        onDelete?.(r.id);
                                                                    }
                                                                }
                                                                setActiveMenuId(null);
                                                            }}
                                                            className="w-full text-left px-4 py-3 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-3"
                                                        >
                                                            <Trash2 className="w-4 h-4" /> {t('delete') || 'Radera'}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                ) : activeTab === 'participants' ? (
                    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-4">
                            <div className="space-y-2">
                                <h2 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter">{t('participants')}</h2>
                                <div className="flex gap-4">
                                    <button onClick={() => setParticipantStatusFilter('active')} className={`text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${participantStatusFilter === 'active' ? 'bg-brand-400 text-white' : 'bg-white text-gray-400 border border-gray-100 hover:border-brand-200'}`}>
                                        {t('active')} <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${participantStatusFilter === 'active' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{myParticipants.filter(p => p.status === 'active').length}</span>
                                    </button>
                                    <button onClick={() => setParticipantStatusFilter('archived')} className={`text-[11px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${participantStatusFilter === 'archived' ? 'bg-brand-400 text-white' : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-300'}`}>
                                        {t('archive')} <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${participantStatusFilter === 'archived' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{myParticipants.filter(p => p.status === 'archived').length}</span>
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                {participantStatusFilter === 'archived' && (
                                    <button
                                        onClick={() => {
                                            setIsSelectionMode(!isSelectionMode);
                                            setSelectedParticipants([]);
                                        }}
                                        className={`px-8 py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg flex items-center gap-3 transition-all hover:-translate-y-1 ${isSelectionMode
                                            ? 'bg-gray-200 text-gray-700 border-2 border-gray-300'
                                            : 'bg-white text-gray-700 border-2 border-gray-200'
                                            }`}
                                    >
                                        {isSelectionMode ? <X className="w-5 h-5" /> : <CheckSquare className="w-5 h-5" />}
                                        {isSelectionMode ? t('cancel') : t('delete_multiple')}
                                    </button>
                                )}
                                {systemSettings.allowBulkImportForCoaches !== false && (
                                    <button
                                        onClick={() => setShowMassImportModal(true)}
                                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 px-8 py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center gap-3 transition-all hover:-translate-y-1"
                                    >
                                        <Upload className="w-5 h-5" /> {t('mass_import')}
                                    </button>
                                )}
                                <button onClick={handleOpenAddModal} className="bg-brand-400 text-white px-10 py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl flex items-center gap-4 transition-all hover:bg-brand-500 hover:-translate-y-1"><Plus className="w-6 h-6" /> {t('new_participant')}</button>
                                <button onClick={handleCreateDemoCV} className="bg-brand-400 text-white border-2 border-brand-500 px-8 py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg flex items-center gap-3 transition-all hover:bg-brand-500 hover:-translate-y-1">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                                    {t('fill_demo_data')}
                                </button>
                                {(userProfile.canUseMatching || userProfile.role === 'admin') && (
                                    <>
                                        <button onClick={onOpenMatching} className="bg-brand-500 text-white px-8 py-5 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] shadow-lg flex items-center gap-3 transition-all hover:opacity-90 hover:-translate-y-1">
                                            <Sparkles className="w-5 h-5" />
                                            {t('matching')}
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" placeholder={t('search_participants')} className="w-full pl-16 pr-6 py-5 bg-white dark:bg-gray-800 border-none rounded-[2rem] shadow-sm focus:ring-2 focus:ring-brand-400 outline-none text-base font-medium" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                            </div>
                            <div className="flex bg-white dark:bg-gray-800 p-1 rounded-[1.5rem] border border-gray-100 dark:border-gray-700 shadow-sm h-[60px] items-center px-1">
                                <button onClick={() => setViewMode('grid')} className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${viewMode === 'grid' ? 'bg-brand-50 text-brand-400 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><LayoutGrid className="w-5 h-5" /></button>
                                <button onClick={() => setViewMode('list')} className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all ${viewMode === 'list' ? 'bg-brand-50 text-brand-400 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}><ListIcon className="w-5 h-5" /></button>
                            </div>
                        </div>

                        {viewMode === 'grid' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                {filteredParticipants.map(p => {
                                    const photo = getParticipantPhoto(p.id);
                                    const count = myResumes.filter(r => r.participantId === p.id).length;
                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => {
                                                if (!isSelectionMode) {
                                                    onSelectParticipant(p.id);
                                                }
                                            }}
                                            className={`bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-sm border cursor-pointer group hover:shadow-2xl hover:scale-[1.02] transition-all flex flex-col relative ${p.status === 'archived' ? 'opacity-60 grayscale-[0.5]' : ''
                                                } ${selectedParticipants.includes(p.id)
                                                    ? 'border-brand-400 border-2 bg-brand-50/50 dark:bg-brand-900/20'
                                                    : 'border-white dark:border-gray-700'
                                                }`}
                                        >
                                            {isSelectionMode && participantStatusFilter === 'archived' && (
                                                <div className="absolute top-4 left-4 z-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedParticipants.includes(p.id)}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedParticipants(prev =>
                                                                prev.includes(p.id)
                                                                    ? prev.filter(id => id !== p.id)
                                                                    : [...prev, p.id]
                                                            );
                                                        }}
                                                        className="w-5 h-5 text-brand-400 border-gray-300 rounded focus:ring-brand-400 cursor-pointer"
                                                    />
                                                </div>
                                            )}
                                            <div className="flex items-center gap-6 mb-8">
                                                <div className="w-20 h-20 rounded-2xl bg-gray-50 dark:bg-gray-700 flex items-center justify-center font-black text-3xl text-brand-400 overflow-hidden border border-gray-100 dark:border-gray-600 shadow-inner group-hover:scale-110 transition-transform">
                                                    {photo ? <img src={photo} className="w-full h-full object-cover" /> : p.firstName[0]}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="font-black text-gray-900 dark:text-white text-xl truncate tracking-tight">{p.firstName} {p.lastName}</h3>
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{count} {t('pieces') || 'Dokument'}</span>
                                                </div>
                                            </div>
                                            <div className="space-y-4 pt-4 border-t border-gray-50 dark:border-gray-700">
                                                {p.email && <div className="flex items-center gap-3 text-xs font-bold text-gray-500"><Mail className="w-4 h-4 text-gray-300" /><span className="truncate">{p.email}</span></div>}
                                                {p.phone && <div className="flex items-center gap-3 text-xs font-bold text-gray-500"><Phone className="w-4 h-4 text-gray-300" />{p.phone}</div>}
                                            </div>
                                            {!isSelectionMode && p.status === 'archived' && (
                                                <div className="absolute bottom-4 right-4">
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            const cvCount = myResumes.filter(r => r.participantId === p.id).length;
                                                            const confirmMessage = `⚠️ RADERA ${p.firstName} ${p.lastName} PERMANENT?\n\nDetta kommer att radera:\n• Deltagaren\n• ${cvCount} CV${cvCount === 1 ? '' : ':n'}\n• All persondata\n\nDenna åtgärd kan INTE ångras!\n\nÄr du säker?`;

                                                            if (confirm(confirmMessage)) {
                                                                const cvs = myResumes.filter(r => r.participantId === p.id);
                                                                for (const cv of cvs) {
                                                                    await onDelete?.(cv.id);
                                                                }
                                                                await onDeleteParticipant?.(p.id);
                                                            }
                                                        }}
                                                        className="p-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40 shadow-sm border border-red-200 dark:border-red-800 transition-all"
                                                        title="Radera permanent"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            )}
                                            {!isSelectionMode && (
                                                <div className="absolute top-4 right-4">
                                                    <button
                                                        onClick={(e) => handleToggleParticipantStatus(e, p)}
                                                        className="p-2.5 bg-gray-50 dark:bg-gray-700 rounded-xl text-gray-400 hover:text-brand-400 shadow-sm border border-gray-100 dark:border-gray-600"
                                                        title={p.status === 'active' ? 'Arkivera' : 'Återställ'}
                                                    >
                                                        {p.status === 'active' ? <Archive className="w-5 h-5" /> : <RotateCcw className="w-5 h-5" />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {viewMode === 'list' && (
                            <div className="bg-white dark:bg-gray-800 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        <tr>
                                            {isSelectionMode && participantStatusFilter === 'archived' && <th className="px-4 py-6 w-12"></th>}
                                            <th className="px-8 py-6 w-20"></th>
                                            <th className="px-6 py-6">{t('name')}</th>
                                            <th className="px-6 py-6">{t('contact') || 'Kontakt'}</th>
                                            <th className="px-6 py-6">{t('status')}</th>
                                            <th className="px-6 py-6 text-right">{t('actions')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                        {filteredParticipants.map(p => {
                                            const photo = getParticipantPhoto(p.id);
                                            const count = myResumes.filter(r => r.participantId === p.id).length;
                                            return (
                                                <tr
                                                    key={p.id}
                                                    onClick={() => {
                                                        if (!isSelectionMode) {
                                                            onSelectParticipant(p.id);
                                                        }
                                                    }}
                                                    className={`group hover:bg-brand-50/30 dark:hover:bg-gray-700/30 cursor-pointer transition-colors ${selectedParticipants.includes(p.id) ? 'bg-brand-50/50 dark:bg-brand-900/20' : ''
                                                        }`}
                                                >
                                                    {isSelectionMode && participantStatusFilter === 'archived' && (
                                                        <td className="px-4 py-4">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedParticipants.includes(p.id)}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedParticipants(prev =>
                                                                        prev.includes(p.id)
                                                                            ? prev.filter(id => id !== p.id)
                                                                            : [...prev, p.id]
                                                                    );
                                                                }}
                                                                className="w-4 h-4 text-brand-400 border-gray-300 rounded focus:ring-brand-400 cursor-pointer"
                                                            />
                                                        </td>
                                                    )}
                                                    <td className="px-8 py-4">
                                                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center font-black text-lg text-brand-400 overflow-hidden">
                                                            {photo ? <img src={photo} className="w-full h-full object-cover" /> : p.firstName[0]}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-gray-900 dark:text-gray-100">{p.firstName} {p.lastName}</div>
                                                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{count} {t('pieces') || 'Dokument'}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-xs text-gray-500 font-medium space-y-1">
                                                            {p.email && <div className="flex items-center gap-2"><Mail className="w-3 h-3" /> {p.email}</div>}
                                                            {p.phone && <div className="flex items-center gap-2"><Phone className="w-3 h-3" /> {p.phone}</div>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${p.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                                            {p.status === 'active' ? t('active') : t('archive')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {!isSelectionMode && p.status === 'archived' && (
                                                                <button
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        const cvCount = myResumes.filter(r => r.participantId === p.id).length;
                                                                        const confirmMessage = `⚠️ RADERA ${p.firstName} ${p.lastName} PERMANENT?\n\nDetta kommer att radera:\n• Deltagaren\n• ${cvCount} CV${cvCount === 1 ? '' : ':n'}\n• All persondata\n\nDenna åtgärd kan INTE ångras!\n\nÄr du säker?`;

                                                                        if (confirm(confirmMessage)) {
                                                                            const cvs = myResumes.filter(r => r.participantId === p.id);
                                                                            for (const cv of cvs) {
                                                                                await onDelete?.(cv.id);
                                                                            }
                                                                            await onDeleteParticipant?.(p.id);
                                                                        }
                                                                    }}
                                                                    className="p-2 text-red-500 hover:text-red-600 transition-colors"
                                                                    title="Radera permanent"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                            {!isSelectionMode && (
                                                                <button
                                                                    onClick={(e) => handleToggleParticipantStatus(e, p)}
                                                                    className="p-2 text-gray-400 hover:text-brand-400 transition-colors"
                                                                    title={p.status === 'active' ? 'Arkivera' : 'Återställ'}
                                                                >
                                                                    {p.status === 'active' ? <Archive className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in">
                        <h2 className="text-5xl font-black tracking-tight">Alla Dokument</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                            {participantResumes.map(r => (
                                <div key={r.id} onClick={() => onEdit(r)} className="bg-white dark:bg-gray-800 p-8 rounded-[3rem] border border-white dark:border-gray-700 shadow-xl cursor-pointer group hover:scale-[1.03] transition-all">
                                    <div className="aspect-[210/297] bg-gray-50 rounded-[2rem] mb-8 overflow-hidden relative border border-gray-100 flex items-center justify-center shadow-inner">
                                        <div className="scale-[0.35] origin-center w-[794px] h-[1123px] shrink-0 pointer-events-none">
                                            <CvPreview data={r} template={r.template || 'classic-sidebar'} />
                                        </div>
                                    </div>
                                    <h3 className="font-black text-gray-900 dark:text-white text-xl truncate group-hover:text-brand-400">{r.title}</h3>
                                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Deltagare: {myParticipants.find(p => p.id === r.participantId)?.firstName || 'Okänd'}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Bulk Delete Action Bar */}
            {selectedParticipants.length > 0 && participantStatusFilter === 'archived' && (
                <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 shadow-2xl z-50 animate-in slide-in-from-bottom">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <CheckSquare className="w-6 h-6 text-brand-400" />
                            <span className="font-black text-lg text-gray-900 dark:text-white">
                                {selectedParticipants.length} deltagare {selectedParticipants.length === 1 ? 'vald' : 'valda'}
                            </span>
                            <span className="text-sm text-gray-500">
                                ({myResumes.filter(r => selectedParticipants.includes(r.participantId)).length} CV:n)
                            </span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSelectedParticipants([])}
                                className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                            >
                                Avmarkera alla
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                className="px-8 py-3 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:bg-red-600 transition-all flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Radera valda permanent
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPhotoModal && (
                <ImageCropModal
                    isOpen={showPhotoModal}
                    onClose={() => setShowPhotoModal(false)}
                    onSave={handleProfilePhotoSave}
                    initialImage={userProfile.photoUrl}
                    aspectRatio={1}
                />
            )}
            
            <AIImportModal
                isOpen={isAIImportModalOpen}
                onClose={() => setIsAIImportModalOpen(false)}
                onImport={handleAIImport}
            />

            {/* Hidden PDF export target */}
            <div id="cv-export-target" className="fixed -left-[9999px] top-0 pointer-events-none">
                {exportingDoc && (
                    <div id="cv-export-target-inner" style={{ width: '210mm' }}>
                        <CvPreview
                            data={exportingDoc.resume}
                            template={exportingDoc.resume.template || 'classic-sidebar'}
                            brevId={exportingDoc.brevId}
                        />
                    </div>
                )}
            </div>

            {showMassImportModal && (
                <div
                    className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-xl flex items-center justify-center p-8 overflow-y-auto"
                    onClick={(e) => {
                        // Close if clicking on backdrop
                        if (e.target === e.currentTarget) {
                            setShowMassImportModal(false);
                        }
                    }}
                >
                    <div className="bg-white dark:bg-gray-900 w-full max-w-5xl rounded-[3rem] shadow-2xl relative">
                        <button
                            onClick={() => setShowMassImportModal(false)}
                            className="fixed top-8 right-8 p-3 bg-red-500 hover:bg-red-600 text-white rounded-full transition-all z-[250] shadow-xl hover:scale-110"
                            title="Stäng (import fortsätter i bakgrunden)"
                        >
                            <X className="w-6 h-6" />
                        </button>
                        <div className="p-10">
                            <LegacyImport
                                apiKey={systemSettings.geminiApiKey}
                                geminiModel={systemSettings.geminiModel}
                                importMappingPrompt={systemSettings.importMappingPrompt}
                                existingResumes={resumes}
                                coachId={userProfile.uid}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
