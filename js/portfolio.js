/**
 * portfolio.js
 * Renders the 2D overlay content for each interactive room object,
 * pulling from PORTFOLIO_DATA (portfolio-data.js).
 */

const Portfolio = (() => {
  const overlay = document.getElementById("overlay");
  const content = document.getElementById("overlay-content");
  const closeBtn = document.getElementById("overlay-close");
  const backdrop = document.getElementById("overlay-backdrop");
  let lastFocusedEl = null;

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str || "";
    return div.innerHTML;
  }

  function linkOrPlaceholder(url, label) {
    if (url) {
      return `<a class="pill-link" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    }
    return `<span class="pill-link disabled">${label} (coming soon)</span>`;
  }

  function sectionIcon(name) {
    const paths = {
      laptop: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M2 21h20l-2-4H4l-2 4Z"/>',
      book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h8"/>',
      gamepad: '<path d="M7 8h10a5 5 0 0 1 4.8 6.4l-.7 2.4a2 2 0 0 1-3.2 1L15 15H9l-2.9 2.8a2 2 0 0 1-3.2-1l-.7-2.4A5 5 0 0 1 7 8Z"/><path d="M8 10v4m-2-2h4m6-1h.01M18 13h.01"/>',
      sprout: '<path d="M12 21v-9"/><path d="M12 13C5 13 4 8 4 4c5 0 9 2 9 8m-1 3c0-5 3-8 8-8 0 5-2 9-8 9"/>',
      user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
      graduation: '<path d="m2 8 10-5 10 5-10 5-10-5Z"/><path d="M6 10v5c3.5 3 8.5 3 12 0v-5m4-2v7"/>',
      cat: '<path d="m4 10 1-6 5 3h4l5-3 1 6a8 8 0 1 1-16 0Z"/><path d="M9 11h.01M15 11h.01M9 15c1.7 1.3 4.3 1.3 6 0"/>',
      phone: '<path d="M5 3h3l2 5-2.5 2a16 16 0 0 0 6.5 6.5l2-2.5 5 2v3a2 2 0 0 1-2 2A18 18 0 0 1 3 5a2 2 0 0 1 2-2Z"/>',
      music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
      lamp: '<path d="M9 18h6m-5 3h4m-7-6a7 7 0 1 1 8 0c-.8.6-1 1.2-1 3h-4c0-1.8-.2-2.4-1-3Z"/>',
      box: '<path d="m3 7 9-4 9 4-9 4-9-4Zm0 0v10l9 4 9-4V7m-9 4v10"/>',
      activity: '<path d="M3 15c2.5 0 4-1 5-3l2-4c1-2 2.5-2 3.5 0l2 4c1 2 2.5 3 5.5 3"/>',
      trash: '<path d="M4 7h16m-10 4v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
      sofa: '<path d="M4 12V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M3 12a2 2 0 0 1 2 2v4h14v-4a2 2 0 0 1 2-2v8H3v-8Zm3 8v2m12-2v2"/>',
      disc: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/>',
      pencil: '<path d="m4 16-.8 4.8L8 20l11-11-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/>',
      coffee: '<path d="M5 8h12v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8Zm12 2h2a2 2 0 0 1 0 4h-2M8 3v2m4-2v2m4-2v2"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      hanger: '<path d="M12 5a2 2 0 1 0-2-2m2 2v3L3 15a2 2 0 0 0 1 4h16a2 2 0 0 0 1-4L12 8"/>',
      bed: '<path d="M3 18V6m0 9h18v6m0-6V9a2 2 0 0 0-2-2h-5v8m-11-4h5a3 3 0 0 1 3 3"/>',
      window: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M12 3v18M3 12h18"/>',
      sparkles: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 11 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14ZM5 15l.8 2.2L8 18l-2.2.8L5 21l-.8-2.2L2 18l2.2-.8L5 15Z"/>',
      image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9" r="1.5"/><path d="m21 15-5-5L5 20"/>',
      bone: '<path d="M7 9a3 3 0 1 1 2-5l6 6a3 3 0 1 1 5 2 3 3 0 1 1-2 5l-6-6a3 3 0 1 1-5-2Z"/>',
    };
    return `<svg class="section-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name]}</svg>`;
  }

  const clutterIcons = {
    guitar: "music", floorlamp: "lamp", basket: "box", boxes: "box",
    bookstack1: "book", bookstack2: "book", shoes: "activity", backpack: "box",
    skateboard: "activity", bin: "trash", pouf: "sofa", cushions: "sofa",
    recordplayer: "music", records: "disc", pencilcup: "pencil", deskbooks: "book",
    deskplant: "sprout", candle: "lamp", headphones: "music", notebook: "book",
    speaker: "music", coffee: "coffee", keyboard: "laptop", clock: "clock",
    hooks: "hanger", nightstand: "bed", bed: "bed", window: "window",
    hangplant: "sprout", stringlights: "sparkles", gallery: "image",
    wallshelf: "box", dogbowls: "bone",
  };

  const renderers = {
    laptop: () => {
      const cards = PORTFOLIO_DATA.projects.map((p) => `
        <div class="info-card">
          <span class="status-badge">${escapeHtml(p.status)}</span>
          <h3>${escapeHtml(p.name)}</h3>
          <p>${escapeHtml(p.description)}</p>
          <div class="tag-row">${p.technologies.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join("")}</div>
          <div class="link-row">
            ${linkOrPlaceholder(p.github, "GitHub")}
            ${linkOrPlaceholder(p.demo, "Live Demo")}
          </div>
        </div>
      `).join("");
      return `
        <h2>${sectionIcon("laptop")} Projects</h2>
        <p class="subtitle">A few things I've been building.</p>
        <div class="card-grid">${cards}</div>
      `;
    },

    bookshelf: () => {
      const groups = Object.entries(PORTFOLIO_DATA.skills).map(([category, items]) => `
        <div class="info-card">
          <h3>${escapeHtml(category)}</h3>
          <div class="tag-row">${items.map((s) => `<span class="tag">${escapeHtml(s)}</span>`).join("")}</div>
        </div>
      `).join("");
      return `
        <h2>${sectionIcon("book")} Skills</h2>
        <p class="subtitle">The tools and languages on my shelf.</p>
        <div class="card-grid">${groups}</div>
      `;
    },

    console: () => {
      const cards = PORTFOLIO_DATA.hobbies.map((h) => {
        const iconMap = {
          Gaming: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path d="M7 8h10a5 5 0 0 1 4.8 6.4l-.7 2.4a2 2 0 0 1-3.2 1L15 15H9l-2.9 2.8a2 2 0 0 1-3.2-1l-.7-2.4A5 5 0 0 1 7 8Z"/><path d="M8 10v4m-2-2h4m6-1h.01M18 13h.01"/></svg>`,
          Drawing: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path d="m4 16-.8 4.8L8 20l11-11-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/></svg>`,
          Singing: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 1rem; height: 1rem;"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/></svg>`,
          Dancing: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 1rem; height: 1rem;"><circle cx="14" cy="4" r="2"/><path d="m12 8-4 3 3 3-2 6m3-9 4 2 3-2m-8 4 5 4 2 4"/></svg>`,
          "Watching movies": `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 1rem; height: 1rem;"><rect x="2" y="6" width="20" height="14" rx="2" ry="2"/><line x1="6" y1="12" x2="6" y2="16"/><line x1="14" y1="12" x2="14" y2="16"/><line x1="10" y1="8" x2="10" y2="12"/><line x1="18" y1="8" x2="18" y2="12"/></svg>`,
        };
        const iconSVG = iconMap[h.label] || `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 1rem; height: 1rem;"><circle cx="12" cy="12" r="6"/></svg>`;
        return `
          <div class="info-card">
            <h3>${iconSVG} ${escapeHtml(h.label)}</h3>
          </div>
        `;
      }).join("");
      return `
        <h2>${sectionIcon("gamepad")} Hobbies</h2>
        <p class="subtitle">What I get up to outside of code.</p>
        <div class="card-grid">${cards}</div>
      `;
    },

    frame: () => {
      const a = PORTFOLIO_DATA.about;
      return `
        <h2>${sectionIcon("user")} About Me</h2>
        <img class="about-photo" src="images/about-photo-placeholder.svg" alt="Placeholder portrait">
        <p class="subtitle">${escapeHtml(a.role)}</p>
        <p>${escapeHtml(a.intro)}</p>
        <h3 style="margin-top:18px;">Things I enjoy building</h3>
        <ul>${a.enjoys.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ul>
        <h3>Developer goals</h3>
        <ul>${a.goals.map((g) => `<li>${escapeHtml(g)}</li>`).join("")}</ul>
      `;
    },

    notes: () => {
      const items = PORTFOLIO_DATA.education.map((e) => `
        <div class="timeline-item">
          <h3>${escapeHtml(e.title)}</h3>
          <div class="period">${escapeHtml(e.period)}</div>
          <p>${escapeHtml(e.description)}</p>
        </div>
      `).join("");
      return `
        <h2>${sectionIcon("graduation")} Education</h2>
        <p class="subtitle">Where I've studied and grown.</p>
        <div class="timeline">${items}</div>
      `;
    },

    cat: () => {
      const facts = PORTFOLIO_DATA.funFacts.map((f) => `
        <div class="fact-item">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 1rem; height: 1rem; vertical-align: middle; margin-right: 4px;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.07-7.07L17 8l-5 5z"/>
          </svg>
          ${escapeHtml(f)}
        </div>
      `).join("");
      return `
        <h2>${sectionIcon("cat")} Fun Facts</h2>
        <p class="subtitle">A few things about me, from the office cat.</p>
        <div class="fact-list">${facts}</div>
      `;
    }, 
    dog: () => renderers.cat(),

    plants: () => {
      const iconMap = {
        React: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 1rem; height: 1rem;"><ellipse cx="12" cy="12" rx="9" ry="3"/><ellipse cx="12" cy="12" rx="9" ry="3" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3" transform="rotate(120 12 12)"/><circle cx="12" cy="12" r="1"/></svg>`,
        "UI/UX Design": `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 1rem; height: 1rem;"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 22h8m-4-4v4M7 8h4m-4 4h10"/></svg>`,
        "Data Analysis": `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 1rem; height: 1rem;"><path d="M4 20V4m0 16h17"/><rect x="7" y="12" width="3" height="5"/><rect x="13" y="8" width="3" height="9"/><rect x="19" y="5" width="3" height="12"/></svg>`,
        "Machine Learning": `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 1rem; height: 1rem;"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="m8 7 3 9m5-9-3 9m-5-9h8"/></svg>`,
      };
      const items = PORTFOLIO_DATA.currentlyLearning.map((l) => {
        const iconSVG = iconMap[l.label] || `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width: 1rem; height: 1rem;"><circle cx="6" cy="6" r="5"/></svg>`;
        return `
          <div class="growth-row">
            <span class="growth-icon">${iconSVG}</span>
            <div>
              <div class="growth-label">${escapeHtml(l.label)}</div>
              <div class="growth-desc">${escapeHtml(l.stage)}</div>
            </div>
          </div>
        `;
      }).join("");
      return `
        <h2>${sectionIcon("sprout")} Currently Learning</h2>
        <p class="subtitle">My little developer garden - always growing.</p>
        ${items}
      `;
    },

    phone: () => {
      const c = PORTFOLIO_DATA.contact;
      const others = (c.other || []).map((o) => linkOrPlaceholder(o.url, o.label)).join("");
      return `
        <h2>${sectionIcon("phone")} Contact</h2>
        <p class="subtitle">I'd love to hear from you.</p>
        <div class="link-row">
          ${linkOrPlaceholder(c.email ? `mailto:${c.email}` : "", "Email")}
          ${linkOrPlaceholder(c.github, "GitHub")}
          ${linkOrPlaceholder(c.linkedin, "LinkedIn")}
          ${others}
        </div>
      `;
    },
  };

  function renderClutter(type) {
  const c = PORTFOLIO_DATA.clutter && PORTFOLIO_DATA.clutter[type];
  if (!c) return null;
  return `
    <h2>${sectionIcon(clutterIcons[type] || "sparkles")} ${escapeHtml(c.title)}</h2>
    <p class="subtitle">${escapeHtml(c.subtitle)}</p>
    <p>${escapeHtml(c.text)}</p>
  `;
}

  function open(type) {
  const renderer = renderers[type] || (() => renderClutter(type));
  const html = renderer();
  if (!html) return;
  lastFocusedEl = document.activeElement;
  content.innerHTML = html;
  overlay.classList.add("open");
  overlay.setAttribute("aria-hidden", "false");
  document.addEventListener("keydown", onKeydown);
  closeBtn.focus();
}

function close() {
  overlay.classList.remove("open");
  overlay.setAttribute("aria-hidden", "true");
  document.removeEventListener("keydown", onKeydown);
  if (lastFocusedEl) lastFocusedEl.focus();
}

function onKeydown(e) {
  if (e.key === "Escape") close();
}

closeBtn.addEventListener("click", close);
backdrop.addEventListener("click", close);

return { open, close };
})();
