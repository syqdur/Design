-- Storage Setup for Supabase (Execute in SQL Editor)

-- Create storage bucket for wedding media
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES ('wedding-media', 'wedding-media', true, now(), now())
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for wedding-media bucket
CREATE POLICY "Allow all operations on wedding-media" ON storage.objects
FOR ALL USING (bucket_id = 'wedding-media');

-- Enable public access for wedding-media bucket
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'wedding-media');

CREATE POLICY "Public upload access" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'wedding-media');

CREATE POLICY "Public update access" ON storage.objects
FOR UPDATE USING (bucket_id = 'wedding-media');

CREATE POLICY "Public delete access" ON storage.objects
FOR DELETE USING (bucket_id = 'wedding-media');