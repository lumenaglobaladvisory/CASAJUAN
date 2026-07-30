(function () {
  'use strict';

  var SESSION_KEY = 'casajuan_age_verified';

  function getSessionId() {
    var key = 'casajuan_session_id';
    var id = sessionStorage.getItem(key);
    if (!id) {
      id = 'sess_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
      sessionStorage.setItem(key, id);
    }
    return id;
  }

  function logEvent(eventName, metadata) {
    try {
      navigator.sendBeacon
        ? navigator.sendBeacon('/api/event', new Blob([JSON.stringify({
            event_name: eventName,
            session_id: getSessionId(),
            metadata: metadata || {}
          })], { type: 'application/json' }))
        : fetch('/api/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_name: eventName,
              session_id: getSessionId(),
              metadata: metadata || {}
            }),
            keepalive: true
          }).catch(function () {});
    } catch (e) {
      /* analytics must never break the page */
    }
  }

  // ---------------------------------------------------------------------
  // Age Gate
  // ---------------------------------------------------------------------
  var ageGate = document.getElementById('age-gate');
  var site = document.getElementById('site');

  function revealSite() {
    ageGate.hidden = true;
    site.removeAttribute('aria-hidden');
    document.body.classList.remove('age-gate-open');
    logEvent('page_load');
  }

  if (sessionStorage.getItem(SESSION_KEY) === 'true') {
    revealSite();
  } else {
    ageGate.hidden = false;
    document.body.classList.add('age-gate-open');
  }

  document.getElementById('age-gate-enter').addEventListener('click', function () {
    sessionStorage.setItem(SESSION_KEY, 'true');
    revealSite();
  });

  document.getElementById('age-gate-exit').addEventListener('click', function () {
    window.location.href = 'https://google.com';
  });

  // ---------------------------------------------------------------------
  // Subscriber count
  // ---------------------------------------------------------------------
  function loadCount() {
    fetch('/api/count')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var el = document.getElementById('subscriber-count');
        if (el && typeof data.count === 'number') {
          el.textContent = data.count.toLocaleString();
        }
      })
      .catch(function () {});
  }
  loadCount();

  // ---------------------------------------------------------------------
  // Signup form
  // ---------------------------------------------------------------------
  var form = document.getElementById('signup-form');
  var errorEl = document.getElementById('form-error');
  var successEl = document.getElementById('form-success');
  var formFocused = false;

  form.addEventListener('focusin', function () {
    if (!formFocused) {
      formFocused = true;
      logEvent('form_focus');
    }
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorEl.hidden = true;

    var payload = {
      first_name: form.first_name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      zip_code: form.zip_code.value.trim(),
      referral_source: form.referral_source.value
    };

    if (!payload.first_name || !payload.email) {
      errorEl.textContent = 'Please enter your name and email address.';
      errorEl.hidden = false;
      return;
    }

    logEvent('form_submit_attempt');

    var submitBtn = form.querySelector('.form__submit');
    submitBtn.disabled = true;

    fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok || !result.data.success) {
          throw new Error(result.data.message || 'Something went wrong.');
        }
        logEvent('form_submit_success');
        form.hidden = true;
        successEl.hidden = false;
        loadCount();
      })
      .catch(function (err) {
        logEvent('form_submit_error', { message: err.message });
        errorEl.textContent = err.message || 'Something went wrong. Please try again.';
        errorEl.hidden = false;
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });
})();
