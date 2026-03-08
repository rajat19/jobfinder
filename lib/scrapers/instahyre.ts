import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { Job } from './types';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function buildUrl(keywords: string, location: string): string {
  // Instahyre uses a different URL structure
  const slug = keywords.toLowerCase().replace(/\s+/g, '-');
  const locSlug = location.toLowerCase().replace(/\s+/g, '-');
  return `https://www.instahyre.com/${slug}-jobs-in-${locSlug}/`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        Referer: 'https://www.instahyre.com/',
      },
    });
    if (!res.ok) {
      console.warn(`[Instahyre] HTTP ${res.status} for ${url}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.error('[Instahyre] Fetch error:', err);
    return null;
  }
}

function parseJobCards(html: string): Job[] {
  const $ = cheerio.load(html);
  const jobs: Job[] = [];

  // Try to find job data in embedded JSON (Instahyre often embeds job data in script tags)
  const scriptTags = $('script');
  scriptTags.each((_, el) => {
    const content = $(el).html() || '';
    // Look for JSON-LD structured data
    if (content.includes('"@type":"JobPosting"') || content.includes('"@type": "JobPosting"')) {
      try {
        const jsonData = JSON.parse(content);
        const postings = Array.isArray(jsonData) ? jsonData : [jsonData];
        for (const posting of postings) {
          if (posting['@type'] === 'JobPosting') {
            jobs.push({
              id: uuidv4(),
              title: posting.title || '',
              company: posting.hiringOrganization?.name || '',
              location: posting.jobLocation?.address?.addressLocality || 'India',
              description: (posting.description || '').replace(/<[^>]*>/g, '').slice(0, 500),
              salary: posting.baseSalary?.value
                ? `${posting.baseSalary.currency || 'INR'} ${posting.baseSalary.value.minValue || ''}-${posting.baseSalary.value.maxValue || ''}`
                : undefined,
              url: posting.url || '',
              platform: 'instahyre' as const,
              postedDate: posting.datePosted || undefined,
            });
          }
        }
      } catch {
        // Not valid JSON, skip
      }
    }
  });

  // Also try parsing job listing HTML
  const selectors = [
    '.opportunity-listing',
    '.job-card',
    '.job-listing',
    '.listing-container > div',
  ];

  const cards = selectors.reduce(
    (found, sel) => (found.length > 0 ? found : $(sel)),
    $('__none__')
  );

  cards.each((_, el) => {
    const $el = $(el);

    const title = (
      $el.find('.opportunity-title').text() ||
      $el.find('.job-title').text() ||
      $el.find('h3').first().text() ||
      ''
    ).trim();

    const company = (
      $el.find('.company-name').text() ||
      $el.find('.employer-name').text() ||
      $el.find('.company').text() ||
      ''
    ).trim();

    const location = (
      $el.find('.location').text() ||
      $el.find('.job-location').text() ||
      ''
    ).trim();

    const snippet = (
      $el.find('.job-description').text() ||
      $el.find('.description').text() ||
      ''
    ).trim();

    const href = $el.find('a').first().attr('href') || '';
    const url = href.startsWith('http') ? href : `https://www.instahyre.com${href}`;

    if (title && company) {
      jobs.push({
        id: uuidv4(),
        title,
        company,
        location: location || 'India',
        description: snippet || `${title} at ${company}`,
        url,
        platform: 'instahyre',
      });
    }
  });

  return jobs;
}

export async function scrapeInstahyre(keywords: string, location: string): Promise<Job[]> {
  // Try the slug-based URL first
  const url = buildUrl(keywords, location);
  console.log(`[Instahyre] Scraping: ${url}`);

  const html = await fetchPage(url);
  if (!html) {
    // Fallback: try search URL pattern
    const altUrl = `https://www.instahyre.com/search-jobs/?job_title=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}`;
    console.log(`[Instahyre] Trying alternate URL: ${altUrl}`);
    const altHtml = await fetchPage(altUrl);
    if (!altHtml) {
      console.warn('[Instahyre] Could not fetch any pages');
      return [];
    }
    return parseJobCards(altHtml);
  }

  const jobs = parseJobCards(html);
  console.log(`[Instahyre] Found ${jobs.length} jobs`);

  await delay(1000);
  return jobs;
}
