(async function () {
  const input = document.getElementById("searchInput");
  const resultsEl = document.getElementById("searchResults");
  if (!input || !resultsEl) return;

  const response = await fetch("./docs/search-index.json").catch(() => null);
  if (!response || !response.ok) {
    resultsEl.textContent = "Search index unavailable.";
    return;
  }

  const index = await response.json();

  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    if (!query) {
      resultsEl.innerHTML = "";
      return;
    }

    const matches = index.filter((entry) =>
      [entry.title, entry.summary, entry.tags.join(" ")].some((field) =>
        field.toLowerCase().includes(query)
      )
    );

    resultsEl.innerHTML = matches
      .map(
        (entry) =>
          `<a class="search-card" href="${entry.url}">
            <strong>${entry.title}</strong>
            <span>${entry.summary}</span>
            <em>${entry.tags.join(" · ")}</em>
          </a>`
      )
      .join("");
  });
})();
