'use client';

import { useOnboardingDocuments, type OnboardingDocumentRecord } from '@/hooks/useOnboardingDocuments';
import { useOnboardingProfile, type OnboardingProfileRecord } from '@/hooks/useOnboardingProfile';
import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

interface OnboardingTaskRecord {
  id: string;
  title: string;
  description: string | null;
  category: string;
  is_completed: boolean;
  is_required?: boolean;
  due_days_from_start?: number | null;
  requires_submission?: boolean;
  submission_type?: 'none' | 'link' | 'document' | 'link_or_document';
  submission_label?: string | null;
  submission_description?: string | null;
  reference_url?: string | null;
}

interface OnboardingChecklistRecord {
  id: string;
  status: 'not_started' | 'in_progress' | 'completed';
  onboarding_tasks: Array<OnboardingTaskRecord>;
}

export interface OnboardingChecklistItemSummary {
  id: string;
  title: string;
  description: string;
  category: string;
  isCompleted: boolean;
  isRequired?: boolean;
  dueLabel?: string;
  submissionRequirementLabel?: string;
  submissionDescription?: string;
  referenceUrl?: string;
  actionHref?: string;
  actionLabel?: string;
  progressLabel?: string;
  source: 'wizard' | 'checklist';
}

function formatSubmissionTypeLabel(
  value: NonNullable<OnboardingTaskRecord['submission_type']>
): string {
  switch (value) {
    case 'link':
      return 'Link required';
    case 'document':
      return 'Document required';
    case 'link_or_document':
      return 'Link or document required';
    default:
      return 'No proof required';
  }
}

interface ProfileRequirementDefinition {
  id: string;
  field: keyof OnboardingProfileRecord;
  title: string;
  description: string;
  category: 'personal_information' | 'payment_information';
}

interface DocumentRequirementDefinition {
  id: string;
  documentType: OnboardingDocumentRecord['document_type'];
  title: string;
  description: string;
}

const PERSONAL_INFO_REQUIREMENTS: ReadonlyArray<ProfileRequirementDefinition> = [
  {
    id: 'first_name',
    field: 'first_name',
    title: 'Add first name',
    description: 'Confirm your first name in the onboarding profile.',
    category: 'personal_information',
  },
  {
    id: 'last_name',
    field: 'last_name',
    title: 'Add last name',
    description: 'Confirm your last name in the onboarding profile.',
    category: 'personal_information',
  },
  {
    id: 'position',
    field: 'position',
    title: 'Confirm assigned position',
    description: 'Make sure your role or position is recorded correctly.',
    category: 'personal_information',
  },
  {
    id: 'personal_email',
    field: 'personal_email',
    title: 'Add personal email',
    description: 'Provide the personal email address used for contact and follow-ups.',
    category: 'personal_information',
  },
  {
    id: 'company_email',
    field: 'company_email',
    title: 'Add company email',
    description: 'Confirm the company email assigned to your account.',
    category: 'personal_information',
  },
  {
    id: 'contact_number',
    field: 'contact_number',
    title: 'Add contact number',
    description: 'Provide your primary contact number.',
    category: 'personal_information',
  },
  {
    id: 'address',
    field: 'address',
    title: 'Add home address',
    description: 'Complete your current residential address.',
    category: 'personal_information',
  },
  {
    id: 'birthday',
    field: 'birthday',
    title: 'Add birthday',
    description: 'Provide your date of birth for HR records.',
    category: 'personal_information',
  },
  {
    id: 'nationality',
    field: 'nationality',
    title: 'Add nationality',
    description: 'Complete your nationality information.',
    category: 'personal_information',
  },
  {
    id: 'education',
    field: 'education',
    title: 'Add education background',
    description: 'Record your current highest educational attainment.',
    category: 'personal_information',
  },
  {
    id: 'emergency_contact_name',
    field: 'emergency_contact_name',
    title: 'Add emergency contact name',
    description: 'Provide the full name of your emergency contact.',
    category: 'personal_information',
  },
  {
    id: 'emergency_contact_number',
    field: 'emergency_contact_number',
    title: 'Add emergency contact number',
    description: 'Provide the phone number for your emergency contact.',
    category: 'personal_information',
  },
  {
    id: 'emergency_contact_relationship',
    field: 'emergency_contact_relationship',
    title: 'Add emergency contact relationship',
    description: 'Specify your relationship to the emergency contact.',
    category: 'personal_information',
  },
];

