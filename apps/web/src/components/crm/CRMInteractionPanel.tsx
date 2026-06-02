'use client';

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@hr-portal/ui';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import {
  type SfoLeadInput,
  type TechInquiryInput,
} from '@/hooks/useCrm';

export type PipelineContext = 'SFO' | 'TECH';

const CRM_FORM_VISIBILITY_STORAGE_KEY = 'crm-form-visibility-v1';

interface CRMInteractionPanelProps {
  pipelineContext: PipelineContext;
  isSubmittingSfo: boolean;
  isSubmittingTech: boolean;
  onCreateSfoLead: (payload: SfoLeadInput) => Promise<void>;
  onCreateTechInquiry: (payload: TechInquiryInput) => Promise<void>;
}

type SfoFormState = {
  customerName: string;
  socialLink: string;
  messageSource: string;
  platform: 'META' | 'IG';
  dateOfContact: string;
  actionPlan: string;
  followUpStatus: 'new' | 'for_follow_up' | 'closed' | 'lost';
  actionTaken: string;
  customerType: 'new' | 'returning' | 'wholesale';
  reasonForReachingOut: string;
  contactNumber: string;
  address: string;
  orderDate: string;
  productsInput: string;
  amountInput: string;
  invoiceNumber: string;
  status: 'new' | 'for_follow_up' | 'closed' | 'lost';
  remarks: string;
};

type TechFormState = {
  companyName: string;
  contactPerson: string;
  companyBackground: string;
  requirementsSummary: string;
  requirementsChecklistInput: string;
  pipelineStage:
    | 'initial_contact'
    | 'requirements_gathering'
    | 'proposal_sent'
    | 'under_review'
    | 'closed_won'
    | 'closed_lost';
  longFormRemarks: string;
  followUpDate: string;
  assignedRep: string;
};

const sfoInitialState: SfoFormState = {
  customerName: '',
  socialLink: '',
  messageSource: '',
  platform: 'META' as const,
  dateOfContact: new Date().toISOString().slice(0, 10),
  actionPlan: '',
  followUpStatus: 'new' as const,
  actionTaken: '',
  customerType: 'new' as const,
  reasonForReachingOut: '',
  contactNumber: '',
  address: '',
  orderDate: '',
  productsInput: '',
  amountInput: '0.00',
  invoiceNumber: '',
  status: 'new' as const,
  remarks: '',
};

const techInitialState: TechFormState = {
  companyName: '',
  contactPerson: '',
  companyBackground: '',
  requirementsSummary: '',
  requirementsChecklistInput: '',
  pipelineStage: 'initial_contact' as const,
  longFormRemarks: '',
  followUpDate: '',
  assignedRep: '',
};

