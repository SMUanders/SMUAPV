-- =============================================================
-- SMU APV — Storage-policy for bucket 'apv-internt'
-- =============================================================
-- Formål: authenticated brugere må LÆSE private dokumenter (så appen kan lave
-- signed URLs), men IKKE skrive/uploade/slette fra frontend.
--
-- Kør i Supabase SQL Editor EFTER at bucket 'apv-internt' er oprettet som PRIVAT.
-- RLS på storage.objects er slået til som standard i Supabase — denne SELECT-
-- policy er det, der giver læseadgang.
--
-- 'apv-offentligt' (public bucket) behøver INGEN policy: public URL virker
-- direkte, og uden en skrive-policy kan frontend alligevel ikke uploade.
--
-- Re-runbar: drop før create.
-- =============================================================

drop policy if exists "apv_internt_laes" on storage.objects;

create policy "apv_internt_laes"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'apv-internt');

-- Bevidst INGEN insert/update/delete-policy for apv-internt (eller apv-offentligt):
-- upload og sletning sker KUN via Dashboard / service-role — aldrig fra frontend.
-- createSignedUrl() fra appen tjekker netop denne SELECT-policy mod brugerens JWT.
