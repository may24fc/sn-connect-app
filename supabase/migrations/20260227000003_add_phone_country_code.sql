-- V2-1.1: Add country code columns for international phone number support
-- Supports storing the country code separately from the phone number for proper validation

ALTER TABLE public.onboarding_profiles
  ADD COLUMN IF NOT EXISTS contact_country_code text DEFAULT 'PH',
  ADD COLUMN IF NOT EXISTS emergency_contact_country_code text DEFAULT 'PH',
  ADD COLUMN IF NOT EXISTS payment_phone_country_code text DEFAULT 'PH';

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS phone_country_code text DEFAULT 'PH',
  ADD COLUMN IF NOT EXISTS emergency_contact_country_code text DEFAULT 'PH';

COMMENT ON COLUMN public.onboarding_profiles.contact_country_code IS 'ISO country code for contact number validation';
COMMENT ON COLUMN public.onboarding_profiles.emergency_contact_country_code IS 'ISO country code for emergency contact number';
COMMENT ON COLUMN public.onboarding_profiles.payment_phone_country_code IS 'ISO country code for payment phone number';
COMMENT ON COLUMN public.employees.phone_country_code IS 'ISO country code for employee phone number';
COMMENT ON COLUMN public.employees.emergency_contact_country_code IS 'ISO country code for emergency contact number';
