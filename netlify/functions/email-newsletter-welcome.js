// Netlify Function — Welcome email for newsletter signups
// Triggered by Netlify Forms submission-created event for the "newsletter" form

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

  if (payload.form_name !== 'newsletter') {
    return { statusCode: 200, body: 'Not a newsletter submission' };
  }

  const email = payload.data.email;
  if (!email) return { statusCode: 200, body: 'No email provided' };

  const html = wrap(`
    <p>Welcome to The Refractive Index.</p>
    <p>You're now subscribed to operator-level frameworks for DTC brands &mdash; no fluff, just the mental models and playbooks we use to grow brands every day.</p>
    <p><strong>Start with a few of our most-read pieces:</strong></p>
    <ul style="line-height: 1.8; padding-left: 20px;">
      <li><a href="https://refractive.co/blog/last-click-attribution-death-spiral.html" style="color: #7c5cfc;">The Last-Click Attribution Death Spiral</a></li>
      <li><a href="https://refractive.co/blog/tracking-maturity-ladder.html" style="color: #7c5cfc;">The Tracking Maturity Ladder</a></li>
      <li><a href="https://refractive.co/blog/blended-ltv-most-dangerous-metric.html" style="color: #7c5cfc;">Blended LTV: The Most Dangerous Metric in DTC</a></li>
    </ul>
    <p>You'll hear from us every few weeks with new frameworks, operator breakdowns, and tools.</p>
    <p>&mdash; The Refractive Team</p>
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
      subject: 'Welcome to The Refractive Index',
      html: html
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
    return { statusCode: 500, body: 'Email send failed' };
  }

  return { statusCode: 200, body: 'Newsletter welcome sent' };
};
