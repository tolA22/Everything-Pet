function formatDate(iso) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

const grid = document.getElementById("blog-grid");
const posts = [...BLOG_POSTS].sort((a, b) => new Date(b.date) - new Date(a.date));

grid.innerHTML = posts.map((post) => `
  <a class="blog-card" href="post.html?id=${encodeURIComponent(post.id)}">
    <div class="blog-card-media">
      <img src="${post.image}" alt="${post.imageAlt}">
    </div>
    <div class="blog-card-body">
      <div class="pet-meta">
        <span class="tag">${post.category}</span>
        <span class="tag">${formatDate(post.date)}</span>
      </div>
      <h2>${post.title}</h2>
      <p class="muted">${post.excerpt}</p>
      <span class="blog-card-link">Read post →</span>
    </div>
  </a>
`).join("");
