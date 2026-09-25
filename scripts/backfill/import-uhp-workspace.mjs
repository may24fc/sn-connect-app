#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const allowedClientTypes = new Set(['Retail', 'Recruitment', 'Accountability Partner']);
const excludedClientTypes = new Set(['Property Development', '40 Carlingford']);

function firstValue(row, ...keys) {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return value;
  }
  return null;
}

function required(value, label) {
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`${label} is required`);
  }
  return value;
}

function booleanValue(value) {
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return Boolean(value);
}

function relationId(row, collectionName) {
  return required(
    firstValue(row, 'client_notion_page_id', 'clientNotionPageId'),
    `${collectionName} row client_notion_page_id`
  );
}

function stableNotionId(row, collectionName) {
  return String(
    required(
      firstValue(row, 'notion_page_id', 'sourceNotionId'),
      `${collectionName} row notion_page_id`
    )
  );
}

export function prepareUhpImport(payload) {
  const includedClientIds = new Set();
  const excludedClientIds = new Set();
  const reviewClientIds = new Set();

  const clients = (payload.clients ?? []).flatMap((row) => {
    const notionPageId = stableNotionId(row, 'clients');
    const clientType = firstValue(row, 'client_type', 'clientType');

    if (excludedClientTypes.has(clientType)) {
      excludedClientIds.add(notionPageId);
      return [];
    }
    if (clientType && !allowedClientTypes.has(clientType)) {
      throw new Error(`Unsupported UHP client type: ${clientType}`);
    }

    includedClientIds.add(notionPageId);
    if (!clientType) reviewClientIds.add(notionPageId);

    return [
      {
        notion_page_id: notionPageId,
        name: required(row.name, `client ${notionPageId} name`),
        client_type: clientType,
        status: row.status ?? 'Prospect',
        interest_state: firstValue(row, 'interest_state', 'interestState') ?? 'unknown',
        lead_owner: firstValue(row, 'lead_owner', 'leadOwner'),
        source_name: firstValue(row, 'source_name', 'sourceName'),
        email: row.email ?? null,
        phone: row.phone ?? null,
        alternate_phone: firstValue(row, 'alternate_phone', 'alternatePhone'),
        instagram_url: firstValue(row, 'instagram_url', 'instagramUrl'),
        website: row.website ?? null,
        job_title: firstValue(row, 'job_title', 'jobTitle'),
        office_address: firstValue(row, 'office_address', 'officeAddress'),
        chatgpt_url: firstValue(row, 'chatgpt_url', 'chatgptUrl'),
        due_date: firstValue(row, 'due_date', 'dueDate'),
        migration_review_required: !clientType,
        legacy_metadata: row,
      },
    ];
  });

  function normalizeRelated(rows, collectionName, mapper) {
    return rows.flatMap((row) => {
      const clientNotionPageId = String(relationId(row, collectionName));
      if (excludedClientIds.has(clientNotionPageId)) return [];
      if (!includedClientIds.has(clientNotionPageId)) {
        throw new Error(`${collectionName} row references unresolved client ${clientNotionPageId}`);
      }

      return [
        {
          ...mapper(row),
          notion_page_id: stableNotionId(row, collectionName),
          client_notion_page_id: clientNotionPageId,
          migration_review_required:
            booleanValue(row.migration_review_required ?? row.migrationReviewRequired) ||
            reviewClientIds.has(clientNotionPageId),
          legacy_metadata: row,
        },
      ];
    });
  }

  const activities = normalizeRelated(payload.activities ?? [], 'activities', (row) => ({
    activity_type: firstValue(row, 'activity_type', 'activityType') ?? 'Interaction',
    occurred_at: required(firstValue(row, 'occurred_at', 'occurredAt'), 'activity occurred_at'),
    direction: row.direction ?? null,
    channel: row.channel ?? null,
    title: required(firstValue(row, 'title', 'summary'), 'activity title'),
    notes: firstValue(row, 'notes', 'body'),
    status: row.status ?? 'Complete',
    follow_up_at: firstValue(row, 'follow_up_at', 'followUpAt'),
    reply_received: booleanValue(firstValue(row, 'reply_received', 'replyReceived')),
    prospect_outcome: firstValue(row, 'prospect_outcome', 'prospectOutcome', 'outcome'),
    appointment_type: firstValue(row, 'appointment_type', 'appointmentType'),
    appointment_at: firstValue(row, 'appointment_at', 'appointmentAt'),
  }));

  const notes = normalizeRelated(payload.notes ?? [], 'notes', (row) => ({
    title: required(firstValue(row, 'title', 'name'), 'note title'),
    body: firstValue(row, 'body', 'note'),
    attachment_urls: firstValue(row, 'attachment_urls', 'attachmentUrls') ?? [],
  }));

  const volumePoints = (payload.volumePoints ?? payload.volume_points ?? []).map((row) => {
    const reportingDate = String(
      required(
        firstValue(row, 'order_date', 'orderDate', 'reporting_date', 'reportingDate'),
        'volume point order_date'
      )
    );
    const reportingMonth = String(
      firstValue(row, 'reporting_month', 'reportingMonth') ?? reportingDate
    );
    return {
      source_sheet: String(
        required(firstValue(row, 'source_sheet', 'sourceSheet'), 'volume point source_sheet')
      ),
      source_row: Number(
        required(firstValue(row, 'source_row', 'sourceRow'), 'volume point source_row')
      ),
      reporting_month: `${reportingMonth.slice(0, 7)}-01`,
      category: required(row.category, 'volume point category'),
      order_id: firstValue(row, 'order_id', 'orderId'),
      member_id: firstValue(row, 'member_id', 'memberId'),
      member_name: required(
        firstValue(row, 'member_name', 'memberName', 'customer_name', 'customerName'),
        'volume point member_name'
      ),
      member_level: firstValue(row, 'member_level', 'memberLevel'),
      discount_percent: firstValue(row, 'discount_percent', 'discountPercent'),
      order_date: reportingDate,
      payment_status: firstValue(row, 'payment_status', 'paymentStatus'),
      handler_name: firstValue(row, 'handler_name', 'handlerName'),
      volume_points: Number(
        required(firstValue(row, 'volume_points', 'volumePoints'), 'volume point value')
      ),
      amount: row.amount ?? null,
      currency: row.currency ?? null,
      original_amount_text: firstValue(row, 'original_amount_text', 'originalAmountText'),
      legacy_metadata: row,
    };
  });

  const targets = (payload.targets ?? []).map((row) => {
    const reportingMonth = String(
      required(firstValue(row, 'reporting_month', 'reportingMonth'), 'target reporting_month')
    );
    return {
      reporting_month: `${reportingMonth.slice(0, 7)}-01`,
      category: required(row.category, 'target category'),
      target_vp: Number(required(firstValue(row, 'target_vp', 'targetVp'), 'target target_vp')),
      forecast_vp: Number(firstValue(row, 'forecast_vp', 'forecastVp') ?? 0),
    };
  });

  return {
    clients,
    activities,
    notes,
    volumePoints,
    targets,
    counts: {
      includedClients: clients.length,
      excludedClients: excludedClientIds.size,
      activities: activities.length,
      notes: notes.length,
      volumePoints: volumePoints.length,
      targets: targets.length,
    },
  };
}

