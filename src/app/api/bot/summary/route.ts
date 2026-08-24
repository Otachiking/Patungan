import { NextResponse } from 'next/server';
import { getProjectBySlug, getProject } from '@/lib/db';
import { calculateSettlementFull } from '@/lib/engine';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug');
    const api_key = searchParams.get('api_key');

    // 1. Verify API Key
    const validApiKey = process.env.BOT_API_KEY;
    if (!validApiKey || api_key !== validApiKey) {
      return NextResponse.json({ error: 'Unauthorized: BOT_API_KEY tidak valid.' }, { status: 401 });
    }

    if (!slug) {
      return NextResponse.json({ error: 'Missing slug parameter' }, { status: 400 });
    }

    // 2. Fetch Project by Slug (or ID just in case)
    let project = await getProjectBySlug(slug);
    if (!project) {
      project = await getProject(slug);
    }

    if (!project) {
      return NextResponse.json({ error: 'Acara tidak ditemukan' }, { status: 404 });
    }

    // 3. Calculate Settlement
    const settlement = calculateSettlementFull(project, project.persons, project.items);

    // 4. Format Text
    let text = `📜 *Rincian Acara: ${project.title}*\n`;
    text += `💰 Total Pengeluaran: Rp ${settlement.total_expense.toLocaleString('id-ID')}\n\n`;

    if (project.items.length === 0) {
      text += `Belum ada pengeluaran yang dicatat.`;
    } else {
      text += `*Daftar Patungan:*\n`;
      Object.entries(settlement.balances).forEach(([personId, balance]) => {
        const person = project!.persons.find(p => p.id === personId);
        if (person) {
          text += `- ${person.name}: Rp ${balance.expense.toLocaleString('id-ID')}\n`;
        }
      });

      text += `\n*Siapa Transfer Siapa:*\n`;
      if (settlement.transactions.length === 0) {
        text += `✅ LUNAS! Tidak ada yang perlu transfer.`;
      } else {
        settlement.transactions.forEach(txn => {
          const from = project!.persons.find(p => p.id === txn.from_person_id)?.name;
          const to = project!.persons.find(p => p.id === txn.to_person_id)?.name;
          text += `💸 ${from} ➡️ mentransfer Rp ${txn.amount.toLocaleString('id-ID')} ke ${to}\n`;
        });
      }
    }

    return NextResponse.json({
      success: true,
      text_summary: text,
      project_id: project.id
    });
  } catch (error: any) {
    console.error('Error fetching summary via bot:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
