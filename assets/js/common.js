/* Aybek Kırtasiye - site ve admin panelinin ortak yardımcıları */
(function (w) {
  'use strict';

  var ICON_LIST = {
    printer: 'Yazıcı',
    copier: 'Fotokopi Makinesi',
    wrench: 'Tamir / Anahtar',
    toner: 'Toner / Kartuş',
    cart: 'Satış / Sepet',
    idcard: 'Kimlik Kartı',
    badge: 'Yaka Kartı',
    firstaid: 'İlk Yardım',
    image: 'Dijital Baskı / Görsel',
    pen: 'Kalem / Kırtasiye',
    book: 'Defter / Kitap',
    scissors: 'Makas',
    file: 'Belge',
    star: 'Yıldız',
    clock: 'Saat',
    truck: 'Teslimat'
  };

  var PATHS = {
    printer: '<path d="M6 9V3h12v6"/><rect x="2" y="9" width="20" height="9" rx="2"/><path d="M6 14h12v7H6z"/><circle cx="18" cy="12" r=".5"/>',
    copier: '<path d="M4 7h16v13H4z"/><path d="M7 7V4h10v3"/><path d="M4 12h16"/><path d="M8 16h4"/><circle cx="16.5" cy="16" r=".6"/>',
    wrench: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    toner: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 7V5h10v2"/><path d="M7 11h6"/><path d="M17 11v2"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6"/>',
    idcard: '<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2.2"/><path d="M4.8 16a3.4 3.4 0 0 1 6.4 0"/><path d="M14 10h5M14 14h3"/>',
    badge: '<rect x="5" y="6" width="14" height="16" rx="2"/><path d="M10 2h4v5h-4z"/><circle cx="12" cy="13" r="2.2"/><path d="M8.5 19a3.6 3.6 0 0 1 7 0"/>',
    firstaid: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M8 6V4h8v2"/><path d="M12 10v6M9 13h6"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    pen: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
    scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    truck: '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>'
  };

  var WA_PATH = '<path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.8 17.8L.1 24l6.4-1.7A11.8 11.8 0 0 0 23.8 12c0-3.2-1.2-6.1-3.4-8.4z"/>';

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function icon(name, cls) {
    cls = cls || 'icon';
    if (name === 'whatsapp') {
      return '<svg class="' + esc(cls) + '" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + WA_PATH + '</svg>';
    }
    return '<svg class="' + esc(cls) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (PATHS[name] || PATHS.star) + '</svg>';
  }

  /** Düz metin -> paragraflar (boş satır = yeni paragraf) */
  function paragraphs(text) {
    text = String(text || '').replace(/\r\n/g, '\n').trim();
    if (!text) return '';
    return text.split(/\n\s*\n/).map(function (p) {
      return '<p>' + esc(p.trim()).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function nl2br(text) {
    return esc(text).replace(/\r?\n/g, '<br>');
  }

  /** Yalnızca güvenli bağlantılara izin ver */
  function safeLink(url) {
    url = String(url || '').trim();
    if (!url) return '';
    url = url.replace(/^([a-z0-9_\-]+)\.php(?=$|[?#])/i, '$1.html'); // eski bağlantılar
    if (/^(https?:\/\/|mailto:|tel:|#)/i.test(url) || /^[a-z0-9_\-]+\.html([?#].*)?$/i.test(url)) return url;
    return '';
  }

  /** Görsel yolu yalnızca uploads/ veya assets/ içinden olabilir */
  function safeImage(path) {
    path = String(path || '').trim();
    return /^(uploads|assets\/img)\/[A-Za-z0-9._\-]+\.(jpe?g|png|webp|gif)$/i.test(path) ? path : '';
  }

  function digits(s) { return String(s || '').replace(/\D+/g, ''); }

  function telLink(phone) {
    var d = digits(phone);
    if (d.charAt(0) === '0') d = '90' + d.slice(1);
    return '+' + d;
  }

  function whatsappLink(number, message) {
    var d = digits(number);
    if (!d) return '';
    if (d.charAt(0) === '0') d = '90' + d.slice(1);
    return 'https://wa.me/' + d + (message ? '?text=' + encodeURIComponent(message) : '');
  }

  w.Aybek = {
    ICON_LIST: ICON_LIST,
    esc: esc,
    icon: icon,
    paragraphs: paragraphs,
    nl2br: nl2br,
    safeLink: safeLink,
    safeImage: safeImage,
    telLink: telLink,
    whatsappLink: whatsappLink
  };
})(window);
