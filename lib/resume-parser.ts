import { PDFParse } from 'pdf-parse';
import { aiClient } from './ai/ollama';
import { ResumeData } from './scrapers/types';

const SKILL_KEYWORDS = [
  // Programming languages
  'javascript',
  'typescript',
  'python',
  'java',
  'c\\+\\+',
  'c#',
  'go',
  'rust',
  'ruby',
  'php',
  'swift',
  'kotlin',
  'scala',
  'r',
  'matlab',
  'perl',
  'dart',
  'lua',
  // Frontend
  'react',
  'angular',
  'vue',
  'svelte',
  'next\\.js',
  'nextjs',
  'nuxt',
  'html',
  'css',
  'sass',
  'less',
  'tailwind',
  'bootstrap',
  'webpack',
  'vite',
  'redux',
  'graphql',
  // Backend
  'node\\.js',
  'nodejs',
  'express',
  'fastify',
  'django',
  'flask',
  'spring',
  'rails',
  'laravel',
  'asp\\.net',
  'gin',
  'fiber',
  'nestjs',
  // Data & ML
  'sql',
  'nosql',
  'mongodb',
  'postgresql',
  'mysql',
  'redis',
  'elasticsearch',
  'tensorflow',
  'pytorch',
  'keras',
  'scikit-learn',
  'pandas',
  'numpy',
  'spark',
  'hadoop',
  'kafka',
  'airflow',
  'dbt',
  // Cloud & DevOps
  'aws',
  'azure',
  'gcp',
  'docker',
  'kubernetes',
  'terraform',
  'ansible',
  'jenkins',
  'ci/cd',
  'linux',
  'nginx',
  'git',
  'github',
  'gitlab',
  // Mobile
  'react native',
  'flutter',
  'ios',
  'android',
  'swiftui',
  // Other
  'agile',
  'scrum',
  'jira',
  'figma',
  'rest',
  'api',
  'microservices',
  'system design',
  'data structures',
  'algorithms',
  'machine learning',
  'deep learning',
  'nlp',
  'computer vision',
  'devops',
  'sre',
  'blockchain',
];

function extractSkills(text: string): string[] {
  const lowerText = text.toLowerCase();
  const found: string[] = [];
  for (const skill of SKILL_KEYWORDS) {
    const regex = new RegExp(`\\b${skill}\\b`, 'i');
    if (regex.test(lowerText)) {
      // Use the original casing from the text where possible
      const match = text.match(new RegExp(`\\b${skill}\\b`, 'i'));
      found.push(match ? match[0] : skill);
    }
  }
  return [...new Set(found)];
}

function extractSection(text: string, sectionNames: string[]): string[] {
  const lines = text.split('\n');
  const results: string[] = [];
  let inSection = false;

  const sectionRegex = new RegExp(`^\\s*(${sectionNames.join('|')})\\s*[:|-]?\\s*$`, 'i');
  const anySectionRegex =
    /^\s*(education|experience|work|skills|projects?|certifications?|awards?|publications?|summary|objective|profile|interests?|hobbies|references?|languages?|volunteer|activities)\s*[:|-]?\s*$/i;

  for (const line of lines) {
    if (sectionRegex.test(line.trim())) {
      inSection = true;
      continue;
    }
    if (inSection && anySectionRegex.test(line.trim())) {
      break;
    }
    if (inSection && line.trim().length > 0) {
      results.push(line.trim());
    }
  }
  return results;
}

function extractSummary(text: string): string {
  const summaryLines = extractSection(text, ['summary', 'objective', 'profile', 'about']);
  if (summaryLines.length > 0) {
    return summaryLines.join(' ').slice(0, 500);
  }
  // Fallback: first 3 non-empty lines
  const lines = text.split('\n').filter((l) => l.trim().length > 10);
  return lines.slice(0, 3).join(' ').slice(0, 500);
}

export async function parseResume(buffer: Buffer | ArrayBuffer): Promise<ResumeData> {
  const dataArray = buffer instanceof Buffer ? new Uint8Array(buffer) : new Uint8Array(buffer);
  const parser = new PDFParse({ data: dataArray });
  const data = await parser.getText();
  const rawText = data.text;

  console.log('[Resume Parser] Extracting structured data using AI...');

  const prompt = `You are an expert data extraction algorithm. Extract structured information from the resume text into JSON.
DO NOT output any explanations. Output ONLY valid JSON matching this schema:
{
  "skills": ["list", "of", "skills"],
  "summary": "Professional summary",
  "experience": [
    {
      "company": "Company Name",
      "role": "Job Title",
      "duration": "Duration (e.g. 2020-2023)",
      "skills": ["skills", "used", "here"]
    }
  ],
  "education": [
    {
      "degree": "Degree",
      "institution": "School",
      "year": "Year"
    }
  ],
  "recommendations": {
    "jobTitles": ["Top 3 recommended job titles (e.g. 'Software Engineer')"],
    "keywords": ["Top 5 search keywords (skills, technologies)"],
    "locations": ["Mentioned locations or hubs (e.g. 'San Francisco', 'Remote')"]
  }
}

RESUME TEXT:
${rawText.slice(0, 8000)}

JSON OUTPUT:
{`;

  try {
    const response = await aiClient.generate({
      prompt,
      strictJson: true,
      maxJsonRetries: 1, // Let aiwrap handle repair if necessary
      temperature: 0.0,
    });

    // Since we used strictJson, aiwrap parsed it for us
    const parsed = response.json as {
      skills?: string[];
      summary?: string;
      experience?: {
        company: string;
        role: string;
        duration: string;
        skills: string[];
      }[];
      education?: {
        degree: string;
        institution: string;
        year: string;
      }[];
      recommendations?: {
        jobTitles?: string[];
        keywords?: string[];
        locations?: string[];
      };
    };

    if (!parsed) {
      throw new Error('No JSON object found in response');
    }

    return {
      rawText,
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      summary: parsed.summary || extractSummary(rawText), // fallback to old logic if empty
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
      recommendedKeywords: Array.isArray(parsed.recommendations?.keywords)
        ? parsed.recommendations.keywords
        : [],
      recommendedLocations: Array.isArray(parsed.recommendations?.locations)
        ? parsed.recommendations.locations
        : [],
      recommendedJobTitles: Array.isArray(parsed.recommendations?.jobTitles)
        ? parsed.recommendations.jobTitles
        : [],
    };
  } catch (err) {
    console.error('[Resume Parser] AI extraction failed, falling back to basic extraction:', err);
    // Fallback to heuristic logic if AI fails
    const skills = extractSkills(rawText);
    const experienceText = extractSection(rawText, [
      'experience',
      'work experience',
      'work history',
      'employment',
      'professional experience',
    ]);
    const educationText = extractSection(rawText, ['education', 'academic', 'qualifications']);
    const summary = extractSummary(rawText);

    return {
      rawText,
      skills,
      experience:
        experienceText.length > 0
          ? [{ company: 'Unknown', role: 'Unknown', duration: 'Unknown', skills: [] }]
          : [],
      education:
        educationText.length > 0
          ? [{ degree: 'Unknown', institution: 'Unknown', year: 'Unknown' }]
          : [],
      summary,
    };
  }
}
