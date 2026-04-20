/* ==========================================================================
   Auth — Supabase-backed member auth for gated resources
   API surface preserved: all consumers (account-ui.js, tool guards,
   playbooks.html) use window.RefractiveAuth unchanged.
   ========================================================================== */

(function() {
  var STORAGE_KEY = 'refractive_user'; // legacy localStorage key for migration
  var sb = null; // Supabase client, set in init
  var _cachedUser = null;
  var _cachedProfile = null;
  var _cachedAccess = null;
  var _ready = false;
  var _readyCallbacks = [];

  // ── Initialisation ──────────────────────────────────────────────────────

  function init() {
    sb = window.RefractiveSupabase;
    if (!sb) {
      // Supabase not loaded — fall back to localStorage for local dev
      _ready = true;
      _flushReady();
      return;
    }

    sb.auth.getSession().then(function(result) {
      var session = result.data && result.data.session;
      if (session) {
        _cachedUser = session.user;
        return _loadProfile(session.user.id);
      }
    }).then(function() {
      _ready = true;
      _flushReady();
    }).catch(function() {
      _ready = true;
      _flushReady();
    });

    // Listen for auth state changes (login/logout)
    sb.auth.onAuthStateChange(function(event, session) {
      if (session && session.user) {
        _cachedUser = session.user;
        _loadProfile(session.user.id);
      } else {
        _cachedUser = null;
        _cachedProfile = null;
        _cachedAccess = null;
      }
    });
  }

  function _flushReady() {
    _readyCallbacks.forEach(function(cb) { cb(); });
    _readyCallbacks = [];
  }

  function onReady(cb) {
    if (_ready) { cb(); } else { _readyCallbacks.push(cb); }
  }

  // ── Profile loading ─────────────────────────────────────────────────────

  function _loadProfile(userId) {
    return Promise.all([
      sb.from('profiles').select('*').eq('id', userId).single(),
      sb.from('tool_access').select('resource_slug').eq('user_id', userId)
    ]).then(function(results) {
      var profileResult = results[0];
      var accessResult = results[1];
      _cachedProfile = profileResult.data || null;
      _cachedAccess = (accessResult.data || []).map(function(r) { return r.resource_slug; });
    });
  }

  // ── Public API (same surface as legacy) ─────────────────────────────────

  function getUser() {
    if (!_cachedProfile) return _getLegacyUser();
    return {
      email: _cachedUser ? _cachedUser.email : null,
      firstName: _cachedProfile.first_name,
      lastName: _cachedProfile.last_name,
      jobTitle: _cachedProfile.job_title,
      company: _cachedProfile.company,
      memberState: _cachedProfile.member_state,
      memberSince: _cachedProfile.member_since,
      access: _cachedAccess || []
    };
  }

  function isAuthenticated() {
    if (_cachedUser) return true;
    // Legacy fallback
    var legacy = _getLegacyUser();
    return !!(legacy && legacy.email);
  }

  function getAccountState() {
    if (!isAuthenticated()) return 'signed_out';
    var access = getAccessList();
    if (access.length > 0) return 'signed_in_with_access';
    return 'signed_in';
  }

  function getAccessList() {
    if (_cachedAccess) return _cachedAccess.slice();
    var legacy = _getLegacyUser();
    if (legacy && Array.isArray(legacy.access)) return legacy.access.slice();
    return [];
  }

  function getAccessCount() {
    return getAccessList().length;
  }

  function checkAccess(resource) {
    return getAccessList().indexOf(resource) !== -1;
  }

  function getEmail() {
    if (_cachedUser) return _cachedUser.email;
    var legacy = _getLegacyUser();
    return legacy ? legacy.email : null;
  }

  function getDisplayName() {
    if (_cachedProfile && _cachedProfile.first_name) return _cachedProfile.first_name;
    if (_cachedUser && _cachedUser.email) return _cachedUser.email.split('@')[0];
    var legacy = _getLegacyUser();
    if (!legacy) return null;
    if (legacy.firstName) return legacy.firstName;
    if (legacy.email) return legacy.email.split('@')[0];
    return null;
  }

  function getLastResource() {
    if (_cachedProfile) return _cachedProfile.last_resource;
    var legacy = _getLegacyUser();
    return legacy ? legacy.lastResource : null;
  }

  function setLastResource(resource) {
    if (!resource) return;
    if (sb && _cachedUser) {
      sb.from('profiles').update({ last_resource: resource, updated_at: new Date().toISOString() }).eq('id', _cachedUser.id);
    }
    // Also update legacy for compat
    var legacy = _getLegacyUser();
    if (legacy) {
      legacy.lastResource = resource;
      legacy.updatedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));
    }
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ── Sign-up / Sign-in / Sign-out ───────────────────────────────────────

  function signUp(email, password, profile) {
    if (!sb) return Promise.reject(new Error('Supabase not loaded'));
    return sb.auth.signUp({ email: email, password: password })
      .then(function(result) {
        if (result.error) throw result.error;
        var user = result.data.user;
        if (!user) throw new Error('Signup failed');
        _cachedUser = user;
        return sb.from('profiles').upsert({
          id: user.id,
          first_name: profile.firstName || null,
          last_name: profile.lastName || null,
          email: email,
          job_title: profile.jobTitle || null,
          company: profile.company || null,
          member_state: 'active',
          member_since: new Date().toISOString(),
          role: 'member'
        });
      })
      .then(function(result) {
        if (result.error) throw result.error;
        // Send welcome email + notify admin (fire and forget)
        _sendWelcomeEmail(email, profile);
        return _loadProfile(_cachedUser.id);
      });
  }

  function _sendWelcomeEmail(email, profile) {
    var payload = JSON.stringify({
      email: email,
      firstName: profile.firstName || '',
      lastName: profile.lastName || '',
      jobTitle: profile.jobTitle || '',
      company: profile.company || ''
    });
    // Welcome email to user
    fetch('/.netlify/functions/email-member-welcome', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload
    }).catch(function() {});
    // Admin notification
    fetch('/.netlify/functions/email-notify-admin', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload
    }).catch(function() {});
  }

  function signIn(email, password) {
    if (!sb) return Promise.reject(new Error('Supabase not loaded'));
    return sb.auth.signInWithPassword({ email: email, password: password })
      .then(function(result) {
        if (result.error) throw result.error;
        _cachedUser = result.data.user;
        return _loadProfile(result.data.user.id);
      });
  }

  function signOut() {
    if (!sb) return Promise.resolve();
    _cachedUser = null;
    _cachedProfile = null;
    _cachedAccess = null;
    localStorage.removeItem(STORAGE_KEY);
    return sb.auth.signOut();
  }

  function grantAccess(resource) {
    if (!sb || !_cachedUser) return Promise.reject(new Error('Not authenticated'));
    return sb.from('tool_access').upsert({
      user_id: _cachedUser.id,
      resource_slug: resource,
      unlocked_at: new Date().toISOString()
    }, { onConflict: 'user_id,resource_slug' })
    .then(function(result) {
      if (result.error) throw result.error;
      if (!_cachedAccess) _cachedAccess = [];
      if (_cachedAccess.indexOf(resource) === -1) _cachedAccess.push(resource);
    });
  }

  // gateUser — replaces the legacy localStorage-only version.
  // Used by playbooks.html gate modal: signs up (or signs in), then grants access.
  function gateUser(profile, resource) {
    // Legacy compat: still write to localStorage for pages that load before Supabase
    var legacyUser = _getLegacyUser() || {
      email: null, firstName: null, lastName: null, jobTitle: null,
      company: null, memberState: 'active', memberSince: null,
      lastResource: null, unlockedAt: null, updatedAt: null, access: []
    };
    legacyUser.email = profile.email;
    legacyUser.firstName = profile.firstName || legacyUser.firstName;
    legacyUser.lastName = profile.lastName || legacyUser.lastName;
    legacyUser.jobTitle = profile.jobTitle || legacyUser.jobTitle;
    legacyUser.company = profile.company || legacyUser.company;
    legacyUser.memberState = 'active';
    legacyUser.memberSince = legacyUser.memberSince || new Date().toISOString();
    legacyUser.unlockedAt = new Date().toISOString();
    legacyUser.updatedAt = new Date().toISOString();
    if (legacyUser.access.indexOf(resource) === -1) legacyUser.access.push(resource);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacyUser));
  }

  // ── Async gateUser — full Supabase flow (used by updated playbooks.html) ──

  function gateUserAsync(profile, password, resource) {
    return signUp(profile.email, password, profile)
      .catch(function(err) {
        if (err.message && err.message.indexOf('already registered') !== -1) {
          return signIn(profile.email, password).catch(function(signInErr) {
            if (signInErr.message && signInErr.message.indexOf('Invalid login') !== -1) {
              throw new Error('An account with this email already exists. Try signing in with your password, or use a different email.');
            }
            throw signInErr;
          });
        }
        throw err;
      })
      .then(function() {
        return grantAccess(resource);
      });
  }

  function resetPassword(email) {
    if (!sb) return Promise.reject(new Error('Supabase not loaded'));
    return sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/playbooks.html'
    }).then(function(result) {
      if (result.error) throw result.error;
    });
  }

  // ── Legacy helpers ──────────────────────────────────────────────────────

  function _getLegacyUser() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return null;
    }
  }

  // ── Async access check (for tool page guards) ──────────────────────────

  function checkAccessAsync(resource) {
    if (!sb) {
      // No Supabase — fall back to sync check
      return Promise.resolve(checkAccess(resource));
    }
    return sb.auth.getSession().then(function(result) {
      var session = result.data && result.data.session;
      if (!session) return false;
      return sb.from('tool_access')
        .select('resource_slug')
        .eq('user_id', session.user.id)
        .eq('resource_slug', resource)
        .then(function(res) {
          return res.data && res.data.length > 0;
        });
    }).catch(function() {
      return false;
    });
  }

  // ── Expose API ──────────────────────────────────────────────────────────

  window.RefractiveAuth = {
    // Legacy sync API (preserved for existing consumers)
    isAuthenticated: isAuthenticated,
    getAccountState: getAccountState,
    checkAccess: checkAccess,
    gateUser: gateUser,
    getUser: getUser,
    getEmail: getEmail,
    getDisplayName: getDisplayName,
    getAccessList: getAccessList,
    getAccessCount: getAccessCount,
    getLastResource: getLastResource,
    setLastResource: setLastResource,
    isValidEmail: isValidEmail,

    // New async API
    signUp: signUp,
    signIn: signIn,
    signOut: signOut,
    grantAccess: grantAccess,
    gateUserAsync: gateUserAsync,
    checkAccessAsync: checkAccessAsync,
    resetPassword: resetPassword,
    onReady: onReady
  };

  // Initialise on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
