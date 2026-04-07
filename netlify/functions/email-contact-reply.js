// Netlify Function — Auto-reply to contact form submissions
// Triggered by Netlify Forms submission-created event

const { wrap } = require('./_email-template');

exports.handler = async function(event) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return { statusCode: 200, body: 'No Resend key configured' };

  let payload;
  try {
    payload = JSON.parse(event.body).payload;
  } catch (e) {
    return { statusCode: 400, body: 'Invalid payload' };
  }

  if (payload.form_name !== 'contact') {
    return { statusCode: 200, body: 'Not a contact form submission' };
  }

  const firstName = payload.data.first_name || 'there';
  const email = payload.data.email;
  if (!email) return { statusCode: 200, body: 'No email provided' };

  const html = wrap(`
    <p>Hey ${firstName},</p>
    <p>Thanks for reaching out to Refractive. We received your message and will get back to you within 24 hours.</p>
    <p>In the meantime, feel free to explore our operator frameworks:</p>
    <p><a href="https://refractive.co/blog/index.html" style="color: #7c5cfc;">The Refractive Index</a> — frameworks for paid, CRO, retention, and measurement.</p>
    <p>Talk soon,<br>The Refractive Team</p>
  `);

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + RESEND_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Refractive <growth@refractive.co>',
      to: email,
      subject: 'We got your message — Refractive',
      html: html
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
    return { statusCode: 500, body: 'Email send failed' };
  }

  return { statusCode: 200, body: 'Auto-reply sent' };
};
