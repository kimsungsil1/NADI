(function () {
  // Mobile menu
  const menuBtn = document.querySelector("[data-menu]");
  const mobile = document.querySelector("[data-mobile]");

  if (menuBtn && mobile) {
    const toggle = (open) => {
      const next = typeof open === "boolean" ? open : mobile.hasAttribute("hidden");
      if (next) {
        mobile.removeAttribute("hidden");
        menuBtn.setAttribute("aria-expanded", "true");
      } else {
        mobile.setAttribute("hidden", "");
        menuBtn.setAttribute("aria-expanded", "false");
      }
    };

    menuBtn.addEventListener("click", () => toggle());
    mobile.addEventListener("click", (e) => {
      const a = e.target.closest("a");
      if (a) toggle(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") toggle(false);
    });
  }

  // Lightbox
  const lb = document.querySelector("[data-lightbox]");
  const lbImg = document.querySelector("[data-lightbox-img]");
  const lbCap = document.querySelector("[data-lightbox-cap]");
  const lbClose = document.querySelector("[data-lightbox-close]");

  document.querySelectorAll("[data-gallery-item]").forEach((item) => {
    item.addEventListener("click", () => {
      const img = item.querySelector("img");
      const cap = item.getAttribute("data-cap") || "";
      if (!lb || !lbImg) return;

      lbImg.src = img.src;
      lbImg.alt = img.alt || cap;
      if (lbCap) lbCap.textContent = cap;

      lb.classList.add("open");
      lb.setAttribute("aria-hidden", "false");
    });
  });

  const closeLB = () => {
    if (!lb) return;
    lb.classList.remove("open");
    lb.setAttribute("aria-hidden", "true");
    if (lbImg) lbImg.src = "";
  };

  if (lbClose) lbClose.addEventListener("click", closeLB);
  if (lb) {
    lb.addEventListener("click", (e) => {
      if (e.target === lb) closeLB();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeLB();
  });

  // Map: in-app webview blocking 대응 (Instagram/Kakao/Naver 등)
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isInApp = /(KAKAOTALK|Instagram|FBAN|FBAV|NAVER|DaumApps|Whale|Line|MicroMessenger)/i.test(ua);

  const mapWrap = document.querySelector("[data-map]");
  if (mapWrap && isInApp) {
    // 인앱이면 아예 iframe 대신 fallback 보여주기 (깨지는 화면 방지)
    mapWrap.classList.add("is-blocked");
  }

  // Google Maps 버튼: Android 인앱이면 intent로 앱 열기
  const gmapsBtn = document.getElementById("gmapsBtn");
  if (gmapsBtn && isAndroid && isInApp) {
    const webUrl = gmapsBtn.href;
    gmapsBtn.href =
      "intent://" +
      webUrl.replace(/^https?:\/\//, "") +
      "#Intent;scheme=https;package=com.google.android.apps.maps;end";
  }

  // Copy address
  const copyBtn = document.querySelector("[data-copy-address]");
  if (copyBtn) {
    const address = "서울특별시 동작구 동작대로29길 7 2층 나디뷰티";
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(address);
        const prev = copyBtn.textContent;
        copyBtn.textContent = "복사됨";
        setTimeout(() => (copyBtn.textContent = prev), 1200);
      } catch (e) {
        alert("주소 복사가 막혀있습니다. 주소를 길게 눌러 복사해 주세요.\n\n" + address);
      }
    });
  }

  // Generic copy helper (문의 템플릿 등)
  document.querySelectorAll("[data-copy]").forEach((btn) => {
    const selector = btn.getAttribute("data-copy");
    const target = selector ? document.querySelector(selector) : null;
    if (!target) return;

    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(target.innerText.trim());
        const prev = btn.textContent;
        btn.textContent = "복사됨";
        setTimeout(() => (btn.textContent = prev), 1400);
      } catch (e) {
        alert("복사가 허용되지 않는 환경입니다. 내용을 길게 눌러 직접 복사해 주세요.\n\n" + target.innerText.trim());
      }
    });
  });
})();
