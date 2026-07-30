const express = require('express');
const router = express.Router();
const supabase = require('../services/supabase');
const { sendBookingNotification, sendBookingConfirmation } = require('../services/email');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/book', async (req, res) => {
  try {
    const { name, email, phone, event_type, event_date, guest_count, location, message } = req.body || {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Please enter your name.' });
    }
    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const guestCountNum = guest_count ? parseInt(guest_count, 10) : null;

    const { data: inquiry, error: insertError } = await supabase
      .from('event_inquiries')
      .insert({
        name: cleanName,
        email: cleanEmail,
        phone: phone ? String(phone).trim() : null,
        event_type: event_type || null,
        event_date: event_date || null,
        guest_count: Number.isInteger(guestCountNum) ? guestCountNum : null,
        location: location ? String(location).trim() : null,
        message: message ? String(message).trim() : null
      })
      .select()
      .single();

    if (insertError) {
      console.error('[book] insert error', insertError);
      return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
    }

    sendBookingNotification(inquiry).catch((err) => {
      console.error('[book] admin notification failed', err);
    });
    sendBookingConfirmation(cleanName, cleanEmail).catch((err) => {
      console.error('[book] confirmation email failed', err);
    });

    return res.status(200).json({ success: true, message: 'Your inquiry has been sent. Casa Juan will be in touch soon.' });
  } catch (err) {
    console.error('[book] unexpected error', err);
    return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
