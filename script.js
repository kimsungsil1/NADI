(() => {
  // Mobile menu
  const menuBtn = document.querySelector('[data-menu]');
  const mobile = document.querySelector('[data-mobile]');
  if (menuBtn && mobile) {
    menuBtn.addEventListener('click', () => {
      const open = mobile.getAttribute('data-open') === '1';
      mobile.setAttribute('data-open', open ? '0' : '1');
      mobile.style.display = open ? 'none' : 'block';
      menuBtn.setAttribute('aria-expanded', open ? 'false' : 'true');
    });
  }

  // Lightbox (gallery)
  const lb = document.querySelector('[data-lightbox]');
  const lbImg = document.querySelector('[data-lightbox-img]');
  const lbCap = document.querySelector('[data-lightbox-cap]');
  const lbClose = document.querySelector('[data-lightbox-close]');

  const openLb = (src, cap) => {
    if (!lb || !lbImg) return;
    lbImg.src = src;
    lbImg.alt = cap || 'NADI Beauty photo';
    if (lbCap) lbCap.textContent = cap || '';
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeLb = () => {
    if (!lb) return;
    lb.classList.remove('open');
    document.body.style.overflow = '';
    if (lbImg) lbImg.src = '';
  };

  document.querySelectorAll('[data-gallery-item]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const img = btn.querySelector('img');
      const cap = btn.getAttribute('data-cap') || '';
      if (img) openLb(img.src, cap);
    });
  });

  if (lb) {
    lb.addEventListener('click', (e) => {
      if (e.target === lb) closeLb();
    });
  }
  if (lbClose) lbClose.addEventListener('click', closeLb);
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLb();
  });
})();
// Copy-to-clipboard
document.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-copy]");
  if (!btn) return;
  const targetSel = btn.getAttribute("data-copy");
  const target = document.querySelector(targetSel);
  if (!target) return;

  const text = target.innerText.trim();
  try {
    await navigator.clipboard.writeText(text);
    const old = btn.textContent;
    btn.textContent = "복사 완료";
    setTimeout(() => (btn.textContent = old), 1200);
  } catch (_) {
    alert("복사 실패. 텍스트를 직접 드래그해서 복사하세요.");
  }
});
