import { NextRequest } from 'next/server';
import { scrapeAllPlatforms } from '@/lib/scrapers';
import { matchJobs } from '@/lib/matcher';
import { Platform, ResumeData, SearchProgress } from '@/lib/scrapers/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywords, location, platforms, resumeData } = body as {
      keywords: string;
      location: string;
      platforms: Platform[];
      resumeData: ResumeData;
    };

    if (!keywords || !location || !platforms?.length || !resumeData) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Use SSE for streaming progress
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        function send(data: SearchProgress) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        }

        try {
          // Step 1: Scrape jobs
          send({ type: 'status', message: 'Starting job search...' });

          const allJobs = await scrapeAllPlatforms(
            { keywords, location, platforms },
            (platform, jobs) => {
              send({
                type: 'jobs',
                platform,
                jobs,
                message: `Found ${jobs.length} jobs on ${platform}`,
              });
            }
          );

          if (allJobs.length === 0) {
            send({
              type: 'done',
              message: 'No jobs found. Try different keywords or location.',
              results: [],
            });
            controller.close();
            return;
          }

          send({
            type: 'status',
            message: `Found ${allJobs.length} total jobs. Starting AI matching...`,
            total: allJobs.length,
          });

          // Step 2: Match jobs against resume
          const results = await matchJobs(resumeData, allJobs, (result, index, total) => {
            send({
              type: 'result',
              result,
              completed: index + 1,
              total,
              message: `Matched ${index + 1}/${total} jobs`,
            });
          });

          send({
            type: 'done',
            results,
            message: `Completed! Matched ${results.length} jobs.`,
          });
        } catch (error) {
          console.error('[Search] Error:', error);
          send({
            type: 'error',
            message: error instanceof Error ? error.message : 'Search failed',
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Search] Error:', error);
    return new Response(JSON.stringify({ error: 'Search failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
