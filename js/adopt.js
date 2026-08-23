const pets = [
  {
    id: "luna",
    name: "Luna",
    type: "Dog",
    breed: "Golden Retriever",
    age: "3 years",
    bio: "Gentle, house-trained, and happiest on long afternoon walks.",
    image: "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "milo",
    name: "Milo",
    type: "Cat",
    breed: "Tabby",
    age: "2 years",
    bio: "A curious lap cat who purrs at breakfast and window-watches all day.",
    image: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "bella",
    name: "Bella",
    type: "Dog",
    breed: "Beagle mix",
    age: "4 years",
    bio: "Friendly with kids and other dogs. Loves sniff walks and belly rubs.",
    image: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "oliver",
    name: "Oliver",
    type: "Cat",
    breed: "Orange shorthair",
    age: "1 year",
    bio: "Playful and talkative. Looking for a home with plenty of toys.",
    image: "https://images.unsplash.com/photo-1574158622682-e40e69881006?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "max",
    name: "Max",
    type: "Dog",
    breed: "Labrador",
    age: "5 years",
    bio: "Calm companion who already knows sit, stay, and come.",
    image: "https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=900&q=80"
  },
  {
    id: "coco",
    name: "Coco",
    type: "Dog",
    breed: "French Bulldog",
    age: "2 years",
    bio: "Compact, affectionate, and excellent at napping on the sofa.",
    image: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=900&q=80"
  }
];

const grid = document.getElementById("pet-grid");
const backdrop = document.getElementById("apply-modal");
const form = document.getElementById("adopt-form");
const petField = document.getElementById("pet-name");
const toast = document.getElementById("toast");
const applied = new Set(JSON.parse(localStorage.getItem("everything-pet-apps") || "[]"));

function renderPets() {
  grid.innerHTML = pets.map((pet) => {
    const alreadyApplied = applied.has(pet.id);
    return `
      <article class="pet-card">
        <img src="${pet.image}" alt="${pet.name}, a ${pet.breed}">
        <div class="pet-body">
          <h3>${pet.name}</h3>
          <div class="pet-meta">
            <span class="tag">${pet.type}</span>
            <span class="tag">${pet.breed}</span>
            <span class="tag">${pet.age}</span>
          </div>
          <p class="muted">${pet.bio}</p>
          <button class="btn btn-primary" data-pet-id="${pet.id}" ${alreadyApplied ? "disabled" : ""}>
            ${alreadyApplied ? "Application submitted" : "Apply to adopt"}
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function openModal(pet) {
  petField.value = pet.name;
  form.dataset.petId = pet.id;
  backdrop.classList.add("open");
  document.getElementById("full-name").focus();
}

function closeModal() {
  backdrop.classList.remove("open");
  form.reset();
}

grid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pet-id]");
  if (!button || button.disabled) return;
  const pet = pets.find((item) => item.id === button.dataset.petId);
  if (pet) openModal(pet);
});

document.getElementById("close-modal").addEventListener("click", closeModal);
backdrop.addEventListener("click", (event) => {
  if (event.target === backdrop) closeModal();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  applied.add(form.dataset.petId);
  localStorage.setItem("everything-pet-apps", JSON.stringify([...applied]));
  closeModal();
  renderPets();
  toast.textContent = "Thanks! We received your adoption application.";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3200);
});

renderPets();
