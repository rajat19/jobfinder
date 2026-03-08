import { v4 as uuidv4 } from 'uuid';
import { Job } from './types';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function scrapeInstahyre(keywords: string, location: string): Promise<Job[]> {
  try {
    const url = `https://www.instahyre.com/api/v1/job_search?skills=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}`;
    console.log(`[Instahyre] Fetching API: ${url}`);

    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        Referer: 'https://www.instahyre.com/',
      },
    });

    if (!res.ok) {
      console.warn(`[Instahyre] API error: ${res.status} for ${url}`);
      return [];
    }

    const data = await res.json();
    const jobs: Job[] = [];

    const items = data.objects || [];
    for (const item of items) {
      const title = item.title || item.candidate_title || 'Unknown Role';
      const company = item.employer?.company_name || 'Unknown Company';

      const skills = Array.isArray(item.keywords) ? item.keywords.join(', ') : '';
      const tagline = item.employer?.company_tagline || '';
      const note = item.employer?.instahyre_note || '';

      let description = `${title} at ${company}.`;
      if (skills) description += ` Required skills: ${skills}.`;
      if (tagline) description += ` Company Tagline: ${tagline}.`;
      if (note) description += ` Note: ${note}`;

      jobs.push({
        id: uuidv4(),
        title,
        company,
        location: item.locations || location,
        description,
        url: item.public_url || `https://www.instahyre.com/job-${item.id}`,
        platform: 'instahyre',
      });
    }

    console.log(`[Instahyre] Found ${jobs.length} jobs via API`);
    return jobs;
  } catch (err) {
    console.error('[Instahyre] Fetch error:', err);
    return [];
  }
}
