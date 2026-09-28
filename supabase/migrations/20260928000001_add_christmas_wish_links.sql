-- Adds an optional reference link to each Christmas wish.
ALTER TABLE public.christmas_wishes
  ADD COLUMN link_url text;

ALTER TABLE public.christmas_wishes
  ADD CONSTRAINT christmas_wishes_link_url_check
  CHECK (
    link_url IS NULL
    OR (
      char_length(link_url) <= 2048
      AND link_url ~* '^https?://'
    )
  );

COMMENT ON COLUMN public.christmas_wishes.link_url IS
  'Optional HTTP(S) reference link supplied with a Christmas wish.';
