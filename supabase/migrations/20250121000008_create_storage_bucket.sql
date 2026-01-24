-- Create the lesson-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-images', 'lesson-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public read access to lesson-images
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'lesson-images' );

-- Policy: Allow authenticated users to upload to lesson-images
CREATE POLICY "Authenticated Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'lesson-images' );

-- Policy: Allow authenticated users to update their own images
CREATE POLICY "Authenticated Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'lesson-images' );

-- Policy: Allow authenticated users to delete their own images
CREATE POLICY "Authenticated Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'lesson-images' );
