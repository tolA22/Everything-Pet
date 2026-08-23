function formatDate(iso) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

const root = document.getElementById("post");
const id = new URLSearchParams(window.location.search).get("id");
const post = BLOG_POSTS.find((item) => item.id === id);

if (!post) {
  root.innerHTML = `
    <section class="page-hero">
      <a class="back-link" href="blog.html">← All posts</a>
      <h1>Post not found.</h1>
      <p class="lead">That article is not on the blog. Head back and pick another card.</p>
    </section>
  `;
} else {
  document.title = `Everything Pet · ${post.title}`;
  root.innerHTML = `
    <section class="page-hero">
      <a class="back-link" href="blog.html">← All posts</a>
      <div class="pet-meta">
        <span class="tag">${post.category}</span>
        <span class="tag">${formatDate(post.date)}</span>
      </div>
      <h1>${post.title}</h1>
    </section>
    <div class="article-hero">
      <img src="${post.image}" alt="${post.imageAlt}">
    </div>
    <div class="article-body">
      ${post.body.map((paragraph) => `<p>${paragraph}</p>`).join("")}
    </div>
  `;
}
