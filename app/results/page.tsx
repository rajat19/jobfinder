'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { MatchResult, Platform, SearchProgress } from '@/lib/scrapers/types';

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 70 ? 'score-high' : score >= 40 ? 'score-medium' : 'score-low';
  return <div className={`score-badge ${cls}`}>{score}</div>;
}

function PlatformIcon({ platform }: { platform: Platform }) {
  const labels: Record<Platform, string> = {
    indeed: 'IN',
    linkedin: 'LI',
    instahyre: 'IH',
  };
  return <span className={`platform-icon ${platform}`}>{labels[platform]}</span>;
}

function JobCard({ result, index }: { result: MatchResult; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="glass-card job-card job-card-appear"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="job-card-header">
        <ScoreBadge score={result.matchScore} />
        <div className="job-card-info">
          <div className="job-card-title">{result.job.title}</div>
          <div className="job-card-company">{result.job.company}</div>
          <div className="job-card-meta">
            <span>📍 {result.job.location}</span>
            <span>
              <PlatformIcon platform={result.job.platform} /> {result.job.platform}
            </span>
            {result.job.salary && <span>💰 {result.job.salary}</span>}
            {result.job.postedDate && <span>🕒 {result.job.postedDate}</span>}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="job-card-details">
          {result.matchedSkills.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--accent-green)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                ✅ Matched Skills
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {result.matchedSkills.map((s, i) => (
                  <span key={i} className="skill-tag matched">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.missingSkills.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--accent-pink)',
                  marginBottom: '6px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                ⚠️ Missing Skills
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {result.missingSkills.map((s, i) => (
                  <span key={i} className="skill-tag missing">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="match-summary">&quot;{result.summary}&quot;</div>

          <div style={{ marginTop: '12px' }}>
            <a
              href={result.job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              onClick={(e) => e.stopPropagation()}
              style={{ textDecoration: 'none' }}
            >
              View on {result.job.platform} →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState<'score' | 'date'>('score');

  const abortRef = useRef<AbortController | null>(null);

  const startSearch = useCallback(async () => {
    const stored = sessionStorage.getItem('searchParams');
    if (!stored) {
      setError('No search parameters found. Please go back and configure your search.');
      setLoading(false);
      return;
    }

    const params = JSON.parse(stored);
    abortRef.current = new AbortController();

    try {
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
                if (data.results) {
                  setResults(data.results);
                }
                setLoading(false);
                setStatusMessage(data.message || 'Done!');
                break;
              case 'error':
                setError(data.message || 'Search failed');
                setLoading(false);
                break;
            }
          } catch {
            // skip invalid JSON
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Search failed');
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startSearch();
    return () => {
      abortRef.current?.abort();
    };
  }, [startSearch]);

  // Apply filters
  const filteredResults = results.filter((r) => {
    if (platformFilter !== 'all' && r.job.platform !== platformFilter) return false;
    if (r.matchScore < minScore) return false;
    return true;
  });

  if (sortBy === 'score') {
    filteredResults.sort((a, b) => b.matchScore - a.matchScore);
  }

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
    <div className="results-page container">
      <div className="results-header">
        <div>
          <a className="back-link" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
            ← New Search
          </a>
          <h1 style={{ marginTop: '8px' }}>
            Job <span className="gradient-text">Matches</span>
          </h1>
        </div>
      </div>

      {/* Stats */}
      {results.length > 0 && (
        <div className="stats-bar">
          <div className="glass-card stat-card">
            <div className="stat-value gradient-text">{results.length}</div>
            <div className="stat-label">Total Jobs</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-value" style={{ color: 'var(--accent-green)' }}>
              {avgScore}%
            </div>
            <div className="stat-label">Avg Match</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-value" style={{ color: 'var(--accent-purple)' }}>
              {filteredResults.filter((r) => r.matchScore >= 70).length}
            </div>
            <div className="stat-label">Strong Matches</div>
          </div>
          <div className="glass-card stat-card">
            <div className="stat-value" style={{ color: 'var(--accent-blue)' }}>
              {topPlatform ? topPlatform[0] : '-'}
            </div>
            <div className="stat-label">Top Platform</div>
          </div>
        </div>
      )}

      {/* Progress */}
      {loading && (
        <div className="glass-card progress-container">
          <div className="progress-spinner" />
          <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '8px' }}>
            {statusMessage}
          </div>
          {progress.total > 0 && (
            <>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                />
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>
                {progress.completed} / {progress.total} jobs analyzed
              </div>
            </>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="glass-card"
          style={{ padding: '24px', textAlign: 'center', borderColor: 'rgba(236, 72, 153, 0.3)' }}
        >
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
          <div
            style={{
              color: 'var(--accent-pink)',
              fontSize: '16px',
              fontWeight: 500,
              marginBottom: '8px',
            }}
          >
            {error}
          </div>
          <button className="btn-primary" onClick={() => router.push('/')}>
            ← Try Again
          </button>
        </div>
      )}

      {/* Filters */}
      {results.length > 0 && (
        <div className="filters-bar">
          <select
            className="filter-select"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option value="all">All Platforms</option>
            <option value="indeed">Indeed</option>
            <option value="linkedin">LinkedIn</option>
            <option value="instahyre">Instahyre</option>
          </select>
          <select
            className="filter-select"
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
          >
            <option value={0}>Min Score: Any</option>
            <option value={30}>Min Score: 30%</option>
            <option value={50}>Min Score: 50%</option>
            <option value={70}>Min Score: 70%</option>
            <option value={80}>Min Score: 80%</option>
          </select>
          <select
            className="filter-select"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'score' | 'date')}
          >
            <option value="score">Sort: Best Match</option>
            <option value="date">Sort: Most Recent</option>
          </select>
          <div style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '13px' }}>
            Showing {filteredResults.length} of {results.length}
          </div>
        </div>
      )}

      {/* Job List */}
      <div className="jobs-list">
        {filteredResults.map((result, i) => (
          <JobCard key={result.job.id} result={result} index={i} />
        ))}
      </div>

      {/* Empty state */}
      {!loading && !error && results.length === 0 && (
        <div className="glass-card" style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
          <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '8px' }}>
            No jobs found
          </div>
          <div style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            Try different keywords or expand your location
          </div>
          <button className="btn-primary" onClick={() => router.push('/')}>
            ← Modify Search
          </button>
        </div>
      )}
    </div>
  );
}