const PAYMENT_INFO_REQUIREMENTS: ReadonlyArray<ProfileRequirementDefinition> = [
  {
    id: 'payment_account_name',
    field: 'payment_account_name',
    title: 'Add payment account name',
    description: 'Enter the account name used for payroll or allowance payouts.',
    category: 'payment_information',
  },
  {
    id: 'payment_account_number',
    field: 'payment_account_number',
    title: 'Add payment account number',
    description: 'Provide the account number used for payment processing.',
    category: 'payment_information',
  },
  {
    id: 'payment_email',
    field: 'payment_email',
    title: 'Add payment email',
    description: 'Provide the email tied to your payout method.',
    category: 'payment_information',
  },
  {
    id: 'payment_phone_number',
    field: 'payment_phone_number',
    title: 'Add payment phone number',
    description: 'Provide the mobile number tied to your payout method.',
    category: 'payment_information',
  },
  {
    id: 'payment_address',
    field: 'payment_address',
    title: 'Add payment address',
    description: 'Complete the address linked to your payment profile.',
    category: 'payment_information',
  },
  {
    id: 'payment_city',
    field: 'payment_city',
    title: 'Add payment city',
    description: 'Provide the city for your payment profile.',
    category: 'payment_information',
  },
  {
    id: 'payment_province',
    field: 'payment_province',
    title: 'Add payment province',
    description: 'Provide the province or state for your payment profile.',
    category: 'payment_information',
  },
];

const REQUIRED_DOCUMENTS: ReadonlyArray<DocumentRequirementDefinition> = [
  {
    id: 'valid_id',
    documentType: 'valid_id',
    title: 'Upload valid ID',
    description: 'Submit a valid government-issued ID for verification.',
  },
  {
    id: 'profile_photo',
    documentType: 'profile_photo',
    title: 'Upload profile photo',
    description: 'Submit a recent profile photo for HR and account setup.',
  },
  {
    id: 'cv',
    documentType: 'cv',
    title: 'Upload CV',
    description: 'Submit the latest copy of your CV or resume.',
  },
  {
    id: 'birth_certificate',
    documentType: 'birth_certificate',
    title: 'Upload birth certificate',
    description: 'Submit a birth certificate copy for identity verification.',
  },
];

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim().length > 0;
  }

  return true;
}

function buildWizardStatusItem(
  profile: OnboardingProfileRecord | null,
  completedRequirements: number,
  totalRequirements: number
): OnboardingChecklistItemSummary {
  const isCompleted = profile?.is_completed === true;

  if (!profile) {
    return {
      id: 'wizard-form',
      title: 'Complete onboarding form',
      description:
        'Start the onboarding wizard to add your personal details, payment information, required documents, and final review.',
      category: 'onboarding_form',
      isCompleted: false,
      actionHref: '/onboarding/setup',
      actionLabel: 'Start form',
      progressLabel: '0% complete',
      source: 'wizard',
    };
  }

  if (isCompleted) {
    return {
      id: 'wizard-form',
      title: 'Complete onboarding form',
      description: 'Your onboarding form has been submitted. You can review your latest details here.',
      category: 'onboarding_form',
      isCompleted: true,
      actionHref: '/onboarding/setup',
      actionLabel: 'Review form',
      progressLabel: 'Submitted',
      source: 'wizard',
    };
  }

  return {
    id: 'wizard-form',
    title: 'Complete onboarding form',
    description:
      'Continue the onboarding wizard to finish your personal details, payment information, documents, and final review.',
    category: 'onboarding_form',
    isCompleted: false,
    actionHref: '/onboarding/setup',
    actionLabel: 'Continue form',
    progressLabel: `${completedRequirements} of ${totalRequirements} requirements complete`,
    source: 'wizard',
  };
}

function buildProfileRequirementItems(
  profile: OnboardingProfileRecord | null,
  definitions: ReadonlyArray<ProfileRequirementDefinition>
): Array<OnboardingChecklistItemSummary> {
  return definitions.map((definition) => ({
    id: `wizard-${definition.id}`,
    title: definition.title,
    description: definition.description,
    category: definition.category,
    isCompleted: profile ? hasValue(profile[definition.field]) : false,
    isRequired: true,
    actionHref: '/onboarding/setup',
    actionLabel: profile ? 'Update form' : 'Start form',
    source: 'wizard',
  }));
}

function buildDocumentRequirementItems(
  documents: Array<OnboardingDocumentRecord>,
  profile: OnboardingProfileRecord | null
): Array<OnboardingChecklistItemSummary> {
  const uploadedTypes = new Set(documents.map((document) => document.document_type));

  return REQUIRED_DOCUMENTS.map((definition) => ({
    id: `wizard-document-${definition.id}`,
    title: definition.title,
    description: definition.description,
    category: 'documents',
    isCompleted: uploadedTypes.has(definition.documentType),
    isRequired: true,
    actionHref: '/onboarding/setup',
    actionLabel: profile ? 'Review upload' : 'Start form',
    source: 'wizard',
  }));
}

