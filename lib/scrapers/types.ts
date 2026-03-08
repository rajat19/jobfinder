export type Platform = 'indeed' | 'linkedin' | 'instahyre';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  url: string;
  platform: Platform;
  postedDate?: string;
}

export interface SearchParams {
  keywords: string;
  location: string;
  platforms: Platform[];
}

export interface ExperienceEntry {
  company: string;
  role: string;
  duration: string;
  skills: string[];
}

export interface EducationEntry {
  degree: string;
  institution: string;
  year: string;
}

export interface ResumeData {
  rawText: string;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  summary: string;
  recommendedKeywords?: string[];
  recommendedLocations?: string[];
  recommendedJobTitles?: string[];
}

export interface MatchResult {
  job: Job;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  summary: string;
}

export interface SearchProgress {
  type: 'status' | 'jobs' | 'matching' | 'result' | 'done' | 'error';
  message?: string;
  platform?: Platform;
  jobs?: Job[];
  result?: MatchResult;
  results?: MatchResult[];
  total?: number;
  completed?: number;
}
