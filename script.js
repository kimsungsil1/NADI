// Mobile menu toggle
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-menu]");
  if (!btn) return;

  const menu = document.querySelector("[data-mobile]");
  if (!menu) return;

  const opened = !menu.hasAttribute("hidden");
  if (opened) {
    menu.setAttribute("hidden", "");
    btn.setAttribute("aria-expanded", "false");
  } else {
    menu.removeAttribute("hidden");
    btn.setAttribute("aria-expanded", "true");
  }
});

// Close mobile menu when clicking a link
document.addEventListener("click", (e) => {
  const link = e.target.closest(".mobile-menu a");
  if (!link) return;

  const menu = document.querySelector("[data-mobile]");
  const btn = document.querySelector("[data-menu]");
  if (menu && btn) {
    menu.setAttribute("hidden", "");
    btn.setAttribute("aria-expanded", "false");
  }
});

// Lightbox
const lb = document.querySelector("[data-lightbox]");
const lbImg = document.querySelector("[data-lightbox-img]");
const lbCap = document.querySelector("[data-lightbox-cap]");

function openLightbox(src, cap) {
  if (!lb || !lbImg) return;
  lbImg.src = src;
  lbImg.alt = cap || "Image";
  if (lbCap) lbCap.textContent = cap || "";
  lb.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  if (!lb) return;
  lb.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.addEventListener("click", (e) => {
  const item = e.target.closest("[data-gallery-item]");
  if (item) {
    const img = item.querySelector("img");
    if (!img) return;
    openLightbox(img.src, item.getAttribute("data-cap"));
    return;
  }

  if (e.target.closest("[data-lightbox-close]")) {
    closeLightbox();
    return;
  }

  // click outside figure closes
  if (lb && lb.getAttribute("aria-hidden") === "false") {
    const fig = e.target.closest(".lightbox figure");
    const isInLb = e.target.closest(".lightbox");
    if (isInLb && !fig) closeLightbox();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeLightbox();
});
