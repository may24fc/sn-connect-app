"use client";

import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { CrmAccessManagerButton } from '@/components/admin/CrmAccessManagerDialog';
import { CRMInteractionPanel, type PipelineContext } from '@/components/crm/CRMInteractionPanel';
import {
  type SfoLeadInput,
  type SfoLeadRecord,
  type SfoStatus,
  type TechInquiryInput,
  type TechPipelineStage,
  useCreateSfoLead,
  useCreateTechInquiry,
  useDeleteSfoLead,
  useDeleteTechInquiry,
  useSfoLeads,
  useTechInquiries,
  useUpdateSfoLead,
  useUpdateTechInquiry,
} from '@/hooks/useCrm';

import { type ReactNode, useState, useMemo, useEffect, type FormEvent } from 'react';
import { type TechInquiryRecord, type SfoCustomerType, type SfoPlatform } from '@/hooks/useCrm';
import { type CrmTrackerKey } from '@/hooks/useCrmAccess';
// schema constants intentionally not imported here (hard-coded option arrays below)
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  EmptyState,
  Badge,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Label,
  Textarea,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  useToast,
} from '@hr-portal/ui';
import { Loader2, AlertCircle, Store, Building2, Pencil, Trash2 } from 'lucide-react';

type SfoEditFormState = {
  customerName: string;
  socialLink: string;
  messageSource: string;
  platform: SfoPlatform;
  dateOfContact: string;
  actionPlan: string;
  followUpStatus: SfoStatus;
  actionTaken: string;
  customerType: SfoCustomerType;
  reasonForReachingOut: string;
  contactNumber: string;
  address: string;
  orderDate: string;
  productsInput: string;
  amountInput: string;
  invoiceNumber: string;
  status: SfoStatus;
  remarks: string;
};

type TechEditFormState = {
  companyName: string;
  contactPerson: string;
  companyBackground: string;
  requirementsSummary: string;
  requirementsChecklistInput: string;
  pipelineStage: TechPipelineStage;
  longFormRemarks: string;
  followUpDate: string;
  assignedRep: string;
};

const emptySfoEditFormState: SfoEditFormState = {
  customerName: '',
  socialLink: '',
  messageSource: '',
  platform: 'Meta',
  dateOfContact: '',
  actionPlan: '',
  followUpStatus: 'new',
  actionTaken: '',
  customerType: 'new',
  reasonForReachingOut: '',
  contactNumber: '',
  address: '',
  orderDate: '',
  productsInput: '',
  amountInput: '0.00',
  invoiceNumber: '',
  status: 'new',
  remarks: '',
};

const emptyTechEditFormState: TechEditFormState = {
  companyName: '',
  contactPerson: '',
  companyBackground: '',
  requirementsSummary: '',
  requirementsChecklistInput: '',
  pipelineStage: 'initial_contact',
  longFormRemarks: '',
  followUpDate: '',
  assignedRep: '',
};

// Options and formatting helpers used throughout the CRM admin page
const sfoStatusOptions = [
  { value: 'new', label: 'New' },
  { value: 'for_follow_up', label: 'For Follow Up' },
  { value: 'closed', label: 'Closed' },
  { value: 'lost', label: 'Lost' },
];

const techStageOptions = [
  { value: 'initial_contact', label: 'Initial Contact' },
  { value: 'requirements_gathering', label: 'Requirements Gathering' },
  { value: 'proposal_sent', label: 'Proposal Sent' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'closed_won', label: 'Closed Won' },
  { value: 'closed_lost', label: 'Closed Lost' },
];

const customerTypeBadgeClassMap: Record<string, string> = {
  new: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200',
  returning: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-200',
  wholesale: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-200',
};

