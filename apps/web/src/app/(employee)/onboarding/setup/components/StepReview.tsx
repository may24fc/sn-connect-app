'use client';

import type { OnboardingStep } from '@/lib/schemas/onboarding.schema';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@hr-portal/ui';
import { Pencil } from 'lucide-react';
import type { ReactNode } from 'react';

// ─── Label maps per card ───────────────────────────────────────────────────────

const profileLabels: Record<string, string> = {
  firstName: 'First Name',
  middleName: 'Middle Name',
  lastName: 'Last Name',
  position: 'Position',
  birthday: 'Date of Birth',
  age: 'Age',
  nationality: 'Nationality',
  education: 'Education',
  major: 'Major / Field of Study',
  startDate: 'Start Date',
  linkedinProfileUrl: 'LinkedIn Profile',
};

const contactLabels: Record<string, string> = {
  personalEmail: 'Personal Email',
  companyEmail: 'Company Email',
  emailAddress: 'Email Address',
  contactNumber: 'Contact Number',
  address: 'Home Address',
};

const financialLabels: Record<string, string> = {
  paymentBankName: 'Bank',
  paymentAccountName: 'Account Name',
  paymentAccountNumber: 'Account Number',
  paymentEmail: 'Payment Email',
  paymentPhoneNumber: 'Phone Number',
  paymentAddress: 'Billing Address',
  paymentCity: 'City',
  paymentProvince: 'Province',
  paymentZipcode: 'Zipcode',
};

const emergencyLabels: Record<string, string> = {
  emergencyContactName: 'Full Name',
  emergencyContactRelationship: 'Relationship',
  emergencyContactNumber: 'Phone Number',
  emergencyContactEmail: 'Email Address',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  title,
  step,
  data,
  labels,
  onEdit,
}: {
  title: string;
  step: OnboardingStep;
  data: Record<string, unknown>;
  labels: Record<string, string>;
  onEdit: (step: OnboardingStep) => void;
}): ReactNode {
  const entries = Object.entries(labels)
    .map(([key, label]) => ({ key, label, value: data[key] }))
    .filter(({ value }) => value !== null && value !== undefined && value !== '');

  return (
    <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3 pt-4 px-5 space-y-0">
        <CardTitle className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 tracking-tight">
          {title}
        </CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 gap-1 shrink-0"
          onClick={() => onEdit(step)}
        >
          <Pencil className="h-3 w-3" />
          Edit
        </Button>
      </CardHeader>
      <CardContent className="px-5 pb-5 pt-0">
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-400 dark:text-zinc-500 italic">No data provided yet.</p>
        ) : (
          <div className="grid gap-4">
            {entries.map(({ key, label, value }) => (
              <div key={key} className="flex flex-col gap-0.5">
                <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
                  {label}
                </span>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 leading-snug break-words">
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Step Review ──────────────────────────────────────────────────────────────

export function StepReview({
  personalInfo,
  paymentInfo,
  onEditStep,
}: {
  personalInfo: Record<string, unknown>;
  paymentInfo: Record<string, unknown>;
  onEditStep: (step: OnboardingStep) => void;
}): ReactNode {
  return (
    <div className="space-y-5">
      {/* Header banner */}
      <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-3 flex items-start gap-3">
        <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center">
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3 w-3 text-indigo-600 dark:text-indigo-400"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.896 15H11a.75.75 0 000-1.5h-.235a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.104 9H9z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
            Review Your Information
          </p>
          <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
            Please review all your information carefully before submitting. Click{' '}
            <strong>Edit</strong> on any card to make changes.
          </p>
        </div>
      </div>

      {/* Two-column grid — collapses to single column on small screens */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard
          title="Personal Profile"
          step="personal_info"
          data={personalInfo}
          labels={profileLabels}
          onEdit={onEditStep}
        />
        <SummaryCard
          title="Contact Details"
          step="personal_info"
          data={personalInfo}
          labels={contactLabels}
          onEdit={onEditStep}
        />
        <SummaryCard
          title="Financial Information"
          step="payment_info"
          data={paymentInfo}
          labels={financialLabels}
          onEdit={onEditStep}
        />
        <SummaryCard
          title="Emergency Contact"
          step="personal_info"
          data={personalInfo}
          labels={emergencyLabels}
          onEdit={onEditStep}
        />
      </div>
    </div>
  );
}
