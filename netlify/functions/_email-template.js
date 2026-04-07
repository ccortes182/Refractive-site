// Shared email template wrapper for all Refractive emails

const ICON_URL = 'https://refractive.co/images/Social%20Icon.png';
const WORDMARK_URL = 'https://refractive.co/images/brand-moment-text.png';
const SITE_URL = 'https://refractive.co';

function wrap(bodyHtml, options = {}) {
  const unsubNote = options.hideUnsubscribe
    ? ''
    : `<p style="font-size: 12px; color: #666; margin-top: 32px; border-top: 1px solid #2a2d31; padding-top: 16px;">
        You're receiving this because you interacted with Refractive.
        If you no longer wish to receive these emails, reply with "unsubscribe" or email <a href="mailto:growth@refractive.co?subject=Unsubscribe" style="color: #7c5cfc;">growth@refractive.co</a>.
      </p>`;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background-color: #121417;">
      <div style="max-width: 560px; margin: 0 auto; padding: 40px 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e8e8e8; line-height: 1.6;">
        <div style="margin-bottom: 32px; display: flex; align-items: center;">
          <a href="${SITE_URL}" style="display: inline-block; text-decoration: none;">
            <img src="${ICON_URL}" alt="Refractive" width="32" height="32" style="display: inline-block; border: 0; vertical-align: middle;">
          </a>
          <a href="${SITE_URL}" style="display: inline-block; text-decoration: none; margin-left: 12px;">
            <img src="${WORDMARK_URL}" alt="Refractive" height="14" style="display: inline-block; border: 0; vertical-align: middle;">
          </a>
        </div>
        <div style="color: #e8e8e8;">
          ${bodyHtml.replace(/color: #1a1a1a/g, 'color: #e8e8e8').replace(/background: #f4f4f5/g, 'background: #1e2025').replace(/color: #666/g, 'color: #999')}
        </div>
        ${unsubNote}
        <div style="font-size: 12px; color: #555; margin-top: 24px; border-top: 1px solid #2a2d31; padding-top: 16px;">
          Refractive &mdash; One Growth Team. Every Channel.<br>
          <a href="${SITE_URL}" style="color: #555;">refractive.co</a>
        </div>
      </div>
    </body>
    </html>
  `;
}

module.exports = { wrap, ICON_URL, WORDMARK_URL, SITE_URL };
