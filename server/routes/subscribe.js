const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { sendWelcomeEmail } = require('../services/email');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_SOURCES = new Set(['instagram', 'tiktok', 'mobile_bar', 'referral', 'organic']);

function tagsForSource(source) {
  return VALID_SOURCES.has(source) ? [source] : ['organic'];
}

let countCache = { value: null, expiresAt: 0 };

router.post('/subscribe', async (req, res) => {
  try {
    const { first_name, email, phone, zip_code, referral_source } = req.body || {};

    if (!first_name || typeof first_name !== 'string' || !first_name.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter your first name.' });
    }
    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = first_name.trim();
    const tags = tagsForSource(referral_source);

    const { data: existing, error: lookupError } = await supabase
      .from('subscribers')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (lookupError) {
      console.error('[subscribe] lookup error', lookupError);
      return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
    }

    if (existing) {
      return res.status(200).json({ success: true, message: 'You are already on the list.' });
    }

    const { error: insertError } = await supabase.from('subscribers').insert({
      first_name: cleanName,
      email: cleanEmail,
      phone: phone ? String(phone).trim() : null,
      zip_code: zip_code ? String(zip_code).trim() : null,
      referral_source: referral_source || null,
      tags
    });

    if (insertError) {
      console.error('[subscribe] insert error', insertError);
      return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
    }

    countCache.expiresAt = 0;

    sendWelcomeEmail(cleanName, cleanEmail).catch((err) => {
      console.error('[subscribe] welcome email failed', err);
    });

    return res.status(200).json({ success: true, message: 'You are on the list.' });
  } catch (err) {
    console.error('[subscribe] unexpected error', err);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

router.get('/count', async (req, res) => {
  try {
    if (countCache.value !== null && Date.now() < countCache.expiresAt) {
      return res.json({ count: countCache.value });
    }

    const { count, error } = await supabase
      .from('subscribers')
      .select('id', { count: 'exact', head: true });

    if (error) {
      console.error('[count] error', error);
      return res.status(500).json({ count: countCache.value || 0 });
    }

    countCache = { value: count || 0, expiresAt: Date.now() + 60000 };
    return res.json({ count: count || 0 });
  } catch (err) {
    console.error('[count] unexpected error', err);
    return res.status(500).json({ count: 0 });
  }
});

router.post('/event', async (req, res) => {
  try {
    const { event_name, session_id, metadata } = req.body || {};
    if (!event_name || typeof event_name !== 'string') {
      return res.status(204).end();
    }

    await supabase.from('events').insert({
      event_name,
      session_id: session_id || null,
      metadata: metadata || {}
    });

    return res.status(204).end();
  } catch (err) {
    console.error('[event] unexpected error', err);
    return res.status(204).end();
  }
});

module.exports = router;
