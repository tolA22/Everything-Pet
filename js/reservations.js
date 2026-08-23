const list = document.getElementById("reservation-list");
const labels = {
  boarding: "Shelter boarding",
  walking: "Pet walking"
};

function formatDate(iso) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function durationLabel(item) {
  if (item.durationUnit === "nights") {
    return `${item.duration} night${item.duration === 1 ? "" : "s"}`;
  }
  return `${item.duration} minutes`;
}

function render(items) {
  if (!items.length) {
    list.innerHTML = `
      <div class="empty-state">
        <h2>No reservations yet</h2>
        <p class="muted">When a pet owner reserves boarding or walking, it will show up here.</p>
        <p><a class="btn btn-primary" href="about.html">Reserve a service</a></p>
      </div>
    `;
    return;
  }

  list.innerHTML = items.map((item) => {
    const pets = item.pets.map((pet) => `${pet.name} (${pet.breed})`).join(", ");
    const pickup = item.pickup
      ? `Pickup: ${item.pickupPoint}`
      : "Drop-off / no pickup";
    return `
      <article class="reservation-card">
        <div class="pet-meta">
          <span class="tag">${labels[item.service] || item.service}</span>
          <span class="tag">${formatDate(item.date)}</span>
        </div>
        <h2>${item.ownerName}</h2>
        <p class="muted">${item.ownerEmail} · ${item.ownerPhone}</p>
        <p>${pets}</p>
        <p class="muted">${durationLabel(item)} · ${pickup}</p>
        <p class="price">$${Number(item.total).toFixed(0)}</p>
      </article>
    `;
  }).join("");
}

async function loadReservations() {
  try {
    const response = await fetch("/reservations");
    if (!response.ok) throw new Error("bad response");
    const items = await response.json();
    render(Array.isArray(items) ? items : []);
  } catch {
    list.innerHTML = `
      <div class="empty-state">
        <h2>Could not load reservations</h2>
        <p class="muted">Start the site with python3 server.py and refresh this page.</p>
      </div>
    `;
  }
}

loadReservations();
