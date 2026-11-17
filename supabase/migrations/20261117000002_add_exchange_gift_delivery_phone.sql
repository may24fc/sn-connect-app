BEGIN;

ALTER TABLE public.christmas_exchange_gift_delivery_addresses
  ADD COLUMN phone_number text;

ALTER TABLE public.christmas_exchange_gift_delivery_addresses
  ADD CONSTRAINT christmas_exchange_gift_phone_number_length
  CHECK (phone_number IS NULL OR char_length(btrim(phone_number)) BETWEEN 7 AND 30);

COMMENT ON COLUMN public.christmas_exchange_gift_delivery_addresses.phone_number IS
  'Private delivery contact number disclosed under the same owner/revealed-giver policy as the address.';

COMMIT;
