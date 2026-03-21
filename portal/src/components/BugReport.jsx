import React, { useState, useRef, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import './BugReport.css';

export default function BugReport() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const fileRef = useRef();

  const handleFile = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshot(file);
    setPreviewUrl(URL.createObjectURL(file));
  }, []);

  const removeScreenshot = useCallback(() => {
    setScreenshot(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileRef.current) fileRef.current.value = '';
  }, [previewUrl]);

  const handleSubmit = useCallback(async () => {
    if (!description.trim()) return;
    setSubmitting(true);

    try {
      let screenshotUrl = null;

      // Upload screenshot if present
      if (screenshot && supabase) {
        const ext = screenshot.name.split('.').pop() || 'png';
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('bug-screenshots')
          .upload(path, screenshot, { contentType: screenshot.type });

        if (!uploadErr) {
          const { data } = supabase.storage.from('bug-screenshots').getPublicUrl(path);
          screenshotUrl = data?.publicUrl || null;
        }
      }

      if (supabase) {
        // Get current user if signed in
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || null;

        await supabase.from('bug_reports').insert({
          user_id: userId,
          game_id: detectCurrentGame(),
          description: description.trim(),
          screenshot_url: screenshotUrl,
          page_url: window.location.href,
          user_agent: navigator.userAgent,
        });
      }

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setDescription('');
        removeScreenshot();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.warn('Bug report failed:', err);
    } finally {
      setSubmitting(false);
    }
  }, [description, screenshot, removeScreenshot]);

  const handleClose = useCallback(() => {
    setOpen(false);
    if (success) {
      setDescription('');
      removeScreenshot();
      setSuccess(false);
    }
  }, [success, removeScreenshot]);

  return (
    <>
      <button
        className="bug-report-fab"
        onClick={() => setOpen(true)}
        aria-label="Report a bug"
        title="Report a bug"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 2l1.88 1.88M14.12 3.88L16 2M9 7.13v-1a3 3 0 0 1 6 0v1"/>
          <path d="M12 20c-3.3 0-6-2.7-6-6v-3a6 6 0 0 1 12 0v3c0 3.3-2.7 6-6 6z"/>
          <path d="M12 20v2M6 13H2M22 13h-4M6 17H3.5M20.5 17H18M6 9H4M20 9h-2"/>
        </svg>
      </button>

      {open && (
        <div className="bug-report-overlay" onClick={handleClose}>
          <div className="bug-report-panel" onClick={e => e.stopPropagation()}>
            <div className="bug-report-header">
              <span className="bug-report-title">Report a Bug</span>
              <button className="bug-report-close" onClick={handleClose}>&times;</button>
            </div>

            {success ? (
              <div className="bug-report-success">
                <div className="bug-report-success-icon">&#10003;</div>
                Thanks! Bug report submitted.
              </div>
            ) : (
              <>
                <label className="bug-report-label">What went wrong?</label>
                <textarea
                  className="bug-report-textarea"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe the bug..."
                  autoFocus
                />

                <div className="bug-report-attach">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="bug-report-file-input"
                    onChange={handleFile}
                  />
                  {!screenshot ? (
                    <button
                      className="bug-report-attach-btn"
                      onClick={() => fileRef.current?.click()}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                      Attach screenshot
                    </button>
                  ) : (
                    <div className="bug-report-preview">
                      <img src={previewUrl} alt="Screenshot preview" />
                      <button className="bug-report-preview-remove" onClick={removeScreenshot}>&times;</button>
                    </div>
                  )}
                </div>

                <button
                  className="bug-report-submit"
                  disabled={!description.trim() || submitting}
                  onClick={handleSubmit}
                >
                  {submitting ? 'Submitting...' : 'Submit Bug Report'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** Try to detect which game the user is currently playing from the DOM */
function detectCurrentGame() {
  // Check URL hash or path
  const path = window.location.pathname + window.location.hash;
  const games = ['hexes','marbles','bridges','pairs','walls','bugs','circles','stacks','towers','trees','sowing','mills','blocks'];
  for (const g of games) {
    if (path.includes(g)) return g;
  }
  // Check for game wrapper in DOM (game title in header, etc.)
  const title = document.querySelector('.game-wrapper-title, [class*="turn"], [class*="Turn"]');
  if (title) {
    const text = title.textContent?.toLowerCase() || '';
    for (const g of games) {
      if (text.includes(g)) return g;
    }
  }
  return null;
}
