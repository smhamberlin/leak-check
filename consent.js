
(function () {
    'use strict';
    if (window.__slcConsentInstalled) return;
    window.__slcConsentInstalled = true;
    var KEY = 'slc-leak-check-clarity-choice-v1';
    var LIFETIME = 180 * 24 * 60 * 60 * 1000;
    var loaded = false, stopped = false, choice = null;
    var panel, returnFocus, status, accept, description;
    function globalOptOut() { return navigator.globalPrivacyControl === true; }
    function readChoice() {
        try {
            var saved = JSON.parse(localStorage.getItem(KEY));
            if (saved && (saved.choice === 'accept' || saved.choice === 'decline') &&
                typeof saved.expires === 'number' && saved.expires > Date.now() &&
                saved.expires <= Date.now() + LIFETIME + 60000) return saved.choice;
        } catch (_) {}
        return null;
    }
    function storeChoice(value) {
        try { localStorage.setItem(KEY, JSON.stringify({choice:value, expires:Date.now() + LIFETIME})); }
        catch (_) {} // If storage is unavailable, consent lasts for this page only.
    }
    function clearClarityCookies() {
        ['_clck','_clsk'].forEach(function (name) {
            document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax';
            var parts = location.hostname.split('.');
            while (parts.length > 1) {
                document.cookie = name + '=; Max-Age=0; Path=/; Domain=' + parts.join('.') + '; SameSite=Lax';
                parts.shift();
            }
        });
    }
    function stopClarity() {
        if (loaded && !stopped && typeof window.clarity === 'function') {
            window.clarity('consentv2', {ad_Storage:'denied', analytics_Storage:'denied'});
            window.clarity('stop');
            stopped = true;
        }
        clearClarityCookies();
    }
    function consentSignal() {
        window.clarity('consentv2', {ad_Storage:'denied', analytics_Storage:'granted'});
    }
    function startClarity() {
        if (choice !== 'accept' || globalOptOut() || location.hostname !== 'check.slcunlimited.app') return;
        document.querySelectorAll('form').forEach(function (form) { form.setAttribute('data-clarity-mask','true'); });
        if (loaded) {
            if (stopped) { window.clarity('start'); stopped = false; }
            consentSignal();
            return;
        }
        window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
        consentSignal();
        var script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.clarity.ms/tag/y91nhiqm49';
        script.onload = function () {
            if (choice !== 'accept' || globalOptOut()) {
                // Cover withdrawal while the remote script was still downloading.
                stopped = false;
                stopClarity();
            }
        };
        loaded = true;
        document.head.appendChild(script);
    }
    function syncChoice() {
        if (choice === 'accept' && !globalOptOut()) startClarity();
        else stopClarity();
    }
    function updatePreferenceLinks() {
        document.querySelectorAll('a[href$="#cookie-preferences"]').forEach(function (link) {
            link.setAttribute('aria-controls','slc-cookie-panel');
            link.setAttribute('aria-expanded',panel.hidden ? 'false' : 'true');
        });
    }
    function openPanel(focus) {
        returnFocus = document.activeElement;
        panel.hidden = false;
        updatePreferenceLinks();
        accept.disabled = globalOptOut();
        description.textContent = globalOptOut()
            ? 'Your browser’s Global Privacy Control signal is enabled, so Microsoft Clarity is off. You can still use the website and contact form.'
            : 'We brought cookies too. They’re optional and help us improve your experience.';
        if (focus) panel.focus();
    }
    function closePanel(message) {
        panel.hidden = true;
        updatePreferenceLinks();
        if (returnFocus && returnFocus.isConnected) returnFocus.focus({preventScroll:true});
        status.textContent = message;
    }
    function choose(value) {
        choice = globalOptOut() ? 'decline' : value;
        storeChoice(choice);
        syncChoice();
        closePanel(choice === 'accept' ? 'Your preference is saved. Clarity is allowed.' : 'Your preference is saved. Clarity is off.');
    }
    function init() {
        if (document.getElementById('slc-cookie-panel')) return;
        panel = document.createElement('section');
        panel.id = 'slc-cookie-panel';
        panel.setAttribute('role','region');
        panel.setAttribute('aria-labelledby','slc-cookie-heading');
        panel.setAttribute('tabindex','-1');
        panel.setAttribute('data-clarity-mask','true');
        panel.innerHTML = '<h2 id="slc-cookie-heading">Your privacy choices</h2><p id="slc-cookie-description"></p><p><a href="https://slcunlimited.app/privacy">Read our Privacy Policy</a>.</p><div id="slc-cookie-actions"><button type="button" id="slc-cookie-decline">Decline</button><button type="button" id="slc-cookie-accept">Accept</button></div>';
        status = document.createElement('span');
        status.id = 'slc-cookie-status';
        status.setAttribute('role','status');
        status.setAttribute('aria-live','polite');
        document.body.appendChild(panel);
        document.body.appendChild(status);
        accept = document.getElementById('slc-cookie-accept');
        description = document.getElementById('slc-cookie-description');
        accept.addEventListener('click',function () { choose('accept'); });
        document.getElementById('slc-cookie-decline').addEventListener('click',function () { choose('decline'); });
        document.addEventListener('click',function (event) {
            var link = event.target.closest && event.target.closest('a[href$="#cookie-preferences"]');
            if (!link) return;
            event.preventDefault();
            event.stopPropagation();
            returnFocus = link;
            openPanel(true);
            returnFocus = link;
        },true);
        panel.addEventListener('keydown',function (event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                if (!choice) choose('decline');
                else closePanel('Your existing preference is unchanged.');
            }
        });
        choice = globalOptOut() ? 'decline' : readChoice();
        if (choice) { panel.hidden = true; updatePreferenceLinks(); }
        else openPanel(false);
        syncChoice();
        window.addEventListener('storage',function (event) {
            if (event.key !== KEY && event.key !== null) return;
            choice = globalOptOut() ? 'decline' : readChoice();
            syncChoice();
            if (!choice) openPanel(false);
            else { panel.hidden = true; updatePreferenceLinks(); }
        });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
    else init();
})();
