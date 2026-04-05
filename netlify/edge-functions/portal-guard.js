// Portal Guard — Netlify Edge Function
// Protects /portal/*, /investor/*, and /downloads/* paths
// Validates Supabase JWT from cookie before serving content

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

export default async function handler(request, context) {
  const url = new URL(request.url);
  const path = url.pathname;

  // Only guard content paths, not the login pages themselves
  // portal.html and investor.html (login pages) remain accessible
  const isPortalContent = path.startsWith('/portal/') && path !== '/portal/' && path !== '/portal/index.html';
  const isInvestorContent = path.startsWith('/investor/') && path !== '/investor/' && path !== '/investor/index.html';
  const isDownload = path.startsWith('/downloads/');

  // Also protect the old root-level content pages (before redirect)
  const protectedRootPages = ['/deck.html', '/pitch.html', '/investor-onepager.html', '/illuminate-roadmap.html'];
  const isProtectedRoot = protectedRootPages.includes(path);

  if (!isPortalContent && !isInvestorContent && !isDownload && !isProtectedRoot) {
    return context.next();
  }

  // Get auth token from cookie
  const cookies = parseCookies(request.headers.get('cookie') || '');
  const accessToken = cookies['sb-access-token'];

  if (!accessToken) {
    return redirectToLogin(path);
  }

  // Validate token with Supabase
  try {
    const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });

    if (!userResponse.ok) {
      return redirectToLogin(path);
    }

    const user = await userResponse.json();

    // Check portal_access for the required portal type
    const requiredType = (isInvestorContent || path.startsWith('/investor'))
      ? 'investor'
      : 'client';

    const accessResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/portal_access?user_id=eq.${user.id}&portal_type=eq.${requiredType}&revoked_at=is.null&select=id`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!accessResponse.ok) {
      return redirectToLogin(path);
    }

    const accessData = await accessResponse.json();

    if (!accessData || accessData.length === 0) {
      return new Response('Unauthorized — you do not have access to this resource.', {
        status: 403,
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // Authorised — serve the page
    return context.next();

  } catch (err) {
    return redirectToLogin(path);
  }
}

function redirectToLogin(path) {
  const loginPage = (path.startsWith('/investor') || path === '/deck.html' || path === '/investor-onepager.html' || path === '/illuminate-roadmap.html')
    ? '/investor.html'
    : '/portal.html';
  return new Response(null, {
    status: 302,
    headers: { 'Location': loginPage }
  });
}

function parseCookies(cookieString) {
  const cookies = {};
  if (!cookieString) return cookies;
  cookieString.split(';').forEach(function(pair) {
    const parts = pair.trim().split('=');
    if (parts.length >= 2) {
      cookies[parts[0]] = parts.slice(1).join('=');
    }
  });
  return cookies;
}

export const config = {
  path: ['/portal/*', '/investor/*', '/downloads/*', '/deck.html', '/pitch.html', '/investor-onepager.html', '/illuminate-roadmap.html']
};
