import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase } from '../_lib';

export async function GET() {
  try {
    const { supabase, user, error } = await getAuthedSupabase();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error: fetchError } = await supabase
      .from('resource_folders')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching folders:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch folders' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error('Unexpected error in GET /api/resources/folders:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error } = await getAuthedSupabase();
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const description = typeof body?.description === 'string' ? body.description : null;
    const color = typeof body?.color === 'string' ? body.color : null;
    const icon = typeof body?.icon === 'string' ? body.icon : null;

    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const { data, error: insertError } = await supabase
      .from('resource_folders')
      .insert({ name, description, color, icon, created_by: user.id })
      .select('*')
      .single();

    if (insertError || !data) {
      console.error('Error creating folder:', insertError);
      return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    console.error('Unexpected error in POST /api/resources/folders:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
