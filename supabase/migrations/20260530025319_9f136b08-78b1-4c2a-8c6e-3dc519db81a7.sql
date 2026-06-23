
CREATE TABLE public.post_links (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  media_position integer NOT NULL DEFAULT 0,
  url text NOT NULL,
  label text,
  logo_url text,
  x double precision NOT NULL DEFAULT 0.5,
  y double precision NOT NULL DEFAULT 0.5,
  size double precision NOT NULL DEFAULT 0.35,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_links_post_id ON public.post_links(post_id);

GRANT SELECT ON public.post_links TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_links TO authenticated;
GRANT ALL ON public.post_links TO service_role;

ALTER TABLE public.post_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "links public read"
ON public.post_links
FOR SELECT
USING (true);

CREATE POLICY "author insert links"
ON public.post_links
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.posts p
  WHERE p.id = post_links.post_id AND p.author_id = auth.uid()
));

CREATE POLICY "author update links"
ON public.post_links
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.posts p
  WHERE p.id = post_links.post_id AND p.author_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.posts p
  WHERE p.id = post_links.post_id AND p.author_id = auth.uid()
));

CREATE POLICY "author delete links"
ON public.post_links
FOR DELETE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.posts p
  WHERE p.id = post_links.post_id AND p.author_id = auth.uid()
));
