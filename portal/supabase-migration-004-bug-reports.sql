-- Bug reports table
CREATE TABLE IF NOT EXISTS bug_reports (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid REFERENCES auth.users(id),
  game_id     text,
  description text NOT NULL,
  screenshot_url text,
  page_url    text,
  user_agent  text,
  status      text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'fixed', 'wontfix')),
  created_at  timestamptz DEFAULT now()
);

-- RLS: anyone can insert, only owner can read their own
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit bug reports"
  ON bug_reports FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view their own bug reports"
  ON bug_reports FOR SELECT
  USING (auth.uid() = user_id);

-- Allow anon inserts (no auth required to report bugs)
GRANT INSERT ON bug_reports TO anon;
GRANT INSERT ON bug_reports TO authenticated;

-- Storage bucket for bug report screenshots
INSERT INTO storage.buckets (id, name, public)
VALUES ('bug-screenshots', 'bug-screenshots', true)
ON CONFLICT DO NOTHING;

-- Allow anyone to upload to bug-screenshots bucket
CREATE POLICY "Anyone can upload bug screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'bug-screenshots');

CREATE POLICY "Anyone can view bug screenshots"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bug-screenshots');
