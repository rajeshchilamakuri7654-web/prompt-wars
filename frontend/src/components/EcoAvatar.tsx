'use client';

import React, { useState, useCallback, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, Leaf, Download } from 'lucide-react';
import styles from './EcoAvatar.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const ACCEPTED_TYPES  = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES  = 5 * 1024 * 1024; // 5 MB

/** Exact AI prompt shown to users for transparency */
const PROMPT_DISCLOSURE =
  'Eco-warrior portrait, lush tropical jungle background, soft golden hour rim lighting, ' +
  'photorealistic, 8K. CRITICAL: clothing unchanged · exact natural likeness · no facial shadows.';

/**
 * EcoAvatar Component.
 *
 * Implements a glassmorphism drag-and-drop file upload interface that allows
 * users to upload their photo (JPEG/PNG/WebP, up to 5MB) and calls the backend
 * AI model to generate a stylized "eco warrior" portrait.
 *
 * Adheres to WCAG 2.1 AAA accessibility requirements with full keyboard support,
 * visual status indicators (spinners, alerts), and proper aria-labels/roles.
 *
 * @returns React TSX element representing the upload card.
 */
export function EcoAvatar() {
  const [previewUrl,  setPreviewUrl]  = useState<string | null>(null);
  const [resultUrl,   setResultUrl]   = useState<string | null>(null);
  const [file,        setFile]        = useState<File | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [isDragOver,  setIsDragOver]  = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  /* ── File validation & preview ─────────────────────────────────────────── */
  const processFile = useCallback((f: File) => {
    setError(null);
    setResultUrl(null);

    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError('Only JPEG, PNG, or WebP images are accepted.');
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setError('File exceeds the 5 MB limit. Please compress your image.');
      return;
    }

    setFile(f);
    const objectUrl = URL.createObjectURL(f);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev); // Free previous blob URL
      return objectUrl;
    });
  }, []);

  /* ── Drag events ───────────────────────────────────────────────────────── */
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  };

  /* ── Native input change ───────────────────────────────────────────────── */
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) processFile(selected);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  /* ── Keyboard: open dialog on Enter/Space on the drop zone ────────────── */
  const handleZoneKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  /* ── Generate ──────────────────────────────────────────────────────────── */
  const handleGenerate = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setResultUrl(null);

    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(`${API_BASE}/api/avatar/generate`, {
        method: 'POST',
        body:   formData,
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        throw new Error(json.error || `Request failed with status ${response.status}`);
      }

      setResultUrl(json.imageUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.card} aria-labelledby="eco-avatar-title">
      {/* Header */}
      <div className={styles.header}>
        <h2 id="eco-avatar-title" className={styles.title}>
          AI Eco-Avatar
        </h2>
        <p className={styles.subtitle}>
          Upload your photo and transform into an eco-warrior
        </p>
      </div>

      {/* Drop zone */}
      {!previewUrl && (
        <div
          className={`${styles.dropZone} ${isDragOver ? styles.dragOver : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onKeyDown={handleZoneKeyDown}
          tabIndex={0}
          role="button"
          aria-label="Upload a photo. Press Enter or Space to open the file dialog, or drag and drop an image here."
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            className={styles.fileInput}
            onChange={handleInputChange}
            aria-label="Photo file input"
            tabIndex={-1}
          />
          <Upload size={28} className={styles.dropIcon} aria-hidden="true" />
          <p className={styles.dropText}>Drag &amp; drop or click to upload</p>
          <p className={styles.dropSubtext}>JPEG, PNG, WebP · Max 5 MB</p>
        </div>
      )}

      {/* Image preview and result grid */}
      {previewUrl && (
        <div className={styles.imageGrid}>
          {/* Original */}
          <div className={styles.imageSlot}>
            <span className={styles.slotLabel}>Your Photo</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Your uploaded photo preview"
              className={styles.previewImg}
            />
            {/* Allow re-uploading */}
            <button
              type="button"
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                       fontSize: '0.7rem', color: 'hsl(var(--text-muted))', marginTop: 4 }}
              onClick={() => {
                setPreviewUrl(null);
                setFile(null);
                setResultUrl(null);
                setError(null);
              }}
              aria-label="Remove uploaded photo and start over"
            >
              ✕ Remove
            </button>
          </div>

          {/* Generated result */}
          <div className={styles.imageSlot}>
            <span className={styles.slotLabel}>Eco Avatar</span>
            {resultUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resultUrl}
                alt="AI-generated eco warrior avatar"
                className={styles.resultImg}
              />
            ) : (
              <div className={styles.imagePlaceholder} aria-label="Generated avatar will appear here">
                {loading
                  ? <div className={styles.spinner} aria-label="Generating your avatar…" role="status" />
                  : <Leaf size={24} aria-hidden="true" />
                }
              </div>
            )}
          </div>
        </div>
      )}

      {/* Download link */}
      {resultUrl && (
        <a
          href={resultUrl}
          download="eco-avatar.png"
          target="_blank"
          rel="noreferrer"
          className={styles.downloadLink}
          aria-label="Download your eco avatar image"
        >
          <Download size={14} aria-hidden="true" />
          Download Eco Avatar
        </a>
      )}

      {/* Error state */}
      {error && (
        <p className={styles.errorMsg} role="alert">
          ⚠ {error}
        </p>
      )}

      {/* Generate button */}
      {file && !resultUrl && (
        <button
          type="button"
          className={styles.generateBtn}
          onClick={handleGenerate}
          disabled={loading}
          aria-label="Generate AI eco avatar from uploaded photo"
          aria-busy={loading}
        >
          {loading ? (
            <>
              <span className={styles.spinner} role="status" aria-label="Generating" />
              Generating Avatar…
            </>
          ) : (
            <>
              <Leaf size={16} aria-hidden="true" />
              Generate Eco Avatar
            </>
          )}
        </button>
      )}

      {/* Prompt transparency disclosure */}
      <div className={styles.promptDisclosure}>
        <span className={styles.promptLabel}>AI Prompt Used:</span>
        {PROMPT_DISCLOSURE}
      </div>
    </section>
  );
}
