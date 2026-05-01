/* AoSharma Theme JS */
(function () {
  'use strict';

  /* ---- Mobile menu toggle ---- */
  const menuBtn = document.querySelector('.site-header__mobile-menu-btn');
  const nav     = document.querySelector('.site-header__nav');

  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      menuBtn.setAttribute('aria-expanded', open);
    });
  }

  /* ---- Sticky header shadow ---- */
  const header = document.querySelector('.site-header');
  if (header) {
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 10);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---- Testimonial slider (if multiple quotes) ---- */
  const quotes = document.querySelectorAll('.testimonial-quote');
  if (quotes.length > 1) {
    let current = 0;
    quotes.forEach((q, i) => { q.style.display = i === 0 ? 'block' : 'none'; });

    setInterval(() => {
      quotes[current].style.display = 'none';
      current = (current + 1) % quotes.length;
      quotes[current].style.display = 'block';
    }, 5000);
  }

  /* ---- Newsletter form feedback ---- */
  const newsletterForm = document.querySelector('.newsletter__form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', (e) => {
      const btn = newsletterForm.querySelector('.newsletter__btn');
      if (btn) {
        btn.textContent = 'Thank you!';
        btn.disabled = true;
      }
    });
  }
})();
