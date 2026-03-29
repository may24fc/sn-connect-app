/**
 * Backfill Wise recipient IDs for existing employees
 * This endpoint attempts to create Wise recipients for employees whose
 * banking info exists but wise_recipient_id is NULL.
 * 
 * POST /api/admin/backfill-wise-recipients?dryRun=true (preview only)
 * POST /api/admin/backfill-wise-recipients (actual backfill)
 */

import { createRecipient } from '@/lib/wise/client';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super_admin
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userRecord || userRecord.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only super_admin can backfill Wise recipients' },
        { status: 403 }
      );
    }

    // Check for dry-run mode
    const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';

    const supabaseAdmin = createSupabaseAdminClient();

    // Get all employees with banking info but NULL recipient ID
    const { data: bankingRecords, error: fetchError } = await supabaseAdmin
      .from('employee_banking_info')
      .select(
        `
        id,
        employee_id,
        wise_recipient_id,
        account_holder_name,
        account_number,
        routing_number,
        swift_code,
        currency,
        country_code,
        bank_name
      `
      )
      .is('wise_recipient_id', null)
      .is('deleted_at', null)
      .not('account_holder_name', 'is', null)
      .not('account_number', 'is', null);

    if (fetchError) {
      console.error('Backfill: failed to fetch banking records:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch banking records', details: fetchError.message },
        { status: 500 }
      );
    }

    if (!bankingRecords || bankingRecords.length === 0) {
      return NextResponse.json({
        message: 'No banking records found to backfill',
        processed: 0,
        successful: 0,
        failed: 0,
        results: [],
        dryRun,
      });
    }

    const results: Array<{
      id: string;
      employee_id: string;
      status: 'success' | 'failed';
      recipientId?: string;
      error?: string;
    }> = [];

    // Process each banking record
    for (const record of bankingRecords) {
      try {
        const recipient = await createRecipient({
          accountHolderName: record.account_holder_name || 'N/A',
          currency: record.currency || 'USD',
          type: resolveWiseRecipientType(record.country_code || 'PH'),
          details: {
            legalType: 'PRIVATE',
            accountNumber: record.account_number,
            ...(record.routing_number ? { bankCode: record.routing_number } : {}),
            ...(record.swift_code ? { swiftCode: record.swift_code } : {}),
            country: record.country_code || 'PH',
          },
        });

        const recipientId = String(recipient.id);
        results.push({
          id: record.id,
          employee_id: record.employee_id,
          status: 'success',
          recipientId,
        });

        // If not dry-run, update the database
        if (!dryRun) {
          const { error: updateError } = await supabaseAdmin
            .from('employee_banking_info')
            .update({
              wise_recipient_id: recipientId,
              is_verified: true,
              verified_at: new Date().toISOString(),
            })
            .eq('id', record.id);

          if (updateError) {
            console.warn('Backfill: failed to update banking record:', {
              recordId: record.id,
              error: updateError.message,
            });
            const lastResult = results[results.length - 1];
            if (lastResult) {
              lastResult.status = 'failed';
              lastResult.error = `Created recipient but failed to store: ${updateError.message}`;
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('Backfill: failed to create recipient for employee:', {
          employeeId: record.employee_id,
          error: errorMessage,
        });
        results.push({
          id: record.id,
          employee_id: record.employee_id,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    const successful = results.filter((r) => r.status === 'success').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    return NextResponse.json({
      message: `Backfill ${dryRun ? '(dry-run)' : ''} completed`,
      processed: bankingRecords.length,
      successful,
      failed,
      dryRun,
      results,
    });
  } catch (error) {
    console.error('POST /api/admin/backfill-wise-recipients error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function resolveWiseRecipientType(countryCode: string): string {
  const normalized = countryCode.toUpperCase();
  if (normalized === 'PH') return 'philippines';
  return 'iban';
}
