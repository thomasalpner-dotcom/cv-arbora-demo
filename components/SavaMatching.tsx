import React, { useState, useEffect } from 'react';
import { Search, Sparkles, User, FileText, Loader2, X, Brain, Settings, PlusCircle, Trash2, Archive, Clock, CheckCircle2, Download, ArrowLeft, Database, Copy } from 'lucide-react';
import { UserProfile, ResumeData, Participant } from '../types';
import { SavaService } from '../services/SavaService';
import { useTranslation } from '../utils/translations';

interface Props {
    userProfile: UserProfile;
    allResumes: ResumeData[];
    allParticipants: Participant[];
    allUsers: UserProfile[];
    onBack: () => void;
    onViewResume: (resume: ResumeData) => void;
    apiKey: string;
    geminiModel: string;
    matchingPrompt?: string;
    isDarkMode: boolean;
    savaName?: string;
    savaAvatarUrl?: string;
}

interface MatchResult {
    resumeId: string;
    score: number;
    reason: string;
}

type EnrichedMatch = MatchResult & {
    resume: ResumeData;
    participant?: Participant;
    coachName?: string;
};

export const SavaMatching: React.FC<Props> = ({
    userProfile,
    allResumes,
    allParticipants,
    allUsers,
    onBack,
    onViewResume,
    apiKey,
    geminiModel,
    matchingPrompt,
    isDarkMode,
    savaName = 'Savå',
    savaAvatarUrl
}) => {
    const { t, currentLanguage } = useTranslation();
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<EnrichedMatch[]>([]);
    const [shortlist, setShortlist] = useState<EnrichedMatch[]>([]);
    const [showShortlist, setShowShortlist] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        try {
            const result = await SavaService.searchCandidates(query, allResumes, apiKey, geminiModel, matchingPrompt, savaName, currentLanguage);

            if (result && result.matches) {
                const enrichedResults = result.matches
                    .map((m: any) => {
                        const resume = allResumes.find(r => r.id === m.resumeId);
                        if (!resume) return null;

                        // Local keyword boost: If a query word is found in jobTitle or skills, 
                        // ensure score is at least 60 if it was lower
                        const queryLower = (query || '').toLowerCase();
                        const resumeTitle = (resume.personal?.jobTitle || '').toLowerCase();
                        const resumeSkills = (Array.isArray(resume.skills) ? resume.skills : []).map(s => (s?.name || '').toLowerCase()).join(' ');
                        const resumeExp = (Array.isArray(resume.experience) ? resume.experience : []).map(e => (e?.role || '').toLowerCase()).join(' ');

                        let finalScore = m.score;
                        const hasKeyword = queryLower.split(' ').some(word =>
                            word.length > 3 && (resumeTitle.includes(word) || resumeSkills.includes(word) || resumeExp.includes(word))
                        );

                        if (hasKeyword && finalScore < 60) {
                            finalScore = 60; // Boost to clearly visible
                        }

                        if (finalScore < 30) return null; // Still filter out very low matches

                        const coach = allUsers.find(u => u.uid === resume.createdBy);

                        return {
                            ...m,
                            score: finalScore,
                            resume,
                            participant: allParticipants.find(p => p.id === resume.participantId),
                            coachName: coach?.displayName || (currentLanguage === 'en' ? 'Unknown coach' : 'Okänd coach')
                        };
                    }).filter(Boolean) as EnrichedMatch[];

                // Sort results by score (highest match first)
                enrichedResults.sort((a, b) => b.score - a.score);

                setResults(enrichedResults);
            }
        } catch (error: any) {
            console.error("Search failed:", error);
            const errorMessage = error?.message || t('unknown_error');
            alert(`Sökningen misslyckades: ${errorMessage}\n\nModell: gemini-2.0-flash\n\nKontrollera din API-nyckel i admin-inställningarna om problemet kvarstår.`);
        } finally {
            setIsSearching(false);
        }
    };

    const toggleShortlist = (match: EnrichedMatch) => {
        setShortlist(prev => {
            const exists = prev.find(item => item.resumeId === match.resumeId);
            if (exists) {
                return prev.filter(item => item.resumeId !== match.resumeId);
            }
            return [...prev, match];
        });
        if (!showShortlist) setShowShortlist(true);
    };

    const handleExportReport = () => {
        if (shortlist.length === 0) return;

        const report = shortlist.map(item => {
            return `KONTAKT: ${item.resume.personal.firstName} ${item.resume.personal.lastName} (${item.resume.personal.jobTitle})\n` +
                `MATCHNINGSPOÄNG: ${item.score}%\n` +
                `MOTIVERING: ${item.reason}\n` +
                `ANSVARIG COACH: ${item.coachName}\n` +
                `-------------------------------------------`;
        }).join('\n\n');

        const header = `MATCHNINGSRAPPORT - SAVÅ AI\nSÖKNING: "${query}"\nDATUM: ${new Date().toLocaleDateString()}\n\n`;

        navigator.clipboard.writeText(header + report);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleDownloadOriginal = async (url: string, firstName: string, lastName: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            
            // Bygg ett säkert filnamn med .pdf extension
            const safeName = `${firstName}_${lastName}_Original.pdf`.replace(/[<>:"/\\|?*]/g, '_');
            link.download = safeName;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error("Download failed:", error);
            // Fallback till vanlig länk om fetch misslyckas (t.ex. CORS)
            window.open(url, '_blank');
        }
    };

    const handleDownloadReport = () => {
        if (shortlist.length === 0) return;

        const report = shortlist.map(item => {
            return `KONTAKT: ${item.resume.personal.firstName} ${item.resume.personal.lastName} (${item.resume.personal.jobTitle})\n` +
                `MATCHNINGSPOÄNG: ${item.score}%\n` +
                `MOTIVERING: ${item.reason}\n` +
                `ANSVARIG COACH: ${item.coachName}\n` +
                `-------------------------------------------`;
        }).join('\n\n');

        const header = `MATCHNINGSRAPPORT - SAVÅ AI\nSÖKNING: "${query}"\nDATUM: ${new Date().toLocaleDateString()}\n\n`;
        const fullContent = header + report;

        const blob = new Blob([fullContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Matchningsrapport_Sava_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-950 flex flex-col overflow-hidden">
            {/* Header */}
            <header className="border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl px-12 py-6 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <button onClick={onBack} className="p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-2xl transition-all text-slate-500 dark:text-slate-400">
                        <X className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight flex items-center gap-3 text-slate-900 dark:text-white">
                            {savaAvatarUrl ? (
                                <img src={savaAvatarUrl} className="w-8 h-8 rounded-lg object-cover" alt={savaName} />
                            ) : (
                                <Brain className="w-8 h-8 text-brand-400" />
                            )}
                            {savaName} <span className="text-brand-400">{t('ai_matching')}</span>
                        </h1>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{t('smart_candidate_search')}</p>
                    </div>
                </div>

                {shortlist.length > 0 && (
                    <button
                        onClick={() => setShowShortlist(!showShortlist)}
                        className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg ${showShortlist ? 'bg-brand-500 text-white shadow-brand-400/20' : 'bg-white dark:bg-slate-800 text-brand-500 border border-brand-100 dark:border-slate-800'}`}
                    >
                        <PlusCircle className={`w-4 h-4 transition-transform ${showShortlist ? 'rotate-45' : ''}`} />
                        {t('shortlist')} ({shortlist.length})
                    </button>
                )}
            </header>

            <div className="flex flex-1 relative overflow-hidden">
                <main className={`flex-1 overflow-y-auto transition-all duration-500 ${showShortlist ? 'mr-[450px]' : ''}`}>
                    <div className="max-w-4xl mx-auto w-full p-12 space-y-12">
                        {/* Search Section */}
                        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 rounded-[3rem] shadow-sm">
                            <form onSubmit={handleSearch} className="space-y-6">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-brand-400 uppercase tracking-[0.2em] ml-2">{t('what_employer_looking_for')}</label>
                                    <div className="relative group">
                                        <textarea
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    if (query.trim() && !isSearching) {
                                                        const form = e.currentTarget.form;
                                                        if (form) form.requestSubmit();
                                                    }
                                                }
                                            }}
                                            placeholder={t('search_placeholder')}
                                            className="w-full h-32 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-3xl p-8 text-lg font-bold outline-none focus:border-brand-400 dark:focus:border-brand-400 transition-all resize-none shadow-sm group-hover:shadow-md dark:text-white"
                                        />
                                        <div className="absolute bottom-6 right-8 text-slate-300 group-focus-within:text-brand-400 transition-colors">
                                            <Brain className="w-8 h-8 opacity-20" />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSearching || !query.trim()}
                                    className="w-full py-6 bg-brand-500 text-white font-black uppercase tracking-widest text-xs rounded-3xl shadow-xl shadow-brand-400/20 flex items-center justify-center gap-3 hover:opacity-90 transition-all disabled:opacity-50 active:scale-[0.98]"
                                >
                                    {isSearching ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            {t('analyze_resumes').replace('{savaName}', savaName)}
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            {t('find_candidates_ai').replace('{savaName}', savaName)}
                                        </>
                                    )}
                                </button>
                            </form>
                        </section>

                        {/* API Key Warning */}
                        {!apiKey && (
                            <div className="bg-amber-500/10 border border-amber-500/20 p-8 rounded-[2rem] flex items-center gap-6 animate-pulse">
                                <div className="w-12 h-12 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <Settings className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">{t('api_key_missing')}</h4>
                                    <p className="text-xs font-bold text-amber-500 dark:text-amber-400/80 mt-1">{t('api_key_missing_desc')}</p>
                                </div>
                            </div>
                        )}

                        {/* Results Section */}
                        {results.length > 0 && (
                            <section className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
                                <div className="flex items-center justify-between px-4">
                                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        {t('found_matching_candidates').replace('{count}', results.length.toString())}
                                    </h2>
                                </div>

                                <div className="grid gap-6">
                                    {results.map((res, i) => {
                                        const isInShortlist = shortlist.some(item => item.resumeId === res.resumeId);
                                        return (
                                            <div
                                                key={res.resumeId}
                                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2.5rem] flex flex-col gap-6 group hover:border-brand-400/50 transition-all shadow-sm hover:shadow-xl"
                                                style={{ animationDelay: `${i * 100}ms` }}
                                            >
                                                <div className="flex items-start gap-8 flex-1">
                                                    <div className="relative shrink-0">
                                                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center font-black text-3xl text-slate-400 overflow-hidden border border-slate-100 dark:border-slate-700">
                                                            {res.participant?.photoUrl ? (
                                                                <img src={res.participant.photoUrl} className="w-full h-full object-cover" />
                                                            ) : (
                                                                res.resume.personal.firstName[0]
                                                            )}
                                                        </div>
                                                        <div className={`absolute -top-3 -right-3 text-white text-[12px] font-black w-10 h-10 flex items-center justify-center rounded-2xl shadow-lg border-4 border-white dark:border-slate-900 ${res.score >= 90 ? 'bg-green-600 border-green-500/20' :
                                                            res.score >= 70 ? 'bg-amber-500 border-amber-400/20' :
                                                                res.score >= 50 ? 'bg-slate-500 border-slate-400/20' :
                                                                    'bg-brand-500'
                                                            }`}>
                                                            {res.score}%
                                                        </div>
                                                    </div>

                                                    <div className="flex-1 space-y-4">
                                                        <div className="flex items-start justify-between">
                                                            <div>
                                                                <div className="flex items-center gap-3">
                                                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                                                                        {res.resume.personal.firstName} {res.resume.personal.lastName}
                                                                    </h3>
                                                                    {res.resume.isLegacy && (
                                                                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[8px] font-black uppercase tracking-widest rounded flex items-center gap-1">
                                                                            <Database className="w-3 h-3" /> {t('archive_find')}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm font-bold text-brand-500 dark:text-brand-400 uppercase tracking-widest mt-1">{res.resume.personal.jobTitle}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                                    {res.resume.isLegacy ? (
                                                                        <><FileText className="w-3 h-3" /> {t('source')}: {res.resume.sourceFile || "Bulk-import"}</>
                                                                    ) : (
                                                                        <><User className="w-3 h-3" /> {t('coach')}: {res.coachName}</>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                                                    <Clock className="w-3 h-3" /> {t('updated')}: {res.resume.lastEdited ? new Date(res.resume.lastEdited).toLocaleDateString() : 'Nyss'}
                                                                </div>
                                                                <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest mt-1 ${res.participant?.status === 'archived' ? 'text-amber-500' : 'text-green-500'}`}>
                                                                    {res.participant?.status === 'archived' ? (
                                                                        <><Archive className="w-3 h-3" /> {t('archived')}</>
                                                                    ) : (
                                                                        <><CheckCircle2 className="w-3 h-3" /> {t('active')}</>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                            {savaAvatarUrl ? (
                                                                <img src={savaAvatarUrl} className="w-4 h-4 inline-block mr-2 rounded-sm" />
                                                            ) : (
                                                                <Sparkles className="w-4 h-4 inline-block mr-2 text-brand-400" />
                                                            )}
                                                            "{res.reason}"
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                    <button
                                                        onClick={() => onViewResume(res.resume)}
                                                        className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                                                    >
                                                        <FileText className="w-3 h-3" /> {res.resume.isLegacy ? t('review_document') : t('view_cv')}
                                                    </button>
                                                    {res.resume.fileUrl && (
                                                        <button
                                                            onClick={() => handleDownloadOriginal(res.resume.fileUrl!, res.resume.personal.firstName, res.resume.personal.lastName)}
                                                            className="px-6 py-3 bg-indigo-500 text-white hover:bg-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                                                        >
                                                            <Download className="w-3 h-3" /> {t('download_original')}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => toggleShortlist(res)}
                                                        className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm ${isInShortlist
                                                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                                            : 'bg-brand-500 text-white hover:opacity-90 shadow-brand-400/20'
                                                            }`}
                                                    >
                                                        {isInShortlist ? (
                                                            <> <Trash2 className="w-3 h-3" /> {t('remove_from_selection')} </>
                                                        ) : (
                                                            <> <PlusCircle className="w-3 h-3" /> {t('choose_for_selection')} </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Empty State */}
                        {!isSearching && results.length === 0 && query && (
                            <div className="p-20 text-center flex flex-col items-center gap-4">
                                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300">
                                    <Search className="w-10 h-10" />
                                </div>
                                <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400 italic">{t('no_candidates_found').replace('{savaName}', savaName)}</h3>
                                <p className="text-xs text-slate-400 max-w-xs font-medium">{t('try_changing_query')}</p>
                            </div>
                        )}

                        {!query && !results.length && !isSearching && (
                            <div className="p-20 text-center flex flex-col items-center gap-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem]">
                                <div className="w-24 h-24 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center text-brand-400">
                                    <Brain className="w-12 h-12" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('welcome_to_ai').replace('{savaName}', savaName)}</h3>
                                    <p className="text-sm text-slate-500 font-medium max-w-md mx-auto">{t('describe_requirements').replace('{savaName}', savaName)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </main>

                {/* Shortlist Sidebar */}
                <aside className={`fixed top-[100px] right-0 bottom-0 w-[450px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 transition-transform duration-500 shadow-2xl z-40 flex flex-col ${showShortlist ? 'translate-x-0' : 'translate-x-full'}`}>
                    <div className="p-10 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{t('shortlist')}</h2>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{t('candidates_for_report')}</p>
                        </div>
                        <button onClick={() => setShowShortlist(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl text-slate-400">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                        {shortlist.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center gap-4 text-center opacity-40 grayscale">
                                <PlusCircle className="w-12 h-12 text-slate-300" />
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('no_candidates_selected')}</p>
                            </div>
                        ) : (
                            shortlist.map(item => (
                                <div key={item.resumeId} className="bg-slate-50 dark:bg-slate-800/40 p-6 rounded-3xl border border-slate-200 dark:border-slate-700/50 flex items-center gap-5 relative group">
                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center font-black text-lg text-slate-400 overflow-hidden shadow-sm">
                                        {item.participant?.photoUrl ? <img src={item.participant.photoUrl} className="w-full h-full object-cover" /> : item.resume.personal.firstName[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">{item.resume.personal.firstName} {item.resume.personal.lastName}</h4>
                                        <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">{item.resume.personal.jobTitle}</p>
                                    </div>
                                    <button
                                        onClick={() => toggleShortlist(item)}
                                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-8 border-t border-slate-200 dark:border-slate-800 space-y-4 shrink-0 bg-slate-50/50 dark:bg-slate-800/20">
                        <button
                            onClick={handleExportReport}
                            disabled={shortlist.length === 0}
                            className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 transition-all shadow-xl ${copySuccess ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 'bg-brand-500 text-white shadow-brand-400/20 opacity-100 hover:opacity-90 active:scale-95 disabled:opacity-50'}`}
                        >
                            {copySuccess ? (
                                <> <CheckCircle2 className="w-4 h-4" /> {t('report_copied')} </>
                            ) : (
                                <> <Copy className="w-4 h-4" /> {t('copy_matching_report')} </>
                            )}
                        </button>

                        <button
                            onClick={handleDownloadReport}
                            disabled={shortlist.length === 0}
                            className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            <Download className="w-4 h-4" /> {t('download_report')}
                        </button>
                    </div>
                </aside>
            </div >
        </div >
    );
};
