import React, { useState } from 'react';
import { Search, AlertTriangle, CheckCircle2, Copy, Trash2, Loader2 } from 'lucide-react';
import { ResumeData } from '../types';
import { db, storage } from '../firebase';

interface DuplicateGroup {
    main: ResumeData;
    duplicates: ResumeData[];
    reason: string;
}

export const DuplicateScanner: React.FC<{ resumes: ResumeData[] }> = ({ resumes }) => {
    const [results, setResults] = useState<DuplicateGroup[] | null>(null);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const normalizeString = (s?: string) => s?.trim().toLowerCase() || '';
    const normalizePhone = (s?: string) => s?.replace(/[^0-9+]/g, '') || '';

    const runScan = () => {
        const groups: DuplicateGroup[] = [];
        const checkedIds = new Set<string>();

        // Sort resumes by created date (oldest first) to establish "original"
        // Assuming implicit order or check date? Resumes prop order might vary.
        // Let's assume the passed array is somewhat arbitrary, so relying on ID iteration is fair.
        // If we want to guarantee the "Main" is the oldest, we should sort first.
        const sortedResumes = [...resumes].sort((a, b) => {
            // Fallback to string comparison if dates are weird, but usually ISO strings work
            return (a.lastEdited || '').localeCompare(b.lastEdited || '');
        });
        // Actually, we probably want "Created Date", but we often only have lastEdited or lastActivity.
        // Let's stick to the input order for now.

        for (let i = 0; i < resumes.length; i++) {
            const current = resumes[i];
            if (checkedIds.has(current.id)) continue;

            const group: DuplicateGroup = {
                main: current,
                duplicates: [],
                reason: ''
            };

            const newEmail = normalizeString(current.personal?.email);
            const newPhone = normalizePhone(current.personal?.phone);
            const newFirst = normalizeString(current.personal?.firstName);
            const newLast = normalizeString(current.personal?.lastName);
            const newCity = normalizeString(current.personal?.city);
            // Safely get company - handle missing experience array
            const newCompany = current.experience && current.experience.length > 0 ? normalizeString(current.experience[0].company) : '';

            for (let j = i + 1; j < resumes.length; j++) {
                const other = resumes[j];
                if (checkedIds.has(other.id)) continue;

                const exEmail = normalizeString(other.personal?.email);
                const exPhone = normalizePhone(other.personal?.phone);
                const exFirst = normalizeString(other.personal?.firstName);
                const exLast = normalizeString(other.personal?.lastName);
                const exCity = normalizeString(other.personal?.city);
                const exCompany = other.experience && other.experience.length > 0 ? normalizeString(other.experience[0].company) : '';

                let isDupe = false;
                let reason = '';

                // 1. Email Match
                if (newEmail && exEmail && newEmail === exEmail) {
                    isDupe = true;
                    reason = 'Samma E-postadress';
                }
                // 2. Phone Match
                else if (newPhone && exPhone && newPhone.length > 5 && newPhone === exPhone) {
                    isDupe = true;
                    reason = 'Samma Telefonnummer';
                }
                // 3. Name + Context
                else if (newFirst && newLast && newFirst === exFirst && newLast === exLast) {
                    if (newCity && exCity && newCity === exCity) {
                        isDupe = true;
                        reason = 'Namn och Ort matchar';
                    }
                    else if (newCompany && exCompany && newCompany === exCompany) {
                        isDupe = true;
                        reason = 'Namn och Senaste Arbetsgivare matchar';
                    }
                }

                if (isDupe) {
                    group.duplicates.push(other);
                    group.reason = reason;
                    checkedIds.add(other.id);
                }
            }

            if (group.duplicates.length > 0) {
                groups.push(group);
                checkedIds.add(current.id); // Mark main as checked too
            }
        }

        setResults(groups);
    };

    const handleDelete = async (resume: ResumeData) => {
        if (!window.confirm(`Är du säker på att du vill radera ${resume.personal?.firstName} ${resume.personal?.lastName} (ID: ${resume.id}) permanent?`)) {
            return;
        }

        setIsDeleting(resume.id);
        try {
            console.log("Deleting resume:", resume.id);
            // 1. Delete Firestore Resume Document
            await db.collection('resumes').doc(resume.id).delete();

            // 2. Delete Firestore Participant Document (if we can infer it)
            if (resume.participantId) {
                await db.collection('participants').doc(resume.participantId).delete();
            }

            // 3. Delete from Storage (if file exists)
            if (resume.fileUrl) {
                try {
                    const fileRef = storage.refFromURL(resume.fileUrl);
                    await fileRef.delete();
                } catch (err) {
                    console.warn("Could not delete file from storage (might not exist or invalid URL):", err);
                }
            }

            // Update local state to remove the deleted item from view immediately
            setResults(prev => {
                if (!prev) return null;
                return prev.map(group => ({
                    ...group,
                    duplicates: group.duplicates.filter(d => d.id !== resume.id)
                })).filter(group => group.duplicates.length > 0); // Remove group if no duplicates left
            });

            console.log("Delete successful");
        } catch (error) {
            console.error("Error deleting duplicate:", error);
            alert("Kunde inte radera posten. Se konsol för detaljer.");
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Search className="w-5 h-5 text-indigo-500" />
                            Dubblettanalys av Databasen
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Söker igenom alla {resumes.length} CV:n efter dubbletter baserat på E-post, Telefon eller Namn+Kontext.
                        </p>
                    </div>
                    <button
                        onClick={runScan}
                        className="px-6 py-3 bg-slate-900 dark:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                    >
                        Starta Scanning
                    </button>
                </div>
            </div>

            {results && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">
                    {results.length === 0 ? (
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 p-8 rounded-[2rem] text-center">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                            <h4 className="text-lg font-black text-emerald-900 dark:text-emerald-100">Inga dubbletter hittades!</h4>
                            <p className="text-sm text-emerald-700 dark:text-emerald-300">Databasen ser ren och fin ut.</p>
                        </div>
                    ) : (
                        results.map((group, idx) => (
                            <div key={idx} className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-6 rounded-[2rem]">
                                <div className="flex items-center gap-3 mb-4">
                                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                                    <h4 className="font-black text-amber-900 dark:text-amber-100 uppercase tracking-widest text-xs">
                                        Misstänkt dublettgrupp ({group.reason})
                                    </h4>
                                </div>
                                <div className="space-y-3">
                                    {/* Main Record */}
                                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-amber-100 dark:border-slate-700 flex items-center justify-between opacity-75">
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white">
                                                {group.main.personal?.firstName} {group.main.personal?.lastName}
                                            </div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                                {group.main.title} • {new Date(group.main.lastEdited).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-[10px] font-bold uppercase text-slate-500">
                                            Original (Först i listan)
                                        </div>
                                    </div>

                                    {/* Duplicates */}
                                    {group.duplicates.map(dupe => (
                                        <div key={dupe.id} className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-xl border border-amber-100 dark:border-slate-700 flex items-center justify-between ml-8 relative hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                            <div className="absolute -left-6 top-1/2 w-4 h-[2px] bg-amber-200"></div>
                                            <div className="absolute -left-6 top-0 bottom-1/2 w-[2px] bg-amber-200 -mt-5"></div>

                                            <div>
                                                <div className="font-bold text-slate-900 dark:text-white">
                                                    {dupe.personal?.firstName} {dupe.personal?.lastName}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {dupe.title} • {new Date(dupe.lastEdited).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <a href={`/resume/${dupe.id}`} target="_blank" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 transition-colors" title="Öppna CV">
                                                    <Copy className="w-4 h-4" />
                                                </a>
                                                <button
                                                    onClick={() => handleDelete(dupe)}
                                                    disabled={isDeleting === dupe.id}
                                                    className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg transition-colors border border-red-100"
                                                    title="Radera denna dublett"
                                                >
                                                    {isDeleting === dupe.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
