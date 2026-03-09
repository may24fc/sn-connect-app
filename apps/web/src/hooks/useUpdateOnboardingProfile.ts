import { queryKeys } from '@/lib/query-keys';
import type { UpdateOnboardingStepInput } from '@/lib/schemas/onboarding.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useUpdateOnboardingProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateOnboardingStepInput) => {
      const response = await fetch('/api/onboarding/profile/step', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response
          .json()
          .catch(() => ({ error: 'Failed to update onboarding profile' }));
        console.error('Update onboarding profile error:', body);

        // Build a human-readable message from the Zod field errors when available
        const fieldErrors = body?.details?.fieldErrors as Record<string, string[]> | undefined;
        if (fieldErrors) {
          const FIELD_LABELS: Record<string, string> = {
            firstName: 'First Name',
            middleName: 'Middle Name',
            lastName: 'Last Name',
            position: 'Position',
            personalEmail: 'Personal Email',
            companyEmail: 'Company Email',
            contactNumber: 'Contact Number',
            emergencyContactNumber: 'Emergency Contact Number',
            emergencyContactName: 'Emergency Contact Name',
            emergencyContactEmail: 'Emergency Contact Email',
            emergencyContactRelationship: 'Emergency Contact Relationship',
            address: 'Address',
            birthday: 'Birthday',
            nationality: 'Nationality',
            education: 'Education',
            major: 'Major',
            paymentAccountName: 'Account Name',
            paymentAccountNumber: 'Account Number',
            paymentEmail: 'Payment Email',
            paymentPhoneNumber: 'Payment Phone Number',
            paymentAddress: 'Payment Address',
            paymentCity: 'City',
            paymentProvince: 'Province',
            paymentZipcode: 'Zip Code',
          };

          const messages = Object.entries(fieldErrors)
            .map(([field, errs]) => {
              const label = FIELD_LABELS[field] || field;
              return `${label}: ${(errs as string[]).join(', ')}`;
            })
            .join('; ');
          throw new Error(messages || body.error || 'Validation failed');
        }

        throw new Error(body.error || 'Failed to update onboarding profile');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.profile() });
      queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.all });
    },
  });
}
