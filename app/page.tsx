'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ResumeData, Platform, MatchResult, SearchProgress } from '@/lib/scrapers/types';
import { ResumePreview } from '@/app/components/ResumePreview';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const PLATFORMS: { id: Platform; label: string; icon: string }[] = [
  { id: 'indeed', label: 'Indeed', icon: 'IN' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'LI' },
  { id: 'instahyre', label: 'Instahyre', icon: 'IH' },
];

function ScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 70
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
      : score >= 40
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30'
        : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30';
  return (
    <div
      className={`flex items-center justify-center w-12 h-12 rounded-full text-base font-bold border-2 shrink-0 ${cls}`}
    >
      {score}
    </div>
  );
}

function PlatformIcon({ platform, active = false }: { platform: Platform; active?: boolean }) {
  const labels: Record<Platform, string> = { indeed: 'IN', linkedin: 'LI', instahyre: 'IH' };

  if (active) {
    return (
      <span className="flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold shrink-0 bg-primary-foreground/20 text-primary-foreground">
        {labels[platform]}
      </span>
    );
  }

  const styles: Record<Platform, string> = {
    indeed: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
    linkedin: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
    instahyre: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  };
  return (
    <span
      className={`flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-bold shrink-0 ${styles[platform]}`}
    >
      {labels[platform]}
    </span>
  );
}

