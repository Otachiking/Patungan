import { NextResponse } from 'next/server';
import { getProjectBySlug, upsertItem, upsertPerson } from '@/lib/db';
import type { Person, ItemParticipant } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { api_key, project_slug, item_name, price, payer_name, participant_names } = body;

    // 1. Verify API Key
    const validApiKey = process.env.BOT_API_KEY;
    if (!validApiKey || api_key !== validApiKey) {
      return NextResponse.json({ error: 'Unauthorized: BOT_API_KEY di .env.local tidak ditemukan atau tidak cocok.' }, { status: 401 });
    }

    if (!project_slug || !item_name || typeof price !== 'number' || !payer_name || !Array.isArray(participant_names)) {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    // 2. Get Project
    const project = await getProjectBySlug(project_slug);
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectId = project.id;
    let currentPersons = [...project.persons];

    // Helper: Find or create person
    const getOrCreatePerson = async (name: string): Promise<Person> => {
      const existing = currentPersons.find((p) => p.name.toLowerCase() === name.toLowerCase());
      if (existing) return existing;

      // Create new person
      const newPerson = await upsertPerson({
        project_id: projectId,
        name: name.trim(),
        order: currentPersons.length,
      });
      currentPersons.push(newPerson);
      return newPerson;
    };

    // 3. Resolve Payer
    const payer = await getOrCreatePerson(payer_name);

    // 4. Resolve Participants (Handle 'ALL' and 'ALL_EXCEPT')
    let resolvedParticipantIds: string[] = [];

    if (participant_names[0] === 'ALL') {
      resolvedParticipantIds = currentPersons.map((p) => p.id);
    } else if (participant_names[0] === 'ALL_EXCEPT') {
      const exceptNames = participant_names.slice(1).map(n => n.toLowerCase());
      resolvedParticipantIds = currentPersons
        .filter((p) => !exceptNames.includes(p.name.toLowerCase()))
        .map((p) => p.id);
    } else {
      for (const name of participant_names) {
        const p = await getOrCreatePerson(name);
        resolvedParticipantIds.push(p.id);
      }
    }

    if (resolvedParticipantIds.length === 0) {
      return NextResponse.json({ error: 'No valid participants found' }, { status: 400 });
    }

    // 5. Insert Item
    const itemParticipants: ItemParticipant[] = resolvedParticipantIds.map((pid) => ({
      person_id: pid,
      weight: 1, // Default equal split
    }));

    const newItem = await upsertItem(
      {
        project_id: projectId,
        name: item_name,
        price: price,
        paid_by_person_id: payer.id,
        order: project.items.length,
      },
      itemParticipants
    );

    return NextResponse.json({
      success: true,
      item: newItem,
    });
  } catch (error: any) {
    console.error('Error adding expense via bot:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
