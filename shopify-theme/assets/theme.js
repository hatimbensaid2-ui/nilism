/* AoSharma Theme - Main JS */

(function () {
  'use strict';

  // Mobile nav drawer
  const toggle = document.querySelector('.site-header__mobile-toggle');
  const drawer = document.querySelector('.nav-drawer');
  const overlay = document.querySelector('.nav-drawer__overlay');
  const closeBtn = document.querySelector('.nav-drawer__close button');

  function openDrawer() {
    drawer && drawer.classList.add('is-open');
    overlay && overlay.classList.add('is-visible');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer && drawer.classList.remove('is-open');
    overlay && overlay.classList.remove('is-visible');
    document.body.style.overflow = '';
  }

  toggle && toggle.addEventListener('click', openDrawer);
  closeBtn && closeBtn.addEventListener('click', closeDrawer);
  overlay && overlay.addEventListener('click', closeDrawer);

  // Newsletter form
  const newsletterForm = document.querySelector('.newsletter-section__form');
  if (newsletterForm) {
    newsletterForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const input = this.querySelector('.newsletter-section__input');
      const btn = this.querySelector('.newsletter-section__btn');
      if (input && input.value) {
        btn.textContent = 'Thank You!';
        btn.style.background = '#8B6840';
        input.value = '';
        setTimeout(() => {
          btn.textContent = 'Subscribe';
          btn.style.background = '';
        }, 3000);
      }
    });
  }

  // Smooth reveal on scroll
  const revealEls = document.querySelectorAll(
    '.intention-card, .trust-badge, .testimonial-section__content, .testimonial-section__image-wrap'
  );

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    revealEls.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
    });
  }

  // Cart count update (hook into Shopify cart API)
  function updateCartCount() {
    fetch('/cart.js')
      .then((r) => r.json())
      .then((cart) => {
        const countEl = document.querySelector('.cart-count');
        if (countEl) {
          countEl.textContent = cart.item_count;
          countEl.style.display = cart.item_count > 0 ? 'flex' : 'none';
        }
      })
      .catch(() => {});
  }

  updateCartCount();
})();
