import { aiClient } from './ai';
import { Job, MatchResult, ResumeData } from './scrapers/types';

function buildMatchPrompt(resume: ResumeData, job: Job, searchLocation?: string): string {
  const locationNote = searchLocation
    ? `\nNote: The candidate is searching for jobs in "${searchLocation}". The job is located in "${job.location}". Factor location match into your assessment.`
    : '';

  return `You are a job matching expert. Analyze how well this resume matches the job posting.

RESUME:
Skills: ${resume.skills.join(', ')}
Experience: ${resume.experience
      .slice(0, 5)
      .map(
        (e) => `${e.role} at ${e.company} (${e.duration}) - Skills: ${(e.skills || []).join(', ')}`
      )
      .join('\n')}
Education: ${resume.education
      .slice(0, 3)
      .map((e) => `${e.degree} from ${e.institution} (${e.year})`)
      .join('\n')}
Summary: ${resume.summary}

JOB POSTING:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description: ${job.description}
${job.salary ? `Salary: ${job.salary}` : ''}${locationNote}

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "matchScore": <number 0-100>,
  "matchedSkills": [<skills from resume that match this job>],
  "missingSkills": [<skills the job needs but resume lacks>],
  "summary": "<2-3 sentence explanation of the match>"
}`;
}

// Quick TF-IDF pre-scoring to filter before sending to LLM
function quickScore(resume: ResumeData, job: Job): number {
  const resumeWords = new Set(
    resume.rawText
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2)
  );
  const jobWords = job.description
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);

  if (jobWords.length === 0) return 50; // neutral score if no description

  const matched = jobWords.filter((w) => resumeWords.has(w)).length;
  return Math.min(100, Math.round((matched / jobWords.length) * 100));
}

/**
 * Check if a job's title or description contains the search query (case-insensitive).
 */
function isQueryMatch(job: Job, query?: string): boolean {
  if (!query || !query.trim()) return false;
  const q = query.toLowerCase().trim();
  return (
    job.title.toLowerCase().includes(q) ||
    job.description.toLowerCase().includes(q)
  );
}

/**
 * Check if a job's location contains the search location (case-insensitive).
 */
function isLocationMatch(job: Job, searchLocation?: string): boolean {
  if (!searchLocation || !searchLocation.trim()) return true; // no location filter = match all
  const loc = searchLocation.toLowerCase().trim();
  return job.location.toLowerCase().includes(loc);
}

export async function matchJobs(
  resume: ResumeData,
  jobs: Job[],
  onProgress?: (result: MatchResult, index: number, total: number) => void,
  maxAiMatches: number = 20,
  searchQuery?: string,
  searchLocation?: string
): Promise<{ results: MatchResult[]; queryNote?: string; queryMatchCount: number }> {
  // Step 1: Quick pre-score all jobs
  const scored = jobs.map((job) => ({
    job,
    preScore: quickScore(resume, job),
    queryMatch: isQueryMatch(job, searchQuery),
    locationMatch: isLocationMatch(job, searchLocation),
  }));

  // Sort: query+location matches first (by pre-score), then rest by pre-score
  scored.sort((a, b) => {
    const aRelevant = a.queryMatch && a.locationMatch ? 1 : 0;
    const bRelevant = b.queryMatch && b.locationMatch ? 1 : 0;
    if (aRelevant !== bRelevant) return bRelevant - aRelevant;
    return b.preScore - a.preScore;
  });

  // Step 2: Use LLM for top N jobs
  const topJobs = scored.slice(0, maxAiMatches);
  const remainingJobs = scored.slice(maxAiMatches);

  const results: MatchResult[] = [];

  // AI-match top jobs
  for (let i = 0; i < topJobs.length; i++) {
    const { job, queryMatch, locationMatch } = topJobs[i];
    console.log(
      `[Matcher] AI matching ${i + 1}/${topJobs.length}: "${job.title}" at ${job.company}`
    );

    try {
      const prompt = buildMatchPrompt(resume, job, searchLocation);
      const response = await aiClient.generate({
        prompt,
        strictJson: true,
        maxJsonRetries: 1,
        temperature: 0.3,
      });

      const parsed = response.json as
        | {
          matchScore: number;
          matchedSkills: string[];
          missingSkills: string[];
          summary: string;
        }
        | undefined;
      const result: MatchResult = parsed
        ? { job, ...parsed, queryMatch, locationMatch }
        : {
          job,
          matchScore: topJobs[i].preScore,
          matchedSkills: resume.skills.filter((s) =>
            job.description.toLowerCase().includes(s.toLowerCase())
          ),
          missingSkills: [],
          summary: 'AI analysis unavailable, scored by keyword overlap.',
          queryMatch,
          locationMatch,
        };

      results.push(result);
      if (onProgress) {
        onProgress(result, i, topJobs.length);
      }
    } catch (err) {
      console.error(`[Matcher] aiwrap error for "${job.title}":`, err);
      results.push({
        job,
        matchScore: topJobs[i].preScore,
        matchedSkills: resume.skills.filter((s) =>
          job.description.toLowerCase().includes(s.toLowerCase())
        ),
        missingSkills: [],
        summary: 'AI analysis failed, scored by keyword overlap.',
        queryMatch,
        locationMatch,
      });
      if (onProgress) {
        onProgress(results[results.length - 1], i, topJobs.length);
      }
    }
  }

  // Add remaining jobs with pre-scores only
  for (const { job, preScore, queryMatch, locationMatch } of remainingJobs) {
    results.push({
      job,
      matchScore: preScore,
      matchedSkills: resume.skills.filter((s) =>
        job.description.toLowerCase().includes(s.toLowerCase())
      ),
      missingSkills: [],
      summary: 'Scored by keyword overlap (not AI-analyzed).',
      queryMatch,
      locationMatch,
    });
  }

  // Sort: query+location matches first, then by matchScore within each group
  results.sort((a, b) => {
    const aRelevant = (a.queryMatch && a.locationMatch) ? 1 : 0;
    const bRelevant = (b.queryMatch && b.locationMatch) ? 1 : 0;
    if (aRelevant !== bRelevant) return bRelevant - aRelevant;
    return b.matchScore - a.matchScore;
  });

  // Compute query note
  const queryMatchCount = results.filter(
    (r) => r.queryMatch && r.locationMatch
  ).length;

  let queryNote: string | undefined;
  if (searchQuery?.trim() && searchLocation?.trim()) {
    queryNote = `Total ${queryMatchCount} ${searchQuery.trim()} jobs found in ${searchLocation.trim()}`;
  } else if (searchQuery?.trim()) {
    queryNote = `Total ${queryMatchCount} ${searchQuery.trim()} jobs found`;
  }

  return { results, queryNote, queryMatchCount };
}

