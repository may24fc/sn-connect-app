'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- Types ---

export interface RoleMetadataRecord {
  id: string;
  user_id: string;
  role_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface KPIEntry {
  id: string;
  user_id: string;
  role_type: string;
  entry_date: string;
  kpi_name: string;
  kpi_value: number;
  kpi_unit: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// --- Role Type Registry ---

export type RoleType =
  | 'google_ads_specialist'
  | 'content_creator'
  | 'developer'
  | 'designer'
  | 'project_manager'
  | 'hr_specialist'
  | 'finance'
  | 'sales'
  | 'marketing'
  | 'operations'
  | 'other';

export interface RoleTypeConfig {
  label: string;
  description: string;
  icon: string;
  fields: RoleMetadataFieldConfig[];
  kpiMetrics?: KPIMetricConfig[];
}

export interface RoleMetadataFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'url' | 'tags' | 'select';
  placeholder?: string;
  options?: string[]; // for 'select' and 'tags' type
  required?: boolean;
}

export interface KPIMetricConfig {
  name: string;
  label: string;
  unit: string;
  description?: string;
}

export const ROLE_TYPE_REGISTRY: Record<RoleType, RoleTypeConfig> = {
  google_ads_specialist: {
    label: 'Google Ads Specialist',
    description: 'Digital advertising and campaign management',
    icon: 'BarChart3',
    fields: [
      { key: 'primary_platforms', label: 'Primary Platforms', type: 'tags', options: ['Google Ads', 'Meta Ads', 'LinkedIn Ads', 'TikTok Ads', 'Twitter Ads'] },
      { key: 'certifications', label: 'Certifications', type: 'tags', options: ['Google Ads Search', 'Google Ads Display', 'Google Ads Video', 'Google Analytics', 'Meta Blueprint'] },
      { key: 'managed_accounts', label: 'Managed Accounts', type: 'number', placeholder: 'Number of accounts managed' },
      { key: 'monthly_budget_managed', label: 'Monthly Budget Managed (USD)', type: 'number', placeholder: 'e.g., 50000' },
    ],
    kpiMetrics: [
      { name: 'spend', label: 'Ad Spend', unit: 'USD', description: 'Total advertising spend' },
      { name: 'cpa', label: 'Cost Per Acquisition', unit: 'USD', description: 'Average cost per conversion' },
      { name: 'roas', label: 'Return on Ad Spend', unit: 'ratio', description: 'Revenue / Ad Spend ratio' },
      { name: 'conversions', label: 'Conversions', unit: 'count', description: 'Total conversion count' },
      { name: 'ctr', label: 'Click-Through Rate', unit: '%', description: 'Click-through rate percentage' },
      { name: 'impressions', label: 'Impressions', unit: 'count', description: 'Total impressions served' },
    ],
  },
  content_creator: {
    label: 'Content Creator',
    description: 'Content production and management',
    icon: 'PenTool',
    fields: [
      { key: 'content_types', label: 'Content Types', type: 'tags', options: ['Blog', 'Social Media', 'Video', 'Podcast', 'Newsletter', 'Whitepaper'] },
      { key: 'tools', label: 'Tools', type: 'tags', options: ['Canva', 'Premiere Pro', 'Final Cut Pro', 'Figma', 'WordPress', 'Buffer'] },
      { key: 'portfolio_url', label: 'Portfolio URL', type: 'url', placeholder: 'https://...' },
    ],
    kpiMetrics: [
      { name: 'posts_published', label: 'Posts Published', unit: 'count' },
      { name: 'engagement_rate', label: 'Engagement Rate', unit: '%' },
      { name: 'reach', label: 'Reach', unit: 'count' },
    ],
  },
  developer: {
    label: 'Developer',
    description: 'Software development and engineering',
    icon: 'Code2',
    fields: [
      { key: 'primary_languages', label: 'Primary Languages', type: 'tags', options: ['TypeScript', 'JavaScript', 'Python', 'Go', 'Rust', 'Java', 'C#'] },
      { key: 'specializations', label: 'Specializations', type: 'tags', options: ['Frontend', 'Backend', 'Full Stack', 'DevOps', 'Mobile', 'Data Engineering', 'ML/AI'] },
      { key: 'github_username', label: 'GitHub Username', type: 'text', placeholder: 'username' },
    ],
    kpiMetrics: [
      { name: 'prs_merged', label: 'PRs Merged', unit: 'count' },
      { name: 'issues_closed', label: 'Issues Closed', unit: 'count' },
      { name: 'code_reviews', label: 'Code Reviews', unit: 'count' },
    ],
  },
  designer: {
    label: 'Designer',
    description: 'Visual and UX design',
    icon: 'Palette',
    fields: [
      { key: 'design_tools', label: 'Design Tools', type: 'tags', options: ['Figma', 'Photoshop', 'Illustrator', 'Sketch', 'InDesign', 'After Effects'] },
      { key: 'specializations', label: 'Specializations', type: 'tags', options: ['UI/UX', 'Branding', 'Motion Graphics', 'Print', 'Web Design', 'Product Design'] },
      { key: 'portfolio_url', label: 'Portfolio URL', type: 'url', placeholder: 'https://...' },
    ],
  },
  project_manager: {
    label: 'Project Manager',
    description: 'Project and program management',
    icon: 'Kanban',
    fields: [
      { key: 'methodologies', label: 'Methodologies', type: 'tags', options: ['Agile', 'Scrum', 'Kanban', 'Waterfall', 'Lean', 'SAFe'] },
      { key: 'tools', label: 'PM Tools', type: 'tags', options: ['Jira', 'Asana', 'Trello', 'Monday.com', 'ClickUp', 'Linear'] },
      { key: 'pmp_certified', label: 'PMP Certified', type: 'select', options: ['Yes', 'No', 'In Progress'] },
    ],
  },
  hr_specialist: {
    label: 'HR Specialist',
    description: 'Human resources and people operations',
    icon: 'Users',
    fields: [
      { key: 'specializations', label: 'Specializations', type: 'tags', options: ['Recruitment', 'Compensation', 'Training', 'Employee Relations', 'Compliance', 'Benefits'] },
      { key: 'certifications', label: 'Certifications', type: 'tags', options: ['SHRM-CP', 'SHRM-SCP', 'PHR', 'SPHR'] },
    ],
  },
  finance: {
    label: 'Finance',
    description: 'Financial operations and analysis',
    icon: 'DollarSign',
    fields: [
      { key: 'specializations', label: 'Specializations', type: 'tags', options: ['Accounting', 'FP&A', 'Tax', 'Audit', 'Treasury', 'Payroll'] },
      { key: 'certifications', label: 'Certifications', type: 'tags', options: ['CPA', 'CFA', 'CMA', 'ACCA'] },
      { key: 'tools', label: 'Tools', type: 'tags', options: ['QuickBooks', 'SAP', 'Oracle', 'Excel Advanced', 'Xero'] },
    ],
  },
  sales: {
    label: 'Sales',
    description: 'Sales and business development',
    icon: 'TrendingUp',
    fields: [
      { key: 'specializations', label: 'Focus Areas', type: 'tags', options: ['B2B', 'B2C', 'Enterprise', 'SMB', 'Inside Sales', 'Field Sales'] },
      { key: 'crm_tools', label: 'CRM Tools', type: 'tags', options: ['Salesforce', 'HubSpot', 'Pipedrive', 'Close.io'] },
    ],
    kpiMetrics: [
      { name: 'deals_closed', label: 'Deals Closed', unit: 'count' },
      { name: 'revenue_generated', label: 'Revenue Generated', unit: 'USD' },
      { name: 'pipeline_value', label: 'Pipeline Value', unit: 'USD' },
    ],
  },
  marketing: {
    label: 'Marketing',
    description: 'Marketing strategy and execution',
    icon: 'Megaphone',
    fields: [
      { key: 'specializations', label: 'Specializations', type: 'tags', options: ['Digital Marketing', 'SEO', 'SEM', 'Email Marketing', 'Brand Strategy', 'Product Marketing'] },
      { key: 'tools', label: 'Tools', type: 'tags', options: ['Google Analytics', 'Mailchimp', 'SEMrush', 'Ahrefs', 'Marketo'] },
    ],
    kpiMetrics: [
      { name: 'leads_generated', label: 'Leads Generated', unit: 'count' },
      { name: 'mql_count', label: 'MQL Count', unit: 'count' },
      { name: 'website_traffic', label: 'Website Traffic', unit: 'count' },
    ],
  },
  operations: {
    label: 'Operations',
    description: 'Business operations and process management',
    icon: 'Settings',
    fields: [
      { key: 'specializations', label: 'Specializations', type: 'tags', options: ['Supply Chain', 'Logistics', 'Process Improvement', 'Quality Assurance', 'Vendor Management'] },
      { key: 'certifications', label: 'Certifications', type: 'tags', options: ['Six Sigma', 'Lean', 'PMP', 'ITIL'] },
    ],
  },
  other: {
    label: 'Other',
    description: 'Custom role configuration',
    icon: 'User',
    fields: [
      { key: 'specializations', label: 'Specializations', type: 'tags' },
      { key: 'tools', label: 'Tools & Technologies', type: 'tags' },
      { key: 'notes', label: 'Additional Notes', type: 'text', placeholder: 'Describe your role...' },
    ],
  },
};

// --- Query Keys ---

export const roleMetadataKeys = {
  all: ['role-metadata'] as const,
  user: (userId: string) => [...roleMetadataKeys.all, userId] as const,
  kpiAll: ['kpi-entries'] as const,
  kpiUser: (userId: string) => [...roleMetadataKeys.kpiAll, userId] as const,
  kpiFiltered: (userId: string, filters: Record<string, string>) =>
    [...roleMetadataKeys.kpiUser(userId), filters] as const,
};

// --- Hooks ---

export function useRoleMetadata(userId: string | undefined) {
  return useQuery({
    queryKey: roleMetadataKeys.user(userId ?? ''),
    queryFn: async (): Promise<RoleMetadataRecord[]> => {
      const res = await fetch(`/api/users/${userId}/metadata`);
      if (!res.ok) throw new Error('Failed to fetch role metadata');
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(userId),
  });
}

export function useUpdateRoleMetadata(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { role_type: string; metadata: Record<string, unknown> }) => {
      const res = await fetch(`/api/users/${userId}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || 'Failed to update metadata');
      }
      return res.json();
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: roleMetadataKeys.user(userId) });
      }
    },
  });
}

export function useDeleteRoleMetadata(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleType: string) => {
      const res = await fetch(`/api/users/${userId}/metadata?role_type=${encodeURIComponent(roleType)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete metadata');
      return res.json();
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: roleMetadataKeys.user(userId) });
      }
    },
  });
}

