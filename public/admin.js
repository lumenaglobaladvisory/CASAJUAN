(function () {
  'use strict';

  var loginView = document.getElementById('login-view');
  var dashboardView = document.getElementById('dashboard-view');
  var loginForm = document.getElementById('login-form');
  var loginError = document.getElementById('login-error');
  var searchInput = document.getElementById('search-input');
  var tagFilter = document.getElementById('tag-filter');
  var tbody = document.getElementById('subscribers-body');
  var tableEmpty = document.getElementById('table-empty');
  var statTotal = document.getElementById('stat-total');
  var campaignForm = document.getElementById('campaign-form');
  var modal = document.getElementById('confirm-modal');
  var modalMessage = document.getElementById('modal-message');
  var modalCancel = document.getElementById('modal-cancel');
  var modalConfirm = document.getElementById('modal-confirm');

  function showDashboard() {
    loginView.hidden = true;
    dashboardView.hidden = false;
    loadSubscribers();
  }

  function showLogin() {
    loginView.hidden = false;
    dashboardView.hidden = true;
  }

  fetch('/api/admin/session')
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.authenticated) showDashboard();
      else showLogin();
    })
    .catch(showLogin);

  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    loginError.hidden = true;
    var password = document.getElementById('login-password').value;
    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: password })
    })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (result) {
        if (!result.ok) throw new Error(result.d.message || 'Login failed.');
        showDashboard();
      })
      .catch(function (err) {
        loginError.textContent = err.message;
        loginError.hidden = false;
      });
  });

  document.getElementById('logout-btn').addEventListener('click', function () {
    fetch('/api/admin/logout', { method: 'POST' }).finally(showLogin);
  });

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function loadSubscribers() {
    var params = new URLSearchParams();
    if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
    if (tagFilter.value) params.set('tag', tagFilter.value);

    fetch('/api/admin/subscribers?' + params.toString())
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (!data.success) return;
        var rows = data.subscribers || [];
        statTotal.textContent = rows.length.toLocaleString();
        tbody.innerHTML = '';
        tableEmpty.hidden = rows.length !== 0;
        rows.forEach(function (s) {
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td>' + escapeHtml(s.first_name) + '</td>' +
            '<td>' + escapeHtml(s.email) + '</td>' +
            '<td>' + escapeHtml(s.phone) + '</td>' +
            '<td>' + escapeHtml(s.zip_code) + '</td>' +
            '<td>' + escapeHtml(s.referral_source) + '</td>' +
            '<td>' + escapeHtml(new Date(s.subscribed_at).toLocaleDateString()) + '</td>' +
            '<td>' + escapeHtml((s.tags || []).join(', ')) + '</td>';
          tbody.appendChild(tr);
        });
      })
      .catch(function () {});
  }

  var debounceTimer;
  function debouncedLoad() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadSubscribers, 250);
  }

  searchInput.addEventListener('input', debouncedLoad);
  tagFilter.addEventListener('change', loadSubscribers);

  // Campaign send with confirmation modal
  var pendingCampaign = null;

  campaignForm.addEventListener('submit', function (e) {
    e.preventDefault();
    pendingCampaign = {
      subject: document.getElementById('campaign-subject').value.trim(),
      body_html: document.getElementById('campaign-body').value.trim()
    };
    if (!pendingCampaign.subject || !pendingCampaign.body_html) return;

    modalMessage.textContent =
      'Send "' + pendingCampaign.subject + '" to ' + (statTotal.textContent || 'all') + ' subscribers?';
    modal.hidden = false;
  });

  modalCancel.addEventListener('click', function () {
    modal.hidden = true;
    pendingCampaign = null;
  });

  modalConfirm.addEventListener('click', function () {
    if (!pendingCampaign) return;
    modalConfirm.disabled = true;
    fetch('/api/admin/campaigns/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pendingCampaign)
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        modal.hidden = true;
        modalConfirm.disabled = false;
        if (data.success) {
          campaignForm.reset();
          alert('Campaign sent to ' + data.recipient_count + ' subscribers.');
        } else {
          alert(data.message || 'Failed to send campaign.');
        }
      })
      .catch(function () {
        modal.hidden = true;
        modalConfirm.disabled = false;
        alert('Failed to send campaign.');
      });
  });
})();
