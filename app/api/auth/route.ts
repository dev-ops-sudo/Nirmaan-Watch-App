import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Simulate network delay to make it look realistic for the judges
    await new Promise(resolve => setTimeout(resolve, 800));

    if (body.type === 'official') {
      const { id, password } = body;
      // Basic validation for the demo
      if (id && password) {
        return NextResponse.json({
          success: true,
          role: 'official',
          message: 'Authenticated securely as Government Official',
          token: crypto.randomUUID(), // Mock token
        });
      }
      return NextResponse.json({ error: 'Invalid official credentials' }, { status: 401 });
    } 
    
    if (body.type === 'citizen') {
      const { name, phone } = body;
      if (name && phone) {
        return NextResponse.json({
          success: true,
          role: 'citizen',
          message: 'Authenticated as Citizen',
          token: crypto.randomUUID(),
        });
      }
      return NextResponse.json({ error: 'Name and phone required' }, { status: 400 });
    }

    return NextResponse.json({ error: 'Invalid login type' }, { status: 400 });
    
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
