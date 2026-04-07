// Netlify Function — Welcome email for new member signups
// Called from auth.js after successful Supabase signup

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return { statusCode: 200, body: 'No Resend key configured' };

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { email, firstName } = data;
  if (!email) return { statusCode: 400, body: 'Email required' };

  const name = firstName || 'there';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + RESEND_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Refractive <growth@refractive.co>',
      to: email,
      subject: 'Welcome to Refractive — your account is live',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <p>Hey ${name},</p>
          <p>Your Refractive account is live. You now have access to our operator-level tools and frameworks.</p>
          <p><strong>What you can do now:</strong></p>
          <ul style="line-height: 1.8;">
            <li><a href="https://refractive.co/playbooks.html" style="color: #7c5cfc;">Browse Member Resources</a> — unlock dashboards, simulators, and calculators</li>
            <li><a href="https://refractive.co/blog/index.html" style="color: #7c5cfc;">Read The Index</a> — operator frameworks for DTC growth</li>
          </ul>
          <p>Every tool you unlock stays in your account. No limits, no trial.</p>
          <p>Welcome aboard,<br>The Refractive Team</p>
        </div>
      `
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
    return { statusCode: 500, body: 'Email send failed' };
  }

  return { statusCode: 200, body: 'Welcome email sent' };
};
