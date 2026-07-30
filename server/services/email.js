const { Resend } = require('resend');

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('[email] RESEND_API_KEY is not set. Emails will not send.');
}

const resend = resendApiKey ? new Resend(resendApiKey) : null;

const FROM_ADDRESS = 'Casa Juan <hello@casajuanexperience.com>';
const ADMIN_NOTIFICATION_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'juan@casajuanexperience.com';

const INSTAGRAM_URL = 'https://instagram.com/casajuanexperience';
const TIKTOK_URL = 'https://tiktok.com/@casajuanexperience';

function welcomeEmailText(firstName) {
  return [
    `${firstName},`,
    '',
    'You are on the list.',
    '',
    'Casa Juan is a modern hospitality brand built in Fort Lauderdale. We are bringing a premium vodka cocktail to market, Mango Passion Fruit, 5% ABV, real ingredients, and a flagship experience to follow.',
    '',
    'When the launch date is set, you will hear from us first.',
    '',
    'Follow the journey:',
    `Instagram: ${INSTAGRAM_URL}`,
    `TikTok: ${TIKTOK_URL}`,
    '',
    'Casa Juan',
    'Fort Lauderdale, FL',
    'Est. 2023'
  ].join('\n');
}

function welcomeEmailHtml(firstName) {
  return `
  <div style="background:#111111;padding:48px 24px;font-family:'DM Sans',Arial,sans-serif;color:#F7F3EC;">
    <div style="max-width:480px;margin:0 auto;text-align:center;">
      <p style="font-family:Georgia,serif;letter-spacing:2px;color:#B99A56;font-size:22px;margin:0 0 32px;">CASA JUAN</p>
      <p style="font-size:15px;line-height:1.7;text-align:left;">
        ${firstName},<br><br>
        You are on the list.<br><br>
        Casa Juan is a modern hospitality brand built in Fort Lauderdale. We are bringing a premium vodka cocktail to market, Mango Passion Fruit, 5% ABV, real ingredients, and a flagship experience to follow.<br><br>
        When the launch date is set, you will hear from us first.<br><br>
        Follow the journey:<br>
        <a href="${INSTAGRAM_URL}" style="color:#B99A56;">Instagram</a> &middot;
        <a href="${TIKTOK_URL}" style="color:#B99A56;">TikTok</a>
      </p>
      <p style="margin-top:40px;font-size:12px;color:#D7D5D2;">Casa Juan &middot; Fort Lauderdale, FL &middot; Est. 2023</p>
    </div>
  </div>`;
}

async function sendWelcomeEmail(firstName, email) {
  if (!resend) return { skipped: true };
  return resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: 'You are on the Casa Juan list.',
    text: welcomeEmailText(firstName),
    html: welcomeEmailHtml(firstName)
  });
}

async function sendCampaign({ subject, bodyHtml, recipients }) {
  if (!resend) return { skipped: true };
  const results = [];
  for (const recipient of recipients) {
    try {
      const res = await resend.emails.send({
        from: FROM_ADDRESS,
        to: recipient,
        subject,
        html: bodyHtml
      });
      results.push({ recipient, success: true, res });
    } catch (err) {
      results.push({ recipient, success: false, error: err.message });
    }
  }
  return results;
}

function bookingNotificationText(inquiry) {
  return [
    'New event inquiry from casajuanexperience.com',
    '',
    `Name: ${inquiry.name}`,
    `Email: ${inquiry.email}`,
    `Phone: ${inquiry.phone || 'Not provided'}`,
    `Event type: ${inquiry.event_type || 'Not specified'}`,
    `Event date: ${inquiry.event_date || 'Not specified'}`,
    `Guest count: ${inquiry.guest_count || 'Not specified'}`,
    `Location: ${inquiry.location || 'Not specified'}`,
    '',
    'Message:',
    inquiry.message || '(none)'
  ].join('\n');
}

async function sendBookingNotification(inquiry) {
  if (!resend) return { skipped: true };
  return resend.emails.send({
    from: FROM_ADDRESS,
    to: ADMIN_NOTIFICATION_EMAIL,
    replyTo: inquiry.email,
    subject: `New event inquiry: ${inquiry.name}${inquiry.event_date ? ' — ' + inquiry.event_date : ''}`,
    text: bookingNotificationText(inquiry)
  });
}

function bookingConfirmationText(name) {
  return [
    `${name},`,
    '',
    'Thank you for reaching out to Casa Juan.',
    '',
    'We have received your event details and will follow up shortly to confirm availability.',
    '',
    'Casa Juan',
    'Fort Lauderdale, FL',
    'Est. 2023'
  ].join('\n');
}

async function sendBookingConfirmation(name, email) {
  if (!resend) return { skipped: true };
  return resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: 'Casa Juan received your event inquiry',
    text: bookingConfirmationText(name)
  });
}

module.exports = { sendWelcomeEmail, sendCampaign, sendBookingNotification, sendBookingConfirmation };
