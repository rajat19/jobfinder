import { scrapeIndeed } from './lib/scrapers/indeed';
import { scrapeInstahyre } from './lib/scrapers/instahyre';

async function test() {
  console.log('Testing Indeed...');
  const indeedJobs = await scrapeIndeed('Software Engineer', 'Bangalore', 1);
  console.log('Indeed Jobs:', indeedJobs.length);

  console.log('Testing Instahyre...');
  const instahyreJobs = await scrapeInstahyre('Software Engineer', 'Bangalore');
  console.log('Instahyre Jobs:', instahyreJobs.length);
}

test().catch(console.error);
