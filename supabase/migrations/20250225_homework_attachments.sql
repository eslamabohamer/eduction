/* Add attachment_url to homework table */
ALTER TABLE public.homework 
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

/* Create Storage Bucket for Homework Attachments */
INSERT INTO storage.buckets (id, name, public)
VALUES ('homework-attachments', 'homework-attachments', true)
ON CONFLICT (id) DO NOTHING;

/* Storage Policies */
-- Allow public access to view files (or restricted to authenticated users)
CREATE POLICY "Authenticated users can view homework attachments"
ON storage.objects FOR SELECT
USING (bucket_id = 'homework-attachments' AND auth.role() = 'authenticated');

-- Allow teachers/admins to upload
CREATE POLICY "Teachers can upload homework attachments"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'homework-attachments' 
    AND auth.role() = 'authenticated'
);
