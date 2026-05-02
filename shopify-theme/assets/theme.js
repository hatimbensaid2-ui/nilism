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

// ---- Accordion ----
document.querySelectorAll('.accordion-trigger').forEach(function (trigger) {
  trigger.addEventListener('click', function () {
    var expanded = this.getAttribute('aria-expanded') === 'true';
    var bodyId   = this.getAttribute('aria-controls');
    var body     = document.getElementById(bodyId);
    this.setAttribute('aria-expanded', String(!expanded));
    if (body) body.classList.toggle('is-open', !expanded);
  });
});

// ---- Gallery thumbnails ----
document.querySelectorAll('.product-gallery__thumb').forEach(function (thumb) {
  thumb.addEventListener('click', function () {
    var mainImg = document.getElementById('gallery-main-img');
    if (mainImg) {
      mainImg.src    = this.dataset.src;
      mainImg.srcset = this.dataset.srcset || '';
      mainImg.alt    = this.dataset.alt    || '';
    }
    document.querySelectorAll('.product-gallery__thumb').forEach(function (t) {
      t.classList.remove('is-active');
    });
    this.classList.add('is-active');
  });
});

// ---- Qty controls ----
var qtyInput = document.getElementById('qty-input');
var qtyMinus = document.getElementById('qty-minus');
var qtyPlus  = document.getElementById('qty-plus');
if (qtyMinus) qtyMinus.addEventListener('click', function () {
  if (qtyInput && +qtyInput.value > 1) qtyInput.value = +qtyInput.value - 1;
});
if (qtyPlus) qtyPlus.addEventListener('click', function () {
  if (qtyInput) qtyInput.value = +qtyInput.value + 1;
});

// ---- Quick Add (collection + related) ----
document.querySelectorAll('.product-card__quick-add').forEach(function (btn) {
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    var id = this.dataset.productId;
    if (!id) return;
    var orig = this.textContent;
    this.textContent = 'Adding…';
    fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: id, quantity: 1 })
    }).then(function () {
      btn.textContent = 'Added ✓';
      setTimeout(function () { btn.textContent = orig; }, 2000);
      fetch('/cart.js').then(function (r) { return r.json(); }).then(function (cart) {
        var c = document.querySelector('.cart-count');
        if (c) { c.textContent = cart.item_count; c.style.display = 'flex'; }
      });
    }).catch(function () { btn.textContent = orig; });
  });
});

// ---- Filter button toggle ----
document.querySelectorAll('.filter-btn').forEach(function (btn) {
  btn.addEventListener('click', function () { this.classList.toggle('is-active'); });
});
