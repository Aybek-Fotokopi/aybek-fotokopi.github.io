/* Aybek Kırtasiye - sayfaları data/content.json dosyasından oluşturur */
(function () {
  'use strict';
  var A = window.Aybek;
  var esc = A.esc, icon = A.icon;
  var page = document.body.getAttribute('data-page') || 'home';
  var app = document.getElementById('app');

  var NAV = [
    ['home', 'Ana Sayfa', 'index.html'],
    ['about', 'Hakkımızda', 'hakkimizda.html'],
    ['services', 'Hizmetler', 'hizmetler.html'],
    ['gallery', 'Galeri', 'galeri.html'],
    ['contact', 'İletişim', 'iletisim.html']
  ];

  // İçeriği yükle (her dakika yeni sürüm alınır; admin değişiklikleri hızlı görünsün)
  var stamp = Math.floor(Date.now() / 60000);
  fetch('data/content.json?v=' + stamp, { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (c) { render(c); init(); })
    .catch(function (err) {
      app.innerHTML = '<div class="load-error"><p>Sayfa yüklenemedi. Lütfen sayfayı yenileyin.</p></div>';
      if (window.console) console.error(err);
    });

  function arr(v) { return Array.isArray(v) ? v : []; }

  function render(c) {
    var site = c.site || {};
    var html = header(site) + '<main>' + pageBody(c) + '</main>' + footer(site);
    app.innerHTML = html;
    app.removeAttribute('aria-busy');

    var title = page === 'home' ? (site.name + ' | ' + site.tagline) : (pageTitle(c) + ' | ' + site.name);
    document.title = title;
  }

  function pageTitle(c) {
    switch (page) {
      case 'about': return (c.about || {}).title || 'Hakkımızda';
      case 'services': return (c.services || {}).title || 'Hizmetlerimiz';
      case 'gallery': return (c.gallery || {}).title || 'Galeri';
      case 'contact': return (c.contact || {}).title || 'İletişim';
      default: return 'Ana Sayfa';
    }
  }

  function callButtons(site, btnClass, label, waMsg) {
    var h = '';
    if (site.phone) h += '<a class="btn ' + btnClass + ' btn-lg" href="tel:' + esc(A.telLink(site.phone)) + '">' + icon('phone') + ' ' + esc(label || site.phone) + '</a>';
    var wa = A.whatsappLink(site.whatsapp, waMsg || 'Merhaba, bilgi almak istiyorum.');
    if (wa) h += '<a class="btn btn-wa btn-lg" href="' + esc(wa) + '" target="_blank" rel="noopener">' + icon('whatsapp') + ' WhatsApp</a>';
    return h;
  }

  /* ---------------- Başlık ---------------- */
  function header(site) {
    var h = '<div class="topbar"><div class="container topbar-inner">' +
      '<span class="topbar-item">' + icon('pin') + esc(site.address) + '</span><span class="topbar-right">';
    if (site.phone) h += '<a class="topbar-item" href="tel:' + esc(A.telLink(site.phone)) + '">' + icon('phone') + esc(site.phone) + '</a>';
    if (site.email1) h += '<a class="topbar-item hide-sm" href="mailto:' + esc(site.email1) + '">' + icon('mail') + esc(site.email1) + '</a>';
    h += '</span></div></div>';

    h += '<header class="header" id="top"><div class="container header-inner">' +
      '<a class="brand" href="index.html" aria-label="' + esc(site.name) + ' ana sayfa"><img src="assets/img/logo.jpeg" alt="' + esc(site.name) + ' logo" width="1581" height="607"></a>' +
      '<button class="nav-toggle" type="button" aria-label="Menüyü aç" aria-expanded="false" aria-controls="main-nav">' + icon('menu', 'icon icon-open') + icon('close', 'icon icon-close') + '</button>' +
      '<nav class="nav" id="main-nav">';
    NAV.forEach(function (n) {
      h += '<a href="' + n[2] + '"' + (n[0] === page ? ' class="active" aria-current="page"' : '') + '>' + n[1] + '</a>';
    });
    if (site.phone) h += '<a class="btn btn-primary nav-cta" href="tel:' + esc(A.telLink(site.phone)) + '">' + icon('phone') + ' Hemen Ara</a>';
    h += '</nav></div></header>';
    return h;
  }

  function pageHead(title, intro) {
    return '<section class="page-head"><div class="container">' +
      '<p class="crumbs"><a href="index.html">Ana Sayfa</a> <span>/</span> ' + esc(title) + '</p>' +
      '<h1>' + esc(title) + '</h1>' + (intro ? '<p class="lead">' + esc(intro) + '</p>' : '') +
      '</div></section>';
  }

  /* ---------------- Sayfa içerikleri ---------------- */
  function pageBody(c) {
    switch (page) {
      case 'about': return aboutPage(c);
      case 'services': return servicesPage(c);
      case 'gallery': return galleryPage(c);
      case 'contact': return contactPage(c);
      default: return homePage(c);
    }
  }

  function highlightsGrid(list, card) {
    return arr(list).map(function (hl) {
      return '<div class="highlight' + (card ? ' card' : '') + '"><span class="hl-icon">' + icon(hl.icon) + '</span><div>' +
        '<h3>' + esc(hl.title) + '</h3><p>' + esc(hl.text) + '</p></div></div>';
    }).join('');
  }

  function serviceCards(list) {
    return arr(list).map(function (sv) {
      return '<article class="service-card"><span class="sv-icon">' + icon(sv.icon) + '</span>' +
        '<h3>' + esc(sv.title) + '</h3><p>' + esc(sv.text) + '</p></article>';
    }).join('');
  }

  function galleryItems(list, withCaption) {
    return arr(list).map(function (g) {
      var img = A.safeImage(g.image);
      if (!img) return '';
      var a = '<a class="gallery-item" href="' + esc(img) + '" data-caption="' + esc(g.caption) + '">' +
        '<img src="' + esc(img) + '" alt="' + esc(g.caption) + '" loading="lazy"></a>';
      if (!withCaption) return a;
      return '<figure class="gallery-fig">' + a + (g.caption ? '<figcaption>' + esc(g.caption) + '</figcaption>' : '') + '</figure>';
    }).join('');
  }

  function homePage(c) {
    var h = c.home || {}, site = c.site || {}, about = c.about || {}, sv = c.services || {}, gal = c.gallery || {};
    var out = '';
    var slides = arr(h.slides).filter(function (s) { return (s.title || '') + (s.image || '') !== ''; });

    if (slides.length) {
      out += '<section class="hero" aria-roledescription="carousel" aria-label="Öne çıkanlar"><div class="hero-track">';
      slides.forEach(function (s, i) {
        var img = A.safeImage(s.image);
        var tag = i === 0 ? 'h1' : 'h2';
        out += '<div class="slide' + (i === 0 ? ' is-active' : '') + (img ? ' has-image' : ' slide-v' + (i % 3)) + '" aria-hidden="' + (i === 0 ? 'false' : 'true') + '">';
        out += img ? '<img class="slide-bg" src="' + esc(img) + '" alt=""' + (i === 0 ? ' fetchpriority="high"' : ' loading="lazy"') + '>'
                   : '<div class="slide-art" aria-hidden="true"><span></span><span></span><span></span></div>';
        out += '<div class="container slide-content">';
        if (s.title) out += '<' + tag + ' class="slide-title">' + esc(s.title) + '</' + tag + '>';
        if (s.text) out += '<p class="slide-text">' + esc(s.text) + '</p>';
        out += '<div class="slide-actions">';
        var link = A.safeLink(s.button_link);
        if (s.button_text && link) out += '<a class="btn btn-primary btn-lg" href="' + esc(link) + '">' + esc(s.button_text) + ' ' + icon('arrow') + '</a>';
        if (site.phone) out += '<a class="btn btn-ghost btn-lg" href="tel:' + esc(A.telLink(site.phone)) + '">' + icon('phone') + ' ' + esc(site.phone) + '</a>';
        out += '</div></div></div>';
      });
      out += '</div>';
      if (slides.length > 1) {
        out += '<button class="hero-arrow prev" type="button" aria-label="Önceki">' + icon('left') + '</button>' +
          '<button class="hero-arrow next" type="button" aria-label="Sonraki">' + icon('right') + '</button><div class="hero-dots">';
        slides.forEach(function (s, i) {
          out += '<button type="button" class="' + (i === 0 ? 'is-active' : '') + '" aria-label="' + (i + 1) + '. görsel"></button>';
        });
        out += '</div>';
      }
      out += '</section>';
    }

    if (arr(h.highlights).length) {
      out += '<section class="highlights"><div class="container highlight-grid">' + highlightsGrid(h.highlights) + '</div></section>';
    }

    var aboutImg = A.safeImage(about.image);
    out += '<section class="section"><div class="container split"><div class="split-text">' +
      '<span class="eyebrow">Hoş geldiniz</span><h2>' + esc(h.intro_title) + '</h2>' +
      '<div class="prose">' + A.paragraphs(h.intro_text) + '</div>' +
      '<a class="btn btn-outline" href="hakkimizda.html">Hakkımızda ' + icon('arrow') + '</a></div>' +
      (aboutImg ? '<div class="split-media"><img src="' + esc(aboutImg) + '" alt="' + esc(site.name) + '" loading="lazy"></div>' : '') +
      '</div></section>';

    var items = arr(sv.items);
    if (items.length) {
      out += '<section class="section section-alt"><div class="container"><div class="section-head">' +
        '<span class="eyebrow">Neler yapıyoruz?</span><h2>' + esc(sv.title) + '</h2><p>' + esc(sv.intro) + '</p></div>' +
        '<div class="service-grid">' + serviceCards(items.slice(0, 6)) + '</div>' +
        (items.length > 6 ? '<div class="center"><a class="btn btn-primary" href="hizmetler.html">Tüm Hizmetler ' + icon('arrow') + '</a></div>' : '') +
        '</div></section>';
    }

    if (arr(gal.items).length) {
      out += '<section class="section"><div class="container"><div class="section-head">' +
        '<span class="eyebrow">Galeri</span><h2>' + esc(gal.title) + '</h2></div>' +
        '<div class="gallery-grid">' + galleryItems(arr(gal.items).slice(0, 8), false) + '</div>' +
        '<div class="center"><a class="btn btn-outline" href="galeri.html">Galeriye Git ' + icon('arrow') + '</a></div></div></section>';
    }

    out += '<section class="cta"><div class="container cta-inner"><div><h2>' + esc(h.cta_title) + '</h2><p>' + esc(h.cta_text) + '</p></div>' +
      '<div class="cta-actions">' + callButtons(site, 'btn-white', 'Ara') + '</div></div></section>';
    return out;
  }

  function aboutPage(c) {
    var a = c.about || {}, site = c.site || {};
    var img = A.safeImage(a.image);
    var out = pageHead(a.title || 'Hakkımızda', a.intro);
    out += '<section class="section"><div class="container split"><div class="split-text prose prose-lg">' +
      A.paragraphs(a.text) + '<p class="company-name">' + esc(site.company) + '</p></div>' +
      (img ? '<div class="split-media"><img src="' + esc(img) + '" alt="' + esc(site.name) + '" loading="lazy"></div>' : '') +
      '</div></section>';
    var hl = (c.home || {}).highlights;
    if (arr(hl).length) {
      out += '<section class="section section-alt"><div class="container"><div class="highlight-grid">' + highlightsGrid(hl, true) + '</div></div></section>';
    }
    return out;
  }

  function servicesPage(c) {
    var s = c.services || {}, site = c.site || {};
    return pageHead(s.title || 'Hizmetlerimiz', s.intro) +
      '<section class="section"><div class="container"><div class="service-grid">' + serviceCards(s.items) + '</div></div></section>' +
      '<section class="cta"><div class="container cta-inner"><div><h2>Fiyat ve bilgi için arayın</h2>' +
      '<p>İhtiyacınızı anlatın, size en uygun çözümü birlikte bulalım.</p></div>' +
      '<div class="cta-actions">' + callButtons(site, 'btn-white', null, 'Merhaba, hizmetleriniz hakkında bilgi almak istiyorum.') + '</div></div></section>';
  }

  function galleryPage(c) {
    var g = c.gallery || {};
    var items = arr(g.items);
    return pageHead(g.title || 'Galeri', g.intro) + '<section class="section"><div class="container">' +
      (items.length ? '<div class="gallery-grid gallery-full">' + galleryItems(items, true) + '</div>'
                    : '<p class="empty">Henüz görsel eklenmedi.</p>') +
      '</div></section>';
  }

  function contactPage(c) {
    var ct = c.contact || {}, site = c.site || {};
    var q = site.map_query || site.address || '';
    var wa = A.whatsappLink(site.whatsapp, 'Merhaba, bilgi almak istiyorum.');
    var out = pageHead(ct.title || 'İletişim', ct.intro);
    out += '<section class="section"><div class="container contact-grid"><div class="contact-cards">';
    out += '<div class="contact-card"><span class="cc-icon">' + icon('pin') + '</span><div><h3>Adres</h3><p>' + esc(site.address) + '</p>' +
      '<a class="text-link" href="https://www.google.com/maps/search/?api=1&amp;query=' + esc(encodeURIComponent(q)) + '" target="_blank" rel="noopener">Yol tarifi al ' + icon('arrow') + '</a></div></div>';
    if (site.phone) {
      out += '<div class="contact-card"><span class="cc-icon">' + icon('phone') + '</span><div><h3>Telefon</h3>' +
        '<p><a href="tel:' + esc(A.telLink(site.phone)) + '">' + esc(site.phone) + '</a></p>' +
        (wa ? '<a class="text-link wa-link" href="' + esc(wa) + '" target="_blank" rel="noopener">WhatsApp ile yazın ' + icon('arrow') + '</a>' : '') +
        '</div></div>';
    }
    if (site.email1 || site.email2) {
      out += '<div class="contact-card"><span class="cc-icon">' + icon('mail') + '</span><div><h3>E-posta</h3>';
      [site.email1, site.email2].forEach(function (m) { if (m) out += '<p><a href="mailto:' + esc(m) + '">' + esc(m) + '</a></p>'; });
      out += '</div></div>';
    }
    if (site.hours) {
      out += '<div class="contact-card"><span class="cc-icon">' + icon('clock') + '</span><div><h3>Çalışma Saatleri</h3><p>' + A.nl2br(site.hours) + '</p></div></div>';
    }
    out += '<p class="company-name">' + esc(site.company) + '</p></div>';
    out += '<div class="map"><iframe title="' + esc(site.name) + ' konum" src="https://maps.google.com/maps?q=' + esc(encodeURIComponent(q)) +
      '&amp;hl=tr&amp;z=16&amp;output=embed" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>';
    out += '</div></section>';
    return out;
  }

  /* ---------------- Alt bilgi ---------------- */
  function footer(site) {
    var wa = A.whatsappLink(site.whatsapp, 'Merhaba, bilgi almak istiyorum.');
    var ig = A.safeLink(site.instagram), fb = A.safeLink(site.facebook);
    var h = '<footer class="footer"><div class="container footer-grid"><div>' +
      '<div class="footer-brand"><span class="fb-red">Aybek</span> <span class="fb-blue">Kırtasiye</span></div>' +
      '<p>' + esc(site.footer_text) + '</p><div class="social">';
    if (ig) h += '<a href="' + esc(ig) + '" target="_blank" rel="noopener" aria-label="Instagram">' + icon('instagram') + '</a>';
    if (fb) h += '<a href="' + esc(fb) + '" target="_blank" rel="noopener" aria-label="Facebook">' + icon('facebook') + '</a>';
    if (wa) h += '<a href="' + esc(wa) + '" target="_blank" rel="noopener" aria-label="WhatsApp">' + icon('whatsapp') + '</a>';
    h += '</div></div><div><h3>Sayfalar</h3><ul class="footer-links">';
    NAV.forEach(function (n) { h += '<li><a href="' + n[2] + '">' + n[1] + '</a></li>'; });
    h += '<li class="admin-link"><a href="admin/" rel="nofollow">' + icon('lock') + ' Yönetim Paneli</a></li></ul></div>';
    h += '<div><h3>İletişim</h3><ul class="footer-contact"><li>' + icon('pin') + '<span>' + esc(site.address) + '</span></li>';
    if (site.phone) h += '<li>' + icon('phone') + '<a href="tel:' + esc(A.telLink(site.phone)) + '">' + esc(site.phone) + '</a></li>';
    [site.email1, site.email2].forEach(function (m) { if (m) h += '<li>' + icon('mail') + '<a href="mailto:' + esc(m) + '">' + esc(m) + '</a></li>'; });
    if (site.hours) h += '<li>' + icon('clock') + '<span>' + A.nl2br(site.hours) + '</span></li>';
    h += '</ul></div></div><div class="footer-bottom"><div class="container"><span>© ' + new Date().getFullYear() + ' ' + esc(site.company) + '</span></div></div></footer>';
    if (wa) h += '<a class="wa-float" href="' + esc(wa) + '" target="_blank" rel="noopener" aria-label="WhatsApp ile yazın">' + icon('whatsapp') + '</a>';
    return h;
  }

  /* ---------------- Etkileşimler ---------------- */
  function init() {
    // Mobil menü
    var headerEl = document.querySelector('.header');
    var toggle = document.querySelector('.nav-toggle');
    var nav = document.getElementById('main-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        headerEl.classList.toggle('menu-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
      });
    }

    // Slayt
    var hero = document.querySelector('.hero');
    if (hero) {
      var slides = hero.querySelectorAll('.slide');
      var dots = hero.querySelectorAll('.hero-dots button');
      var current = 0, timer = null;
      var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      var show = function (i) {
        current = (i + slides.length) % slides.length;
        Array.prototype.forEach.call(slides, function (s, k) {
          s.classList.toggle('is-active', k === current);
          s.setAttribute('aria-hidden', k === current ? 'false' : 'true');
        });
        Array.prototype.forEach.call(dots, function (d, k) { d.classList.toggle('is-active', k === current); });
      };
      var stop = function () { if (timer) clearInterval(timer); timer = null; };
      var start = function () {
        if (reduced || slides.length < 2) return;
        stop();
        timer = setInterval(function () { show(current + 1); }, 6000);
      };
      var prev = hero.querySelector('.hero-arrow.prev'), next = hero.querySelector('.hero-arrow.next');
      if (prev) prev.addEventListener('click', function () { show(current - 1); start(); });
      if (next) next.addEventListener('click', function () { show(current + 1); start(); });
      Array.prototype.forEach.call(dots, function (d, k) { d.addEventListener('click', function () { show(k); start(); }); });
      var x0 = null;
      hero.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
      hero.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 50) { show(current + (dx < 0 ? 1 : -1)); start(); }
        x0 = null;
      });
      hero.addEventListener('mouseenter', stop);
      hero.addEventListener('mouseleave', start);
      start();
    }

    // Galeri büyütme
    var items = Array.prototype.slice.call(document.querySelectorAll('.gallery-item'));
    if (!items.length) return;
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.innerHTML = '<button class="lb-close" type="button" aria-label="Kapat">' + icon('close') + '</button>' +
      '<button class="lb-prev" type="button" aria-label="Önceki">' + icon('left') + '</button>' +
      '<button class="lb-next" type="button" aria-label="Sonraki">' + icon('right') + '</button><img alt=""><p></p>';
    document.body.appendChild(lb);
    var img = lb.querySelector('img'), cap = lb.querySelector('p'), idx = 0;
    var open = function (i) {
      idx = (i + items.length) % items.length;
      img.src = items[idx].getAttribute('href');
      img.alt = cap.textContent = items[idx].getAttribute('data-caption') || '';
      lb.classList.add('open');
      document.body.style.overflow = 'hidden';
    };
    var close = function () { lb.classList.remove('open'); document.body.style.overflow = ''; };
    items.forEach(function (a, i) { a.addEventListener('click', function (e) { e.preventDefault(); open(i); }); });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', function () { open(idx - 1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { open(idx + 1); });
    if (items.length < 2) {
      lb.querySelector('.lb-prev').style.display = 'none';
      lb.querySelector('.lb-next').style.display = 'none';
    }
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') open(idx - 1);
      if (e.key === 'ArrowRight') open(idx + 1);
    });
  }
})();
