/* Consent-gated funnel events for the existing Microsoft Clarity project. */
(function () {
  'use strict';
  var active = false;
  var seen = Object.create(null);
  var params = new URLSearchParams(location.search);
  var internal = params.get('slc_test') === '1';
  // Only a fixed campaign code is accepted. Never send arbitrary URL parameters.
  var campaign = params.get('campaign') === 'tampa-hvac-reply-first-v1'
    ? 'tampa-hvac-reply-first-v1' : 'unattributed';
  var allowed = ['landing', 'contact_viewed', 'contact_submit', 'contact_saved',
    'contact_invalid', 'save_failed', 'completed', 'booking_clicked',
    'report_requested', 'report_sent', 'report_failed'];
  for (var i = 1; i <= 9; i++) allowed.push('q' + i + '_saved');
  function canTrack() {
    return active && window.slcAnalyticsAllowed === true &&
      navigator.globalPrivacyControl !== true &&
      location.hostname === 'check.slcunlimited.app' && typeof window.clarity === 'function';
  }
  function track(name, repeat) {
    if (!canTrack() || allowed.indexOf(name) < 0 || (!repeat && seen[name])) return;
    try {
      window.clarity('event', (internal ? 'qa_slc_' : 'slc_') + name);
      seen[name] = true;
    } catch (_) { /* Analytics must never block the assessment. */ }
  }
  window.slcTrack = track;
  window.addEventListener('slc:analytics-consent', function (event) {
    active = !!(event.detail && event.detail.allowed);
    if (!canTrack()) return;
    try {
      window.clarity('set', 'slc_funnel_version', '2026-10-19-v1');
      window.clarity('set', 'slc_internal_test', internal ? 'true' : 'false');
      window.clarity('set', 'slc_campaign', campaign);
      track('landing');
      // If consent arrives late, record only the current screen, not past actions.
      var capture = document.getElementById('capture-screen');
      if (capture && capture.classList.contains('active')) track('contact_viewed');
    } catch (_) {}
  });
})();
