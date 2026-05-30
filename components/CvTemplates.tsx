import { useTranslation } from "../utils/translations";
import React, { useState, useLayoutEffect, useRef } from 'react';
import { ResumeData, DesignSettings, MasterTemplateConfig, PhotoPosition, LANGUAGE_LEVELS } from '../types';
import { Mail, Phone, MapPin, Car, Calendar, User, Linkedin, Globe, Star, Info, Link as LinkIcon, ExternalLink, Image as ImageIcon, GripVertical } from 'lucide-react';

interface TemplateProps {
    data: ResumeData;
    fontClass: string;
    containerStyle: React.CSSProperties;
    design: DesignSettings;
    headerHelper: (key: string, defaultText: string) => string;
    isBrev?: boolean;
    brevContent?: string;
}

// --- UTILS ---
const formatShortDate = (dateStr: string) => {
    if (!dateStr) return "";

    // Handle ISO strings (e.g., 1991-08-01T00:00:00.000Z)
    if (dateStr.includes('T') || dateStr.includes('-')) {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            const months = ["jan", "feb", "mar", "apr", "maj", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];
            return `${months[date.getMonth()]} ${date.getFullYear()}`;
        }
    }

    const monthMap: Record<string, string> = {
        "Januari": "jan", "Februari": "feb", "Mars": "mar", "April": "apr",
        "Maj": "maj", "Juni": "jun", "Juli": "jul", "Augusti": "aug",
        "September": "sep", "Oktober": "okt", "November": "nov", "December": "dec"
    };
    const parts = dateStr.split(" ");
    if (parts.length === 2) {
        const [m, y] = parts;
        return `${monthMap[m] || m.toLowerCase()} ${y}`;
    }
    return dateStr.toLowerCase();
};

const trimHtml = (html: string) => {
    if (!html) return '';
    // Removes trailing empty paragraphs, breaks, and nbsp that often cause extra pages
    return html.replace(/(\s*(<p>(&nbsp;|<br\/?>|\s)*<\/p>|<br\/?>|&nbsp;)\s*)+$/, '');
};

export const renderRichText = (text: string, className: string = "") => {
    if (!text) return null;
    const trimmed = trimHtml(text);
    if (!trimmed) return null;
    return <div className={`rich-text ${className}`} dangerouslySetInnerHTML={{ __html: trimmed }} />;
};

export const getSectionGroups = (data: ResumeData) => {
    const left: string[] = [];
    const right: string[] = [];
    data.sectionOrder.forEach(id => {
        const col = data.columnSettings?.[id] || 'right';
        if (col === 'left') left.push(id); else right.push(id);
    });
    return { left, right };
};

// --- BASE COMPONENTS FOR TEMPLATES ---

const SectionItem: React.FC<{ item: any, sectionId: string, showDateInline?: boolean }> = ({ item, sectionId, showDateInline = true }) => {
    return (
        <div className="mb-4 last:mb-0">
            <div className="flex justify-between items-baseline gap-4 mb-0">
                <h3 className="font-bold text-[1.1em] leading-tight">{item.role || item.degree || item.name}</h3>
                {showDateInline && (item.startDate || item.endDate) && (
                    <span className="text-[0.75em] font-black uppercase tracking-tight whitespace-nowrap opacity-50">
                        {formatShortDate(item.startDate)} — {item.current ? 'Nu' : formatShortDate(item.endDate)}
                    </span>
                )}
            </div>
            <div className="text-[0.9em] font-bold mb-0 opacity-70">
                {item.company || item.school || item.issuer}
                {item.location && <span className="mx-2 opacity-40">|</span>}
                {item.location}
            </div>
            <div
                className="opacity-95"
                data-section-id={sectionId}
                data-item-id={item.id}
            >
                {renderRichText(item.description)}
            </div>
        </div>
    );
};