export function CRMInteractionPanel({
  pipelineContext,
  isSubmittingSfo,
  isSubmittingTech,
  onCreateSfoLead,
  onCreateTechInquiry,
}: CRMInteractionPanelProps) {
  const [sfoForm, setSfoForm] = useState<SfoFormState>(sfoInitialState);
  const [techForm, setTechForm] = useState<TechFormState>(techInitialState);
  const [formVisibility, setFormVisibility] = useState<Record<PipelineContext, boolean>>({
    SFO: true,
    TECH: true,
  });

  const patchSfoForm = <K extends keyof SfoFormState>(
    key: K,
    value: SfoFormState[K]
  ): void => {
    setSfoForm((prev: SfoFormState) => ({ ...prev, [key]: value }));
  };

  const patchTechForm = <K extends keyof TechFormState>(
    key: K,
    value: TechFormState[K]
  ): void => {
    setTechForm((prev: TechFormState) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    // Reset inactive pipeline form so stale fields never bleed across modes.
    if (pipelineContext === 'SFO') {
      setTechForm(techInitialState);
      return;
    }

    setSfoForm(sfoInitialState);
  }, [pipelineContext]);

  useEffect(() => {
    try {
      const rawValue = window.localStorage.getItem(CRM_FORM_VISIBILITY_STORAGE_KEY);

      if (!rawValue) {
        return;
      }

      const parsed = JSON.parse(rawValue) as Partial<Record<PipelineContext, boolean>>;
      setFormVisibility((prev) => ({
        SFO: typeof parsed.SFO === 'boolean' ? parsed.SFO : prev.SFO,
        TECH: typeof parsed.TECH === 'boolean' ? parsed.TECH : prev.TECH,
      }));
    } catch {
      // Ignore malformed localStorage values and keep defaults.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(CRM_FORM_VISIBILITY_STORAGE_KEY, JSON.stringify(formVisibility));
  }, [formVisibility]);

  function toggleFormVisibility(context: PipelineContext): void {
    setFormVisibility((prev) => ({
      ...prev,
      [context]: !prev[context],
    }));
  }

  async function handleSfoSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    await onCreateSfoLead({
      customerName: sfoForm.customerName,
      socialLink: sfoForm.socialLink || undefined,
      messageSource: sfoForm.messageSource || undefined,
      platform: sfoForm.platform,
      dateOfContact: sfoForm.dateOfContact,
      actionPlan: sfoForm.actionPlan || undefined,
      followUpStatus: sfoForm.followUpStatus,
      actionTaken: sfoForm.actionTaken || undefined,
      customerType: sfoForm.customerType,
      reasonForReachingOut: sfoForm.reasonForReachingOut || undefined,
      contactNumber: sfoForm.contactNumber || undefined,
      address: sfoForm.address || undefined,
      orderDate: sfoForm.orderDate || undefined,
      products: sfoForm.productsInput
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      amount: Number.parseFloat(sfoForm.amountInput || '0'),
      invoiceNumber: sfoForm.invoiceNumber || undefined,
      status: sfoForm.status,
      remarks: sfoForm.remarks || undefined,
    });

    setSfoForm(sfoInitialState);
  }

  async function handleTechSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    await onCreateTechInquiry({
      companyName: techForm.companyName,
      contactPerson: techForm.contactPerson,
      companyBackground: techForm.companyBackground || undefined,
      requirementsSummary: techForm.requirementsSummary,
      requirementsChecklist: techForm.requirementsChecklistInput
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean),
      pipelineStage: techForm.pipelineStage,
      longFormRemarks: techForm.longFormRemarks || undefined,
      followUpDate: techForm.followUpDate || undefined,
      assignedRep: techForm.assignedRep || undefined,
    });

    setTechForm(techInitialState);
  }

  if (pipelineContext === 'SFO') {
    const isOpen = formVisibility.SFO;

    return (
      <Card>
        <CardHeader className="gap-2">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-base">New SFO Transaction</CardTitle>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
              onClick={() => toggleFormVisibility('SFO')}
              aria-expanded={isOpen}
            >
              {isOpen ? 'Collapse' : 'Expand'}
              {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
          <CardDescription>
            Capture high-volume order data with real-time A$ precision fields.
          </CardDescription>
        </CardHeader>
        {isOpen ? (
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSfoSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="sfo-customer-name">Customer Name</Label>
              <Input
                id="sfo-customer-name"
                value={sfoForm.customerName}
                onChange={(event) => patchSfoForm('customerName', event.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="sfo-social-link">Facebook/Social Link</Label>
                <Input
                  id="sfo-social-link"
                  value={sfoForm.socialLink}
                  onChange={(event) => patchSfoForm('socialLink', event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sfo-message-source">Message/Comment Source</Label>
                <Input
                  id="sfo-message-source"
                  value={sfoForm.messageSource}
                  onChange={(event) => patchSfoForm('messageSource', event.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="sfo-platform">Platform</Label>
                <Select
                  value={sfoForm.platform}
                  onValueChange={(value) => patchSfoForm('platform', value as 'META' | 'IG')}
                >
                  <SelectTrigger id="sfo-platform">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="META">META</SelectItem>
                    <SelectItem value="IG">IG</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sfo-date-of-contact">Date of Contact</Label>
                <Input
                  id="sfo-date-of-contact"
                  type="date"
                  value={sfoForm.dateOfContact}
                  onChange={(event) => patchSfoForm('dateOfContact', event.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sfo-order-date">Order Date</Label>
                <Input
                  id="sfo-order-date"
                  type="date"
                  value={sfoForm.orderDate}
                  onChange={(event) => patchSfoForm('orderDate', event.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="sfo-products">Products (comma-separated)</Label>
                <Input
                  id="sfo-products"
                  value={sfoForm.productsInput}
                  onChange={(event) => patchSfoForm('productsInput', event.target.value)}
                  placeholder="Product A, Product B"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sfo-amount">Amount (A$)</Label>
                <Input
                  id="sfo-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={sfoForm.amountInput}
                  onChange={(event) => patchSfoForm('amountInput', event.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="sfo-status">Status</Label>
                <Select
                  value={sfoForm.status}
                  onValueChange={(value) =>
                    patchSfoForm('status', value as 'new' | 'for_follow_up' | 'closed' | 'lost')
                  }
                >
                  <SelectTrigger id="sfo-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="for_follow_up">For Follow Up</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sfo-follow-up-status">Status of Follow-up</Label>
                <Select
                  value={sfoForm.followUpStatus}
                  onValueChange={(value) =>
                    patchSfoForm('followUpStatus', value as 'new' | 'for_follow_up' | 'closed' | 'lost')
                  }
                >
                  <SelectTrigger id="sfo-follow-up-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="for_follow_up">For Follow Up</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sfo-customer-type">Customer Type</Label>
                <Select
                  value={sfoForm.customerType}
                  onValueChange={(value) =>
                    patchSfoForm('customerType', value as 'new' | 'returning' | 'wholesale')
                  }
                >
                  <SelectTrigger id="sfo-customer-type">
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
                <Label htmlFor="sfo-invoice-number">Invoice Number</Label>
                <Input
                  id="sfo-invoice-number"
                  value={sfoForm.invoiceNumber}
                  onChange={(event) => patchSfoForm('invoiceNumber', event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sfo-contact-number">Contact Number</Label>
                <Input
                  id="sfo-contact-number"
                  value={sfoForm.contactNumber}
                  onChange={(event) => patchSfoForm('contactNumber', event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sfo-reason">Reason for Reaching Out</Label>
              <Input
                id="sfo-reason"
                value={sfoForm.reasonForReachingOut}
                onChange={(event) => patchSfoForm('reasonForReachingOut', event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sfo-action-plan">Action Plan</Label>
              <Textarea
                id="sfo-action-plan"
                value={sfoForm.actionPlan}
                onChange={(event) => patchSfoForm('actionPlan', event.target.value)}
                rows={3}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sfo-action-taken">Action Taken</Label>
              <Textarea
                id="sfo-action-taken"
                value={sfoForm.actionTaken}
                onChange={(event) => patchSfoForm('actionTaken', event.target.value)}
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sfo-address">Address</Label>
              <Input
                id="sfo-address"
                value={sfoForm.address}
                onChange={(event) => patchSfoForm('address', event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sfo-remarks">Other Remarks</Label>
              <Textarea
                id="sfo-remarks"
                value={sfoForm.remarks}
                onChange={(event) => patchSfoForm('remarks', event.target.value)}
                rows={3}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmittingSfo}>
                {isSubmittingSfo ? 'Saving...' : 'Add SFO Record'}
              </Button>
            </div>
          </form>
        </CardContent>
        ) : (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              SFO form is collapsed. Click Expand to add a new transaction.
            </p>
          </CardContent>
        )}
      </Card>
    );
  }

  const isOpen = formVisibility.TECH;

  return (
    <Card>
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">New SN Tech Inquiry</CardTitle>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/50"
            onClick={() => toggleFormVisibility('TECH')}
            aria-expanded={isOpen}
          >
            {isOpen ? 'Collapse' : 'Expand'}
            {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
        <CardDescription>
          Capture company context, requirements checklist, and pipeline stage.
        </CardDescription>
      </CardHeader>
      {isOpen ? (
      <CardContent>
        <form className="grid gap-4" onSubmit={handleTechSubmit}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="tech-company-name">Company Name</Label>
              <Input
                id="tech-company-name"
                value={techForm.companyName}
                onChange={(event) => patchTechForm('companyName', event.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tech-contact-person">Contact Person</Label>
              <Input
                id="tech-contact-person"
                value={techForm.contactPerson}
                onChange={(event) => patchTechForm('contactPerson', event.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tech-company-background">Company Background</Label>
            <Textarea
              id="tech-company-background"
              value={techForm.companyBackground}
              onChange={(event) => patchTechForm('companyBackground', event.target.value)}
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tech-requirements-summary">Requirements Summary</Label>
            <Textarea
              id="tech-requirements-summary"
              value={techForm.requirementsSummary}
              onChange={(event) => patchTechForm('requirementsSummary', event.target.value)}
              rows={4}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tech-requirements-checklist">Requirements Checklist (comma-separated)</Label>
            <Input
              id="tech-requirements-checklist"
              value={techForm.requirementsChecklistInput}
              onChange={(event) => patchTechForm('requirementsChecklistInput', event.target.value)}
              placeholder="Integration, Dashboard, Automation"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="tech-pipeline-stage">Pipeline Stage</Label>
              <Select
                value={techForm.pipelineStage}
                onValueChange={(value) =>
                  patchTechForm(
                    'pipelineStage',
                    value as
                      | 'initial_contact'
                      | 'requirements_gathering'
                      | 'proposal_sent'
                      | 'under_review'
                      | 'closed_won'
                      | 'closed_lost'
                  )
                }
              >
                <SelectTrigger id="tech-pipeline-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="initial_contact">Initial Contact</SelectItem>
                  <SelectItem value="requirements_gathering">Requirements Gathering</SelectItem>
                  <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="closed_won">Closed Won</SelectItem>
                  <SelectItem value="closed_lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tech-follow-up-date">Follow-up Date</Label>
              <Input
                id="tech-follow-up-date"
                type="date"
                value={techForm.followUpDate}
                onChange={(event) => patchTechForm('followUpDate', event.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tech-assigned-rep">Assigned Rep</Label>
              <Input
                id="tech-assigned-rep"
                value={techForm.assignedRep}
                onChange={(event) => patchTechForm('assignedRep', event.target.value)}
                placeholder="Rep name"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tech-long-form-remarks">Long-form Remarks</Label>
            <Textarea
              id="tech-long-form-remarks"
              value={techForm.longFormRemarks}
              onChange={(event) => patchTechForm('longFormRemarks', event.target.value)}
              rows={5}
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmittingTech}>
              {isSubmittingTech ? 'Saving...' : 'Add TECH Inquiry'}
            </Button>
          </div>
        </form>
      </CardContent>
      ) : (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            TECH form is collapsed. Click Expand to add a new inquiry.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
