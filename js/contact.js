const form = document.getElementById("contact-form");
const confirmation = document.getElementById("confirmation");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setError(field, message) {
  const errorEl = form.querySelector(`[data-error-for="${field}"]`);
  const input = form.elements[field];
  if (errorEl) errorEl.textContent = message || "";
  if (input) input.classList.toggle("invalid", Boolean(message));
}

function clearErrors() {
  ["fullName", "email", "why", "form"].forEach((field) => setError(field, ""));
}

function validate(data) {
  const errors = {};
  if (data.fullName.trim().length < 2) {
    errors.fullName = "Please enter your full name.";
  }
  if (!emailPattern.test(data.email.trim())) {
    errors.email = "Please enter a valid email address.";
  }
  return errors;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors();

  const data = {
    fullName: form.fullName.value,
    email: form.email.value,
    why: form.why.value
  };

  const errors = validate(data);
  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([field, message]) => setError(field, message));
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    const response = await fetch("/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      if (payload.errors) {
        Object.entries(payload.errors).forEach(([field, message]) => setError(field, message));
      } else {
        setError("form", payload.error || "Could not send your message.");
      }
      button.disabled = false;
      return;
    }

    form.hidden = true;
    confirmation.hidden = false;
  } catch {
    setError("form", "Could not send your message. Start the site with python3 server.py and try again.");
    button.disabled = false;
  }
});
