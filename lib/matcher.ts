import { aiClient } from './ai/ollama';
import { Job, MatchResult, ResumeData } from './scrapers/types';

function buildMatchPrompt(resume: ResumeData, job: Job): string {
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
${job.salary ? `Salary: ${job.salary}` : ''}

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

export async function matchJobs(
  resume: ResumeData,
  jobs: Job[],
  onProgress?: (result: MatchResult, index: number, total: number) => void,
  maxAiMatches: number = 20
): Promise<MatchResult[]> {
  // Step 1: Quick pre-score all jobs
  const scored = jobs.map((job) => ({
    job,
    preScore: quickScore(resume, job),
  }));

  // Sort by pre-score descending
  scored.sort((a, b) => b.preScore - a.preScore);

  // Step 2: Use LLM for top N jobs
  const topJobs = scored.slice(0, maxAiMatches);
  const remainingJobs = scored.slice(maxAiMatches);

  const results: MatchResult[] = [];

  // AI-match top jobs
  for (let i = 0; i < topJobs.length; i++) {
    const { job } = topJobs[i];
    console.log(
      `[Matcher] AI matching ${i + 1}/${topJobs.length}: "${job.title}" at ${job.company}`
    );

    try {
      const prompt = buildMatchPrompt(resume, job);
      const response = await aiClient.generate({
        prompt,
        strictJson: true,
        maxJsonRetries: 1, // aiwrap can retry automatically if JSON is mangled
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
        ? { job, ...parsed }
        : {
            job,
            matchScore: topJobs[i].preScore,
            matchedSkills: resume.skills.filter((s) =>
              job.description.toLowerCase().includes(s.toLowerCase())
            ),
            missingSkills: [],
            summary: 'AI analysis unavailable, scored by keyword overlap.',
          };

      results.push(result);
      if (onProgress) {
        onProgress(result, i, topJobs.length);
      }
    } catch (err) {
      console.error(`[Matcher] aiwrap error for "${job.title}":`, err);
      // Fallback to pre-score
      results.push({
        job,
        matchScore: topJobs[i].preScore,
        matchedSkills: resume.skills.filter((s) =>
          job.description.toLowerCase().includes(s.toLowerCase())
        ),
        missingSkills: [],
        summary: 'AI analysis failed, scored by keyword overlap.',
      });
      if (onProgress) {
        onProgress(results[results.length - 1], i, topJobs.length);
      }
    }
  }

  // Add remaining jobs with pre-scores only
  for (const { job, preScore } of remainingJobs) {
    results.push({
      job,
      matchScore: preScore,
      matchedSkills: resume.skills.filter((s) =>
        job.description.toLowerCase().includes(s.toLowerCase())
      ),
      missingSkills: [],
      summary: 'Scored by keyword overlap (not AI-analyzed).',
    });
  }

  // Sort by match score descending
  results.sort((a, b) => b.matchScore - a.matchScore);

  return results;
}
