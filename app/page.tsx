'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ResumeData, Platform } from '@/lib/scrapers/types';
import { ResumePreview } from '@/app/components/ResumePreview';

const PLATFORMS: { id: Platform; label: string; icon: string }[] = [
  { id: 'indeed', label: 'Indeed', icon: 'IN' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'LI' },
  { id: 'instahyre', label: 'Instahyre', icon: 'IH' },
];

export default function HomePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [keywords, setKeywords] = useState('');
  const [location, setLocation] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([
    'indeed',
    'linkedin',
    'instahyre',
  ]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const togglePlatform = (id: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.name.endsWith('.pdf')) {
      setUploadError('Please upload a PDF file');
      return;
    }

    setResumeFile(file);
    setUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const res = await fetch('/api/upload-resume', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      const parsedData = data.data as ResumeData;
      setResumeData(parsedData);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to parse resume');
      setResumeFile(null);
    } finally {
      setUploading(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleSearch = () => {
    if (!resumeData || !keywords || !location || selectedPlatforms.length === 0) return;

    // Store search params in sessionStorage for the results page
    sessionStorage.setItem(
      'searchParams',
      JSON.stringify({
        keywords,
        location,
        platforms: selectedPlatforms,
        resumeData,
      })
    );

    router.push('/results');
  };

  const isReady = resumeData && keywords.trim() && location.trim() && selectedPlatforms.length > 0;

  return (
    <main className="hero">
      <div className="hero-content">
        <h1>
          Find Your <span className="gradient-text">Perfect Job</span> Match
        </h1>
        <p className="hero-subtitle">
          Upload your resume, pick your platforms, and let AI find the jobs that match your skills.
          We search Indeed, LinkedIn, and Instahyre in real-time.
        </p>

        <div className="hero-form">
          {/* Resume Upload */}
          <div className="form-group">
            <label className="form-label">📄 Your Resume</label>
            <div
              className={`dropzone ${isDragOver ? 'active' : ''} ${resumeData ? 'uploaded' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              {uploading ? (
                <>
                  <div className="progress-spinner" />
                  <div className="dropzone-text">Parsing resume...</div>
                </>
              ) : resumeData ? (
                <>
                  <div className="dropzone-icon">✅</div>
                  <div className="dropzone-text">
                    <strong>{resumeFile?.name}</strong> — parsed successfully
                  </div>
                  <div className="dropzone-hint">Click to upload a different file</div>
                </>
              ) : (
                <>
                  <div className="dropzone-icon">📎</div>
                  <div className="dropzone-text">
                    Drag & drop your PDF resume here, or{' '}
                    <strong style={{ color: 'var(--accent-purple)' }}>click to browse</strong>
                  </div>
                  <div className="dropzone-hint">Supports PDF format</div>
                </>
              )}
            </div>

            {uploadError && (
              <div style={{ color: 'var(--accent-pink)', fontSize: '13px', marginTop: '6px' }}>
                ⚠️ {uploadError}
              </div>
            )}

            {resumeData && <ResumePreview resumeData={resumeData} />}
          </div>

          {/* Search Fields */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">🔍 Job Title / Keywords</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Software Engineer, Data Analyst"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
              {resumeData?.recommendedJobTitles && resumeData.recommendedJobTitles.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <span
                    style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '24px' }}
                  >
                    Suggestions:
                  </span>
                  {resumeData.recommendedJobTitles.map((title, i) => (
                    <button
                      key={i}
                      className="skill-tag"
                      style={{ cursor: 'pointer', border: 'none', background: 'var(--bg-glass)' }}
                      onClick={() => setKeywords(title)}
                      title="Click to use this title"
                    >
                      {title}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">📍 Location</label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Bangalore, Remote, New York"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              {resumeData?.recommendedLocations && resumeData.recommendedLocations.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  <span
                    style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '24px' }}
                  >
                    Suggestions:
                  </span>
                  {resumeData.recommendedLocations.map((loc, i) => (
                    <button
                      key={i}
                      className="skill-tag"
                      style={{ cursor: 'pointer', border: 'none', background: 'var(--bg-glass)' }}
                      onClick={() => setLocation(loc)}
                      title="Click to use this location"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Platform Selection */}
          <div className="form-group">
            <label className="form-label">🌐 Platforms</label>
            <div className="platform-toggle">
              {PLATFORMS.map(({ id, label, icon }) => (
                <button
                  key={id}
                  className={`platform-chip ${selectedPlatforms.includes(id) ? 'active' : ''}`}
                  onClick={() => togglePlatform(id)}
                >
                  <span className={`platform-icon ${id}`}>{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Button */}
          <button
            className="btn-primary"
            onClick={handleSearch}
            disabled={!isReady}
            style={{ width: '100%', padding: '16px', fontSize: '17px' }}
          >
            🚀 Find Matching Jobs
          </button>
        </div>
      </div>
    </main>
  );
}
