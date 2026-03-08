import { NextRequest, NextResponse } from 'next/server';
import { parseResume } from '@/lib/resume-parser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('resume') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const resumeData = await parseResume(buffer);

    return NextResponse.json({
      success: true,
      data: resumeData,
    });
  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json({ error: 'Failed to parse resume' }, { status: 500 });
  }
}
