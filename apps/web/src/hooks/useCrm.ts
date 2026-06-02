import { STALE_TIMES } from '@/lib/query-client';
import { type CrmSfoFilters, type CrmTechFilters, queryKeys } from '@/lib/query-keys';
import {
  SFO_CUSTOMER_TYPE_VALUES,
  SFO_PLATFORM_VALUES,
  SFO_STATUS_VALUES,
  TECH_PIPELINE_STAGE_VALUES,
  sfoLeadCreateSchema,
  sfoLeadUpdateSchema,
  techInquiryCreateSchema,
  techInquiryUpdateSchema,
} from '@/lib/schemas/crm.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { z } from 'zod';

export type SfoPlatform = (typeof SFO_PLATFORM_VALUES)[number];
export type SfoStatus = (typeof SFO_STATUS_VALUES)[number];
export type SfoCustomerType = (typeof SFO_CUSTOMER_TYPE_VALUES)[number];
export type TechPipelineStage = (typeof TECH_PIPELINE_STAGE_VALUES)[number];

export type SfoLeadInput = z.infer<typeof sfoLeadCreateSchema>;
export type SfoLeadUpdateInput = z.infer<typeof sfoLeadUpdateSchema>;
export type TechInquiryInput = z.infer<typeof techInquiryCreateSchema>;
export type TechInquiryUpdateInput = z.infer<typeof techInquiryUpdateSchema>;

export interface SfoLeadRecord {
  id: string;
  customer_name: string;
  social_link: string | null;
  message_source: string | null;
  platform: SfoPlatform;
  date_of_contact: string;
  action_plan: string | null;
  follow_up_status: SfoStatus;
  action_taken: string | null;
  customer_type: SfoCustomerType;
  reason_for_reaching_out: string | null;
  contact_number: string | null;
  address: string | null;
  order_date: string | null;
  products: string[];
  amount: number;
  invoice_number: string | null;
  status: SfoStatus;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface TechInquiryRecord {
  id: string;
  company_name: string;
  contact_person: string;
  company_background: string | null;
  requirements_summary: string;
  requirements_checklist: string[];
  pipeline_stage: TechPipelineStage;
  long_form_remarks: string | null;
  follow_up_date: string | null;
  assigned_rep: string | null;
  created_at: string;
  updated_at: string;
}

interface ListResponse<T> {
  data: Array<T>;
}

export function useSfoLeads(filters: CrmSfoFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.crm.sfo.list(filters),
    queryFn: async (): Promise<ListResponse<SfoLeadRecord>> => {
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);

      const response = await fetch(`/api/crm/sfo?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch SFO CRM records' }));
        throw new Error(error.error || 'Failed to fetch SFO CRM records');
      }

      return response.json();
    },
    enabled: options.enabled ?? true,
    staleTime: STALE_TIMES.dynamic,
  });
}

export function useCreateSfoLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: SfoLeadInput): Promise<{ data: SfoLeadRecord }> => {
      const response = await fetch('/api/crm/sfo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create SFO CRM record' }));
        throw new Error(error.error || 'Failed to create SFO CRM record');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.sfo.all() });
    },
  });
}

export function useUpdateSfoLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: SfoLeadUpdateInput }): Promise<{ data: SfoLeadRecord }> => {
      const response = await fetch(`/api/crm/sfo/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update SFO CRM record' }));
        throw new Error(error.error || 'Failed to update SFO CRM record');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.sfo.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.sfo.detail(variables.id) });
    },
  });
}

export function useTechInquiries(filters: CrmTechFilters = {}, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.crm.tech.list(filters),
    queryFn: async (): Promise<ListResponse<TechInquiryRecord>> => {
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.stage) params.append('stage', filters.stage);

      const response = await fetch(`/api/crm/tech?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch TECH CRM records' }));
        throw new Error(error.error || 'Failed to fetch TECH CRM records');
      }

      return response.json();
    },
    enabled: options.enabled ?? true,
    staleTime: STALE_TIMES.dynamic,
  });
}

export function useCreateTechInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TechInquiryInput): Promise<{ data: TechInquiryRecord }> => {
      const response = await fetch('/api/crm/tech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create TECH CRM record' }));
        throw new Error(error.error || 'Failed to create TECH CRM record');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.tech.all() });
    },
  });
}

export function useUpdateTechInquiry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: TechInquiryUpdateInput }): Promise<{ data: TechInquiryRecord }> => {
      const response = await fetch(`/api/crm/tech/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update TECH CRM record' }));
        throw new Error(error.error || 'Failed to update TECH CRM record');
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.tech.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.crm.tech.detail(variables.id) });
    },
  });
}
