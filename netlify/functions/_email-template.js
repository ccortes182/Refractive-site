// Shared email template wrapper for all Refractive emails

const LOGO_URL = 'https://refractive.co/images/Social%20Icon.png';
const SITE_URL = 'https://refractive.co';

function wrap(bodyHtml, options = {}) {
  const unsubNote = options.hideUnsubscribe
    ? ''
    : `<p style="font-size: 12px; color: #999; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
        You're receiving this because you interacted with Refractive.
        If you no longer wish to receive these emails, reply with "unsubscribe" or email <a href="mailto:growth@refractive.co?subject=Unsubscribe" style="color: #999;">growth@refractive.co</a>.
      </p>`;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background-color: #f9fafb;">
      <div style="max-width: 560px; margin: 0 auto; padding: 40px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.6;">
        <div style="margin-bottom: 32px;">
          <a href="${SITE_URL}">
            <img src="${LOGO_URL}" alt="Refractive" width="40" height="40" style="display: block; border: 0;">
          </a>
        </div>
        ${bodyHtml}
        ${unsubNote}
        <p style="font-size: 12px; color: #bbb; margin-top: 16px;">
          Refractive &mdash; One Growth Team. Every Channel.<br>
          <a href="${SITE_URL}" style="color: #bbb;">refractive.co</a>
        </p>
      </div>
    </body>
    </html>
  `;
}

module.exports = { wrap, LOGO_URL, SITE_URL };