function JobCard({ result, index }: { result: MatchResult; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className="bg-background/50 backdrop-blur-sm border-border/40 hover:border-primary/50 transition-all cursor-pointer mb-3 animate-in fade-in slide-in-from-bottom-4 duration-500"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="p-5 flex items-start gap-4">
        <ScoreBadge score={result.matchScore} />
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold mb-1 leading-tight">{result.job.title}</div>
          <div className="text-sm font-medium text-indigo-500 dark:text-violet-400 mb-1">
            {result.job.company}
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground mt-2">
            <span className="flex items-center gap-1">📍 {result.job.location}</span>
            <span className="flex items-center gap-1">
              <PlatformIcon platform={result.job.platform} /> {result.job.platform}
            </span>
            {result.job.salary && (
              <span className="flex items-center gap-1">💰 {result.job.salary}</span>
            )}
            {result.job.postedDate && (
              <span className="flex items-center gap-1">🕒 {result.job.postedDate}</span>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <CardContent className="px-5 pb-5 pt-0 border-t border-border/40 mt-4 animate-in slide-in-from-top-2">
          <div className="pt-4">
            {result.matchedSkills.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-emerald-500 mb-1.5 uppercase tracking-wide">
                  ✅ Matched Skills
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.matchedSkills.map((s, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {result.missingSkills.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-rose-500 mb-1.5 uppercase tracking-wide">
                  ⚠️ Missing Skills
                </div>
                <div className="flex flex-wrap gap-1">
                  {result.missingSkills.map((s, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="text-sm text-muted-foreground italic mt-3 leading-relaxed">
              &quot;{result.summary}&quot;
            </div>
            <div className="mt-4">
              <a
                href={result.job.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
              >
                <Button variant="outline" size="sm">
                  View on {result.job.platform} &rarr;
                </Button>
              </a>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function HomePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

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
  const [isProfileCollapsed, setIsProfileCollapsed] = useState(false);

  // Search Results States
  const [results, setResults] = useState<MatchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [searchError, setSearchError] = useState<string | null>(null);
  const [queryNote, setQueryNote] = useState<string | null>(null);

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState<'score' | 'date'>('score');

  const abortRef = useRef<AbortController | null>(null);

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

      const res = await fetch('/api/upload-resume', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Upload failed');
      setResumeData(data.data as ResumeData);
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

  const startSearch = async () => {
    if (!resumeData || !keywords || !location || selectedPlatforms.length === 0) return;

    setSearching(true);
    setIsProfileCollapsed(true);
    setSearchError(null);
    setResults([]);
    setProgress({ completed: 0, total: 0 });
    setStatusMessage('Initializing search...');
    setQueryNote(null);

    abortRef.current = new AbortController();

    // Scroll to results area gracefully
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    try {
      const params = { keywords, location, platforms: selectedPlatforms, resumeData };
      const res = await fetch('/api/search-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Search failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data: SearchProgress = JSON.parse(line.slice(6));

            switch (data.type) {
              case 'status':
                setStatusMessage(data.message || '');
                if (data.total) setProgress((p) => ({ ...p, total: data.total! }));
                break;
              case 'jobs':
                setStatusMessage(data.message || '');
                break;
              case 'result':
                if (data.result) {
                  setResults((prev) => {
                    const next = [...prev, data.result!];
                    next.sort((a, b) => b.matchScore - a.matchScore);
                    return next;
                  });
                }
                if (data.completed && data.total) {
                  setProgress({ completed: data.completed, total: data.total });
                  setStatusMessage(data.message || '');
                }
                break;
              case 'done':
                if (data.results) setResults(data.results);
                if (data.queryNote) setQueryNote(data.queryNote);
                setSearching(false);
                setStatusMessage(data.message || 'Done!');
                break;
              case 'error':
                setSearchError(data.message || 'Search failed');
                setSearching(false);
                break;
            }
          } catch {
            // skip invalid JSON
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setSearchError(err instanceof Error ? err.message : 'Search failed');
      setSearching(false);
    }
  };

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const isReady = resumeData && keywords.trim() && location.trim() && selectedPlatforms.length > 0;

  // Apply filters
  const filteredResults = results.filter((r) => {
    if (platformFilter !== 'all' && r.job.platform !== platformFilter) return false;
    if (r.matchScore < minScore) return false;
    return true;
  });

  // Sort: query-matching jobs first, then by score within each group
  filteredResults.sort((a, b) => {
    const aRelevant = (a.queryMatch && a.locationMatch) ? 1 : 0;
    const bRelevant = (b.queryMatch && b.locationMatch) ? 1 : 0;
    if (aRelevant !== bRelevant) return bRelevant - aRelevant;
    if (sortBy === 'score') return b.matchScore - a.matchScore;
    return 0;
  });

  const avgScore = filteredResults.length
    ? Math.round(filteredResults.reduce((sum, r) => sum + r.matchScore, 0) / filteredResults.length)
    : 0;

  const platformCounts = results.reduce(
    (acc, r) => {
      acc[r.job.platform] = (acc[r.job.platform] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  const topPlatform = Object.entries(platformCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <main className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto flex flex-col gap-10">
      <div className="text-center relative z-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 text-foreground/90">
          Find Your{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-sky-500/80">
            Perfect Job
          </span>{' '}
          Match
        </h1>
        <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto leading-relaxed">
          Upload your resume, pick your platforms, and let AI find the jobs that match your skills.
          We search Indeed, LinkedIn, and Instahyre in real-time.
        </p>
      </div>

      <div className="flex flex-col gap-6 relative z-10 bg-background/40 backdrop-blur-xl border border-border/50 p-6 sm:p-8 rounded-3xl shadow-2xl">
        {/* Resume Upload */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              📄 Your Resume
            </label>
            {resumeData && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setIsProfileCollapsed(!isProfileCollapsed)}
              >
                {isProfileCollapsed ? 'Expand Profile ↓' : 'Collapse Profile ↑'}
              </Button>
            )}
          </div>

          {!isProfileCollapsed && (
            <div
              className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer transition-all ${isDragOver ? 'border-primary bg-primary/5' : resumeData ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border/60 hover:border-primary/40 hover:bg-muted/30'}`}
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
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-muted border-t-violet-500 rounded-full animate-spin" />
                  <div className="text-sm font-medium">Parsing resume...</div>
                </div>
              ) : resumeData ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="text-4xl mb-2">✅</div>
                  <div className="text-sm font-medium">
                    <strong>{resumeFile?.name}</strong> — parsed successfully
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Click to upload a different file
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="text-4xl mb-2">📎</div>
                  <div className="text-sm font-medium">
                    Drag & drop your PDF resume here, or{' '}
                    <strong className="text-violet-400">click to browse</strong>
                  </div>
                  <div className="text-xs text-muted-foreground">Supports PDF format</div>
                </div>
              )}
            </div>
          )}

          {uploadError && !isProfileCollapsed && <div className="text-rose-400 text-sm mt-1">⚠️ {uploadError}</div>}
          {resumeData && !isProfileCollapsed && <ResumePreview resumeData={resumeData} />}

          {resumeData && isProfileCollapsed && (
            <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📄</span>
                <div>
                  <div className="font-semibold text-sm">{resumeFile?.name || 'Resume Uploaded'}</div>
                  <div className="text-xs text-muted-foreground">{resumeData.skills.length} skills extracted</div>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProfileCollapsed(false)}
              >
                View Details
              </Button>
            </div>
          )}
        </div>

        {/* Search Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              🔍 Job Title / Keywords
            </label>
            <Input
              placeholder="e.g. Software Engineer, Data Analyst"
              className="h-14 bg-background/50 backdrop-blur-sm border-border"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
            {resumeData?.recommendedJobTitles && resumeData.recommendedJobTitles.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[11px] text-muted-foreground mr-1 uppercase font-semibold">
                  Suggestions:
                </span>
                {resumeData.recommendedJobTitles.map((title, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/10 text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() => setKeywords(title)}
                  >
                    {title}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              📍 Location
            </label>
            <Input
              placeholder="e.g. Bangalore, Remote, New York"
              className="h-14 bg-background/50 backdrop-blur-sm border-border"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            {resumeData?.recommendedLocations && resumeData.recommendedLocations.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                <span className="text-[11px] text-muted-foreground mr-1 uppercase font-semibold">
                  Suggestions:
                </span>
                {resumeData.recommendedLocations.map((loc, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/10 text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() => setLocation(loc)}
                  >
                    {loc}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Platform Selection */}
        <div className="flex flex-col gap-2 mt-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            🌐 Platforms
          </label>
          <div className="flex flex-wrap gap-2.5">
            {PLATFORMS.map(({ id, label }) => {
              const isActive = selectedPlatforms.includes(id);
              return (
                <Badge
                  key={id}
                  variant={isActive ? 'default' : 'outline'}
                  className={`cursor-pointer px-4 py-2 transition-all text-sm font-medium ${isActive ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm' : 'bg-background/50 border-border/60 hover:border-primary/40 text-foreground'}`}
                  onClick={() => togglePlatform(id)}
                >
                  <PlatformIcon platform={id} active={isActive} />
                  <span className="ml-2">{label}</span>
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Search Button */}
        <div className="mt-4">
          <Button
            size="lg"
            className="w-full h-14 text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-all hover:-translate-y-0.5"
            onClick={startSearch}
            disabled={!isReady || searching}
          >
            {searching ? '🔍 Searching and Matching...' : '🚀 Find Matching Jobs'}
          </Button>
        </div>
      </div>

      {/* Results Section */}
      <div ref={resultsRef} className="pt-4 scroll-mt-6">
        {(searching || results.length > 0 || searchError) && (
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold">
              Job{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-sky-500/80">
                Matches
              </span>
            </h2>
          </div>
        )}

        {/* Stats */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-background/40 backdrop-blur-md border-border/50 text-center py-6">
              <div className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-sky-500/80">
                {results.length}
              </div>
              <div className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">
                Total Jobs
              </div>
            </Card>
            <Card className="bg-background/40 backdrop-blur-md border-border/50 text-center py-6">
              <div className="text-3xl font-extrabold text-emerald-500">{avgScore}%</div>
              <div className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">
                Avg Match
              </div>
            </Card>
            <Card className="bg-background/40 backdrop-blur-md border-border/50 text-center py-6">
              <div className="text-3xl font-extrabold text-violet-400">
                {filteredResults.filter((r) => r.matchScore >= 70).length}
              </div>
              <div className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">
                Strong Matches
              </div>
            </Card>
            <Card className="bg-background/40 backdrop-blur-md border-border/50 text-center py-6">
              <div className="text-3xl font-extrabold text-sky-400">
                {topPlatform ? topPlatform[0] : '-'}
              </div>
              <div className="text-xs font-semibold text-muted-foreground mt-1 uppercase tracking-wider">
                Top Platform
              </div>
            </Card>
          </div>
        )}

        {/* Progress Display */}
        {searching && (
          <Card className="bg-background/40 backdrop-blur-md border-border/50 p-8 text-center mb-8">
            <div className="w-12 h-12 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <div className="text-lg font-medium mb-4">{statusMessage}</div>
            {progress.total > 0 && (
              <div className="max-w-md mx-auto">
                <div className="h-2 bg-background/50 rounded-full overflow-hidden border border-border/50">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                  />
                </div>
                <div className="text-sm text-muted-foreground mt-2 font-medium">
                  {progress.completed} / {progress.total} jobs matched
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Error */}
        {searchError && (
          <Card className="bg-rose-500/10 border-rose-500/30 p-8 text-center mb-8">
            <div className="text-5xl mb-4">⚠️</div>
            <div className="text-lg font-semibold text-rose-500 mb-6">{searchError}</div>
            <Button
              variant="outline"
              className="border-rose-500/30 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300"
              onClick={startSearch}
            >
              Try Again
            </Button>
          </Card>
        )}

        {/* Query Summary Note */}
        {queryNote && results.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
            <span className="text-lg">📋</span>
            <span className="text-sm font-semibold text-primary">
              {queryNote}
            </span>
          </div>
        )}

        {/* Filters */}
        {results.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-6 bg-background/30 p-4 rounded-xl border border-border/40">
            <select
              className="bg-background/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
            >
              <option value="all">All Platforms</option>
              <option value="indeed">Indeed</option>
              <option value="linkedin">LinkedIn</option>
              <option value="instahyre">Instahyre</option>
            </select>
            <select
              className="bg-background/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
            >
              <option value={0}>Min Score: Any</option>
              <option value={30}>Min Score: 30%</option>
              <option value={50}>Min Score: 50%</option>
              <option value={70}>Min Score: 70%</option>
            </select>
            <select
              className="bg-background/50 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'score' | 'date')}
            >
              <option value="score">Sort: Best Match</option>
              <option value="date">Sort: Most Recent</option>
            </select>
            <div className="ml-auto text-sm text-muted-foreground font-medium">
              Showing {filteredResults.length} of {results.length}
            </div>
          </div>
        )}

        {/* Job List */}
        <div className="flex flex-col gap-3">
          {filteredResults.map((result, i) => (
            <JobCard key={result.job.id} result={result} index={i} />
          ))}
        </div>

        {/* Empty state */}
        {!searching &&
          !searchError &&
          results.length === 0 &&
          resumeData &&
          keywords &&
          location &&
          selectedPlatforms.length > 0 && (
            <Card className="bg-background/40 backdrop-blur-md border-border/50 text-center py-16 mt-8">
              <div className="text-6xl mb-4">🔍</div>
              <div className="text-xl font-bold mb-2">Ready to Search</div>
              <div className="text-muted-foreground max-w-sm mx-auto">
                Click &quot;Find Matching Jobs&quot; above to start scanning for your next
                opportunity.
              </div>
            </Card>
          )}
      </div>
    </main>
  );
}
