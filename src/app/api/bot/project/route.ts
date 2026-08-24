import { NextResponse } from 'next/server';
import { createProject } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { api_key, title, persons } = body;

    // 1. Verify API Key
    const validApiKey = process.env.BOT_API_KEY;
    if (!validApiKey || api_key !== validApiKey) {
      return NextResponse.json({ error: 'Unauthorized: BOT_API_KEY di .env.local tidak ditemukan atau tidak cocok dengan request Langflow.' }, { status: 401 });
    }

    if (!title || !Array.isArray(persons) || persons.length === 0) {
      return NextResponse.json({ error: 'Missing title or persons array' }, { status: 400 });
    }

    // 2. Create Project
    const project = await createProject({
      title,
      person_names: persons,
      currency: 'IDR',
      tax_rate: 0,
    });

    // 3. Construct response
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const admin_link = `${protocol}://${host}/p/${project.share_slug}/edit?t=${project.edit_token}`;

    return NextResponse.json({
      success: true,
      slug: project.share_slug,
      admin_link,
      project_id: project.id,
    });
  } catch (error: any) {
    console.error('Error creating project via bot:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
