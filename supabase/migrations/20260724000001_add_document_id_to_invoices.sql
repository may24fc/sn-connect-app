-- V3-2.1: Add document_id to invoices table
-- Links each invoice to the uploaded document so admins and employees can preview it.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.invoices.document_id IS
  'Optional reference to the uploaded invoice document. Set at creation time for document-based invoices.';

CREATE INDEX IF NOT EXISTS idx_invoices_document_id
  ON public.invoices(document_id)
  WHERE document_id IS NOT NULL;
