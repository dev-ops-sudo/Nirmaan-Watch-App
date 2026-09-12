import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/db';
import * as s from '@/db/schema';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const db = getDb();
    const reviews = await db.select()
      .from(s.feedback)
      .where(eq(s.feedback.projectId, projectId))
      .orderBy(desc(s.feedback.createdAt))
      .limit(50);
      
    return NextResponse.json({ reviews });
  } catch (e) {
    console.error('Reviews GET error:', e);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate the incoming review
    const schema = z.object({
      projectId: z.string().max(80),
      name: z.string().min(2).max(100),
      rating: z.number().int().min(1).max(5),
      message: z.string().trim().min(5).max(2000)
    });
    
    const data = schema.parse(body);
    const db = getDb();
    
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    // Using a generic author identifier since this is public/citizen access for demo
    const author = 'citizen-' + crypto.randomUUID().slice(0, 8);
    
    await db.insert(s.feedback).values({
      id,
      projectId: data.projectId,
      author,
      name: data.name,
      rating: data.rating,
      category: 'Other', // default category
      message: data.message,
      status: 'Open',
      response: '',
      createdAt: now
    });
    
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error('Reviews POST error:', e);
    const message = e instanceof z.ZodError ? e.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ') : 'Failed to post review';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
