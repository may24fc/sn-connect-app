import { resolveStagedFormData } from '@/lib/storage/upload-staging.server';
import { extractContactFromImage } from '@hr-portal/ai';
import { type NextRequest, NextResponse } from 'next/server';
import { readUhpScreenshot, requireUhpModule } from '../../_lib';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const auth = await requireUhpModule('client_tracker');
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let formData: FormData;
  try {
    formData = await resolveStagedFormData(await request.formData());
  } catch {
    return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
  }
  const screenshot = readUhpScreenshot(formData);
  if (!screenshot.ok) return NextResponse.json({ error: screenshot.error }, { status: 400 });

  try {
    const buffer = Buffer.from(await screenshot.file.arrayBuffer());
    const result = await extractContactFromImage(buffer.toString('base64'), screenshot.file.type);
    return NextResponse.json({
      data: {
        name: result.name,
        phone: result.phone,
        email: result.email,
        channel: result.channel,
        confidence: result.confidence,
      },
    });
  } catch (error) {
    // Only the error message: the screenshot and extracted contact are PII.
    console.error(
      'UHP contact extraction failed:',
      error instanceof Error ? error.message : 'unknown error'
    );
    return NextResponse.json(
      { error: 'Could not read the screenshot. Enter the details manually.' },
      { status: 502 }
    );
  }
}
