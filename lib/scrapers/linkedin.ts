import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { Job } from './types';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function buildUrl(keywords: string, location: string, start: number = 0): string {
  const params = new URLSearchParams({
    keywords,
    location,
    start: String(start),
    f_TPR: 'r604800', // past week
  });
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
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
      },
    });
    if (!res.ok) {
      console.warn(`[LinkedIn] HTTP ${res.status} for ${url}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.error('[LinkedIn] Fetch error:', err);
    return null;
  }
}

function parseJobCards(html: string): Job[] {
  const $ = cheerio.load(html);
  const jobs: Job[] = [];

  // LinkedIn guest job search page selectors
  const selectors = [
    '.jobs-search__results-list li',
    '.base-card',
    '.result-card',
    '.job-search-card',
  ];

  const cards = selectors.reduce(
    (found, sel) => (found.length > 0 ? found : $(sel)),
    $('__none__')
  );

  cards.each((_, el) => {
    const $el = $(el);

    const title = (
      $el.find('.base-search-card__title').text() ||
      $el.find('.result-card__title').text() ||
      $el.find('h3').first().text() ||
      ''
    ).trim();

    const company = (
      $el.find('.base-search-card__subtitle a').text() ||
      $el.find('.result-card__subtitle').text() ||
      $el.find('h4').first().text() ||
      ''
    ).trim();

    const location = (
      $el.find('.job-search-card__location').text() ||
      $el.find('.result-card__meta span').text() ||
      ''
    ).trim();

    const url = (
      $el.find('.base-card__full-link').attr('href') ||
      $el.find('a.result-card__full-card-link').attr('href') ||
      $el.find('a').first().attr('href') ||
      ''
    ).trim();

    const date = (
      $el.find('time').attr('datetime') ||
      $el.find('.job-search-card__listdate').attr('datetime') ||
      ''
    ).trim();

    const snippet = ($el.find('.base-search-card__metadata').text() || '').trim();

    if (title && company) {
      jobs.push({
        id: uuidv4(),
        title,
        company,
        location: location || 'Not specified',
        description: snippet || `${title} at ${company}`,
        url: url.startsWith('http') ? url : `https://www.linkedin.com${url}`,
        platform: 'linkedin',
        postedDate: date || undefined,
      });
    }
  });

  return jobs;
}

export async function scrapeLinkedin(
  keywords: string,
  location: string,
  maxPages: number = 2
): Promise<Job[]> {
  const allJobs: Job[] = [];

  for (let page = 0; page < maxPages; page++) {
    const start = page * 25;
    const url = buildUrl(keywords, location, start);
    console.log(`[LinkedIn] Scraping page ${page + 1}: ${url}`);

    const html = await fetchPage(url);
    if (!html) {
      console.warn(`[LinkedIn] Failed to fetch page ${page + 1}`);
      break;
    }

    const jobs = parseJobCards(html);
    console.log(`[LinkedIn] Found ${jobs.length} jobs on page ${page + 1}`);

    if (jobs.length === 0) break;
    allJobs.push(...jobs);

    // Respectful delay between pages
    if (page < maxPages - 1) {
      await delay(2500 + Math.random() * 1500);
    }
  }

  return allJobs;
}
