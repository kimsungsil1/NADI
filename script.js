
const Nadi = {
  // Handles mobile menu toggling and keyboard interactions.
  initMobileMenu() {
    const menuBtn = document.querySelector("[data-menu]");
    const mobileNav = document.querySelector("[data-mobile]");

    if (!menuBtn || !mobileNav) return;

    const toggle = (isOpen) => {
      const shouldOpen = typeof isOpen === "boolean" ? isOpen : mobileNav.hasAttribute("hidden");
      mobileNav.toggleAttribute("hidden", !shouldOpen);
      menuBtn.setAttribute("aria-expanded", String(shouldOpen));
    };

    menuBtn.addEventListener("click", () => toggle());
    mobileNav.addEventListener("click", (e) => {
      if (e.target.closest("a")) toggle(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") toggle(false);
    });
  },

  // Initializes the image gallery lightbox.
  initLightbox() {
    const lightbox = document.querySelector("[data-lightbox]");
    const lightboxImg = document.querySelector("[data-lightbox-img]");
    const lightboxCap = document.querySelector("[data-lightbox-cap]");
    const closeBtn = document.querySelector("[data-lightbox-close]");

    if (!lightbox || !lightboxImg) return;

    const openLightbox = (img, cap) => {
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || cap;
      if (lightboxCap) lightboxCap.textContent = cap;
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
    };

    const closeLightbox = () => {
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
      lightboxImg.src = "";
    };

    document.querySelectorAll("[data-gallery-item]").forEach((item) => {
      const triggerLightbox = () => {
        const img = item.querySelector("img");
        const cap = item.getAttribute("data-cap") || "";
        openLightbox(img, cap);
      };

      item.addEventListener("click", triggerLightbox);
      item.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          triggerLightbox();
        }
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLightbox();
    });
  },

  // Handles map display issues in in-app browsers.
  initMap() {
    const ua = navigator.userAgent || "";
    const isAndroid = /Android/i.test(ua);
    const isInApp = /(KAKAOTALK|Instagram|FBAN|FBAV|NAVER|DaumApps|Whale|Line|MicroMessenger)/i.test(ua);

    const mapWrap = document.querySelector("[data-map]");
    if (mapWrap && isInApp) {
      mapWrap.classList.add("is-blocked");
    }

    const gmapsBtn = document.getElementById("gmapsBtn");
    if (gmapsBtn && isAndroid && isInApp) {
      const webUrl = gmapsBtn.href;
      gmapsBtn.href = `intent://${webUrl.replace(/^https?:\/\//, "")}#Intent;scheme=https;package=com.google.android.apps.maps;end`;
    }
  },

  // Sets up clipboard copy functionality.
  initClipboard() {
    const copyAddressBtn = document.querySelector("[data-copy-address]");
    if (copyAddressBtn) {
      const address = "서울특별시 동작구 동작대로29길 7 2층 나디뷰티";
      this.setupCopyButton(copyAddressBtn, address);
    }

    document.querySelectorAll("[data-copy]").forEach((btn) => {
      const selector = btn.getAttribute("data-copy");
      const target = selector ? document.querySelector(selector) : null;
      if (target) {
        this.setupCopyButton(btn, target.innerText.trim());
      }
    });
  },

  // Helper function to create copy-to-clipboard functionality.
  setupCopyButton(button, text) {
    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(text);
        const originalText = button.textContent;
        button.textContent = "복사됨";
        setTimeout(() => (button.textContent = originalText), 1200);
      } catch (err) {
        alert(`복사가 지원되지 않는 환경입니다. 다음 내용을 직접 복사해 주세요:\n\n${text}`);
      }
    });
  },

  // Initializes all scripts.
  init() {
    this.initMobileMenu();
    this.initLightbox();
    this.initMap();
    this.initClipboard();
  }
};

Nadi.init();