function buildReviewRequirementItem(
  profile: OnboardingProfileRecord | null
): OnboardingChecklistItemSummary {
  const reviewItem: OnboardingChecklistItemSummary = {
    id: 'wizard-review-submit',
    title: 'Submit onboarding review',
    description: 'Review your onboarding details and submit the form for HR processing.',
    category: 'review',
    isCompleted: profile?.is_completed === true,
    isRequired: true,
    actionHref: '/onboarding/setup',
    actionLabel: profile?.is_completed ? 'Review form' : 'Continue form',
    source: 'wizard',
  };

  if (profile?.is_completed) {
    reviewItem.progressLabel = 'Submitted';
  }

  return reviewItem;
}

export function useOnboardingProgressSummary() {
  const profileQuery = useOnboardingProfile();
  const documentsQuery = useOnboardingDocuments();
  const checklistQuery = useQuery({
    queryKey: queryKeys.onboarding.tasks(),
    queryFn: async (): Promise<{ data: Array<OnboardingChecklistRecord> }> => {
      const response = await fetch('/api/onboarding');
      if (!response.ok) {
        throw new Error('Failed to fetch onboarding tasks');
      }
      return response.json();
    },
  });

  const summary = useMemo(() => {
    const profile = profileQuery.data?.data ?? null;
    const documents = documentsQuery.data?.data ?? [];
    const checklist = checklistQuery.data?.data?.[0] ?? null;
    const checklistTasks = checklist?.onboarding_tasks ?? [];

    const personalRequirementItems = buildProfileRequirementItems(profile, PERSONAL_INFO_REQUIREMENTS);
    const paymentRequirementItems = buildProfileRequirementItems(profile, PAYMENT_INFO_REQUIREMENTS);
    const documentRequirementItems = buildDocumentRequirementItems(documents, profile);
    const reviewRequirementItem = buildReviewRequirementItem(profile);

    const wizardRequirementItems = [
      ...personalRequirementItems,
      ...paymentRequirementItems,
      ...documentRequirementItems,
      reviewRequirementItem,
    ];

    const checklistItems: Array<OnboardingChecklistItemSummary> = [
      ...wizardRequirementItems,
      ...checklistTasks.map((task) => {
        const summaryItem: OnboardingChecklistItemSummary = {
          id: task.id,
          title: task.title,
          description: task.description ?? 'No description provided.',
          category: task.category,
          isCompleted: task.is_completed,
          isRequired: task.is_required ?? true,
          source: 'checklist',
        };

        if (typeof task.due_days_from_start === 'number') {
          summaryItem.dueLabel = `Due by day ${task.due_days_from_start}`;
        }

        if (task.requires_submission) {
          summaryItem.submissionRequirementLabel = formatSubmissionTypeLabel(
            task.submission_type ?? 'link_or_document'
          );

          if (task.submission_description) {
            summaryItem.submissionDescription = task.submission_description;
          }

          if (task.reference_url) {
            summaryItem.referenceUrl = task.reference_url;
          }
        }

        return summaryItem;
      }),
    ];

    const completedRequirements = checklistItems.filter((item) => item.isCompleted).length;
    const totalRequirements = checklistItems.length;
    const progressPercent =
      totalRequirements > 0 ? Math.round((completedRequirements / totalRequirements) * 100) : 0;
    const personalCompleted = personalRequirementItems.filter((item) => item.isCompleted).length;
    const paymentCompleted = paymentRequirementItems.filter((item) => item.isCompleted).length;
    const documentsCompleted = documentRequirementItems.filter((item) => item.isCompleted).length;
    const wizardCompletedRequirements = wizardRequirementItems.filter((item) => item.isCompleted).length;
    const wizardTotalRequirements = wizardRequirementItems.length;
    const wizardChecklistItem = buildWizardStatusItem(
      profile,
      wizardCompletedRequirements,
      wizardTotalRequirements
    );

    const tasksRemainingCount = checklistItems.filter((item) => !item.isCompleted).length;

    return {
      profile,
      documents,
      checklist,
      checklistTasks,
      checklistItems,
      wizardChecklistItem,
      completedRequirements,
      totalRequirements,
      progressPercent,
      tasksRemainingCount,
      personalCompleted,
      paymentCompleted,
      documentsCompleted,
    };
  }, [checklistQuery.data?.data, documentsQuery.data?.data, profileQuery.data?.data]);

  return {
    ...summary,
    isLoading: profileQuery.isLoading || documentsQuery.isLoading || checklistQuery.isLoading,
    isError: profileQuery.isError || documentsQuery.isError || checklistQuery.isError,
    refetchChecklist: checklistQuery.refetch,
  };
}