async function upsertRows({ supabaseUrl, serviceRoleKey, table, conflictTarget, rows, select }) {
  if (!rows.length) return [];
  const returned = [];

  for (let start = 0; start < rows.length; start += 200) {
    const query = new URLSearchParams({ on_conflict: conflictTarget });
    if (select) query.set('select', select);
    const response = await fetch(`${supabaseUrl}/rest/v1/${table}?${query}`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: `resolution=merge-duplicates,return=${select ? 'representation' : 'minimal'}`,
      },
      body: JSON.stringify(rows.slice(start, start + 200)),
    });
    if (!response.ok) throw new Error(`${table} import failed: ${await response.text()}`);
    if (select) returned.push(...(await response.json()));
  }

  return returned;
}

async function run() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const inputArg = args.find((arg) => !arg.startsWith('--'));

  if (!inputArg) {
    console.error('Usage: node scripts/backfill/import-uhp-workspace.mjs <export.json> [--apply]');
    process.exitCode = 1;
    return;
  }

  const inputPath = path.resolve(process.cwd(), inputArg);
  const prepared = prepareUhpImport(JSON.parse(await readFile(inputPath, 'utf8')));

  for (const [name, count] of Object.entries(prepared.counts)) {
    console.log(`${name}: ${count} row(s)`);
  }

  if (!apply) {
    console.log('Dry run only. Re-run with --apply after reviewing counts.');
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required with --apply');
  }

  const importedClients = await upsertRows({
    supabaseUrl,
    serviceRoleKey,
    table: 'uhp_clients',
    conflictTarget: 'notion_page_id',
    rows: prepared.clients,
    select: 'id,notion_page_id',
  });
  const clientIds = new Map(importedClients.map((row) => [row.notion_page_id, row.id]));

  const relatedTables = [
    ['uhp_client_activities', prepared.activities],
    ['uhp_client_notes', prepared.notes],
  ];
  for (const [table, rows] of relatedTables) {
    const resolvedRows = rows.map(({ client_notion_page_id: sourceId, ...row }) => {
      const clientId = clientIds.get(sourceId);
      if (!clientId) throw new Error(`${table} could not resolve imported client ${sourceId}`);
      return { ...row, client_id: clientId };
    });
    await upsertRows({
      supabaseUrl,
      serviceRoleKey,
      table,
      conflictTarget: 'notion_page_id',
      rows: resolvedRows,
    });
  }

  await upsertRows({
    supabaseUrl,
    serviceRoleKey,
    table: 'uhp_vp_entries',
    conflictTarget: 'source_sheet,source_row',
    rows: prepared.volumePoints,
  });
  await upsertRows({
    supabaseUrl,
    serviceRoleKey,
    table: 'uhp_vp_month_targets',
    conflictTarget: 'reporting_month,category',
    rows: prepared.targets,
  });

  console.log('UHP workspace import complete.');
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
