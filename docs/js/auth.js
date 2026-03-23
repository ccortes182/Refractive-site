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
      unlockedAt: null,
      access: []
    };
    user.email = profile.email;
    user.firstName = profile.firstName || user.firstName;
    user.lastName = profile.lastName || user.lastName;
    user.jobTitle = profile.jobTitle || user.jobTitle;
    user.company = profile.company || user.company;
    user.unlockedAt = new Date().toISOString();
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
    return null;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  window.RefractiveAuth = {
    isAuthenticated: isAuthenticated,
    checkAccess: checkAccess,
    gateUser: gateUser,
    getUser: getUser,
    getEmail: getEmail,
    getDisplayName: getDisplayName,
    isValidEmail: isValidEmail
  };
})();
