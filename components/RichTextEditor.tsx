
import React, { useRef, useEffect } from 'react';
import { Bold, List, MessageSquare, AlignLeft, AlignCenter, AlignRight, Type } from 'lucide-react';
import { AgnetaAvatar } from './AgnetaAvatar';
import { useTranslation } from '../utils/translations';

interface Props {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    context?: string;
    onOpenAgneta?: (currentHtml: string, context: string) => void;
    maxLength?: number;
    hideAgnetaButton?: boolean;
    minHeight?: string;
}

export const RichTextEditor: React.FC<Props> = ({ value, onChange, placeholder, context, onOpenAgneta, hideAgnetaButton, maxLength, minHeight = '600px' }) => {
    const { t } = useTranslation();
    const editorRef = useRef<HTMLDivElement>(null);

    // Ensure the editor content updates when the 'value' prop changes externally
    useEffect(() => {
        if (editorRef.current && value !== editorRef.current.innerHTML) {
            // Only update if we are not currently typing OR if the value changed significantly 
            // (e.g. from an external tool like Agneta)
            if (document.activeElement !== editorRef.current || value === "" || value.includes('<b>')) {
                editorRef.current.innerHTML = value;
            }
        }
    }, [value]);

    const handleInput = () => {
        if (!editorRef.current) return;

        let content = editorRef.current.innerHTML;
        const textLength = editorRef.current.textContent?.length || 0;

        if (maxLength && textLength > maxLength) {
            // Optional: trim or warn?
            // For better UX, we just warn visually, but we could enforce it.
            // Enforcing strict length in contentEditable is complex/buggy.
            // Let's rely on the visual indicator for now.
        }

        onChange(content);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!maxLength || !editorRef.current) return;

        const textLength = editorRef.current.textContent?.length || 0;
        const isControlKey = e.key === 'Backspace' || e.key === 'Delete' || e.ctrlKey || e.metaKey || e.key.includes('Arrow');

        if (textLength >= maxLength && !isControlKey) {
            e.preventDefault();
        }
    }

    const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const sizePx = e.target.value;
        if (!sizePx || !editorRef.current) return;
        
        // 1. Temporarily apply size 7 (which translates to <font size="7">)
        document.execCommand('fontSize', false, '7');
        
        // 2. Find all font tags with size 7 and convert them to spans with exact pixel sizes
        const fontElements = editorRef.current.querySelectorAll('font[size="7"]');
        fontElements.forEach(font => {
            const span = document.createElement('span');
            span.style.fontSize = `${sizePx}px`;
            span.innerHTML = font.innerHTML;
            font.parentNode?.replaceChild(span, font);
        });
        
        if (editorRef.current) {
            editorRef.current.focus();
            onChange(editorRef.current.innerHTML);
        }
        
        // Reset the select back to "Stl"
        e.target.value = "";
    };

    const execCommand = (command: string, value: any = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            editorRef.current.focus();
            onChange(editorRef.current.innerHTML);
        }
    };

    const textLength = editorRef.current?.textContent?.length || (value ? value.replace(/<[^>]*>/g, '').length : 0);
    const isApproachingLimit = maxLength && textLength > maxLength * 0.9;
    const isOverLimit = maxLength && textLength >= maxLength;

    return (
        <div className={`relative border rounded-3xl bg-white dark:bg-gray-800 focus-within:ring-2 focus-within:ring-brand-400 transition-all flex flex-col overflow-visible shadow-sm ${isOverLimit ? 'border-red-400 focus-within:ring-red-400' : 'border-gray-200 dark:border-gray-700'}`}>
            <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 rounded-t-3xl">
                <div className="flex items-center gap-1">
                    <button onClick={() => execCommand('bold')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 transition-colors" title="Fetstil"><Bold className="w-4 h-4" /></button>
                    <button onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 transition-colors" title="Punktlista"><List className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
                    <button onClick={() => execCommand('justifyLeft')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 transition-colors" title="Vänsterställt"><AlignLeft className="w-4 h-4" /></button>
                    <button onClick={() => execCommand('justifyCenter')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 transition-colors" title="Centrerat"><AlignCenter className="w-4 h-4" /></button>
                    <button onClick={() => execCommand('justifyRight')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-400 transition-colors" title="Högerställt"><AlignRight className="w-4 h-4" /></button>
                    <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
                    <div className="flex items-center">
                        <Type className="w-3.5 h-3.5 text-gray-400 mr-2" />
                        <select
                            onChange={handleFontSizeChange}
                            className="bg-transparent border-none text-[10px] font-black uppercase text-gray-500 outline-none cursor-pointer"
                            defaultValue=""
                        >
                            <option value="" disabled hidden>Stl</option>
                            <option value="8">8</option>
                            <option value="9">9</option>
                            <option value="10">10</option>
                            <option value="11">11</option>
                            <option value="12">12</option>
                            <option value="14">14</option>
                            <option value="16">16</option>
                            <option value="18">18</option>
                            <option value="20">20</option>
                            <option value="22">22</option>
                            <option value="24">24</option>
                            <option value="26">26</option>
                            <option value="28">28</option>
                            <option value="36">36</option>
                            <option value="48">48</option>
                        </select>
                    </div>
                </div>

                {onOpenAgneta && !hideAgnetaButton && (
                    <button
                        onClick={() => onOpenAgneta(value, context || t('content'))}
                        className="flex items-center gap-2 pl-2 pr-4 py-1.5 bg-violet-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-violet-700 transition-all shadow-lg shadow-violet-600/20 group"
                    >
                        <div className="w-6 h-6 rounded-lg overflow-hidden bg-white/10 p-0.5 shrink-0">
                            <AgnetaAvatar />
                        </div>
                        {t ? t('ask_agneta') : 'Fråga Agneta'}
                    </button>
                )}
            </div>

            <div className="relative">
                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    className="w-full border-none focus:outline-none focus:ring-0 text-sm leading-relaxed p-5 bg-white dark:bg-gray-800 dark:text-white rich-text rounded-b-3xl"
                    style={{ minHeight }}
                />
                {!value && (
                    <div className="absolute top-5 left-5 text-gray-400 text-sm pointer-events-none italic">
                        {placeholder || "Skriv ner dina tankar här, så hjälper Agneta dig att formulera dem proffsigt..."}
                    </div>
                )}
            </div>

            {maxLength && (
                <div className={`absolute bottom-4 right-4 px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm border ${isOverLimit ? 'bg-red-50 text-red-500 border-red-100' : isApproachingLimit ? 'bg-amber-50 text-amber-500 border-amber-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                    {textLength} / {maxLength} tecken
                </div>
            )}
        </div>
    );
};
