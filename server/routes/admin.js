const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { sendCampaign } = require('../services/email');
const { requireAdmin, isAuthenticated, loginCookie, logoutCookie } = require('../services/adminAuth');

function toCsv(rows) {
  const header = ['first_name', 'email', 'phone', 'zip_code', 'referral_source', 'subscribed_at', 'tags'];
  const lines = [header.join(',')];
  for (const row of rows) {
    const values = header.map((key) => {
      let val = row[key];
      if (Array.isArray(val)) val = val.join('|');
      if (val === null || val === undefined) val = '';
      val = String(val).replace(/"/g, '""');
      return `"${val}"`;
    });
    lines.push(values.join(','));
  }
  return lines.join('\n');
}

// --- Auth ---
// Stateless: the session is a signed cookie (HMAC'd with ADMIN_PASSWORD), not
// server-side session storage, so it works across serverless invocations.
router.post('/login', (req, res) => {
  const { password } = req.body || {};
  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'Incorrect password.' });
  }
  res.setHeader('Set-Cookie', loginCookie());
  return res.json({ success: true });
});

router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', logoutCookie());
  res.json({ success: true });
});

router.get('/session', (req, res) => {
  res.json({ authenticated: isAuthenticated(req) });
});

// --- Subscribers ---
router.get('/subscribers', requireAdmin, async (req, res) => {
  try {
    const { search, tag } = req.query;
    let query = supabase.from('subscribers').select('*').order('subscribed_at', { ascending: false });

    if (search) {
      query = query.or(`first_name.ilike.%${search}%,email.ilike.%${search}%`);
    }
    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[admin/subscribers] error', error);
      return res.status(500).json({ success: false, message: 'Failed to load subscribers.' });
    }
    return res.json({ success: true, subscribers: data });
  } catch (err) {
    console.error('[admin/subscribers] unexpected error', err);
    return res.status(500).json({ success: false, message: 'Failed to load subscribers.' });
  }
});

router.get('/export', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase.from('subscribers').select('*').order('subscribed_at', { ascending: false });
    if (error) {
      console.error('[admin/export] error', error);
      return res.status(500).json({ success: false, message: 'Failed to export subscribers.' });
    }
    const csv = toCsv(data);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="casajuan-subscribers.csv"');
    return res.send(csv);
  } catch (err) {
    console.error('[admin/export] unexpected error', err);
    return res.status(500).json({ success: false, message: 'Failed to export subscribers.' });
  }
});

// Protected via x-admin-key header, per spec — for programmatic/API access.
router.post('/export', async (req, res) => {
  const key = req.headers['x-admin-key'];
  if (!key || key !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }
  try {
    const { data, error } = await supabase.from('subscribers').select('*').order('subscribed_at', { ascending: false });
    if (error) {
      console.error('[admin/export:api] error', error);
      return res.status(500).json({ success: false, message: 'Failed to export subscribers.' });
    }
    return res.json({ success: true, subscribers: data });
  } catch (err) {
    console.error('[admin/export:api] unexpected error', err);
    return res.status(500).json({ success: false, message: 'Failed to export subscribers.' });
  }
});

// --- Campaigns ---
router.post('/campaigns/send', requireAdmin, async (req, res) => {
  try {
    const { subject, body_html } = req.body || {};
    if (!subject || !body_html) {
      return res.status(400).json({ success: false, message: 'Subject and body are required.' });
    }

    const { data: subscribers, error: fetchError } = await supabase
      .from('subscribers')
      .select('email');

    if (fetchError) {
      console.error('[admin/campaigns/send] fetch error', fetchError);
      return res.status(500).json({ success: false, message: 'Failed to load recipients.' });
    }

    const recipients = subscribers.map((s) => s.email);

    const { data: campaign, error: insertError } = await supabase
      .from('campaigns')
      .insert({
        name: subject,
        subject,
        body_html,
        sent_at: new Date().toISOString(),
        recipient_count: recipients.length
      })
      .select()
      .single();

    if (insertError) {
      console.error('[admin/campaigns/send] insert error', insertError);
      return res.status(500).json({ success: false, message: 'Failed to record campaign.' });
    }

    sendCampaign({ subject, bodyHtml: body_html, recipients }).catch((err) => {
      console.error('[admin/campaigns/send] send error', err);
    });

    return res.json({ success: true, campaign, recipient_count: recipients.length });
  } catch (err) {
    console.error('[admin/campaigns/send] unexpected error', err);
    return res.status(500).json({ success: false, message: 'Failed to send campaign.' });
  }
});

module.exports = router;
