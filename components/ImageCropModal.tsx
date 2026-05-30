import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, RefreshCcw, RotateCcw, RotateCw, ZoomIn, ZoomOut, Upload, FlipHorizontal, Square, Check, User, Image as ImageIcon, ArrowLeft, Loader2 } from 'lucide-react';
import { ImageLibraryModal } from './ImageLibraryModal';
import { StockService } from '../services/StockService';
import { useTranslation } from '../utils/translations';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (base64Image: string) => void;
    initialImage?: string;
    aspectRatio?: number;
}

export const ImageCropModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialImage, aspectRatio = 1 }) => {
    const { t } = useTranslation();
    const [mode, setMode] = useState<'select' | 'camera' | 'edit'>('select');
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Transform State
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [isMirrored, setIsMirrored] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    // Drag State
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset loop
    useEffect(() => {
        if (isOpen) {
            setMode('select');
            setImageSrc(null);
            resetTransform();
        } else {
            stopCamera();
        }
    }, [isOpen]);

    const resetTransform = () => {
        setScale(1);
        setRotation(0);
        setIsMirrored(false);
        setOffset({ x: 0, y: 0 });
    };

    // --- DRAG HANDLERS ---
    const handlePointerDown = (e: React.PointerEvent) => {
        if (mode !== 'edit') return;
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || mode !== 'edit') return;
        e.preventDefault();

        const dx = e.clientX - dragStart.x;
        const dy = e.clientY - dragStart.y;

        const rad = -rotation * (Math.PI / 180);
        const rotDx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const rotDy = dx * Math.sin(rad) + dy * Math.cos(rad);

        setOffset(prev => ({
            x: prev.x + (rotDx / scale),
            y: prev.y + (rotDy / scale)
        }));

        setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handlePointerUp = () => {
        setIsDragging(false);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        setScale(s => Math.min(Math.max(0.1, s + delta), 10));
    };

    // --- CAMERA HANDLERS ---
    const startCamera = async () => {
        setMode('camera');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            alert(t('camera_error'));
            setMode('select');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.translate(canvas.width, 0);
            ctx?.scale(-1, 1);
            ctx?.drawImage(videoRef.current, 0, 0);
            setImageSrc(canvas.toDataURL('image/jpeg'));
            stopCamera();
            setMode('edit');
            resetTransform();
        }
    };

    // --- FILE HANDLER ---
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsOptimizing(true);
            setError(null);
            try {
                const reader = new FileReader();
                reader.onload = async () => {
                    try {
                        // For editing, we use 1500px to allow some zooming without blur
                        const compressed = await StockService.compressImage(reader.result as string, 1500, 0.9);
                        setImageSrc(compressed);
                        setMode('edit');
                        resetTransform();
                    } catch (err) {
                        setError(t('optimize_error'));
                    } finally {
                        setIsOptimizing(false);
                    }
                };
                reader.onerror = () => {
                    setError(t('read_error'));
                    setIsOptimizing(false);
                };
                reader.readAsDataURL(file);
            } catch (err) {
                setError(t('load_error'));
                setIsOptimizing(false);
            }
            if (e.target) e.target.value = '';
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    // --- SAVE / RENDER HANDLER ---
    const handleSave = () => {
        if (!imgRef.current) return;

        try {
            const canvas = document.createElement('canvas');
            const OUTPUT_SIZE = 600; // Reduced from 800 for better database performance
            canvas.width = OUTPUT_SIZE;
            canvas.height = OUTPUT_SIZE;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not create canvas");

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.save();
            ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.scale(scale * (isMirrored ? -1 : 1), scale);
            ctx.translate(isMirrored ? -offset.x : offset.x, offset.y);

            const img = imgRef.current;
            let drawW, drawH;
            const aspect = img.naturalWidth / img.naturalHeight;

            if (aspect > 1) {
                drawH = OUTPUT_SIZE;
                drawW = OUTPUT_SIZE * aspect;
            } else {
                drawW = OUTPUT_SIZE;
                drawH = OUTPUT_SIZE / aspect;
            }

            ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
            ctx.restore();

            // Reduced quality from 0.9 to 0.8 significantly helps with size
            onSave(canvas.toDataURL('image/jpeg', 0.8));
            onClose();
        } catch (err) {
            console.error("Save error:", err);
            setError(t('save_image_error'));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden relative">
                <div className="shrink-0 p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 z-50">
                    <h3 className="font-black text-xs uppercase tracking-widest text-gray-900 dark:text-white">
                        {isOptimizing ? t('optimizing') : mode === 'camera' ? t('take_photo') : mode === 'edit' ? t('edit_image') : t('select_image')}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors z-50 cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-900 p-4">
                    <div className="flex flex-col items-center justify-center min-h-full space-y-6">
                        {error && (
                            <div className="w-full max-w-sm p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-2xl text-[10px] font-bold text-red-500 text-center animate-in fade-in slide-in-from-top-2">
                                {error}
                            </div>
                        )}

                        {mode === 'select' && (
                            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mx-auto my-auto">
                                <button
                                    onClick={triggerFileSelect}
                                    disabled={isOptimizing}
                                    className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[2rem] cursor-pointer hover:border-brand-400 dark:hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-all group aspect-square disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <div className="bg-brand-50 dark:bg-brand-900/50 p-4 rounded-2xl mb-3 group-hover:scale-110 transition-transform">
                                        {isOptimizing ? <Loader2 className="w-8 h-8 text-brand-400 animate-spin" /> : <Upload className="w-8 h-8 text-brand-400" />}
                                    </div>
                                    <span className="font-black text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 text-center">{isOptimizing ? t('wait') : t('upload')}</span>
                                </button>

                                <button onClick={() => setIsLibraryOpen(true)} className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[2rem] cursor-pointer hover:border-brand-400 dark:hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-all group aspect-square">
                                    <div className="bg-brand-50 dark:bg-brand-900/50 p-4 rounded-2xl mb-3 group-hover:scale-110 transition-transform">
                                        <ImageIcon className="w-8 h-8 text-brand-400" />
                                    </div>
                                    <span className="font-black text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400 text-center">{t('library')}</span>
                                </button>

                                <button onClick={startCamera} className="col-span-2 flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-[2rem] cursor-pointer hover:border-brand-400 dark:hover:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/10 transition-all group">
                                    <div className="bg-brand-50 dark:bg-brand-900/50 p-3 rounded-xl mb-2 group-hover:scale-110 transition-transform">
                                        <Camera className="w-6 h-6 text-brand-400" />
                                    </div>
                                    <span className="font-black text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">{t('use_camera')}</span>
                                </button>
                            </div>
                        )}

                        {mode === 'camera' && (
                            <div className="relative w-full max-w-sm aspect-square bg-black rounded-[2rem] overflow-hidden shadow-xl flex items-center justify-center mx-auto my-auto">
                                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transform scale-x-[-1]" />
                                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex flex-col items-center gap-2 z-50">
                                    <button onClick={capturePhoto} className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:bg-white/20 transition-all active:scale-90">
                                        <div className="w-12 h-12 bg-white rounded-full"></div>
                                    </button>
                                </div>
                                <button onClick={() => { stopCamera(); setMode('select'); }} className="absolute top-4 left-4 p-3 bg-black/40 text-white rounded-xl hover:bg-black/60 transition-colors backdrop-blur-md">
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        {mode === 'edit' && imageSrc && (
                            <>
                                <div ref={containerRef} className="relative w-full max-w-[280px] sm:max-w-[320px] aspect-square shadow-2xl overflow-hidden bg-black rounded-[2rem] cursor-move touch-none border border-gray-100 dark:border-gray-700 select-none shrink-0" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onWheel={handleWheel}>
                                    <img
                                        ref={imgRef}
                                        src={imageSrc}
                                        crossOrigin={imageSrc.startsWith('data:') ? undefined : "anonymous"}
                                        alt="Edit"
                                        className="absolute top-1/2 left-1/2 w-full h-full object-cover pointer-events-none origin-center z-10"
                                        style={{ transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${isMirrored ? -scale : scale}, ${scale})` }}
                                        draggable={false}
                                    />
                                    <div className="absolute inset-0 pointer-events-none opacity-20 z-20">
                                        <div className="absolute top-1/3 left-0 w-full h-px bg-white"></div>
                                        <div className="absolute top-2/3 left-0 w-full h-px bg-white"></div>
                                        <div className="absolute top-0 left-1/3 h-full w-px bg-white"></div>
                                        <div className="absolute top-0 left-2/3 h-full w-px bg-white"></div>
                                    </div>
                                </div>

                                <div className="w-full max-w-[320px] bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 space-y-4 sm:space-y-6 shrink-0">
                                    <div className="space-y-2 sm:space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('zoom')}</span>
                                            <span className="text-[10px] font-bold text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-md">{Math.round(scale * 100)}%</span>
                                        </div>
                                        <input type="range" min="0.1" max="5" step="0.01" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-brand-400" />
                                    </div>

                                    <div className="space-y-2 sm:space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{t('rotate')}</span>
                                            <span className="text-[10px] font-bold text-brand-400 bg-brand-50 dark:bg-brand-900/30 px-2 py-0.5 rounded-md">{Math.round(rotation)}°</span>
                                        </div>
                                        <div className="flex items-center gap-3 sm:gap-4">
                                            <button onClick={() => setRotation(r => r - 90)} className="p-2 sm:p-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-xl text-gray-400 hover:text-brand-400 transition-all active:scale-95"><RotateCcw className="w-4 h-4" /></button>
                                            <input type="range" min={rotation - 45} max={rotation + 45} step="1" value={rotation} onChange={(e) => setRotation(parseFloat(e.target.value))} className="flex-1 h-1 bg-gray-100 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-brand-400" />
                                            <button onClick={() => setRotation(r => r + 90)} className="p-2 sm:p-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-xl text-gray-400 hover:text-brand-400 transition-all active:scale-95"><RotateCw className="w-4 h-4" /></button>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-2">
                                        <div className="flex gap-4">
                                            <button onClick={() => setIsMirrored(!isMirrored)} className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors ${isMirrored ? 'text-brand-400' : 'text-gray-400 hover:text-brand-400'}`}><FlipHorizontal className="w-3.5 h-3.5" /> {t('mirror')}</button>
                                            <button onClick={resetTransform} className="text-[9px] font-black text-gray-400 hover:text-brand-400 uppercase tracking-widest flex items-center gap-1.5 transition-colors"><RefreshCcw className="w-3 h-3" /> {t('reset')}</button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="shrink-0 p-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 z-50">
                    {mode === 'edit' ? (
                        <>
                            <button onClick={() => setMode('select')} className="text-gray-400 hover:text-brand-400 dark:hover:text-brand-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors"><ArrowLeft className="w-4 h-4" /> {t('change_image')}</button>
                            <button onClick={handleSave} className="bg-brand-400 hover:bg-brand-500 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-brand-400/20 flex items-center gap-2 transition-all active:scale-95"><Check className="w-4 h-4" /> {t('confirm')}</button>
                        </>
                    ) : (
                        <div className="flex-1 text-center text-[9px] font-black text-gray-300 uppercase tracking-widest">{t('image_requirements')}</div>
                    )}
                </div>
            </div>

            <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isOptimizing} />

            <ImageLibraryModal isOpen={isLibraryOpen} onClose={() => setIsLibraryOpen(false)} onSelect={(url) => { setImageSrc(url); setMode('edit'); setIsLibraryOpen(false); resetTransform(); }} />
        </div>
    );
};
