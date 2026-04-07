// Netlify Function — Notify admin of new member signups
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

  const { email, firstName, lastName, jobTitle, company, resource } = data;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + RESEND_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'Refractive <growth@refractive.co>',
      to: 'ccortes182@gmail.com',
      subject: 'New member signup — ' + (email || 'unknown'),
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
          <h3 style="margin-bottom: 8px;">New Member Signup</h3>
          <table style="border-collapse: collapse; width: 100%;">
            <tr><td style="padding: 4px 8px; color: #666;">Email</td><td style="padding: 4px 8px;">${email || '—'}</td></tr>
            <tr><td style="padding: 4px 8px; color: #666;">Name</td><td style="padding: 4px 8px;">${firstName || ''} ${lastName || ''}</td></tr>
            <tr><td style="padding: 4px 8px; color: #666;">Title</td><td style="padding: 4px 8px;">${jobTitle || '—'}</td></tr>
            <tr><td style="padding: 4px 8px; color: #666;">Company</td><td style="padding: 4px 8px;">${company || '—'}</td></tr>
            <tr><td style="padding: 4px 8px; color: #666;">Resource</td><td style="padding: 4px 8px;">${resource || '—'}</td></tr>
          </table>
          <p style="margin-top: 16px;"><a href="https://supabase.com/dashboard/project/rdwmyryoncvwumorgyuo/editor" style="color: #7c5cfc;">View in Supabase</a></p>
        </div>
      `
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
  }

  return { statusCode: 200, body: 'Admin notified' };
};
