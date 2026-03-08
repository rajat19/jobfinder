import * as cheerio from 'cheerio';
import { v4 as uuidv4 } from 'uuid';
import { chromium } from 'playwright';
import { Job } from './types';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function buildUrl(keywords: string, location: string, start: number = 0): string {
  const params = new URLSearchParams({
    q: keywords,
    l: location,
    start: String(start),
  });
  return `https://www.indeed.com/jobs?${params.toString()}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJobCards(html: string): Job[] {
  const $ = cheerio.load(html);
  const jobs: Job[] = [];

  // Indeed uses various selectors for job cards
  const selectors = [
    '.job_seen_beacon',
    '.jobsearch-ResultsList > li',
    '[data-jk]',
    '.result',
    '.tapItem',
  ];

  const cards = selectors.reduce(
    (found, sel) => (found.length > 0 ? found : $(sel)),
    $('__none__')
  );

  cards.each((_, el) => {
    const $el = $(el);

    const title = (
      $el.find('.jobTitle a span').text() ||
      $el.find('h2.jobTitle span').text() ||
      $el.find('a[data-jk] span').text() ||
      $el.find('.title a').text() ||
      ''
    ).trim();

    const company = (
      $el.find('[data-testid="company-name"]').text() ||
      $el.find('.companyName').text() ||
      $el.find('.company').text() ||
      ''
    ).trim();

    const location = (
      $el.find('[data-testid="text-location"]').text() ||
      $el.find('.companyLocation').text() ||
      $el.find('.location').text() ||
      ''
    ).trim();

    const salary = (
      $el.find('.salary-snippet-container').text() ||
      $el.find('[data-testid="attribute_snippet_testid"]').text() ||
      $el.find('.estimated-salary').text() ||
      ''
    ).trim();

    const snippet = (
      $el.find('.job-snippet').text() ||
      $el.find('.summary').text() ||
      $el.find('[class*="snippet"]').text() ||
      ''
    ).trim();

    const jobKey = $el.attr('data-jk') || $el.find('a[data-jk]').attr('data-jk') || '';
    const href = $el.find('a').first().attr('href') || '';
    const url = jobKey
      ? `https://www.indeed.com/viewjob?jk=${jobKey}`
      : href.startsWith('http')
        ? href
        : `https://www.indeed.com${href}`;

    const date = (
      $el.find('.date').text() ||
      $el.find('[data-testid="myJobsStateDate"]').text() ||
      ''
    ).trim();

    if (title && company) {
      jobs.push({
        id: uuidv4(),
        title,
        company,
        location: location || 'Not specified',
        description: snippet || `${title} at ${company}`,
        salary: salary || undefined,
        url,
        platform: 'indeed',
        postedDate: date || undefined,
      });
    }
  });

  return jobs;
}

export async function scrapeIndeed(
  keywords: string,
  location: string,
  maxPages: number = 2
): Promise<Job[]> {
  const allJobs: Job[] = [];
  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ userAgent: USER_AGENT });
    const pageObj = await context.newPage();

    for (let page = 0; page < maxPages; page++) {
      const start = page * 10;
      const url = buildUrl(keywords, location, start);
      console.log(`[Indeed] Scraping page ${page + 1}: ${url}`);

      try {
        await pageObj.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        // Give the page a moment to load dynamic react components or CF checks
        await pageObj.waitForTimeout(2000);

        const html = await pageObj.content();
        const jobs = parseJobCards(html);
        console.log(`[Indeed] Found ${jobs.length} jobs on page ${page + 1}`);

        if (jobs.length === 0) break;
        allJobs.push(...jobs);
      } catch (err) {
        console.warn(`[Indeed] Failed to fetch page ${page + 1}`, err);
        break;
      }

      if (page < maxPages - 1) {
        await delay(2000 + Math.random() * 1000);
      }
    }
  } catch (err) {
    console.error('[Indeed] Browser launch failed', err);
  } finally {
    if (browser) await browser.close();
  }

  return allJobs;
}
