'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@hr-portal/ui';
import type { ReactNode } from 'react';

const personalInfoLabels: Record<string, string> = {
  firstName: 'First Name',
  middleName: 'Middle Name',
  lastName: 'Last Name',
  position: 'Position',
  personalEmail: 'Personal Email',
  companyEmail: 'Company Email',
  contactNumber: 'Contact Number',
  address: 'Address',
  birthday: 'Birthday',
  nationality: 'Nationality',
  education: 'Education',
  emergencyContactName: 'Emergency Contact Name',
  emergencyContactNumber: 'Emergency Contact Number',
  emergencyContactEmail: 'Emergency Contact Email',
  emergencyContactRelationship: 'Emergency Contact Relationship',
  emailAddress: 'Email Address',
  departmentId: 'Department ID',
  startDate: 'Start Date',
  age: 'Age',
  linkedinProfileUrl: 'LinkedIn Profile',
};

const paymentInfoLabels: Record<string, string> = {
  paymentAccountName: 'Account Name',
  paymentAccountNumber: 'Account Number',
  paymentEmail: 'Payment Email',
  paymentPhoneNumber: 'Phone Number',
  paymentAddress: 'Address',
  paymentCity: 'City',
  paymentProvince: 'Province',
  paymentZipcode: 'Zipcode',
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  return String(value);
}

function renderPairs(
  title: string,
  data: Record<string, unknown>,
  labels: Record<string, string>
): ReactNode {
  const entries = Object.entries(data).filter(([_, value]) => {
    // Only show fields that have values
    return value !== null && value !== undefined && value !== '';
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data provided yet.</p>
        ) : (
          entries.map(([key, value]) => (
            <div key={key} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {labels[key] || key}
              </span>
              <span className="text-sm">{formatValue(value)}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function StepReview({
  personalInfo,
  paymentInfo,
}: {
  personalInfo: Record<string, unknown>;
  paymentInfo: Record<string, unknown>;
}): ReactNode {
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30 p-3">
        <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-1">
          Review Your Information
        </p>
        <p className="text-sm text-indigo-700 dark:text-indigo-300">
          Please review all your information carefully before submitting. You can go back to make changes if needed.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {renderPairs('Personal Information', personalInfo, personalInfoLabels)}
        {renderPairs('Payment Information', paymentInfo, paymentInfoLabels)}
      </div>
    </div>
  );
}
