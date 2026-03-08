import { Job, Platform, SearchParams } from './types';
import { scrapeIndeed } from './indeed';
import { scrapeLinkedin } from './linkedin';
import { scrapeInstahyre } from './instahyre';

function deduplicateJobs(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = `${job.title.toLowerCase().trim()}|${job.company.toLowerCase().trim()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function scrapeAllPlatforms(
  params: SearchParams,
  onProgress?: (platform: Platform, jobs: Job[]) => void
): Promise<Job[]> {
  const allJobs: Job[] = [];

  const scraperMap: Record<Platform, (keywords: string, location: string) => Promise<Job[]>> = {
    indeed: (kw, loc) => scrapeIndeed(kw, loc, 2),
    linkedin: (kw, loc) => scrapeLinkedin(kw, loc, 2),
    instahyre: (kw, loc) => scrapeInstahyre(kw, loc),
  };

  // Run scrapers concurrently
  await Promise.allSettled(
    params.platforms.map(async (platform) => {
      const scraper = scraperMap[platform];
      if (!scraper) return;

      try {
        console.log(`[Aggregator] Starting ${platform} scraper...`);
        const jobs = await scraper(params.keywords, params.location);
        allJobs.push(...jobs);
        if (onProgress) {
          onProgress(platform, jobs);
        }
      } catch (err) {
        console.error(`[Aggregator] ${platform} scraper failed:`, err);
        if (onProgress) {
          onProgress(platform, []);
        }
      }
    })
  );

  const uniqueJobs = deduplicateJobs(allJobs);
  console.log(
    `[Aggregator] Total unique jobs: ${uniqueJobs.length} (from ${allJobs.length} total)`
  );
  return uniqueJobs;
}
