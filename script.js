(() => {
  const year = document.getElementById("y");
  if (year) year.textContent = new Date().getFullYear();

  const btn = document.querySelector(".hamburger");
  const mobile = document.querySelector(".mobile");
  if (btn && mobile) {
    btn.addEventListener("click", () => {
      const open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!open));
      mobile.hidden = open;
    });

    mobile.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => {
        btn.setAttribute("aria-expanded", "false");
        mobile.hidden = true;
      });
    });
  }

  // Lightbox
  const dialog = document.querySelector("dialog.lightbox");
  const img = document.querySelector(".lbImg");
  const closeBtn = document.querySelector(".lbClose");
  const items = document.querySelectorAll(".gItem");

  if (dialog && img) {
    items.forEach(el => {
      el.addEventListener("click", () => {
        const src = el.getAttribute("data-full");
        if (!src) return;
        img.src = src;
        dialog.showModal();
      });
    });

    const close = () => {
      dialog.close();
      img.removeAttribute("src");
    };

    closeBtn?.addEventListener("click", close);
    dialog.addEventListener("click", (e) => {
      const rect = dialog.getBoundingClientRect();
      const inDialog =
        rect.top <= e.clientY && e.clientY <= rect.bottom &&
        rect.left <= e.clientX && e.clientX <= rect.right;
      if (!inDialog) close();
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && dialog.open) close();
    });
  }
})();