const SkillItem: React.FC<{ item: any, style?: 'dots' | 'bars' | 'tags', accentColor?: string }> = ({ item, style = 'dots', accentColor }) => {
    if (style === 'bars') {
        const percentage = (item.level / 5) * 100;
        return (
            <div className="py-2">
                <div className="flex justify-between items-center text-[0.85em] mb-1.5 font-bold">
                    <span>{item.name}</span>
                </div>
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${percentage}%`, backgroundColor: accentColor || 'currentColor' }}
                    />
                </div>
            </div>
        );
    }

    if (style === 'tags') {
        return (
            <span
                className="inline-block px-3 py-1.5 rounded-lg text-[0.8em] font-bold mr-2 mb-2 border border-gray-100 shadow-sm"
                style={{ backgroundColor: `${accentColor}08`, color: accentColor }}
            >
                {item.name}
            </span>
        );
    }

    return (
        <div className="flex justify-between items-center text-[0.9em] py-1">
            <span className="font-bold opacity-80">{item.name}</span>
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(dot => (
                    <div 
                        key={dot} 
                        className={`w-2 h-2 rounded-full border border-current transition-all ${Number(item.level) >= dot ? 'bg-current' : 'bg-transparent opacity-30'}`}
                    ></div>
                ))}
            </div>
        </div>
    );
};


// ManualPageBreak: Creates a visual break that pushes content to the next A4 page.
// For preview: Uses calculated height to show the gap visually
// For PDF/print: Uses html2pdf__page-break class which triggers CSS page-break-before
const ManualPageBreak: React.FC<{ refreshKey?: string }> = ({ refreshKey }) => {
    const breakRef = useRef<HTMLDivElement>(null);
    const [spacerHeight, setSpacerHeight] = useState(0);
    // Use a ref to track if we've measured to avoid dependency issues
    const hasMeasured = useRef(false);

    useLayoutEffect(() => {
        const measure = () => {
            if (!breakRef.current) return;

            const el = breakRef.current;

            // Find the CV container - try multiple approaches
            let container = el.closest('[style*="width: 210mm"]') as HTMLElement;

            // Fallback: look for the .w-\\[210mm\\] class
            if (!container) {
                container = el.closest('.w-\\[210mm\\]') as HTMLElement;
            }

            // Fallback: traverse up to find a container with A4-like width (around 794px)
            if (!container) {
                let current = el.parentElement;
                while (current) {
                    const width = current.offsetWidth;
                    if (width >= 790 && width <= 800) {
                        container = current;
                        break;
                    }
                    current = current.parentElement;
                }
            }

            if (!container) {
                // Last resort: use the nearest positioned ancestor
                container = el.offsetParent as HTMLElement;
            }

            if (!container) return;

            // A4 dimensions - 210mm width, 297mm height
            const containerWidth = container.offsetWidth || 794;
            const pxPerMm = containerWidth / 210;
            const pageHeightPx = 297 * pxPerMm;

            // Get bounding rects
            const containerRect = container.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();

            // Check if we're in the hidden measurement div (left < -1000)
            const isHidden = containerRect.left < -1000;

            // Calculate scale factor (for visible scaled preview)
            const scale = isHidden ? 1 : (containerRect.width / containerWidth || 1);

            // Top offset relative to container, accounting for scale
            const topOffset = (elRect.top - containerRect.top) / scale;

            // Calculate position within the current page
            const positionInPage = topOffset % pageHeightPx;

            // If we're already near the top of a page (within 15px), no gap needed
            if (positionInPage < 15) {
                if (spacerHeight !== 0) {
                    setSpacerHeight(0);
                }
            } else {
                // Gap needed = remaining space on current page
                const gap = pageHeightPx - positionInPage;
                // Only update if significantly different (avoid infinite loops)
                if (!hasMeasured.current || Math.abs(spacerHeight - gap) > 10) {
                    setSpacerHeight(gap);
                }
            }

            hasMeasured.current = true;
        };

        // Reset measurement flag when refreshKey changes
        hasMeasured.current = false;

        // Run measurement after a brief delay to allow DOM to settle
        const timer = setTimeout(measure, 150);
        return () => clearTimeout(timer);
    }, [refreshKey]); // Only depend on refreshKey, not spacerHeight

    // Single spacer div - visible in both preview and PDF
    // In preview: shows the visual gap with styling
    // In PDF: creates white space at bottom of page 1, content flows to page 2
    return (
        <div
            ref={breakRef}
            className="manual-page-break w-full"
            style={{
                height: spacerHeight,
                // White background for clean PDF output
                backgroundColor: 'white'
            }}
            data-page-break="true"
            data-spacer-height={spacerHeight}
        >
            {/* Visual indicator - only in preview (not in print/PDF) */}
            {spacerHeight > 0 && (
                <div className="relative h-full w-full no-print" data-html2canvas-ignore="true">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-blue-400 opacity-30" />
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-xs text-blue-500 opacity-60 font-medium whitespace-nowrap bg-white px-3 py-1 rounded border border-blue-200">
                        ✂️ SIDBRYTNING ({Math.round(spacerHeight)}px)
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-400 opacity-30" />
                </div>
            )}
            {/* Thin line when no spacer needed */}
            {spacerHeight === 0 && (
                <div className="h-0.5 w-full bg-blue-300 opacity-20 no-print" data-html2canvas-ignore="true" />
            )}
        </div>
    );
};


const SectionRenderer: React.FC<{ data: ResumeData, sectionId: string, headerClass: string, headerStyle?: React.CSSProperties, showHeader?: boolean, skillStyle?: 'dots' | 'bars' | 'tags', accentColor?: string, skipBreak?: boolean }> = ({ data, sectionId, headerClass, headerStyle, showHeader = true, skillStyle = 'dots', accentColor, skipBreak }) => {
    const { t } = useTranslation();
    const headerHelper = (key: string, def: string) => {
        const customHeader = data.headers?.[key];
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
            return t('section_' + key) || t(key) || def;
        }
        if (defaultSwedishHeaders[key] === customHeader || customHeader === 'Profil / Sammanfattning') {
            if (key === 'experience') return t('experience');
            if (key === 'education') return t('education');
            if (key === 'skills') return t('skills');
            if (key === 'languages') return t('languages');
            return t('section_' + key) || customHeader;
        }
        return customHeader;
    };
    const rawItems = (data as any)[sectionId];
    const items = Array.isArray(rawItems) ? rawItems : [];
    const hasSectionPageBreak = !skipBreak && data.pageBreaks?.includes(sectionId);

    let content: React.ReactNode = null;

    if (hasSectionPageBreak) {
        return (
            <>
                <ManualPageBreak refreshKey={data.lastEdited} />
                <SectionRenderer {...{ data, sectionId, headerClass, headerStyle, showHeader, skillStyle, accentColor, skipBreak: true }} />
            </>
        );
    }

    if (sectionId === 'profile') {
        if (!data.profile) return null;
        content = <div data-section-id="profile">{renderRichText(data.profile)}</div>;
    }
    else if (['experience', 'education', 'internships', 'courses', 'certificates', 'references', 'hobbies'].includes(sectionId)) {
        if (items.length === 0) return null;
        const itemsWithBreaks = items.map((i: any) => ({
            ...i,
            hasManualBreak: data.itemPageBreaks?.includes(i.id)
        }));

        content = (
            <div className="space-y-4">
                {itemsWithBreaks.map((i: any) => (
                    <React.Fragment key={i.id}>
                        {i.hasManualBreak && <ManualPageBreak refreshKey={data.lastEdited} />}
                        <SectionItem
                            item={i}
                            sectionId={sectionId}
                        />
                    </React.Fragment>
                ))}
            </div>
        );
    }
    else if (sectionId === 'skills') {
        if (items.length === 0) return null;
        content = (
            <div className={skillStyle === 'tags' ? 'flex flex-wrap' : ''}>
                {items.map((i: any) => <SkillItem key={i.id} item={i} style={skillStyle} accentColor={accentColor} />)}
            </div>
        );
    }
    else if (sectionId === 'languages') {
        if (items.length === 0) return null;

        // Map language levels to dot ratings (1-5)
        const levelToDots: Record<string, number> = {
            'Modersmål': 5,
            'Flytande': 5,
            'Mycket goda kunskaper': 4,
            'Goda kunskaper': 3,
            'Grundläggande kunskaper': 2
        };

        content = (
            <div>
                {items.map((i: any) => (
                    <div key={i.id} className="flex justify-between items-center text-[0.9em] py-1">
                        <span className="font-bold opacity-80">{i.name}</span>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(dot => {
                                const levelNum = typeof i.level === 'number' ? i.level : (levelToDots[i.level] || (parseInt(i.level) || 3));
                                return (
                                    <div 
                                        key={dot} 
                                        className={`w-2 h-2 rounded-full border border-current transition-all ${levelNum >= dot ? 'bg-current' : 'bg-transparent opacity-30'}`}
                                    ></div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!content) return null;
    return (
        <section className="mb-0">
            {showHeader && <h2 className={`${headerClass} mb-1.5`} style={headerStyle}>{headerHelper(sectionId, sectionId)}</h2>}
            {content}
        </section>
    );
};

const SheetEngine: React.FC<{
    children: React.ReactNode,
    singlePageOnly?: boolean,
    design?: DesignSettings,
    config?: MasterTemplateConfig,
    pageHeader?: React.ReactNode,
    pageFooter?: React.ReactNode,
    hasColoredSidebar?: boolean,
    sidebarWidth?: string
}> = ({ children, singlePageOnly = false, design, config, pageHeader, pageFooter, hasColoredSidebar = false, sidebarWidth = '65mm' }) => {
    const [numPages, setNumPages] = useState(1);
    const measureRef = useRef<HTMLDivElement>(null);

    // Dynamically calculate how many pages are needed
    useLayoutEffect(() => {
        const measureHeight = () => {
            if (measureRef.current && !singlePageOnly) {
                // Respect manual override if it exists
                if (design?.maxPages && design.maxPages > 0) {
                    if (numPages !== design.maxPages) {
                        setNumPages(design.maxPages);
                    }
                    return;
                }

                // Measure the actual height of the content
                const contentHeight = measureRef.current.scrollHeight;
                // Calculate height of one A4 in pixels (based on current 210mm width)
                const pxPerMm = measureRef.current.offsetWidth / 210;
                const pageHeightPx = 297 * pxPerMm;

                // Determine how many pages we need (max 10)
                const rawNeeded = Math.ceil(contentHeight / pageHeightPx);

                // In the UI, we ALWAYS show what's actually needed so user can see overflow
                const needed = Math.min(10, Math.max(1, design?.maxPages || rawNeeded));

                if (needed !== numPages) {
                    setNumPages(needed);
                }
            }
        };

        measureHeight();

        // Also observe for size changes (e.g. from ManualPageBreak components)
        if (measureRef.current && !singlePageOnly) {
            const observer = new ResizeObserver(() => {
                measureHeight();
            });
            observer.observe(measureRef.current);
            return () => observer.disconnect();
        }
    }, [children, singlePageOnly, numPages, design?.maxPages]);

    const pageIndices = (singlePageOnly ? [0] : Array.from({ length: numPages }, (_, i) => i));

    return (
        <div className="flex flex-col items-center print:block">
            {/* HIDDEN MEASUREMENT DIV - Used to calculate content height */}
            <div
                ref={measureRef}
                className="absolute invisible pointer-events-none opacity-0 h-auto overflow-hidden"
                style={{ width: '210mm', left: '-10000px' }}
                aria-hidden="true"
                data-html2canvas-ignore="true"
            >
                {children}
            </div>

            {pageIndices.map(i => {
                const isMaster = !!config;
                const isLeft = isMaster ? (config?.layout !== 'sidebar-right') : true;
                const sColor = design?.accentColor || '#3b82f6';
                const sWidth = isMaster ? (config?.sidebarWidth || '30%') : '65mm';
                const hasSidebar = hasColoredSidebar;

                return (
                    <React.Fragment key={i}>
                        {/* 12mm Gap - EDITOR ONLY (Ignored in PDF) */}
                        {i > 0 && <div className="h-[12mm] w-full no-print" data-html2canvas-ignore="true" />}

                        <div
                            className="cv-preview-container light font-light relative w-[210mm] h-[297mm] overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.12)] dark:shadow-[0_40px_80px_rgba(0,0,0,0.5)] dark:ring-1 dark:ring-white/10 print:shadow-none shrink-0"
                            style={{ backgroundColor: 'white', printColorAdjust: 'exact', colorScheme: 'light' } as any}
                        >
                            {/* Sidebar Background for ClassicSidebar - appears on every page */}
                            {!isMaster && hasSidebar && (
                                <div
                                    className="absolute top-0 bottom-0 left-0 z-[2]"
                                    style={{ backgroundColor: sColor, width: sidebarWidth }}
                                />
                            )}

                            {/* White background for main content area (not sidebar) to prevent bleed-through */}
                            {!isMaster && hasSidebar && (
                                <div className="absolute top-0 bottom-0 bg-white z-[1]" style={{ left: sidebarWidth, right: 0 }} />
                            )}
                            {/* For non-sidebar templates, cover entire page */}
                            {(!hasSidebar || isMaster) && (
                                <div className="absolute inset-0 bg-white z-[1]" />
                            )}

                            {/* Persistent page elements */}
                            {pageHeader && <div className="absolute top-0 left-0 right-0 z-40 no-print-background">{pageHeader}</div>}
                            {pageFooter && <div className="absolute bottom-0 left-0 right-0 z-40 no-print-background">{pageFooter}</div>}
                            {/* THE CONTENT SLICE */}
                            <div
                                className="relative z-10 w-[210mm] bg-transparent"
                                style={{
                                    transform: `translateY(-${i * 297}mm)`,
                                    willChange: 'transform'
                                }}
                            >
                                {children}
                            </div>

                            {/* Visual Guides - Editor only */}
                            <div className="absolute top-0 left-0 right-0 h-px bg-black/5 no-print z-50" />
                            <div className="absolute bottom-0 left-0 right-0 h-px bg-black/5 no-print z-50" />

                            <div className="absolute -right-20 top-8 flex flex-col items-center gap-1 opacity-40 no-print">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 rotate-90 whitespace-nowrap">SIDA {i + 1}</span>
                            </div>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    );
};

// --- MASTER TEMPLATE: UNIVERSAL LAYOUT ENGINE ---
export const MasterTemplate: React.FC<TemplateProps & {
    config?: MasterTemplateConfig,
    isEditMode?: boolean,
    onPhotoDragStart?: (e: React.DragEvent) => void,
    activeDropZone?: PhotoPosition | null,
    onDropZoneOver?: (zone: PhotoPosition) => void,
    onDropZoneLeave?: () => void,
    onDropOnZone?: (zone: PhotoPosition) => void
}> = ({ data, containerStyle, design, config, isEditMode, onPhotoDragStart, activeDropZone, onDropZoneOver, onDropZoneLeave, onDropOnZone, isBrev, brevContent }) => {
    const cfg = config || data.customTemplateConfig || {
        layout: 'sidebar-left',
        sidebarWidth: '30%',
        spacing: 'normal',
        headerAlignment: 'left',
        headerStyle: 'modern',
        sectionStyle: 'underlined',
        accentColor: design.accentColor,
        fontHeading: 'inter',
        fontBody: 'inter',
        borderRadius: '0.75rem',
        showPhoto: true,
        photoShape: 'soft-square',
        photoPosition: 'sidebar-top',
        sideStripe: 'none',
        sideStripeWidth: '5mm',
        showBorder: false,
        borderWidth: '2px',
        borderColor: '#e2e8f0'
    };

    const { t } = useTranslation();
    const { left, right } = getSectionGroups(data);
    const p = data.personal;

    const getHeaderClass = () => {
        switch (cfg.headerStyle) {
            case 'modern': return 'text-[3.5em] font-black leading-none tracking-tighter';
            case 'classic': return 'text-[3em] font-bold tracking-tight';
            case 'serif-elegant': return 'text-[3.5em] font-serif italic font-medium';
            case 'minimal': return 'text-[2.5em] font-light uppercase tracking-[0.4em]';
            default: return 'text-[3em] font-bold';
        }
    };

    const getSectionHeaderStyle = (): React.CSSProperties => {
        const style: React.CSSProperties = { color: cfg.accentColor };
        if (cfg.sectionStyle === 'underlined') {
            style.borderBottom = `2px solid ${cfg.accentColor}20`;
            style.paddingBottom = '0.5rem';
        } else if (cfg.sectionStyle === 'boxed') {
            style.backgroundColor = `${cfg.accentColor}05`;
            style.padding = '0.75rem 1rem';
            style.borderRadius = cfg.borderRadius;
        } else if (cfg.sectionStyle === 'side-border') {
            style.borderLeft = `4px solid ${cfg.accentColor}`;
            style.paddingLeft = '1rem';
        }
        return style;
    };

    const spacingClass = cfg.spacing === 'compact' ? 'gap-4' : cfg.spacing === 'relaxed' ? 'gap-10' : 'gap-6';

    const PhotoRenderer = ({ position }: { position: PhotoPosition }) => {
        const isCurrentPosition = cfg.photoPosition === position;

        if (isEditMode) {
            const isTargeted = activeDropZone === position;
            return (
                <div
                    onDragOver={(e) => { e.preventDefault(); onDropZoneOver?.(position); }}
                    onDragLeave={onDropZoneLeave}
                    onDrop={() => onDropOnZone?.(position)}
                    className={`relative transition-all duration-300 ${isCurrentPosition ? '' : 'min-h-[40px] mb-4'}`}
                >
                    {isCurrentPosition ? (
                        <div draggable onDragStart={onPhotoDragStart} className={`group relative cursor-grab active:cursor-grabbing`}><PhotoContent /><div className="absolute inset-0 bg-indigo-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-inherit transition-opacity"><div className="bg-white/90 p-2 rounded-lg shadow-xl"><GripVertical className="w-5 h-5 text-indigo-600" /></div></div></div>
                    ) : (
                        <div className={`w-full aspect-square border-2 border-dashed rounded-[1rem] flex items-center justify-center transition-all ${isTargeted ? 'bg-indigo-500/10 border-indigo-500 scale-105' : 'bg-transparent border-gray-200 opacity-0 hover:opacity-100'}`}><ImageIcon className={`w-6 h-6 ${isTargeted ? 'text-indigo-500' : 'text-gray-300'}`} /></div>
                    )}
                </div>
            );
        }
        if (!isCurrentPosition || !cfg.showPhoto) return null;
        return <PhotoContent />;
    };

    const PhotoContent = () => {
        if (!p.photoUrl && !isEditMode) return null;
        const shapeClass = cfg.photoShape === 'circle' ? 'rounded-full' : cfg.photoShape === 'soft-square' ? 'rounded-[2rem]' : 'rounded-none';
        return (
            <div className={`${shapeClass} overflow-hidden shadow-lg border-2 border-white mb-6 shrink-0 w-40 h-40 mx-auto bg-gray-100 flex items-center justify-center`}>
                {p.photoUrl ? <img src={p.photoUrl} className="w-full h-full object-cover" /> : <ImageIcon className="w-12 h-12 text-gray-300" />}
            </div>
        );
    };

    const sidebarColor = cfg.accentColor;

    const layoutStyle: React.CSSProperties = {
        display: 'flex',
        flexDirection: cfg.layout === 'sidebar-left' ? 'row' : cfg.layout === 'sidebar-right' ? 'row-reverse' : 'column',
        position: 'relative',
        backgroundColor: 'transparent',
        ...containerStyle
    };

    return (
        <SheetEngine design={design} config={cfg} singlePageOnly={isBrev}>
            <div className="w-[210mm] relative flex items-stretch bg-white" style={layoutStyle}>

                {/* Background Sidebar for Master Template */}
                {(cfg.layout === 'sidebar-left' || cfg.layout === 'sidebar-right') && (
                    <div
                        className="absolute top-0 bottom-0 z-0"
                        style={{
                            left: cfg.layout === 'sidebar-left' ? 0 : 'auto',
                            right: cfg.layout === 'sidebar-right' ? 0 : 'auto',
                            width: cfg.sidebarWidth,
                            backgroundColor: design.accentColor
                        }}
                    />
                )}

                {(cfg.sideStripe === 'left' || cfg.sideStripe === 'both') && <div className="absolute left-0 top-0 bottom-0 z-20 shrink-0" style={{ width: cfg.sideStripeWidth, backgroundColor: cfg.accentColor }}></div>}
                {(cfg.sideStripe === 'right' || cfg.sideStripe === 'both') && <div className="absolute right-0 top-0 bottom-0 z-20 shrink-0" style={{ width: cfg.sideStripeWidth, backgroundColor: cfg.accentColor }}></div>}

                {(cfg.layout === 'sidebar-left' || cfg.layout === 'sidebar-right') && (
                    <div className="shrink-0 flex flex-col p-10 relative z-10" style={{ width: cfg.sidebarWidth }}>
                        <PhotoRenderer position="sidebar-top" />
                        <div className="flex flex-col gap-8 flex-1 relative z-10 text-white font-bold">
                            <section>
                                <h3 className="text-[0.8em] font-black uppercase tracking-widest mb-4 text-white">{t('contact_info')}</h3>
                                <div className="space-y-3 text-[0.85em] font-medium text-white/90">
                                    {p.email && <div className="flex items-center gap-3"><Mail className="w-4 h-4" />{p.email}</div>}
                                    {p.phone && <div className="flex items-center gap-3"><Phone className="w-4 h-4" />{p.phone}</div>}
                                    {p.city && <div className="flex items-center gap-3"><MapPin className="w-4 h-4" />{p.city}</div>}
                                    {p.linkedin && <div className="flex items-center gap-3"><Linkedin className="w-4 h-4" />{p.linkedin}</div>}
                                    {p.website && <div className="flex items-center gap-3"><Globe className="w-4 h-4" />{p.website}</div>}
                                    {p.driversLicense && <div className="flex items-center gap-3"><Car className="w-4 h-4" />{p.driversLicense}</div>}
                                </div>
                            </section>
                            {left.map(sid => <SectionRenderer key={sid} data={data} sectionId={sid} headerClass="text-[0.9em] font-black uppercase tracking-widest mb-4 text-white" />)}
                            <div className="mt-auto"><PhotoRenderer position="sidebar-bottom" /></div>
                        </div>
                    </div>
                )}

                <div className="flex-1 pt-16 px-16 pb-0 flex flex-col text-black relative z-10">
                    <header className={`mb-12 shrink-0 text-${cfg.headerAlignment}`}>
                        <div className="flex flex-col gap-4 mb-4">
                            {cfg.photoPosition === 'header-left' && <PhotoRenderer position="header-left" />}
                            {cfg.photoPosition === 'header-center' && <PhotoRenderer position="header-center" />}
                            {cfg.photoPosition === 'header-right' && <PhotoRenderer position="header-right" />}
                        </div>
                        <h1 className={getHeaderClass()} style={{ color: cfg.accentColor }}>{p.firstName || 'Förnamn'} {p.lastName || 'Efternamn'}</h1>
                        {p.jobTitle && <p className="text-[1.4em] font-medium text-black/60 uppercase tracking-[0.2em] mt-2">{p.jobTitle}</p>}
                        <div className={`flex flex-wrap gap-8 mt-6 text-[0.9em] font-bold text-gray-600 justify-${cfg.headerAlignment === 'center' ? 'center' : (cfg.headerAlignment === 'right' ? 'end' : 'start')}`}>
                            {p.email && <span className="flex items-center gap-2"><Mail className="w-4 h-4" />{p.email}</span>}
                            {p.phone && <span className="flex items-center gap-2"><Phone className="w-4 h-4" />{p.phone}</span>}
                            {p.linkedin && <span className="flex items-center gap-2"><Linkedin className="w-4 h-4" />{p.linkedin}</span>}
                            {p.website && <span className="flex items-center gap-2"><Globe className="w-4 h-4" />{p.website}</span>}
                            {p.driversLicense && <span className="flex items-center gap-2"><Car className="w-4 h-4" />{p.driversLicense}</span>}
                        </div>
                    </header>
                    <div className={`flex flex-col ${spacingClass}`}>
                        {cfg.layout === 'split-equal' && !isBrev ? (
                            [...left, ...right].map(sid => <SectionRenderer key={sid} data={data} sectionId={sid} headerClass="text-[1.4em] font-black mb-6" headerStyle={getSectionHeaderStyle()} />)
                        ) : (
                            isBrev ? (
                                renderRichText(brevContent || '', "text-[1.1em] leading-relaxed")
                            ) : (
                                right.map(sid => <SectionRenderer key={sid} data={data} sectionId={sid} headerClass="text-[1.4em] font-black mb-6" headerStyle={getSectionHeaderStyle()} />)
                            )
                        )}
                    </div>
                </div>
            </div>
        </SheetEngine>
    );
};

export const ClassicSidebar: React.FC<TemplateProps> = ({ data, fontClass, containerStyle, design, isBrev, brevContent }) => {
    const { t } = useTranslation();
    const { left, right } = getSectionGroups(data);
    const p = data.personal;
    const layoutStyle: React.CSSProperties = {
        ...containerStyle,
        backgroundColor: 'transparent'
    };

    return (
        <SheetEngine design={design} singlePageOnly={isBrev} hasColoredSidebar={true}>
            <div className={`w-[210mm] flex shrink-0 relative items-stretch bg-white ${fontClass}`} style={layoutStyle}>

                <div className="w-[65mm] text-white p-4 flex flex-col gap-4 shrink-0 relative z-10" style={{ backgroundColor: design.accentColor }}>
                    <div className="relative z-10 flex flex-col gap-4">
                        {p.photoUrl && <div className="w-[65%] mx-auto aspect-square bg-white rounded-xl overflow-hidden mb-1 shadow-2xl border-3 border-white/10 shrink-0"><img src={p.photoUrl} className="w-full h-full object-cover" /></div>}
                        <section className="shrink-0"><h3 className="text-[0.95em] border-b border-white/20 pb-1.5 mb-3 font-black uppercase tracking-[0.2em]">{t('contact_info')}</h3>
                            <div className="space-y-2.5 text-[0.82em] font-medium opacity-90">
                                {p.email && <div className="flex items-start gap-3"><Mail className="w-4 h-4 mt-0.5 shrink-0" /><span className="break-all">{p.email}</span></div>}
                                {p.phone && <div className="flex items-start gap-3"><Phone className="w-4 h-4 mt-0.5 shrink-0" />{p.phone}</div>}
                                {p.address && <div className="flex items-start gap-3"><MapPin className="w-4 h-4 mt-0.5 shrink-0" />{p.address}</div>}
                                {(p.zipCode || p.city) && <div className="flex items-start gap-3"><MapPin className="w-4 h-4 mt-0.5 shrink-0" />{[p.zipCode, p.city].filter(Boolean).join(' ')}</div>}
                                {p.linkedin && <div className="flex items-start gap-3"><Linkedin className="w-4 h-4 mt-0.5 shrink-0" />{p.linkedin}</div>}
                                {p.website && <div className="flex items-start gap-3"><Globe className="w-4 h-4 mt-0.5 shrink-0" />{p.website}</div>}
                                {p.driversLicense && <div className="flex items-start gap-3"><Car className="w-4 h-4 mt-0.5 shrink-0" />{p.driversLicense}</div>}
                            </div>
                        </section>
                        {left.map(sid => <SectionRenderer key={sid} data={data} sectionId={sid} headerClass="text-[0.9em] border-b border-white/20 pb-2 uppercase tracking-[0.2em] font-black" />)}
                    </div>
                </div>
                <div className="flex-1 pt-8 px-8 pb-0 text-black relative z-10 flex flex-col">
                    <header className="mb-5 shrink-0"><h1 className="text-[2.8em] font-black leading-tight tracking-tighter pb-2 mb-1" style={{ color: design.accentColor }}>{p.firstName} {p.lastName}</h1><div className="h-1 w-14 bg-current mb-3" style={{ color: design.accentColor }}></div>{p.jobTitle && <p className="text-[1.1em] font-black text-gray-300 uppercase tracking-[0.2em]">{p.jobTitle}</p>}</header>
                    <div className="flex flex-col gap-4 flex-1">
                        {isBrev ? (
                            renderRichText(brevContent || '', "text-[1.1em] leading-relaxed")
                        ) : (
                            right.map(sid => <SectionRenderer key={sid} data={data} sectionId={sid} headerClass="text-[1.1em] font-black uppercase tracking-widest border-b-2 border-gray-100 pb-2" headerStyle={{ color: design.accentColor }} />)
                        )}
                    </div>
                </div>
            </div>
        </SheetEngine>
    );
};

export const ModernHeader: React.FC<TemplateProps> = ({ data, fontClass, containerStyle, design, isBrev, brevContent }) => {
    const { t } = useTranslation();
    const { left, right } = getSectionGroups(data);
    const p = data.personal;
    return (
        <SheetEngine design={design} singlePageOnly={isBrev}>
            <div className={`w-[210mm] shrink-0 relative bg-white ${fontClass}`} style={{ ...containerStyle, overflow: 'hidden' }}>
                <div className="w-full p-8 text-white flex justify-between items-center shrink-0" style={{ backgroundColor: design.accentColor }}>
                    <div className="flex-1 min-w-0 pr-8"><h1 className="text-[3.2em] font-black leading-none mb-3">{p.firstName} {p.lastName}</h1>{p.jobTitle && <p className="text-[1.2em] font-black opacity-80 uppercase tracking-[0.2em]">{p.jobTitle}</p>}<div className="flex flex-wrap gap-x-6 gap-y-2 mt-6 text-[0.85em] font-bold opacity-90 uppercase tracking-widest">{p.email && <span className="flex items-center gap-2"><Mail className="w-4 h-4" />{p.email}</span>}{p.phone && <span className="flex items-center gap-2"><Phone className="w-4 h-4" />{p.phone}</span>}{p.address && <span className="flex items-center gap-2"><MapPin className="w-4 h-4" />{p.address}</span>}{(p.zipCode || p.city) && <span className="flex items-center gap-2"><MapPin className="w-4 h-4" />{[p.zipCode, p.city].filter(Boolean).join(' ')}</span>}{p.linkedin && <span className="flex items-center gap-2"><Linkedin className="w-4 h-4" />{p.linkedin}</span>}{p.website && <span className="flex items-center gap-2"><Globe className="w-4 h-4" />{p.website}</span>}{p.driversLicense && <span className="flex items-center gap-2"><Car className="w-4 h-4" />{p.driversLicense}</span>}</div></div>
                    {p.photoUrl && <div className="w-32 h-32 rounded-2xl border-3 border-white/20 shadow-2xl overflow-hidden shrink-0"><img src={p.photoUrl} className="w-full h-full object-cover" /></div>}
                </div>
                <div className="p-8 bg-white grid grid-cols-12 gap-8">
                    <div className="col-span-4 space-y-8">{left.map(sid => <SectionRenderer key={sid} data={data} sectionId={sid} headerClass="text-[0.95em] font-black uppercase text-gray-400 tracking-[0.2em] mb-1.5" />)}</div>
                    <div className="col-span-8">
                        {isBrev ? (
                            renderRichText(brevContent || '', "text-[1.1em] leading-relaxed")
                        ) : (
                            right.map(sid => <SectionRenderer key={sid} data={data} sectionId={sid} headerClass="text-[1.3em] font-black mb-4 border-b-2 pb-1.5" headerStyle={{ borderBottomColor: design.accentColor + '10' }} />)
                        )}
                    </div>
                </div>
            </div>
        </SheetEngine>
    );
};

export const Minimalist: React.FC<TemplateProps> = ({ data, fontClass, containerStyle, design, isBrev, brevContent }) => {
    const p = data.personal;
    return (
        <SheetEngine design={design} singlePageOnly={isBrev}>
            <div className={`w-[210mm] bg-white p-10 shrink-0 relative ${fontClass}`} style={{ ...containerStyle, overflow: 'hidden' }}>
                <header className="mb-6 border-b-2 border-gray-900 pb-4 flex justify-between items-end shrink-0"><div className="flex-1 pr-8"><h1 className="text-[3em] font-black leading-none mb-2">{p.firstName} {p.lastName}</h1>{p.jobTitle && <p className="text-[1.1em] font-bold text-gray-400">{p.jobTitle}</p>}</div><div className="text-right text-[0.8em] font-bold uppercase tracking-widest text-gray-500 space-y-1">{p.email && <div>{p.email}</div>}{p.phone && <div>{p.phone}</div>}{p.city && <div>{p.city}</div>}{p.linkedin && <div>{p.linkedin}</div>}{p.website && <div>{p.website}</div>}{p.driversLicense && <div>{p.driversLicense}</div>}</div></header>
                <div className="space-y-8">
                    {isBrev ? (
                        renderRichText(brevContent || '', "text-[1.1em] leading-relaxed")
                    ) : (
                        data.sectionOrder.map(sid => <SectionRenderer key={sid} data={data} sectionId={sid} headerClass="text-[1.1em] font-black uppercase tracking-[0.3em] mb-4 border-l-6 border-gray-900 pl-4" />)
                    )}
                </div>
            </div>
        </SheetEngine>
    );
};

export const CreativeProfile: React.FC<TemplateProps> = ({ data, fontClass, containerStyle, design, isBrev, brevContent }) => {
    const { t } = useTranslation();
    const { left, right } = getSectionGroups(data);
    const p = data.personal;

    // Override design for gray sidebar
    const grayDesign = { ...design, accentColor: '#f9fafb' }; // gray-50

    return (
        <SheetEngine design={grayDesign} singlePageOnly={isBrev} hasColoredSidebar={true} sidebarWidth="85mm">
            <div className={`w-[210mm] flex shrink-0 bg-white relative ${fontClass}`} style={{ ...containerStyle, overflow: 'hidden' }}>
                <div className="w-[85mm] bg-gray-50 flex flex-col p-6 border-r border-gray-100 shrink-0">
                    {p.photoUrl && <div className="w-48 h-48 rounded-[2.5rem] overflow-hidden shadow-2xl mb-8 mx-auto shrink-0"><img src={p.photoUrl} className="w-full h-full object-cover" /></div>}
                    <div className="space-y-8">
                        <section><h3 className="text-[1.1em] font-black uppercase tracking-[0.2em] mb-6" style={{ color: design.accentColor }}>{t('contact_info')}</h3><div className="space-y-3.5 text-[0.85em] font-bold text-gray-600">{p.email && <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0"><Mail className="w-4.5 h-4.5" /></div>{p.email}</div>}{p.phone && <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0"><Phone className="w-4.5 h-4.5" /></div>{p.phone}</div>}{p.address && <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0"><MapPin className="w-4.5 h-4.5" /></div>{p.address}</div>}{(p.zipCode || p.city) && <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0"><MapPin className="w-4.5 h-4.5" /></div>{[p.zipCode, p.city].filter(Boolean).join(' ')}</div>}{p.linkedin && <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0"><Linkedin className="w-4.5 h-4.5" /></div>{p.linkedin}</div>}{p.website && <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0"><Globe className="w-4.5 h-4.5" /></div>{p.website}</div>}{p.driversLicense && <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm shrink-0"><Car className="w-4.5 h-4.5" /></div>{p.driversLicense}</div>}</div></section>
                        {left.map(sid => <SectionRenderer key={sid} data={data} sectionId={sid} headerClass="text-[1.1em] font-black uppercase tracking-[0.2em] mb-6" headerStyle={{ color: design.accentColor }} />)}
                    </div>
                </div>
                <div className="flex-1 p-8 bg-white min-w-0">
                    <header className="mb-8 shrink-0"><h1 className="text-[3.5em] font-black text-gray-900 leading-tight tracking-tighter pb-2 mb-2"><span>{p.firstName}</span><br /><span style={{ color: design.accentColor }}>{p.lastName}</span></h1>{p.jobTitle && <p className="text-[1.4em] font-black text-gray-200 uppercase tracking-widest">{p.jobTitle}</p>}</header>
                    <div>
                        {isBrev ? (
                            renderRichText(brevContent || '', "text-[1.1em] leading-relaxed")
                        ) : (
                            right.map(sid => <SectionRenderer key={sid} data={data} sectionId={sid} headerClass="text-[1.3em] font-black mb-6 border-b-2 pb-1.5" headerStyle={{ borderBottomColor: design.accentColor + '10' }} />)
                        )}
                    </div>
                </div>
            </div>
        </SheetEngine>
    );
};

export const CleanTimeline: React.FC<TemplateProps> = ({ data, fontClass, containerStyle, design, isBrev, brevContent, headerHelper }) => {
    const p = data.personal;
    const TimelineItem: React.FC<{ item: any; sectionId: string }> = ({ item, sectionId }) => (
        <div className={`grid grid-cols-12 gap-8 mb-8 last:mb-0`} data-section-id={sectionId} data-item-id={item.id}>
            <div className="col-span-3 text-right"><div className="text-[0.8em] font-black uppercase tracking-widest opacity-40 leading-relaxed">{formatShortDate(item.startDate)} —<br />{item.current ? 'Nu' : formatShortDate(item.endDate)}</div></div>
            <div className="col-span-9 relative border-l-2 border-gray-100 pl-8 pb-4"><div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-gray-200"></div><h3 className="font-bold text-[1.1em] mb-1">{item.role || item.degree || item.name}</h3><div className="text-[0.9em] font-bold opacity-60 mb-2">{item.company || item.school || item.issuer}</div>{item.description && <div className="opacity-90 mt-2" data-section-id={sectionId} data-item-id={item.id}>{renderRichText(item.description)}</div>}</div>
        </div>
    );
    const TimelineSection: React.FC<{ sectionId: string }> = ({ sectionId }) => {
        const items = (data as any)[sectionId] || [];
        if (sectionId === 'profile') return <SectionRenderer data={data} sectionId={sectionId} headerClass="text-[1.2em] font-black uppercase tracking-[0.2em] mb-8" headerStyle={{ color: design.accentColor }} />;
        if (['experience', 'education', 'internships'].includes(sectionId) && items.length > 0) {
            return (
                <div className="mb-16 last:mb-0"><h2 className="text-[1.2em] font-black uppercase tracking-[0.2em] mb-8" style={{ color: design.accentColor }}>{headerHelper(sectionId, sectionId)}</h2>{items.map((i: any) => <TimelineItem key={i.id} item={i} />)}</div>
            );
        }
        return <SectionRenderer data={data} sectionId={sectionId} headerClass="text-[1.2em] font-black uppercase tracking-[0.2em] mb-8" headerStyle={{ color: design.accentColor }} />;
    };
    return (
        <SheetEngine design={design} singlePageOnly={isBrev}>
            <div className={`w-[210mm] bg-white p-10 shrink-0 relative ${fontClass}`} style={{ ...containerStyle, overflow: 'hidden' }}>
                <header className="flex justify-between items-center mb-10 shrink-0 border-b-4 border-gray-50 pb-6"><div className="flex-1 pr-10"><h1 className="text-[3em] font-black tracking-tighter leading-none mb-2">{p.firstName} {p.lastName}</h1>{p.jobTitle && <p className="text-[1.1em] font-black text-gray-200 uppercase tracking-[0.3em]">{p.jobTitle}</p>}</div><div className="text-right space-y-1.5 text-[0.8em] font-bold text-gray-400 uppercase tracking-widest shrink-0">{p.email && <div>{p.email}</div>}{p.phone && <div>{p.phone}</div>}{p.city && <div>{p.city}</div>}{p.linkedin && <div>{p.linkedin}</div>}{p.website && <div>{p.website}</div>}{p.driversLicense && <div>{p.driversLicense}</div>}</div></header>
                <div className="max-w-4xl">
                    {isBrev ? (
                        renderRichText(brevContent || '', "text-[1.1em] leading-relaxed")
                    ) : (
                        data.sectionOrder.map(sid => <TimelineSection key={sid} sectionId={sid} />)
                    )}
                </div>
            </div>
        </SheetEngine>
    );
};

export const ExecutiveSerif: React.FC<TemplateProps> = ({ data, fontClass, containerStyle, design, isBrev, brevContent }) => {
    const p = data.personal;
    return (
        <SheetEngine design={design} singlePageOnly={isBrev}>
            <div className={`w-[210mm] bg-white p-10 shrink-0 font-serif relative`} style={{ ...containerStyle, fontFamily: "'Merriweather', serif", overflow: 'hidden' }}>
                <header className="text-center mb-8 border-b border-gray-200 pb-6 shrink-0"><h1 className="text-[2.8em] font-bold mb-3 tracking-tight" style={{ color: design.accentColor }}>{p.firstName} {p.lastName}</h1><div className="flex justify-center flex-wrap gap-x-5 gap-y-1.5 text-[0.85em] text-gray-600 font-medium">{p.email && <span className="flex items-center gap-2">{p.email}</span>}{p.phone && <span className="flex items-center gap-2">• {p.phone}</span>}{p.city && <span className="flex items-center gap-2">• {p.city}</span>}{p.linkedin && <span className="flex items-center gap-2">• {p.linkedin}</span>}{p.website && <span className="flex items-center gap-2">• {p.website}</span>}{p.driversLicense && <span className="flex items-center gap-2">• {p.driversLicense}</span>}</div>{p.jobTitle && <div className="mt-4 text-[1.1em] font-bold text-gray-400 uppercase tracking-widest">{p.jobTitle}</div>}</header>
                <div className="space-y-8">
                    {isBrev ? (
                        renderRichText(brevContent || '', "text-[1.1em] leading-relaxed")
                    ) : (
                        data.sectionOrder.map(sid => <SectionRenderer key={sid} data={data} sectionId={sid} headerClass="text-[1.05em] font-bold uppercase tracking-[0.2em] border-b border-gray-100 pb-1.5 mb-4" headerStyle={{ color: design.accentColor }} />)
                    )}
                </div>
            </div>
        </SheetEngine>
    );
};

export const AventusClassic: React.FC<TemplateProps> = ({ data, fontClass, containerStyle, design, isBrev, brevContent }) => {
    const { t } = useTranslation();
    const { left, right } = getSectionGroups(data);
    const p = data.personal;

    const AccentBar = ({ position }: { position: 'top' | 'bottom' }) => (
        <div
            className={`w-full h-6 ${position === 'top' ? 'top-0' : 'bottom-0'}`}
            style={{ backgroundColor: design.accentColor }}
        />
    );

    return (
        <SheetEngine
            design={design}
            singlePageOnly={isBrev}
            pageHeader={<AccentBar position="top" />}
            pageFooter={<AccentBar position="bottom" />}
        >
            <div className={`w-[210mm] flex shrink-0 relative items-stretch bg-white min-h-[297mm] ${fontClass}`} style={containerStyle}>

                {/* Sidebar Background - Simple grey as in image */}
                <div className="absolute top-0 left-0 bottom-0 w-[70mm] bg-slate-50 z-0 border-r border-gray-100" />

                {/* Sidebar Content */}
                <div className="w-[70mm] p-8 pt-16 flex flex-col gap-8 shrink-0 relative z-10">
                    {p.photoUrl && (
                        <div className="w-full aspect-[4/5] bg-white rounded-lg overflow-hidden shadow-md border-4 border-white shrink-0 mb-4">
                            <img src={p.photoUrl} className="w-full h-full object-cover" />
                        </div>
                    )}

                    <section>
                        <h3 className="text-[1.1em] font-black uppercase tracking-[0.2em] mb-4 text-slate-800" style={{ color: design.accentColor }}>{t('personal_info')}</h3>
                        <div className="space-y-4 text-[0.85em]">
                            {p.firstName && (
                                <div>
                                    <div className="font-black text-slate-400 uppercase tracking-widest text-[0.7em] mb-0.5">Namn</div>
                                    <div className="font-bold text-black">{p.firstName} {p.lastName}</div>
                                </div>
                            )}
                            {p.email && (
                                <div>
                                    <div className="font-black text-slate-400 uppercase tracking-widest text-[0.7em] mb-0.5">E-postadress</div>
                                    <div className="font-bold text-black break-all">{p.email}</div>
                                </div>
                            )}
                            {p.phone && (
                                <div>
                                    <div className="font-black text-slate-400 uppercase tracking-widest text-[0.7em] mb-0.5">Telefonnummer</div>
                                    <div className="font-bold text-black">{p.phone}</div>
                                </div>
                            )}
                            {p.city && (
                                <div>
                                    <div className="font-black text-slate-400 uppercase tracking-widest text-[0.7em] mb-0.5">Adress</div>
                                    <div className="font-bold text-black">{p.city}</div>
                                </div>
                            )}
                        </div>
                    </section>

                    {left.map(sid => (
                        <SectionRenderer
                            key={sid}
                            data={data}
                            sectionId={sid}
                            headerClass="text-[1.15em] font-black uppercase tracking-[0.2em] mb-4"
                            headerStyle={{ color: design.accentColor }}
                        />
                    ))}
                </div>

                {/* Main Content */}
                <div className="flex-1 p-8 pt-12 pb-10 text-black relative z-10 bg-white">
                    <header className="mb-8">
                        <h1 className="text-[3.8em] font-black leading-tight tracking-tighter pb-2 mb-2" style={{ color: design.accentColor }}>
                            {p.firstName}<br />{p.lastName}
                        </h1>
                        <div className="h-1 w-20 bg-current mt-4" style={{ color: design.accentColor }} />
                    </header>

                    <div className="flex flex-col gap-10">
                        {isBrev ? (
                            renderRichText(brevContent || '', "text-[1.1em] leading-relaxed")
                        ) : (
                            right.map(sid => (
                                <SectionRenderer
                                    key={sid}
                                    data={data}
                                    sectionId={sid}
                                    headerClass="text-[1.4em] font-black mb-6 border-b-2 pb-2"
                                    headerStyle={{ borderColor: `${design.accentColor}10`, color: design.accentColor }}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </SheetEngine>
    );
};

export const ProfessionalWave: React.FC<TemplateProps> = ({ data, fontClass, containerStyle, design, isBrev, brevContent }) => {
    const { t } = useTranslation();
    const { left, right } = getSectionGroups(data);
    const p = data.personal;

    return (
        <SheetEngine design={design} singlePageOnly={isBrev}>
            <div className={`w-[210mm] flex flex-col shrink-0 relative bg-white ${fontClass}`} style={containerStyle}>
                {/* Wave Header */}
                <div className="relative h-64 w-full overflow-hidden shrink-0" style={{ backgroundColor: design.accentColor }}>
                    <div className="absolute inset-0 opacity-20">
                        <svg viewBox="0 0 500 500" preserveAspectRatio="none" className="h-full w-full">
                            <path d="M0,100 C150,200 350,0 500,100 L500,0 L0,0 Z" fill="white"></path>
                        </svg>
                    </div>

                    <div className="absolute inset-0 flex items-center justify-between px-10 z-10">
                        <div className="text-white">
                            <h1 className="text-[4em] font-black leading-tight tracking-tighter">
                                {p.firstName} {p.lastName}
                            </h1>
                            {p.jobTitle && (
                                <p className="text-[1.2em] font-bold opacity-80 uppercase tracking-[0.3em] mt-2">
                                    {p.jobTitle}
                                </p>
                            )}
                        </div>
                        {p.photoUrl && (
                            <div className="w-44 h-44 rounded-full border-8 border-white shadow-2xl overflow-hidden shrink-0">
                                <img src={p.photoUrl} className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>

                    {/* Bottom diagonal – CSS border triangle, most compatible with html2canvas */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        width: 0,
                        height: 0,
                        borderStyle: 'solid',
                        borderWidth: '0 0 48px 794px',
                        borderColor: `transparent transparent white transparent`,
                    }} />
                </div>

                <div className="flex-1 px-10 py-8 grid grid-cols-12 gap-10">
                    {/* Sidebar */}
                    <div className="col-span-4 flex flex-col gap-10">
                        <section>
                            <h3 className="text-[0.9em] font-black uppercase tracking-widest mb-6 pb-2 border-b-2" style={{ borderColor: `${design.accentColor}20`, color: design.accentColor }}>{t('contact_info')}</h3>
                            <div className="space-y-4 text-[0.85em] font-bold text-slate-600">
                                {p.email && <div className="flex items-center gap-3"><Mail className="w-4 h-4 opacity-40" />{p.email}</div>}
                                {p.phone && <div className="flex items-center gap-3"><Phone className="w-4 h-4 opacity-40" />{p.phone}</div>}
                                {p.city && <div className="flex items-center gap-3"><MapPin className="w-4 h-4 opacity-40" />{p.city}</div>}
                                {p.linkedin && <div className="flex items-center gap-3"><Linkedin className="w-4 h-4 opacity-40" />{p.linkedin}</div>}
                            </div>
                        </section>

                        {left.map(sid => (
                            <SectionRenderer
                                key={sid}
                                data={data}
                                sectionId={sid}
                                headerClass="text-[0.9em] font-black uppercase tracking-widest mb-6 pb-2 border-b-2"
                                headerStyle={{ borderColor: `${design.accentColor}20`, color: design.accentColor }}
                                skillStyle="bars"
                                accentColor={design.accentColor}
                            />
                        ))}
                    </div>

                    {/* Main */}
                    <div className="col-span-8 flex flex-col gap-10">
                        {isBrev ? (
                            renderRichText(brevContent || '', "text-[1.1em] leading-relaxed")
                        ) : (
                            right.map(sid => (
                                <SectionRenderer
                                    key={sid}
                                    data={data}
                                    sectionId={sid}
                                    headerClass="text-[1.4em] font-black mb-6 flex items-center gap-3"
                                    headerStyle={{ color: 'inherit' }}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </SheetEngine>
    );
};
export const ModernTimeline: React.FC<TemplateProps> = ({ data, fontClass, containerStyle, design, isBrev, brevContent, headerHelper }) => {
    const p = data.personal;

    const TimelineItem: React.FC<{ item: any; sectionId: string }> = ({ item, sectionId }) => (
        <div className="grid grid-cols-12 gap-8 mb-10 last:mb-0" data-section-id={sectionId} data-item-id={item.id}>
            {/* Date Column */}
            <div className="col-span-3 text-right">
                <div className="text-[0.8em] font-black uppercase tracking-widest text-slate-400 leading-tight pt-1">
                    {formatShortDate(item.startDate)} —<br />
                    {item.current ? 'Nu' : formatShortDate(item.endDate)}
                </div>
            </div>

            {/* Content Column */}
            <div className="col-span-9 relative border-l-2 pl-10 pb-2" style={{ borderColor: `${design.accentColor}15` }}>
                {/* Dot Marker */}
                <div
                    className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-white border-2"
                    style={{ borderColor: design.accentColor }}
                />

                <h3 className="font-black text-[1.25em] leading-tight mb-1">{item.role || item.degree || item.name}</h3>
                <div className="text-[1em] font-bold opacity-60 mb-4">{item.company || item.school || item.issuer}</div>

                {item.description && (
                    <div className="text-[0.95em] leading-relaxed text-black">
                        {renderRichText(item.description)}
                    </div>
                )}
            </div>
        </div>
    );

    const TimelineSection: React.FC<{ sectionId: string }> = ({ sectionId }) => {
        const items = (data as any)[sectionId] || [];
        if (items.length === 0 && sectionId !== 'profile') return null;

        return (
            <div className="mb-16 last:mb-0">
                <h2 className="text-[0.85em] font-black uppercase tracking-[0.3em] mb-10 inline-block border-b-4 pb-2" style={{ color: design.accentColor, borderColor: `${design.accentColor}10` }}>
                    {headerHelper(sectionId, sectionId)}
                </h2>

                {sectionId === 'profile' ? (
                    <div className="pl-[25%] text-[1.1em] leading-relaxed text-black">
                        {renderRichText(data.profile)}
                    </div>
                ) : (
                    ['experience', 'education', 'internships'].includes(sectionId) ? (
                        items.map((i: any) => <TimelineItem key={i.id} item={i} sectionId={sectionId} />)
                    ) : (
                        <div className="pl-[25%]">
                            <SectionRenderer
                                data={data}
                                sectionId={sectionId}
                                headerClass="hidden"
                                showHeader={false}
                                skillStyle="tags"
                                accentColor={design.accentColor}
                            />
                        </div>
                    )
                )}
            </div>
        );
    };

    return (
        <SheetEngine design={design} singlePageOnly={isBrev}>
            <div className={`w-[210mm] bg-white p-10 shrink-0 relative ${fontClass}`} style={containerStyle}>
                {/* Minimal Header */}
                <header className="flex flex-col items-center text-center mb-20">
                    {p.photoUrl && (
                        <div className="w-32 h-32 rounded-3xl rotate-3 overflow-hidden shadow-xl mb-8 border-4 border-white">
                            <img src={p.photoUrl} className="w-full h-full object-cover" />
                        </div>
                    )}
                    <h1 className="text-[4.5em] font-black tracking-tighter leading-none mb-4">
                        {p.firstName} <span style={{ color: design.accentColor }}>{p.lastName}</span>
                    </h1>
                    {p.jobTitle && (
                        <p className="text-[1.1em] font-black text-slate-300 uppercase tracking-[0.4em]">
                            {p.jobTitle}
                        </p>
                    )}

                    <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 mt-10 text-[0.8em] font-black text-slate-400 uppercase tracking-widest">
                        {p.email && <span>{p.email}</span>}
                        {p.phone && <span>{p.phone}</span>}
                        {p.city && <span>{p.city}</span>}
                    </div>
                </header>

                <div className="max-w-4xl mx-auto">
                    {isBrev ? (
                        renderRichText(brevContent || '', "text-[1.1em] leading-relaxed")
                    ) : (
                        data.sectionOrder.map(sid => <TimelineSection key={sid} sectionId={sid} />)
                    )}
                </div>
            </div>
        </SheetEngine>
    );
};

export const StandardCoverLetter: React.FC<TemplateProps> = ({ data, containerStyle, design, isBrev, brevContent }) => {
    const p = data.personal;
    const coverLetter = data.coverLetters?.find(l => l.content === brevContent) || { title: 'Ansökan' };

    return (
        <SheetEngine singlePageOnly={true}>
            <div className="w-[210mm] relative bg-white flex flex-col" style={{ ...containerStyle, overflow: 'hidden' }}>
                {/* Header with Accent Color */}
                <div className="w-full px-10 py-8 shrink-0 flex flex-col gap-2" style={{ backgroundColor: design.accentColor }}>
                    <h1 className="text-[3em] font-black text-white leading-none tracking-tight">
                        {p.firstName} {p.lastName}
                    </h1>
                    {p.jobTitle && (
                        <p className="text-white/80 font-bold uppercase tracking-widest text-[0.9em]">
                            {p.jobTitle}
                        </p>
                    )}
                </div>

                {/* Contact Info Bar */}
                <div className="px-10 py-5 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-x-8 gap-y-2 text-[0.85em] font-medium text-gray-600 shrink-0">
                    {p.email && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" />{p.email}</div>}
                    {p.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" />{p.phone}</div>}
                    {p.city && <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400" />{p.city}</div>}
                    {p.linkedin && <div className="flex items-center gap-2"><Linkedin className="w-3.5 h-3.5 text-gray-400" />{p.linkedin}</div>}
                </div>

                {/* Main Content Area */}
                <div className="flex-1 px-10 py-8 flex flex-col">
                    {/* Date and Subject */}
                    <div className="flex justify-between items-baseline mb-8">
                        <div className="flex-1">
                            {/* Placeholder for recipient if we had it, for now just empty space or subject */}
                            {coverLetter.title && (
                                <h2 className="text-[1.2em] font-bold text-gray-900 border-b-2 inline-block pb-1" style={{ borderColor: design.accentColor }}>
                                    {coverLetter.title}
                                </h2>
                            )}
                        </div>
                        <div className="text-gray-500 text-[0.9em] font-medium">
                            {new Date().toLocaleDateString('sv-SE', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                    </div>

                    {/* Body Content */}
                    <div className="text-[0.95em] leading-relaxed text-black rich-text flex-1">
                        {renderRichText(brevContent || '')}
                    </div>

                    {/* Sign-off Space */}
                    <div className="mt-12 text-[0.95em] font-medium text-black">
                        <p className="mb-8">{(coverLetter as any).signOff || t('sign_off_default')}</p>
                        <p className="font-bold">{p.firstName} {p.lastName}</p>
                    </div>
                </div>
            </div>
        </SheetEngine>
    );
};
