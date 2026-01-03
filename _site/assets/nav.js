(() => {
  const linkTargets = [
    { label: '예약하기', path: 'booking.html' },
    { label: '회원권', path: 'membership.html' },
    { label: '상품권', path: 'giftcard.html' },
    { label: 'AI 디자인', path: 'ai.html' }
  ];

  const computeBasePrefix = () => {
    const segments = window.location.pathname.split('/').filter(Boolean);
    const repoIndex = segments.lastIndexOf('NADI');
    const depth = repoIndex === -1
      ? Math.max(segments.length - 1, 0)
      : Math.max(segments.length - repoIndex - 2, 0);
    return depth > 0 ? '../'.repeat(depth) : './';
  };

  const buildLinks = (prefix) =>
    linkTargets.map(({ label, path }) => ({ label, href: `${prefix}${path}` }));

  const ensureStyles = () => {
    if (document.getElementById('global-nav-styles')) return;

    const style = document.createElement('style');
    style.id = 'global-nav-styles';
    style.textContent = `
      #global-nav { width: 100%; }
      .cta-nav { background: #f7e7e3; border-bottom: 1px solid #eadedb; }
      .cta-nav .cta-inner { max-width: 1200px; margin: 0 auto; padding: 10px 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; box-sizing: border-box; }
      .cta-nav .cta-label { font-weight: 700; color: #5c4330; letter-spacing: -0.01em; }
      .cta-nav .cta-links { display: flex; flex-wrap: wrap; gap: 8px; }
      .cta-nav .cta-button { background: #fff; border: 1px solid #d7c6c1; color: #5c4330; padding: 8px 12px; border-radius: 6px; font-weight: 600; text-decoration: none; transition: all 0.15s ease; display: inline-flex; align-items: center; justify-content: center; white-space: nowrap; }
      .cta-nav .cta-button:hover, .cta-nav .cta-button:focus-visible { background: #5c4330; color: #fff; border-color: #5c4330; outline: none; }
      .cta-nav .cta-button:active { transform: translateY(1px); }
      .cta-nav .cta-button:focus-visible { box-shadow: 0 0 0 2px #fff, 0 0 0 4px #5c4330; }
      .global-shortcuts { background: #faf7f5; border-top: 1px solid #eadedb; margin-top: 32px; }
      .global-shortcuts .shortcuts-inner { max-width: 1200px; margin: 0 auto; padding: 20px 16px; display: flex; flex-direction: column; gap: 12px; box-sizing: border-box; }
      .global-shortcuts .shortcuts-title { font-weight: 700; color: #5c4330; letter-spacing: -0.01em; }
      .global-shortcuts .shortcuts-links { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
      .global-shortcuts .shortcut { background: #fff; border: 1px solid #d7c6c1; border-radius: 6px; padding: 10px 12px; text-align: center; text-decoration: none; color: #5c4330; font-weight: 600; transition: all 0.15s ease; }
      .global-shortcuts .shortcut:hover, .global-shortcuts .shortcut:focus-visible { background: #5c4330; color: #fff; border-color: #5c4330; outline: none; }
      .global-shortcuts .shortcut:active { transform: translateY(1px); }
      .global-shortcuts .shortcut:focus-visible { box-shadow: 0 0 0 2px #fff, 0 0 0 4px #5c4330; }
      @media (max-width: 640px) {
        .cta-nav .cta-inner { justify-content: center; text-align: center; }
        .cta-nav .cta-label { width: 100%; }
      }
    `;

    document.head.appendChild(style);
  };

  const renderTopNav = (links) => {
    const container = document.getElementById('global-nav');
    if (!container) return;

    const nav = document.createElement('nav');
    nav.className = 'cta-nav';
    nav.setAttribute('aria-label', '주요 페이지 바로가기');

    const inner = document.createElement('div');
    inner.className = 'cta-inner';

    const label = document.createElement('div');
    label.className = 'cta-label';
    label.textContent = '바로가기';

    const linkWrap = document.createElement('div');
    linkWrap.className = 'cta-links';

    links.forEach(({ label: text, href }) => {
      const a = document.createElement('a');
      a.className = 'cta-button';
      a.href = href;
      a.textContent = text;
      linkWrap.appendChild(a);
    });

    inner.appendChild(label);
    inner.appendChild(linkWrap);
    nav.appendChild(inner);
    container.innerHTML = '';
    container.appendChild(nav);
  };

  const renderFooter = (links) => {
    const container = document.getElementById('global-footer-links');
    if (!container) return;

    const section = document.createElement('section');
    section.className = 'global-shortcuts';
    section.setAttribute('aria-label', '하단 바로가기');

    const inner = document.createElement('div');
    inner.className = 'shortcuts-inner';

    const title = document.createElement('div');
    title.className = 'shortcuts-title';
    title.textContent = '바로가기';

    const list = document.createElement('div');
    list.className = 'shortcuts-links';

    links.forEach(({ label: text, href }) => {
      const link = document.createElement('a');
      link.className = 'shortcut';
      link.href = href;
      link.textContent = text;
      list.appendChild(link);
    });

    inner.appendChild(title);
    inner.appendChild(list);
    section.appendChild(inner);

    container.innerHTML = '';
    container.appendChild(section);
  };

  const init = () => {
    const prefix = computeBasePrefix();
    const links = buildLinks(prefix);
    ensureStyles();
    renderTopNav(links);
    renderFooter(links);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
