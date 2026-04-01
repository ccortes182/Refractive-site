/* ==========================================================================
   Auth — localStorage email-gate for gated resources
   ========================================================================== */

(function() {
  var STORAGE_KEY = 'refractive_user';

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      return null;
    }
  }

  function isAuthenticated() {
    var user = getUser();
    return !!(user && user.email);
  }

  function getAccessList() {
    var user = getUser();
    if (!user || !Array.isArray(user.access)) return [];
    return user.access.slice();
  }

  function getAccessCount() {
    return getAccessList().length;
  }

  function checkAccess(resource) {
    var user = getUser();
    if (!user || !user.access) return false;
    return user.access.indexOf(resource) !== -1;
  }

  function gateUser(profile, resource) {
    var user = getUser() || {
      email: null,
      firstName: null,
      lastName: null,
      jobTitle: null,
      company: null,
      memberState: 'active',
      memberSince: null,
      lastResource: null,
      unlockedAt: null,
      updatedAt: null,
      access: []
    };
    user.email = profile.email;
    user.firstName = profile.firstName || user.firstName;
    user.lastName = profile.lastName || user.lastName;
    user.jobTitle = profile.jobTitle || user.jobTitle;
    user.company = profile.company || user.company;
    user.memberState = 'active';
    user.memberSince = user.memberSince || new Date().toISOString();
    user.unlockedAt = new Date().toISOString();
    user.updatedAt = new Date().toISOString();
    if (user.access.indexOf(resource) === -1) {
      user.access.push(resource);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  function getEmail() {
    var user = getUser();
    return user ? user.email : null;
  }

  function getDisplayName() {
    var user = getUser();
    if (!user) return null;
    if (user.firstName) return user.firstName;
    if (user.email) return user.email.split('@')[0];
    return null;
  }

  function getLastResource() {
    var user = getUser();
    return user ? user.lastResource : null;
  }

  function setLastResource(resource) {
    var user = getUser();
    if (!user || !resource) return;
    user.lastResource = resource;
    user.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }

  function getAccountState() {
    if (!isAuthenticated()) return 'signed_out';
    if (getAccessCount() > 0) return 'signed_in_with_access';
    return 'signed_in';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  window.RefractiveAuth = {
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
    isValidEmail: isValidEmail
  };
})();
