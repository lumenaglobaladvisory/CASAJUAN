(function () {
  'use strict';

  var form = document.getElementById('book-form');
  var errorEl = document.getElementById('form-error');
  var successEl = document.getElementById('form-success');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorEl.hidden = true;

    var payload = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      event_type: form.event_type.value,
      event_date: form.event_date.value,
      guest_count: form.guest_count.value,
      location: form.location.value.trim(),
      message: form.message.value.trim()
    };

    if (!payload.name || !payload.email) {
      errorEl.textContent = 'Please enter your name and email address.';
      errorEl.hidden = false;
      return;
    }

    var submitBtn = form.querySelector('.form__submit');
    submitBtn.disabled = true;

    fetch('/api/book', {
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
        form.hidden = true;
        successEl.hidden = false;
      })
      .catch(function (err) {
        errorEl.textContent = err.message || 'Something went wrong. Please try again.';
        errorEl.hidden = false;
      })
      .finally(function () {
        submitBtn.disabled = false;
      });
  });
})();
