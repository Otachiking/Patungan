'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getReceiptImages, uploadReceiptImage, deleteReceiptImage } from '@/lib/db';
import type { ReceiptImage } from '@/lib/types';

interface ReceiptGalleryProps {
  projectId: string;
  readOnly?: boolean;
}

export function ReceiptGallery({ projectId, readOnly = false }: ReceiptGalleryProps) {
  const [images, setImages] = useState<ReceiptImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getReceiptImages(projectId).then(setImages);
  }, [projectId]);

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [lightboxIdx]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIdx === null) return;
      if (e.key === 'Escape') setLightboxIdx(null);
      if (e.key === 'ArrowLeft' && lightboxIdx > 0) setLightboxIdx(lightboxIdx - 1);
      if (e.key === 'ArrowRight' && lightboxIdx < images.length - 1) setLightboxIdx(lightboxIdx + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIdx, images.length]);

  useEffect(() => {
    const el = imgContainerRef.current;
    if (!el) return;
    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Adjust zoom factor based on deltaY magnitude (trackpad vs mouse wheel)
      const zoomFactor = Math.abs(e.deltaY) < 50 ? 0.05 : 0.25;
      setScale((s) => Math.max(0.5, Math.min(5, s + (e.deltaY < 0 ? zoomFactor : -zoomFactor))));
    };
    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleNativeWheel);
  }, [lightboxIdx]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploads = Array.from(files).map((file, i) =>
        uploadReceiptImage(projectId, file, images.length + i)
      );
      const results = await Promise.all(uploads);
      const successful = results.filter(Boolean) as ReceiptImage[];
      setImages((prev) => [...prev, ...successful]);
      if (successful.length < files.length) {
        setErrorMsg('Beberapa gambar gagal diunggah. Pastikan Supabase Storage "receipt-images" sudah disetup.');
      } else {
        setErrorMsg(null);
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(img: ReceiptImage) {
    setDeletingId(img.id);
    try {
      await deleteReceiptImage(img);
      setImages((prev) => prev.filter((i) => i.id !== img.id));
      if (lightboxIdx !== null && images[lightboxIdx]?.id === img.id) {
        setLightboxIdx(null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  const hasImages = images.length > 0;

  return (
    <div className="space-y-3">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-xl flex items-start gap-2">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <p>{errorMsg}</p>
        </div>
      )}

      {/* Thumbnails strip */}
      {hasImages && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide snap-x">
          {images.map((img, idx) => (
            <div
              key={img.id}
              className="relative shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border border-tinta/15 group snap-start cursor-pointer"
              onClick={() => setLightboxIdx(idx)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.public_url}
                alt={`Struk ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-150 group-hover:scale-105"
              />
              {!readOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(img);
                  }}
                  disabled={deletingId === img.id}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  title="Hapus foto"
                >
                  {deletingId === img.id ? '…' : '✕'}
                </button>
              )}
            </div>
          ))}

          {/* Add more button (in strip) */}
          {!readOnly && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-dashed border-tinta/20 flex flex-col items-center justify-center gap-1 text-tinta-pudar hover:border-stamp/40 hover:text-stamp transition-all duration-150 snap-start"
            >
              <span className="text-xl">{uploading ? '⏳' : '＋'}</span>
              <span className="text-[10px] font-mono">Foto</span>
            </button>
          )}
        </div>
      )}

      {/* Upload drop zone (shown when empty) */}
      {!readOnly && !hasImages && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="relative border-2 border-dashed border-tinta/20 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-stamp/40 hover:bg-stamp/[0.02] transition-all duration-200 group"
        >
          <span className="text-3xl">📎</span>
          <div className="text-center">
            <p className="text-sm font-medium text-tinta-pudar group-hover:text-tinta transition-colors">
              {uploading ? 'Mengunggah...' : 'Tambah Foto Struk'}
            </p>
            <p className="text-xs text-tinta-pudar/60 mt-0.5">Klik atau drag & drop · JPG, PNG, HEIC</p>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {/* Lightbox */}
      {lightboxIdx !== null && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center overflow-hidden"
          onClick={() => setLightboxIdx(null)}
        >
          {/* Nav prev */}
          {lightboxIdx > 0 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white text-xl flex items-center justify-center transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx - 1); }}
            >
              ‹
            </button>
          )}

          {/* Image Area */}
          <div 
            ref={imgContainerRef}
            className="relative w-full h-full flex items-center justify-center overflow-hidden" 
            onClick={() => setLightboxIdx(null)}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[lightboxIdx].public_url}
              alt={`Struk ${lightboxIdx + 1}`}
              onClick={(e) => {
                e.stopPropagation();
                if (e.detail === 2) setScale((s) => Math.min(5, s + 1));
                else if (e.detail === 3) setScale(1);
              }}
              onMouseDown={handleMouseDown}
              style={{ 
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transition: isDragging ? 'none' : 'transform 150ms ease-out',
                cursor: isDragging ? 'grabbing' : 'grab'
              }}
              className="max-w-[92vw] max-h-[85vh] object-contain rounded-xl shadow-2xl pointer-events-auto select-none"
            />
            
            {/* Zoom controls */}
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setScale(s => Math.min(5, s + 0.25))} className="w-10 h-10 bg-white/10 hover:bg-white/25 text-white rounded-full flex items-center justify-center text-xl transition-colors">
                ＋
              </button>
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))} className="w-10 h-10 bg-white/10 hover:bg-white/25 text-white rounded-full flex items-center justify-center text-xl transition-colors">
                −
              </button>
            </div>

            <div className="absolute top-4 right-4 flex gap-2 z-10" onClick={(e) => e.stopPropagation()}>
              {!readOnly && (
                <button
                  onClick={() => handleDelete(images[lightboxIdx])}
                  disabled={deletingId === images[lightboxIdx].id}
                  className="w-10 h-10 rounded-full bg-red-600/80 hover:bg-red-600 text-white text-sm flex items-center justify-center transition-colors shadow-lg"
                  title="Hapus"
                >
                  🗑
                </button>
              )}
              <button
                onClick={() => setLightboxIdx(null)}
                className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-colors shadow-lg"
              >
                ✕
              </button>
            </div>
            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/60 text-xs font-mono bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm z-10">
              {lightboxIdx + 1} / {images.length}
            </p>
          </div>

          {/* Nav next */}
          {lightboxIdx < images.length - 1 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 text-white text-xl flex items-center justify-center transition-colors z-10"
              onClick={(e) => { e.stopPropagation(); setLightboxIdx(lightboxIdx + 1); }}
            >
              ›
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
