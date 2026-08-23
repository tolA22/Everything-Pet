const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const backdrop = document.getElementById("reserve-modal");
const form = document.getElementById("reserve-form");
const formWrap = document.getElementById("reserve-form-wrap");
const confirmation = document.getElementById("reserve-confirmation");
const petFields = document.getElementById("pet-fields");
const petCountInput = document.getElementById("pet-count");
const nightsWrap = document.getElementById("duration-nights-wrap");
const minutesWrap = document.getElementById("duration-minutes-wrap");
const pickupInput = document.getElementById("pickup");
const pickupWrap = document.getElementById("pickup-point-wrap");
const totalEl = document.getElementById("reserve-total");
const serviceInput = document.getElementById("reserve-service");
const dateInput = document.getElementById("service-date");

const titles = {
  boarding: "Reserve shelter boarding",
  walking: "Reserve a pet walk"
};

const subtitles = {
  boarding: "$60 per night per pet. Pickup is optional and adds $20.",
  walking: "$25 for 30 minutes per pet, or $45 for 60 minutes per pet. Pickup adds $20."
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function setError(field, message) {
  const errorEl = form.querySelector(`[data-error-for="${field}"]`);
  const input = form.querySelector(`[name="${field}"]`) || document.getElementById(field);
  if (errorEl) errorEl.textContent = message || "";
  if (input && input.classList) input.classList.toggle("invalid", Boolean(message));
}

function clearErrors() {
  form.querySelectorAll(".field-error").forEach((el) => {
    el.textContent = "";
  });
  form.querySelectorAll(".invalid").forEach((el) => el.classList.remove("invalid"));
}

function currentService() {
  return serviceInput.value;
}

function petCount() {
  return Math.max(1, Number(petCountInput.value) || 1);
}

function durationValue() {
  if (currentService() === "walking") {
    return Number(document.getElementById("duration-minutes").value);
  }
  return Number(document.getElementById("duration-nights").value);
}

function calcTotal() {
  const pets = petCount();
  const pickupFee = pickupInput.checked ? 20 : 0;
  if (currentService() === "walking") {
    const rate = durationValue() === 60 ? 45 : 25;
    return rate * pets + pickupFee;
  }
  const nights = Math.max(1, durationValue() || 1);
  return 60 * nights * pets + pickupFee;
}

function updateTotal() {
  totalEl.textContent = `$${calcTotal()}`;
}

function renderPetFields() {
  const count = Math.min(8, petCount());
  const existing = [...petFields.querySelectorAll(".pet-row")].map((row) => ({
    name: row.querySelector('[data-pet="name"]').value,
    breed: row.querySelector('[data-pet="breed"]').value
  }));
  petFields.innerHTML = "";
  for (let i = 0; i < count; i += 1) {
    const saved = existing[i] || { name: "", breed: "" };
    const row = document.createElement("div");
    row.className = "pet-row";
    row.innerHTML = `
      <p class="pet-row-title">Pet ${i + 1}</p>
      <label>
        Name
        <input data-pet="name" value="${saved.name.replace(/"/g, "&quot;")}" required>
        <span class="field-error" data-error-for="pet-${i}-name"></span>
      </label>
      <label>
        Breed
        <input data-pet="breed" value="${saved.breed.replace(/"/g, "&quot;")}" required>
        <span class="field-error" data-error-for="pet-${i}-breed"></span>
      </label>
    `;
    petFields.append(row);
  }
  updateTotal();
}

function collectPets() {
  return [...petFields.querySelectorAll(".pet-row")].map((row) => ({
    name: row.querySelector('[data-pet="name"]').value.trim(),
    breed: row.querySelector('[data-pet="breed"]').value.trim()
  }));
}

function openModal(service) {
  serviceInput.value = service;
  document.getElementById("reserve-title").textContent = titles[service];
  document.getElementById("reserve-subtitle").textContent = subtitles[service];
  form.reset();
  serviceInput.value = service;
  dateInput.min = todayIso();
  petCountInput.value = "1";
  document.getElementById("duration-nights").value = "1";
  document.getElementById("duration-minutes").value = "30";
  nightsWrap.hidden = service !== "boarding";
  minutesWrap.hidden = service !== "walking";
  pickupWrap.hidden = true;
  formWrap.hidden = false;
  confirmation.hidden = true;
  clearErrors();
  renderPetFields();
  backdrop.classList.add("open");
  document.getElementById("owner-name").focus();
}

function closeModal() {
  backdrop.classList.remove("open");
  form.reset();
}

function validate(data) {
  const errors = {};
  if (!data.date || data.date < todayIso()) {
    errors.date = "Please choose today or a future date.";
  }
  if (data.ownerName.length < 2) {
    errors.ownerName = "Please enter the owner's name.";
  }
  if (!emailPattern.test(data.ownerEmail)) {
    errors.ownerEmail = "Please enter a valid email address.";
  }
  if (data.ownerPhone.replace(/\D/g, "").length < 7) {
    errors.ownerPhone = "Please enter a contact number.";
  }
  if (!data.pets.length) {
    errors.petCount = "Add at least one pet.";
  }
  data.pets.forEach((pet, index) => {
    if (!pet.name) errors[`pet-${index}-name`] = "Enter this pet's name.";
    if (!pet.breed) errors[`pet-${index}-breed`] = "Enter this pet's breed.";
  });
  if (!data.duration || data.duration < 1) {
    errors.duration = "Enter a valid duration.";
  }
  if (data.service === "walking" && data.duration !== 30 && data.duration !== 60) {
    errors.duration = "Choose 30 or 60 minutes.";
  }
  if (data.pickup && !data.pickupPoint) {
    errors.pickupPoint = "Enter a pickup point.";
  }
  return errors;
}

document.querySelectorAll("[data-reserve]").forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.reserve));
});

document.getElementById("close-reserve").addEventListener("click", closeModal);
backdrop.addEventListener("click", (event) => {
  if (event.target === backdrop) closeModal();
});

petCountInput.addEventListener("input", renderPetFields);
pickupInput.addEventListener("change", () => {
  pickupWrap.hidden = !pickupInput.checked;
  updateTotal();
});
document.getElementById("duration-nights").addEventListener("input", updateTotal);
document.getElementById("duration-minutes").addEventListener("change", updateTotal);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearErrors();

  const data = {
    service: currentService(),
    date: dateInput.value,
    ownerName: document.getElementById("owner-name").value.trim(),
    ownerEmail: document.getElementById("owner-email").value.trim(),
    ownerPhone: document.getElementById("owner-phone").value.trim(),
    duration: durationValue(),
    pickup: pickupInput.checked,
    pickupPoint: document.getElementById("pickup-point").value.trim(),
    pets: collectPets()
  };

  const errors = validate(data);
  if (Object.keys(errors).length) {
    Object.entries(errors).forEach(([field, message]) => setError(field, message));
    return;
  }

  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;

  try {
    const response = await fetch("/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (payload.errors) {
        Object.entries(payload.errors).forEach(([field, message]) => setError(field, message));
      } else {
        setError("form", payload.error || "Could not save this reservation.");
      }
      button.disabled = false;
      return;
    }
    formWrap.hidden = true;
    confirmation.hidden = false;
    button.disabled = false;
  } catch {
    setError("form", "Could not save this reservation. Start the site with python3 server.py and try again.");
    button.disabled = false;
  }
});

renderPetFields();
