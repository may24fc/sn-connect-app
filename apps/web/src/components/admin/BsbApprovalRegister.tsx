'use client';

import {
  Button, Card, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger,
  SelectValue, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Textarea,
} from '@hr-portal/ui';
import { useEffect, useState } from 'react';

interface SourceRow {
  id: string; title: string; drive_file_id: string; decision: 'draft' | 'approved' | 'revoked';
  classification: string | null; source_owner_email: string | null; retention_rule: string; retention_until: string | null;
  acl_checked_at: string | null;
  reviewer_id: string | null; expires_at: string | null; revoked_at: string | null;
  allowed_principals: string[]; okf: { facts: Array<{ id: string; exactQuote: string }> };
}

const fields = [
  ['classification', 'Classification'], ['retentionUntil', 'Retention until (ISO date/time, if applicable)'],
  ['expiresAt', 'Optional access expiry (ISO date/time)'],
  ['allowedPrincipals', 'Approved reader emails (one per line)'],
] as const;

const columnLabels = ['Source reference', 'Classification', 'Retention', 'ACL check',
  'Approved by', 'Decision', 'Expiry', 'Revocation', 'Actions'];

export function BsbApprovalRegister() {
  const [rows, setRows] = useState<SourceRow[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  async function refresh() {
    const response = await fetch('/api/bsb/sources', { cache: 'no-store' });
    if (response.ok) setRows((await response.json() as { data: SourceRow[] }).data);
    else setMessage('Approval Register is unavailable.');
  }
  useEffect(() => { void refresh(); }, []);

  async function act(method: 'POST' | 'PATCH', body?: Record<string, unknown>) {
    setPending(true); setMessage('');
    try {
      const response = await fetch('/api/bsb/sources', {
        method, headers: { 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Request failed');
      await refresh();
      setSelected(null); setRevokeId(null); setRevokeReason('');
      setMessage(method === 'POST' ? 'Private draft imported.' : 'Decision saved.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Request failed'); }
    finally { setPending(false); }
  }

  function approve(id: string) {
    void act('PATCH', { id, action: 'approve', processor: 'openai',
      ...Object.fromEntries(Object.entries(form).filter(([key, value]) =>
        key !== 'allowedPrincipals' && value.trim() !== '')),
      allowedPrincipals: (form.allowedPrincipals ?? '').split(/\r?\n/).map((email) => email.trim()).filter(Boolean),
    });
  }

  return <Card role="region" aria-label="BSB Approval Register" className="mt-5 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-base font-semibold">BSB Approval Register</h2>
        <p className="text-sm text-muted-foreground">One Google Doc. Review its passages, reader access, and retention before publishing.</p></div>
      <Button type="button" size="sm" disabled={pending} onClick={() => void act('POST')}>Import configured note</Button>
    </div>
    {message && <p role="status" className="mt-2 text-sm">{message}</p>}

    <div className="mt-3">
      <Table className="min-w-[800px] text-xs">
        <TableHeader><TableRow>{columnLabels.map((label) =>
          <TableHead key={label} className="p-2">{label}</TableHead>)}</TableRow></TableHeader>
        <TableBody>{rows.map((row) => <TableRow key={row.id}>
          <TableCell className="p-2 align-top"><span className="font-medium">{row.title}</span><br />
            <span className="break-all text-muted-foreground">{row.drive_file_id}</span><br />
            Owner: {row.source_owner_email ?? 'Pending'}</TableCell>
          <TableCell className="p-2 align-top">{row.classification ?? 'Pending'}</TableCell>
          <TableCell className="p-2 align-top">{row.retention_rule === 'never' ? 'Never' : row.retention_until ?? 'Pending'}</TableCell>
          <TableCell className="p-2 align-top">{row.acl_checked_at ?? 'Pending'}</TableCell>
          <TableCell className="p-2 align-top">{row.reviewer_id ?? 'Pending'}</TableCell>
          <TableCell className="p-2 align-top font-medium">{row.decision}</TableCell>
          <TableCell className="p-2 align-top">{row.expires_at ?? 'Pending'}</TableCell>
          <TableCell className="p-2 align-top">{row.revoked_at ?? '—'}</TableCell>
          <TableCell className="space-y-1 p-2 align-top">
            {row.decision === 'draft' && <Button type="button" variant="link" size="xs"
              onClick={() => setSelected(selected === row.id ? null : row.id)}>Review</Button>}
            {row.decision === 'approved' && <Button type="button" variant="destructive" size="xs"
              disabled={pending} onClick={() => setRevokeId(row.id)}>Revoke</Button>}
          </TableCell>
        </TableRow>)}</TableBody>
      </Table>
      {rows.length === 0 && <p className="p-3 text-sm text-muted-foreground">No source imported.</p>}
    </div>

    {rows.filter((row) => row.id === selected).map((row) => <Card key={row.id} className="mt-4 p-3">
      <h3 className="font-medium">Review source passages and access</h3>
      <p className="text-xs text-muted-foreground">Source owner: {row.source_owner_email ?? 'Not available'}. The current Google ACL is checked again at approval and every chat request.</p>
      <details className="my-3 max-h-64 overflow-auto text-sm"><summary className="cursor-pointer">Read {row.okf.facts.length} imported passages</summary>
        {row.okf.facts.map((fact) => <p key={fact.id} className="my-2 whitespace-pre-wrap border-b pb-2"><strong>{fact.id}</strong> {fact.exactQuote}</p>)}
      </details>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1"><Label htmlFor="bsb-retention-rule">Retention rule</Label>
          <Select value={form.retentionRule ?? 'pending'} onValueChange={(value) => setForm({ ...form, retentionRule: value })}>
            <SelectTrigger id="bsb-retention-rule"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="pending">Select rule</SelectItem>
              <SelectItem value="never">Never</SelectItem><SelectItem value="until">Until date</SelectItem></SelectContent>
          </Select>
        </div>
        {fields.filter(([key]) => key !== 'retentionUntil' || form.retentionRule === 'until')
          .map(([key, label]) => <div key={key} className="space-y-1">
            <Label htmlFor={`bsb-${key}`}>{label}</Label>
            {key === 'allowedPrincipals'
              ? <Textarea id={`bsb-${key}`} value={form[key] ?? ''} showCounter={false} rows={3}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
              : <Input id={`bsb-${key}`} value={form[key] ?? ''}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })} />}
          </div>)}
      </div>
      <Button type="button" size="sm" className="mt-3" disabled={pending} onClick={() => approve(row.id)}>
        Approve with OpenAI
      </Button>
    </Card>)}

    <Dialog open={revokeId !== null} onOpenChange={(open) => { if (!open) { setRevokeId(null); setRevokeReason(''); } }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Revoke BSB source</DialogTitle>
          <DialogDescription>Chat access stops immediately after the server confirms revocation.</DialogDescription></DialogHeader>
        <div className="space-y-1"><Label htmlFor="bsb-revoke-reason">Reason for revocation</Label>
          <Textarea id="bsb-revoke-reason" showCounter={false} value={revokeReason}
            onChange={(event) => setRevokeReason(event.target.value)} /></div>
        <DialogFooter><Button type="button" variant="outline" onClick={() => setRevokeId(null)}>Cancel</Button>
          <Button type="button" variant="destructive" disabled={pending || !revokeReason.trim() || !revokeId}
            onClick={() => { if (revokeId) void act('PATCH', { id: revokeId, action: 'revoke', reason: revokeReason.trim() }); }}>
            Revoke source
          </Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </Card>;
}
