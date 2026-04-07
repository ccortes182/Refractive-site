// Netlify Function — Send portal invite email with credentials
// Called from admin-invite.js after creating/granting access

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return { statusCode: 500, body: 'No Resend key configured' };

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { email, password, portal } = data;
  if (!email || !password || !portal) {
    return { statusCode: 400, body: 'email, password, and portal are required' };
  }

  const isInvestor = portal === 'investor';
  const portalLabel = isInvestor ? 'Investor Relations' : 'Client Portal';
  const loginUrl = isInvestor
    ? 'https://refractive.co/investor.html'
    : 'https://refractive.co/portal.html';
  const materialsDesc = isInvestor
    ? 'investor deck, one-pager, and Illuminate roadmap'
    : 'engagement decks, service one-pagers, and operational playbooks';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + RESEND_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Refractive <growth@refractive.co>',
      to: email,
      subject: 'Your ' + portalLabel + ' access — Refractive',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <p>You've been granted access to the Refractive ${portalLabel}.</p>
          <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <p style="margin: 0 0 12px 0;"><strong>Login URL</strong><br>
            <a href="${loginUrl}" style="color: #7c5cfc;">${loginUrl}</a></p>
            <p style="margin: 0 0 12px 0;"><strong>Email</strong><br>${email}</p>
            <p style="margin: 0;"><strong>Temporary Password</strong><br>${password}</p>
          </div>
          <p>Once signed in, you'll have access to your ${materialsDesc}.</p>
          <p style="margin-top: 24px;">
            <a href="${loginUrl}" style="display: inline-block; background: #7c5cfc; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600;">Sign In to ${portalLabel}</a>
          </p>
          <p style="color: #666; font-size: 13px; margin-top: 32px;">If you have any questions, reply to this email or reach out at <a href="mailto:growth@refractive.co" style="color: #7c5cfc;">growth@refractive.co</a>.</p>
          <p>— The Refractive Team</p>
        </div>
      `
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
    return { statusCode: 500, body: 'Email send failed: ' + err };
  }

  return { statusCode: 200, body: 'Invite email sent' };
};
