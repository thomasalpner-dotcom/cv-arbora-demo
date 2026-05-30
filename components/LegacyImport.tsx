import { useTranslation } from '../utils/translations';
import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Sparkles, X, Database, AlertTriangle } from 'lucide-react';
import { ImportService } from '../services/ImportService';
import { db, storage } from '../firebase';
import { ResumeData, Participant } from '../types';

interface ProcessedFile {
    id: string;
    file: File;
    status: 'waiting' | 'reading' | 'uploading' | 'analyzing' | 'done' | 'error' | 'duplicate';
    progress: number;
    error?: string;
    warning?: string;
    result?: Partial<ResumeData>;
}

export const LegacyImport: React.FC<{
    apiKey?: string,
    geminiModel?: string,
    importMappingPrompt?: string,
    existingResumes?: ResumeData[],
    coachId?: string
}> = ({ apiKey, geminiModel, importMappingPrompt, existingResumes = [], coachId = 'system-import' }) => {
    const { t } = useTranslation();
    const [files, setFiles] = useState<ProcessedFile[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const droppedFiles = Array.from(e.dataTransfer.files) as File[];
        handleFiles(droppedFiles);
    }, [existingResumes]);

    const handleFiles = (incomingFiles: File[]) => {
        const validFiles = incomingFiles.filter(f => {
            const ext = f.name.split('.').pop()?.toLowerCase();
            return ['pdf', 'docx', 'txt'].includes(ext || '');
        });

        const newFiles: ProcessedFile[] = validFiles.map(f => {
            // Check for duplicate filename
            const isFilenameDuplicate = existingResumes.some(r => r.sourceFile === f.name);

            return {
                id: Math.random().toString(36).substr(2, 9),
                file: f,
                status: isFilenameDuplicate ? 'duplicate' : 'waiting',
                progress: 0,
                warning: isFilenameDuplicate ? 'Filen finns redan i databasen' : undefined
            };
        });

        setFiles(prev => [...prev, ...newFiles]);
    };

    // Support for Paste (Ctrl+V) from Windows Explorer
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            if (e.clipboardData && e.clipboardData.files.length > 0) {
                const pastedFiles = Array.from(e.clipboardData.files) as File[];
                handleFiles(pastedFiles);
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [existingResumes]);

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const normalizeString = (s?: string) => s?.trim().toLowerCase() || '';
    const normalizePhone = (s?: string) => s?.replace(/[^0-9+]/g, '') || '';

    const processFile = async (fileItem: ProcessedFile) => {
        console.log(`[Import] Starting: ${fileItem.file.name}`);
        try {
            // 1. Reading
            updateFileStatus(fileItem.id, { status: 'reading', progress: 10 });
            const text = await ImportService.extractText(fileItem.file);
            console.log(`[Import] Text extracted (${text.length} chars)`);

            // 2. Uploading (with real progress)
            updateFileStatus(fileItem.id, { status: 'uploading', progress: 30 });
            const storageRef = storage.ref(`legacy_cvs/${Date.now()}_${fileItem.file.name}`);

            const uploadTask = storageRef.put(fileItem.file);

            await new Promise<void>((resolve, reject) => {
                uploadTask.on('state_changed',
                    (snapshot) => {
                        const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 30; // Scale 0-100 to 30-60
                        updateFileStatus(fileItem.id, { progress: 30 + percent });
                    },
                    (error) => reject(error),
                    () => resolve()
                );
            });

            const fileUrl = await storageRef.getDownloadURL();
            console.log(`[Import] Upload complete: ${fileUrl}`);

            // 3. Analyzing
            updateFileStatus(fileItem.id, { status: 'analyzing', progress: 60 });
            console.log(`[Import] Starting AI analysis with ${geminiModel}...`);
            const mappedData = await ImportService.mapTextToResume(text, apiKey || '', geminiModel, importMappingPrompt);
            console.log(`[Import] AI Analysis complete for ${mappedData.personal?.firstName}`);

            // ADVANCED DUPLICATE CHECK
            let duplicateWarning = undefined;
            const newEmail = normalizeString(mappedData.personal?.email);
            const newPhone = normalizePhone(mappedData.personal?.phone);
            const newFirst = normalizeString(mappedData.personal?.firstName);
            const newLast = normalizeString(mappedData.personal?.lastName);
            const newCity = normalizeString(mappedData.personal?.city);
            // Get most recent company safely
            const newCompany = mappedData.experience && mappedData.experience.length > 0 ? normalizeString(mappedData.experience[0].company) : '';

            for (const existing of existingResumes) {
                const exEmail = normalizeString(existing.personal?.email);
                const exPhone = normalizePhone(existing.personal?.phone);
                const exFirst = normalizeString(existing.personal?.firstName);
                const exLast = normalizeString(existing.personal?.lastName);
                const exCity = normalizeString(existing.personal?.city);
                const exCompany = existing.experience && existing.experience.length > 0 ? normalizeString(existing.experience[0].company) : '';

                // 1. Email Match (Strongest)
                if (newEmail && exEmail && newEmail === exEmail) {
                    duplicateWarning = `E-post (${mappedData.personal.email}) finns redan registrerad på ${existing.personal?.firstName} ${existing.personal?.lastName}.`;
                    break;
                }

                // 2. Phone Match (Strong)
                if (newPhone && exPhone && newPhone.length > 5 && newPhone === exPhone) {
                    duplicateWarning = `Telefonnummer (${mappedData.personal.phone}) finns redan.`;
                    break;
                }

                // 3. Name + (City OR Company) Match
                if (newFirst && newLast && newFirst === exFirst && newLast === exLast) {
                    if (newCity && exCity && newCity === exCity) {
                        duplicateWarning = `Namn och Ort (${mappedData.personal.city}) matchar befintlig deltagare.`;
                        break;
                    }
                    if (newCompany && exCompany && newCompany === exCompany) {
                        duplicateWarning = `Namn och senaste arbetsgivare (${mappedData.experience?.[0].company}) matchar.`;
                        break;
                    }
                }
            }

            // 4. Persistence
            const partRef = db.collection('participants').doc();
            const participant: Participant = {
                id: partRef.id,
                firstName: mappedData.personal?.firstName || "Okänt",
                lastName: mappedData.personal?.lastName || "Namn",
                status: 'active',
                lastActivity: new Date().toISOString(),
                createdBy: coachId,
                isLegacy: true
            };
            await partRef.set(participant);

            const resRef = db.collection('resumes').doc();
            const resume: ResumeData = {
                ...mappedData as ResumeData,
                id: resRef.id,
                participantId: partRef.id,
                title: `Importerat: ${fileItem.file.name}`,
                createdBy: coachId,
                lastEdited: new Date().toISOString(),
                isLegacy: true,
                sourceFile: fileItem.file.name,
                fileUrl: fileUrl
            };
            await resRef.set(resume);

            updateFileStatus(fileItem.id, {
                status: 'done',
                progress: 100,
                result: mappedData,
                warning: duplicateWarning
            });

        } catch (err: any) {
            console.error(`Error processing ${fileItem.file.name}:`, err);
            updateFileStatus(fileItem.id, { status: 'error', error: err.message });
        }
    };

    const processFiles = async () => {
        if (!apiKey) {
            alert("API-nyckel saknas. Gå till inställningar.");
            return;
        }

        setIsProcessing(true);
        // We process 'waiting' files AND 'duplicate' files (if user forces it by clicking start)
        const pendingFiles = files.filter(f => (f.status === 'waiting' || f.status === 'duplicate') && f.status !== 'done' && f.status !== 'error');

        // Parallel processing with concurrency limit (e.g., 3 at a time)
        const CONCURRENCY = 3;
        const queue = [...pendingFiles];

        const workers = Array(CONCURRENCY).fill(null).map(async () => {
            while (queue.length > 0) {
                const nextFile = queue.shift();
                if (nextFile) {
                    await processFile(nextFile);
                }
            }
        });

        await Promise.all(workers);
        setIsProcessing(false);
    };

    const updateFileStatus = (id: string, updates: Partial<ProcessedFile>) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-indigo-500/5 border border-indigo-500/10 p-10 rounded-[3rem]">
                <div className="max-w-2xl">
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t("mass_import_archive", "Mass-importera Arkiv")}</h2>
                    <p className="text-sm text-slate-500 font-medium mt-2 leading-relaxed">
                        {t("drag_pdf_word_info", "Dra in PDF- eller Word-filer här för att göra dem sökbara i Savå AI. ")}
                        
                    </p>
                </div>

                <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                    onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
                    onDrop={onDrop}
                    className={`mt-10 border-4 border-dashed rounded-[2.5rem] p-16 text-center transition-all group flex flex-col items-center gap-4 cursor-pointer relative ${isDragging
                        ? 'border-indigo-500 bg-indigo-500/10'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-white dark:hover:bg-slate-800/50'
                        }`}
                >
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-transform ${isDragging ? 'bg-indigo-500 text-white scale-110' : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 group-hover:scale-110'
                        }`}>
                        <Upload className="w-10 h-10" />
                    </div>
                    <div>
                        <p className="text-lg font-black text-slate-900 dark:text-white">
                            {isDragging ? t("drop_files_now", "Släpp filerna nu!") : t("drag_drop_files", "Dra och släpp filer här eller Ctrl+V")}
                        </p>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 mb-4">{t("supports_formats", "Stöder .pdf, .docx och .txt")}</p>
                        <button className="px-6 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all">
                            Välj från datorn
                        </button>
                    </div>
                    <input
                        type="file"
                        multiple
                        accept=".pdf,.docx,.txt"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={(e) => {
                            const selectedFiles = Array.from(e.target.files || []) as File[];
                            handleFiles(selectedFiles);
                        }}
                    />
                </div>
            </div>

            {files.length > 0 && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-none">
                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Database className="w-6 h-6 text-indigo-500" />
                            <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">{t("files_in_queue", "Filer i kö")} ({files.length})</h3>
                        </div>
                        <button
                            onClick={processFiles}
                            disabled={isProcessing || files.every(f => f.status === 'done' || f.status === 'error')}
                            className="px-8 py-3 bg-indigo-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-2"
                        >
                            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {t("start_mass_import", "Starta Import")}
                        </button>
                    </div>

                    <div className="max-h-[500px] overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {files.map((f) => (
                            <div key={f.id} className={`p-5 rounded-2xl border flex items-center justify-between group ${f.warning
                                ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
                                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800'
                                }`}>
                                <div className="flex items-center gap-5 flex-1 mr-8">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${f.status === 'done' ? 'bg-emerald-500/10 text-emerald-500' :
                                        f.status === 'error' ? 'bg-red-500/10 text-red-500' :
                                            f.warning ? 'bg-amber-500/10 text-amber-500' :
                                                'bg-white dark:bg-slate-800 text-slate-400'
                                        }`}>
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{f.file.name}</span>
                                            {f.status === 'done' && !f.warning && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                            {f.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                                            {f.warning && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                                        </div>
                                        <div className="mt-1.5 h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${f.status === 'error' ? 'bg-red-500' : f.warning ? 'bg-amber-500' : 'bg-indigo-500'}`}
                                                style={{ width: `${f.progress}%` }}
                                            />
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-widest mt-2">
                                            {f.status === 'waiting' && <span className="text-slate-400">{t("status_waiting", "Väntar...")}</span>}
                                            {f.status === 'duplicate' && <span className="text-amber-500">{t("status_duplicate_filename", "Filnamn finns redan (Klicka start för att tvinga)")}</span>}
                                            {f.status === 'reading' && <span className="text-indigo-500">{t("status_reading_file", "Läser fil...")}</span>}
                                            {f.status === 'uploading' && <span className="text-indigo-500">{t("status_uploading", "Laddar upp till molnet...")}</span>}
                                            {f.status === 'analyzing' && <span className="text-indigo-500">{t("status_analyzing", "Savå AI analyserar...")}</span>}
                                            {f.status === 'done' && (
                                                f.warning ? <span className="text-amber-600 font-bold">{f.warning}</span> :
                                                    <span className="text-emerald-500">{t("status_done", "Klar!")} {f.result?.personal?.firstName} {f.result?.personal?.lastName}</span>
                                            )}
                                            {f.status === 'error' && <span className="text-red-500">{f.error}</span>}
                                        </p>
                                    </div>
                                </div>
                                {!isProcessing && f.status !== 'done' && (
                                    <button onClick={() => removeFile(f.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
