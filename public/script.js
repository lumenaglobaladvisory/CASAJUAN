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
    triggerCanReveal();
  }

  function triggerCanReveal() {
    var canEl = document.querySelector('.hero__can');
    var revealMask = document.querySelector('.hero__can-reveal');
    if (!canEl || !revealMask) return;

    var reduceMotion = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return; // leave overlay at its default opacity:0

    var rect = canEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    var spotRadius = Math.min(rect.width, rect.height) * 0.3;
    var feather = Math.max(18, spotRadius * 0.35);
    var maxRadius = Math.sqrt(rect.width * rect.width + rect.height * rect.height);

    // a searchlight wandering across the can before settling and expanding -
    // points as % position within the can's own box
    var waypoints = [
      { x: 36, y: 16 },
      { x: 70, y: 24 },
      { x: 74, y: 58 },
      { x: 30, y: 64 },
      { x: 50, y: 40 }
    ];

    var sweepDuration = 1500;
    var expandDuration = 750;
    var totalDuration = sweepDuration + expandDuration;
    var startTime = null;

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    function setSpot(xPct, yPct, radiusPx) {
      var inner = Math.max(0, radiusPx - feather);
      var outer = radiusPx + feather * 0.4;
      var css = 'radial-gradient(circle ' + radiusPx.toFixed(1) + 'px at ' +
        xPct.toFixed(2) + '% ' + yPct.toFixed(2) + '%, transparent 0px, ' +
        'transparent ' + inner.toFixed(1) + 'px, rgba(0,0,0,1) ' + outer.toFixed(1) + 'px)';
      revealMask.style.webkitMaskImage = css;
      revealMask.style.maskImage = css;
    }

    revealMask.style.opacity = '1';
    setSpot(waypoints[0].x, waypoints[0].y, spotRadius);

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var elapsed = timestamp - startTime;

      if (elapsed <= sweepDuration) {
        var segCount = waypoints.length - 1;
        var segDuration = sweepDuration / segCount;
        var segIndex = Math.min(segCount - 1, Math.floor(elapsed / segDuration));
        var segT = Math.min(1, (elapsed - segIndex * segDuration) / segDuration);
        var a = waypoints[segIndex];
        var b = waypoints[segIndex + 1];
        var te = easeInOut(segT);
        setSpot(a.x + (b.x - a.x) * te, a.y + (b.y - a.y) * te, spotRadius);
        window.requestAnimationFrame(step);
      } else if (elapsed <= totalDuration) {
        var expandT = easeInOut(Math.min(1, (elapsed - sweepDuration) / expandDuration));
        var last = waypoints[waypoints.length - 1];
        var radius = spotRadius + (maxRadius - spotRadius) * expandT;
        setSpot(last.x, last.y, radius);
        window.requestAnimationFrame(step);
      } else {
        revealMask.style.opacity = '0';
        revealMask.style.webkitMaskImage = '';
        revealMask.style.maskImage = '';
      }
    }

    window.requestAnimationFrame(step);
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