export function useKPIEntries(
  userId: string | undefined,
  filters?: { role_type?: string; from_date?: string; to_date?: string; kpi_name?: string }
) {
  const params = new URLSearchParams();
  if (filters?.role_type) params.set('role_type', filters.role_type);
  if (filters?.from_date) params.set('from_date', filters.from_date);
  if (filters?.to_date) params.set('to_date', filters.to_date);
  if (filters?.kpi_name) params.set('kpi_name', filters.kpi_name);

  return useQuery({
    queryKey: roleMetadataKeys.kpiFiltered(userId ?? '', filters as Record<string, string> ?? {}),
    queryFn: async (): Promise<KPIEntry[]> => {
      const qs = params.toString();
      const res = await fetch(`/api/users/${userId}/kpi-entries${qs ? `?${qs}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch KPI entries');
      const json = await res.json();
      return json.data;
    },
    enabled: Boolean(userId),
  });
}

export function useCreateKPIEntry(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      role_type: string;
      entry_date?: string;
      kpi_name: string;
      kpi_value: number;
      kpi_unit?: string;
      notes?: string;
    }) => {
      const res = await fetch(`/api/users/${userId}/kpi-entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.details || 'Failed to create KPI entry');
      }
      return res.json();
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: roleMetadataKeys.kpiAll });
      }
    },
  });
}