const audNumberFormatter = new Intl.NumberFormat('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const createdAtFormatter = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

function formatStageLabel(value: string) {
  return techStageOptions.find((option) => option.value === value)?.label ?? value;
}

function formatStatusLabel(value: string) {
  return sfoStatusOptions.find((option) => option.value === value)?.label ?? value;
}

function formatCreatedAt(value: string) {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return 'Invalid date';
  return createdAtFormatter.format(parsedDate);
}

function formatCreatorName(value: string | null | undefined) {
  return value?.trim() || 'Unknown user';
}

function formatAudAmount(value: number) {
  return `AU$${audNumberFormatter.format(value)}`;
}

function createSfoEditFormState(lead: SfoLeadRecord): SfoEditFormState {
  return {
    customerName: lead.customer_name,
    socialLink: lead.social_link || '',
    messageSource: lead.message_source || '',
    platform: lead.platform,
    dateOfContact: lead.date_of_contact,
    actionPlan: lead.action_plan || '',
    followUpStatus: lead.follow_up_status,
    actionTaken: lead.action_taken || '',
    customerType: lead.customer_type,
    reasonForReachingOut: lead.reason_for_reaching_out || '',
    contactNumber: lead.contact_number || '',
    address: lead.address || '',
    orderDate: lead.order_date || '',
    productsInput: lead.products.join(', '),
    amountInput: String(lead.amount),
    invoiceNumber: lead.invoice_number || '',
    status: lead.status,
    remarks: lead.remarks || '',
  };
}

function createTechEditFormState(record: TechInquiryRecord): TechEditFormState {
  return {
    companyName: record.company_name,
    contactPerson: record.contact_person,
    companyBackground: record.company_background || '',
    requirementsSummary: record.requirements_summary,
    requirementsChecklistInput: record.requirements_checklist.join(', '),
    pipelineStage: record.pipeline_stage,
    longFormRemarks: record.long_form_remarks || '',
    followUpDate: record.follow_up_date || '',
    assignedRep: record.assigned_rep || '',
  };
}

type CrmTab = 'META' | 'GOOGLE_ADS' | 'TECH';

function trackerKeyToTab(key: CrmTrackerKey): CrmTab {
  if (key === 'meta_leads') return 'META';
  if (key === 'google_ads_leads') return 'GOOGLE_ADS';
  return 'TECH';
}

export default function AdminCrmPage({ allowedTrackers }: { allowedTrackers?: CrmTrackerKey[] }): ReactNode {
  const { addToast } = useToast();
  // Determine which tabs to show. If `allowedTrackers` is provided (non-admin users),
  // only show the corresponding tracker tabs. Admins pass `undefined` and see all tabs.
  const allowedTabs: CrmTab[] = (allowedTrackers && allowedTrackers.length > 0)
    ? Array.from(new Set(allowedTrackers.map(trackerKeyToTab)))
    : (['META', 'GOOGLE_ADS', 'TECH'] as CrmTab[]);

  const defaultTab: CrmTab = allowedTabs.length > 0 ? (allowedTabs.includes('META') ? 'META' : (allowedTabs[0] as CrmTab)) : 'TECH';

  const [pipelineContext, setPipelineContext] = useState<CrmTab>(defaultTab);

  const [sfoSearch, setSfoSearch] = useState('');
  const [sfoStatusFilter, setSfoStatusFilter] = useState<'all' | SfoStatus>('all');
  const [techSearch, setTechSearch] = useState('');
  const [techStageFilter, setTechStageFilter] = useState<'all' | TechPipelineStage>('all');

  const [selectedSfoId, setSelectedSfoId] = useState<string | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string | null>(null);

  const sfoFilters = useMemo(
    () => ({
      ...(sfoSearch ? { search: sfoSearch } : {}),
      ...(sfoStatusFilter !== 'all' ? { status: sfoStatusFilter } : {}),
      ...(pipelineContext === 'META'
        ? { platform: 'Meta' as const }
        : pipelineContext === 'GOOGLE_ADS'
          ? { platform: 'Google Ads' as const }
          : {}),
    }),
    [pipelineContext, sfoSearch, sfoStatusFilter]
  );

  const techFilters = useMemo(
    () => ({
      ...(techSearch ? { search: techSearch } : {}),
      ...(techStageFilter !== 'all' ? { stage: techStageFilter } : {}),
    }),
    [techSearch, techStageFilter]
  );

  const sfoLeadsQuery = useSfoLeads(sfoFilters, {
    enabled: pipelineContext === 'META' || pipelineContext === 'GOOGLE_ADS',
  });
  const techInquiriesQuery = useTechInquiries(techFilters, { enabled: pipelineContext === 'TECH' });

  const createSfoLead = useCreateSfoLead();
  const createTechInquiry = useCreateTechInquiry();
  const deleteSfoLead = useDeleteSfoLead();
  const deleteTechInquiry = useDeleteTechInquiry();
  const updateSfoLead = useUpdateSfoLead();
  const updateTechInquiry = useUpdateTechInquiry();

  const [editingSfoLead, setEditingSfoLead] = useState<SfoLeadRecord | null>(null);
  const [deletingSfoLead, setDeletingSfoLead] = useState<SfoLeadRecord | null>(null);
  const [editingTechInquiry, setEditingTechInquiry] = useState<TechInquiryRecord | null>(null);
  const [deletingTechInquiry, setDeletingTechInquiry] = useState<TechInquiryRecord | null>(null);

  const sfoLeads = sfoLeadsQuery.data?.data ?? [];
  const techInquiries = techInquiriesQuery.data?.data ?? [];

  const selectedSfoLead = sfoLeads.find((lead) => lead.id === selectedSfoId) ?? null;
  const selectedTechInquiry = techInquiries.find((lead) => lead.id === selectedTechId) ?? null;

  const techByStage = useMemo(() => {
    return techStageOptions.map((stage) => ({
      stage,
      records: techInquiries.filter((record) => record.pipeline_stage === stage.value),
    }));
  }, [techInquiries]);

  async function handleCreateSfoLead(payload: Parameters<typeof createSfoLead.mutateAsync>[0]): Promise<void> {
    try {
      await createSfoLead.mutateAsync(payload);
      addToast({ title: 'SFO record added', variant: 'success' });
    } catch (error) {
      addToast({
        title: error instanceof Error ? error.message : 'Failed to create SFO record',
        variant: 'error',
      });
    }
  }

  async function handleCreateTechInquiry(payload: Parameters<typeof createTechInquiry.mutateAsync>[0]): Promise<void> {
    try {
      await createTechInquiry.mutateAsync(payload);
      addToast({ title: 'TECH inquiry added', variant: 'success' });
    } catch (error) {
      addToast({
        title: error instanceof Error ? error.message : 'Failed to create TECH inquiry',
        variant: 'error',
      });
    }
  }

  async function handleSfoStatusUpdate(
    lead: SfoLeadRecord,
    status: SfoStatus,
    key: 'status' | 'followUpStatus'
  ): Promise<void> {
    try {
      await updateSfoLead.mutateAsync({
        id: lead.id,
        payload: key === 'status' ? { status } : { followUpStatus: status },
      });
      addToast({ title: 'SFO status updated', variant: 'success' });
    } catch (error) {
      addToast({
        title: error instanceof Error ? error.message : 'Failed to update SFO status',
        variant: 'error',
      });
    }
  }

  async function handleTechStageUpdate(lead: TechInquiryRecord, pipelineStage: TechPipelineStage): Promise<void> {
    try {
      await updateTechInquiry.mutateAsync({ id: lead.id, payload: { pipelineStage } });
      addToast({ title: 'TECH pipeline stage updated', variant: 'success' });
    } catch (error) {
      addToast({
        title: error instanceof Error ? error.message : 'Failed to update TECH stage',
        variant: 'error',
      });
    }
  }

  async function handleSaveSfoLead(id: string, payload: SfoLeadInput): Promise<void> {
    try {
      await updateSfoLead.mutateAsync({ id, payload });
      setEditingSfoLead(null);
      addToast({ title: 'SFO record updated', variant: 'success' });
    } catch (error) {
      addToast({
        title: error instanceof Error ? error.message : 'Failed to update SFO record',
        variant: 'error',
      });
    }
  }

  async function handleDeleteSfoLead(): Promise<void> {
    if (!deletingSfoLead) {
      return;
    }

    try {
      await deleteSfoLead.mutateAsync({ id: deletingSfoLead.id });
      if (selectedSfoId === deletingSfoLead.id) {
        setSelectedSfoId(null);
      }
      setDeletingSfoLead(null);
      addToast({ title: 'SFO record deleted', variant: 'success' });
    } catch (error) {
      addToast({
        title: error instanceof Error ? error.message : 'Failed to delete SFO record',
        variant: 'error',
      });
    }
  }

  async function handleSaveTechInquiry(id: string, payload: TechInquiryInput): Promise<void> {
    try {
      await updateTechInquiry.mutateAsync({ id, payload });
      setEditingTechInquiry(null);
      addToast({ title: 'TECH inquiry updated', variant: 'success' });
    } catch (error) {
      addToast({
        title: error instanceof Error ? error.message : 'Failed to update TECH inquiry',
        variant: 'error',
      });
    }
  }

  async function handleDeleteTechInquiry(): Promise<void> {
    if (!deletingTechInquiry) {
      return;
    }

    try {
      await deleteTechInquiry.mutateAsync({ id: deletingTechInquiry.id });
      if (selectedTechId === deletingTechInquiry.id) {
        setSelectedTechId(null);
      }
      setDeletingTechInquiry(null);
      addToast({ title: 'TECH inquiry deleted', variant: 'success' });
    } catch (error) {
      addToast({
        title: error instanceof Error ? error.message : 'Failed to delete TECH inquiry',
        variant: 'error',
      });
    }
  }

  function renderSfoContent(tabLabel: string): ReactNode {
    const emptyDescription =
      tabLabel === 'Meta Leads'
        ? 'Create the first Meta lead from the interaction panel.'
        : 'Create the first Google Ads lead from the interaction panel.';

    return sfoLeadsQuery.isLoading ? (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={<Loader2 className="h-5 w-5 animate-spin" />}
            title={`Loading ${tabLabel}`}
            description="Fetching transactional cards."
            size="sm"
          />
        </CardContent>
      </Card>
    ) : sfoLeadsQuery.error ? (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={AlertCircle}
            title={`Failed to load ${tabLabel}`}
            description={sfoLeadsQuery.error.message}
            size="sm"
          />
        </CardContent>
      </Card>
    ) : sfoLeads.length === 0 ? (
      <Card>
        <CardContent className="p-6">
          <EmptyState
            icon={Store}
            title={`No ${tabLabel.toLowerCase()} yet`}
            description={emptyDescription}
            size="sm"
          />
        </CardContent>
      </Card>
    ) : (
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          {sfoLeads.map((lead) => (
            <Card
              key={lead.id}
              onClick={() => setSelectedSfoId(lead.id)}
              className={`group ${lead.id === selectedSfoId ? 'border-zinc-900 dark:border-zinc-100' : ''}`}
            >
              <CardContent className="relative cursor-pointer space-y-3 p-4">
                <div className="absolute right-4 top-4 z-10 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingSfoLead(lead);
                    }}
                    aria-label={`Edit ${lead.customer_name}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0 text-zinc-500 hover:text-red-600"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDeletingSfoLead(lead);
                    }}
                    aria-label={`Delete ${lead.customer_name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    className="pr-20 text-left"
                    onClick={() => setSelectedSfoId(lead.id)}
                  >
                    <p className="font-semibold text-foreground">{lead.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {lead.message_source || 'No source provided'}
                    </p>
                  </button>
                  <div className="inline-flex items-center gap-2 rounded-md border border-border px-2 py-1 text-md">
                    <span className="font-semibold text-foreground">
                      {formatAudAmount(lead.amount)}
                    </span>
                  </div>
                </div>

                <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2 lg:grid-cols-3">
                  <p>Facebook Link: {lead.social_link || '-'}</p>
                  <p>Platform: {lead.platform}</p>
                  <p>Date of Contact: {lead.date_of_contact}</p>
                  <p>Action Plan: {lead.action_plan || '-'}</p>
                  <p>Action Taken: {lead.action_taken || '-'}</p>
                  <p>Reason: {lead.reason_for_reaching_out || '-'}</p>
                  <p>Contact Number: {lead.contact_number || '-'}</p>
                  <p>Address: {lead.address || '-'}</p>
                  <p>Order Date: {lead.order_date || '-'}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between pt-4">
                  <div className="flex items-center gap-2">
                    <Badge className={customerTypeBadgeClassMap[lead.customer_type]}>
                      {lead.customer_type === 'new'
                        ? 'New'
                        : lead.customer_type === 'returning'
                          ? 'Returning'
                          : 'Wholesale'}
                    </Badge>

                    <Select
                      value={lead.status}
                      onValueChange={(value) => void handleSfoStatusUpdate(lead, value as SfoStatus, 'status')}
                    >
                      <SelectTrigger className="h-8 w-[170px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sfoStatusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={lead.follow_up_status}
                      onValueChange={(value) =>
                        void handleSfoStatusUpdate(lead, value as SfoStatus, 'followUpStatus')
                      }
                    >
                      <SelectTrigger className="h-8 w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {sfoStatusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end">
                    <p className="text-xs text-muted-foreground">
                      Created {formatCreatedAt(lead.created_at)} by {formatCreatorName(lead.created_by_name)}
                    </p>
                  </div>
                </div>

                
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit xl:sticky xl:top-6">
          <CardHeader>
            <CardTitle className="text-base">SFO Detail Panel</CardTitle>
            <CardDescription>
              Products, amount, status, invoice number, and remarks.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {selectedSfoLead ? (
              <>
                <p className="font-semibold text-foreground">{selectedSfoLead.customer_name}</p>
                <p>Products: {selectedSfoLead.products.join(', ') || '-'}</p>
                <p>Amount: {formatAudAmount(selectedSfoLead.amount)}</p>
                <p>Status: {formatStatusLabel(selectedSfoLead.status)}</p>
                <p>Invoice Number: {selectedSfoLead.invoice_number || '-'}</p>
                <p>Other Remarks: {selectedSfoLead.remarks || '-'}</p>
              </>
            ) : (
              <p>Select a row card to open details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dual-Pipeline CRM Tracker</h1>
        <p className="text-sm text-muted-foreground">
          One workspace for SFO retail transactions and SN Tech B2B requirements management.
        </p>
      </div>

      <Tabs
        value={pipelineContext}
        onValueChange={(value) => {
          setPipelineContext(value as PipelineContext);
          setSelectedSfoId(null);
          setSelectedTechId(null);
        }}
      >
        <TabsList className="h-auto w-full justify-start gap-2 rounded-none border-b bg-transparent p-0">
          {allowedTabs.includes('META') && (
            <TabsTrigger
              value="META"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none dark:data-[state=active]:border-zinc-100"
            >
              Meta Leads
            </TabsTrigger>
          )}

          {allowedTabs.includes('GOOGLE_ADS') && (
            <TabsTrigger
              value="GOOGLE_ADS"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none dark:data-[state=active]:border-zinc-100"
            >
              Google Ads Leads
            </TabsTrigger>
          )}

          {allowedTabs.includes('TECH') && (
            <TabsTrigger
              value="TECH"
              className="rounded-none border-b-2 border-transparent bg-transparent px-4 py-2 data-[state=active]:border-zinc-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none dark:data-[state=active]:border-zinc-100"
            >
              SN Tech Inquiries
            </TabsTrigger>
          )}
        </TabsList>

        <div className="pt-4">
          <CRMInteractionPanel
            pipelineContext={pipelineContext as PipelineContext}
            isSubmittingSfo={createSfoLead.isPending}
            isSubmittingTech={createTechInquiry.isPending}
            onCreateSfoLead={handleCreateSfoLead}
            onCreateTechInquiry={handleCreateTechInquiry}
          />
        </div>

        <TabsContent value="META" className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              value={sfoSearch}
              onChange={(event) => setSfoSearch(event.target.value)}
              placeholder="Search customer, invoice, source, remarks"
              className="md:max-w-md"
            />
            <Select value={sfoStatusFilter} onValueChange={(value) => setSfoStatusFilter(value as 'all' | SfoStatus)}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {sfoStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

            <CrmAccessManagerButton tracker="meta_leads" label="Meta Leads" />
          </div>

          {renderSfoContent('Meta Leads')}
        </TabsContent>

        <TabsContent value="GOOGLE_ADS" className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              value={sfoSearch}
              onChange={(event) => setSfoSearch(event.target.value)}
              placeholder="Search customer, invoice, source, remarks"
              className="md:max-w-md"
            />
            <Select value={sfoStatusFilter} onValueChange={(value) => setSfoStatusFilter(value as 'all' | SfoStatus)}>
              <SelectTrigger className="w-full md:w-56">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {sfoStatusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

            <CrmAccessManagerButton tracker="google_ads_leads" label="Google Ads Leads" />
          </div>

          {renderSfoContent('Google Ads Leads')}
        </TabsContent>

        <TabsContent value="TECH" className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              value={techSearch}
              onChange={(event) => setTechSearch(event.target.value)}
              placeholder="Search company, contact, summary"
              className="md:max-w-md"
            />
            <Select value={techStageFilter} onValueChange={(value) => setTechStageFilter(value as 'all' | TechPipelineStage)}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="Pipeline Stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {techStageOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>

            <CrmAccessManagerButton tracker="sn_tech_inquiries" label="SN Tech Inquiries" />
          </div>

          {techInquiriesQuery.isLoading ? (
            <Card>
              <CardContent className="p-6">
                <EmptyState
                  icon={<Loader2 className="h-5 w-5 animate-spin" />}
                  title="Loading TECH pipeline"
                  description="Fetching board columns."
                  size="sm"
                />
              </CardContent>
            </Card>
          ) : techInquiriesQuery.error ? (
            <Card>
              <CardContent className="p-6">
                <EmptyState
                  icon={AlertCircle}
                  title="Failed to load TECH records"
                  description={techInquiriesQuery.error.message}
                  size="sm"
                />
              </CardContent>
            </Card>
          ) : techInquiries.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <EmptyState icon={Building2} title="No TECH inquiries yet" description="Create the first inquiry from the interaction panel." size="sm" />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
              <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
                {techByStage.map(({ stage, records }) => (
                  <Card key={stage.value}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">{stage.label}</CardTitle>
                      <CardDescription>{records.length} deal(s)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {records.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No inquiries in this stage.</p>
                      ) : (
                        records.map((record) => (
                          <div key={record.id} className={`group relative`}> 
                            <div className="absolute right-4 top-4 z-10 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setEditingTechInquiry(record);
                                }}
                                aria-label={`Edit ${record.company_name}`}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-zinc-500 hover:text-red-600"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setDeletingTechInquiry(record);
                                }}
                                aria-label={`Delete ${record.company_name}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setSelectedTechId(record.id)}
                              className="w-full rounded-md border border-border p-2 pr-16 text-left text-sm transition-colors hover:bg-muted/40"
                            >
                              <p className="font-medium text-foreground">{record.company_name}</p>
                              <p className="text-xs text-muted-foreground">{record.contact_person}</p>
                              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{record.requirements_summary}</p>
                              <div className="mt-2 flex justify-end">
                                <p className="text-[11px] text-muted-foreground">
                                  Created {formatCreatedAt(record.created_at)} by {record.created_by_name || 'Unknown user'}
                                </p>
                              </div>
                            </button>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="h-fit xl:sticky xl:top-6">
                <CardHeader>
                  <CardTitle className="text-base">TECH Contact Detail Panel</CardTitle>
                  <CardDescription>
                    Company profile, requirements checklist, and long-form remarks thread.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  {selectedTechInquiry ? (
                    <>
                      <div>
                        <p className="font-semibold text-foreground">{selectedTechInquiry.company_name}</p>
                        <p>Contact: {selectedTechInquiry.contact_person}</p>
                        <p>Assigned Rep: {selectedTechInquiry.assigned_rep || '-'}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Company Profile</p>
                        <p>{selectedTechInquiry.company_background || 'No profile added yet.'}</p>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Requirements Checklist</p>
                        <ul className="list-disc space-y-1 pl-4">
                          {selectedTechInquiry.requirements_checklist.length === 0
                            ? <li>No checklist items yet.</li>
                            : selectedTechInquiry.requirements_checklist.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Remarks Thread</p>
                        <div className="rounded-md border border-border bg-muted/30 p-3">
                          {selectedTechInquiry.long_form_remarks || 'No remarks yet.'}
                        </div>
                      </div>

                      <Select
                        value={selectedTechInquiry.pipeline_stage}
                        onValueChange={(value) =>
                          void handleTechStageUpdate(selectedTechInquiry, value as TechPipelineStage)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {techStageOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <p>Current Stage: {formatStageLabel(selectedTechInquiry.pipeline_stage)}</p>
                    </>
                  ) : (
                    <p>Select a TECH inquiry card to inspect details.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <EditSfoLeadDialog
        lead={editingSfoLead}
        open={!!editingSfoLead}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSfoLead(null);
          }
        }}
        isPending={updateSfoLead.isPending}
        onSubmit={handleSaveSfoLead}
      />

      <EditTechInquiryDialog
        inquiry={editingTechInquiry}
        open={!!editingTechInquiry}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTechInquiry(null);
          }
        }}
        isPending={updateTechInquiry.isPending}
        onSubmit={handleSaveTechInquiry}
      />

      <ConfirmActionDialog
        open={!!deletingSfoLead}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingSfoLead(null);
          }
        }}
        title="Delete SFO lead?"
        description={deletingSfoLead ? `\"${deletingSfoLead.customer_name}\" will be removed from the CRM tracker.` : ''}
        confirmLabel="Delete lead"
        isPending={deleteSfoLead.isPending}
        onConfirm={() => {
          void handleDeleteSfoLead();
        }}
      />

      <ConfirmActionDialog
        open={!!deletingTechInquiry}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingTechInquiry(null);
          }
        }}
        title="Delete TECH inquiry?"
        description={deletingTechInquiry ? `\"${deletingTechInquiry.company_name}\" will be removed from the CRM tracker.` : ''}
        confirmLabel="Delete inquiry"
        isPending={deleteTechInquiry.isPending}
        onConfirm={() => {
          void handleDeleteTechInquiry();
        }}
      />
    </div>
  );
}

function EditSfoLeadDialog({
  lead,
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: {
  lead: SfoLeadRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (id: string, payload: SfoLeadInput) => Promise<void>;
}) {
  const [form, setForm] = useState<SfoEditFormState>(lead ? createSfoEditFormState(lead) : emptySfoEditFormState);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(lead ? createSfoEditFormState(lead) : emptySfoEditFormState);
  }, [lead, open]);

  if (!lead) {
    return null;
  }

  function patchField<K extends keyof SfoEditFormState>(key: K, value: SfoEditFormState[K]): void {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!lead) {
      return;
    }

    await onSubmit(lead.id, {
      customerName: form.customerName,
      socialLink: form.socialLink || undefined,
      messageSource: form.messageSource || undefined,
      platform: form.platform,
      dateOfContact: form.dateOfContact,
      actionPlan: form.actionPlan || undefined,
      followUpStatus: form.followUpStatus,
      actionTaken: form.actionTaken || undefined,
      customerType: form.customerType,
      reasonForReachingOut: form.reasonForReachingOut || undefined,
      contactNumber: form.contactNumber || undefined,
      address: form.address || undefined,
      orderDate: form.orderDate || undefined,
      products: form.productsInput.split(',').map((value) => value.trim()).filter(Boolean),
      amount: Number.parseFloat(form.amountInput || '0'),
      invoiceNumber: form.invoiceNumber || undefined,
      status: form.status,
      remarks: form.remarks || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit SFO Lead</DialogTitle>
          <DialogDescription>Update the lead details, status, and transaction notes.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-sfo-customer-name">Customer Name</Label>
            <Input
              id="edit-sfo-customer-name"
              value={form.customerName}
              onChange={(event) => patchField('customerName', event.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-sfo-social-link">Facebook/Social Link</Label>
              <Input
                id="edit-sfo-social-link"
                value={form.socialLink}
                onChange={(event) => patchField('socialLink', event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-sfo-message-source">Message/Comment Source</Label>
              <Input
                id="edit-sfo-message-source"
                value={form.messageSource}
                onChange={(event) => patchField('messageSource', event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="edit-sfo-platform">Platform</Label>
              <Select value={form.platform} onValueChange={(value) => patchField('platform', value as 'Meta' | 'Google Ads')}>
                <SelectTrigger id="edit-sfo-platform">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Meta">Meta</SelectItem>
                  <SelectItem value="Google Ads">Google Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-sfo-date-of-contact">Date of Contact</Label>
              <Input
                id="edit-sfo-date-of-contact"
                type="date"
                value={form.dateOfContact}
                onChange={(event) => patchField('dateOfContact', event.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-sfo-order-date">Order Date</Label>
              <Input
                id="edit-sfo-order-date"
                type="date"
                value={form.orderDate}
                onChange={(event) => patchField('orderDate', event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-sfo-products">Products (comma-separated)</Label>
              <Input
                id="edit-sfo-products"
                value={form.productsInput}
                onChange={(event) => patchField('productsInput', event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-sfo-amount">Amount (AU$)</Label>
              <Input
                id="edit-sfo-amount"
                type="number"
                step="0.01"
                min="0"
                value={form.amountInput}
                onChange={(event) => patchField('amountInput', event.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="edit-sfo-status">Status</Label>
              <Select value={form.status} onValueChange={(value) => patchField('status', value as SfoStatus)}>
                <SelectTrigger id="edit-sfo-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sfoStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-sfo-follow-up-status">Status of Follow-up</Label>
              <Select value={form.followUpStatus} onValueChange={(value) => patchField('followUpStatus', value as SfoStatus)}>
                <SelectTrigger id="edit-sfo-follow-up-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sfoStatusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-sfo-customer-type">Customer Type</Label>
              <Select value={form.customerType} onValueChange={(value) => patchField('customerType', value as 'new' | 'returning' | 'wholesale')}>
                <SelectTrigger id="edit-sfo-customer-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="returning">Returning</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-sfo-invoice-number">Invoice Number</Label>
              <Input
                id="edit-sfo-invoice-number"
                value={form.invoiceNumber}
                onChange={(event) => patchField('invoiceNumber', event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-sfo-contact-number">Contact Number</Label>
              <Input
                id="edit-sfo-contact-number"
                value={form.contactNumber}
                onChange={(event) => patchField('contactNumber', event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-sfo-reason">Reason for Reaching Out</Label>
            <Input
              id="edit-sfo-reason"
              value={form.reasonForReachingOut}
              onChange={(event) => patchField('reasonForReachingOut', event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-sfo-action-plan">Action Plan</Label>
            <Textarea
              id="edit-sfo-action-plan"
              value={form.actionPlan}
              onChange={(event) => patchField('actionPlan', event.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-sfo-action-taken">Action Taken</Label>
            <Textarea
              id="edit-sfo-action-taken"
              value={form.actionTaken}
              onChange={(event) => patchField('actionTaken', event.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-sfo-address">Address</Label>
            <Input
              id="edit-sfo-address"
              value={form.address}
              onChange={(event) => patchField('address', event.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-sfo-remarks">Other Remarks</Label>
            <Textarea
              id="edit-sfo-remarks"
              value={form.remarks}
              onChange={(event) => patchField('remarks', event.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditTechInquiryDialog({
  inquiry,
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: {
  inquiry: TechInquiryRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onSubmit: (id: string, payload: TechInquiryInput) => Promise<void>;
}) {
  const [form, setForm] = useState<TechEditFormState>(inquiry ? createTechEditFormState(inquiry) : emptyTechEditFormState);

  useEffect(() => {
    if (!open) {
      return;
    }

    setForm(inquiry ? createTechEditFormState(inquiry) : emptyTechEditFormState);
  }, [inquiry, open]);

  if (!inquiry) {
    return null;
  }

  function patchField<K extends keyof TechEditFormState>(key: K, value: TechEditFormState[K]): void {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!inquiry) {
      return;
    }

    await onSubmit(inquiry.id, {
      companyName: form.companyName,
      contactPerson: form.contactPerson,
      companyBackground: form.companyBackground || undefined,
      requirementsSummary: form.requirementsSummary,
      requirementsChecklist: form.requirementsChecklistInput.split(',').map((value) => value.trim()).filter(Boolean),
      pipelineStage: form.pipelineStage,
      longFormRemarks: form.longFormRemarks || undefined,
      followUpDate: form.followUpDate || undefined,
      assignedRep: form.assignedRep || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Edit TECH Inquiry</DialogTitle>
          <DialogDescription>Update the company context, requirements, and deal stage.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-tech-company-name">Company Name</Label>
              <Input
                id="edit-tech-company-name"
                value={form.companyName}
                onChange={(event) => patchField('companyName', event.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-tech-contact-person">Contact Person</Label>
              <Input
                id="edit-tech-contact-person"
                value={form.contactPerson}
                onChange={(event) => patchField('contactPerson', event.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-tech-company-background">Company Background</Label>
            <Textarea
              id="edit-tech-company-background"
              value={form.companyBackground}
              onChange={(event) => patchField('companyBackground', event.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-tech-requirements-summary">Requirements Summary</Label>
            <Textarea
              id="edit-tech-requirements-summary"
              value={form.requirementsSummary}
              onChange={(event) => patchField('requirementsSummary', event.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-tech-requirements-checklist">Requirements Checklist (comma-separated)</Label>
            <Input
              id="edit-tech-requirements-checklist"
              value={form.requirementsChecklistInput}
              onChange={(event) => patchField('requirementsChecklistInput', event.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="edit-tech-pipeline-stage">Pipeline Stage</Label>
              <Select value={form.pipelineStage} onValueChange={(value) => patchField('pipelineStage', value as TechPipelineStage)}>
                <SelectTrigger id="edit-tech-pipeline-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {techStageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-tech-follow-up-date">Follow-up Date</Label>
              <Input
                id="edit-tech-follow-up-date"
                type="date"
                value={form.followUpDate}
                onChange={(event) => patchField('followUpDate', event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-tech-assigned-rep">Assigned Rep</Label>
              <Input
                id="edit-tech-assigned-rep"
                value={form.assignedRep}
                onChange={(event) => patchField('assignedRep', event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="edit-tech-long-form-remarks">Long-form Remarks</Label>
            <Textarea
              id="edit-tech-long-form-remarks"
              value={form.longFormRemarks}
              onChange={(event) => patchField('longFormRemarks', event.target.value)}
              rows={5}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
