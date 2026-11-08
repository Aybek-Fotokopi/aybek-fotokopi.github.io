/*
 * Aybek Kırtasiye - Yönetim Paneli (GitHub Pages / Cloudflare Pages sürümü)
 * Değişiklikler GitHub API ile depoya kaydedilir; site birkaç dakika içinde güncellenir.
 */
(function () {
  'use strict';
  var A = window.Aybek, esc = A.esc, icon = A.icon;
  var root = document.getElementById('admin');
  var STORE_KEY = 'aybek_admin_v1';
  var MAX_SIDE = 1920;
  var MAX_FILE = 15 * 1024 * 1024;

  var SECTIONS = [
    ['genel', 'Genel Bilgiler', 'Firma adı, telefon, e-posta, adres ve sosyal medya'],
    ['anasayfa', 'Ana Sayfa', 'Büyük slayt görselleri ve ana sayfa yazıları'],
    ['hakkimizda', 'Hakkımızda', 'Hakkımızda sayfasının yazısı ve görseli'],
    ['hizmetler', 'Hizmetler', 'Hizmet listesi'],
    ['galeri', 'Galeri', 'Fotoğraf ekleme ve silme'],
    ['iletisim', 'İletişim', 'İletişim sayfası başlığı ve açıklaması'],
    ['baglanti', 'Hesap', 'Bağlantı bilgisi ve çıkış']
  ];
  var LINKS = [['index.html', 'Ana Sayfa'], ['hakkimizda.html', 'Hakkımızda'], ['hizmetler.html', 'Hizmetler'], ['galeri.html', 'Galeri'], ['iletisim.html', 'İletişim']];

  var state = { backend: null, content: null, section: 'genel', dirty: false, flashes: [], previews: {} };

  /* ===================== Ayarlar / oturum ===================== */

  function detectRepo() {
    var cfg = window.AYBEK_CONFIG || {};
    var out = { owner: cfg.owner || '', repo: cfg.repo || '', branch: cfg.branch || '' };
    var host = location.hostname;
    if (!out.owner && /\.github\.io$/i.test(host)) {
      out.owner = host.split('.')[0];
      var first = location.pathname.split('/').filter(Boolean)[0];
      out.repo = (first && first !== 'admin') ? first : out.owner + '.github.io';
    }
    return out;
  }

  function loadSaved() {
    var raw = null;
    try { raw = localStorage.getItem(STORE_KEY) || sessionStorage.getItem(STORE_KEY); } catch (e) { /* gizli mod */ }
    try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  function saveLogin(data, remember) {
    try {
      localStorage.removeItem(STORE_KEY);
      sessionStorage.removeItem(STORE_KEY);
      (remember ? localStorage : sessionStorage).setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) { /* depolama kapalıysa sadece bu oturumda çalışır */ }
  }

  function clearLogin() {
    try { localStorage.removeItem(STORE_KEY); sessionStorage.removeItem(STORE_KEY); } catch (e) { /* yok say */ }
  }

  function isDemo() {
    return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && /[?&]demo=1/.test(location.search);
  }

  /* ===================== GitHub bağlantısı ===================== */

  function GitHub(cfg) {
    this.owner = cfg.owner;
    this.repo = cfg.repo;
    this.branch = cfg.branch;
    this.token = cfg.token;
  }

  GitHub.prototype.api = function (path, opts) {
    opts = opts || {};
    var headers = {
      'Authorization': 'Bearer ' + this.token,
      'Accept': opts.accept || 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (opts.body) headers['Content-Type'] = 'application/json';
    var url = 'https://api.github.com/repos/' + encodeURIComponent(this.owner) + '/' + encodeURIComponent(this.repo) + path;
    return fetch(url, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store'
    }).then(function (r) {
      if (r.ok) return opts.raw ? r.text() : r.json();
      return r.text().then(function (t) {
        var msg = 'GitHub hatası (' + r.status + ').';
        if (r.status === 401) msg = 'Giriş anahtarı geçersiz veya süresi dolmuş. Çıkış yapıp yeni anahtarla tekrar girin.';
        else if (r.status === 403) msg = 'Bu anahtarın depoya yazma yetkisi yok. Anahtarı oluştururken "Contents: Read and write" izni verildiğinden emin olun.';
        else if (r.status === 404) msg = 'Depo veya dosya bulunamadı. Kullanıcı adı ve depo adını kontrol edin.';
        else if (r.status === 409 || r.status === 422) msg = 'Kayıt sırasında çakışma oldu. Sayfayı yenileyip tekrar deneyin.';
        var err = new Error(msg);
        err.status = r.status;
        err.detail = t;
        throw err;
      });
    });
  };

  GitHub.prototype.verify = function () {
    var self = this;
    return this.api('').then(function (repo) {
      if (!repo.permissions || !repo.permissions.push) {
        throw new Error('Bu anahtarın depoya yazma yetkisi yok. "Contents: Read and write" izni gerekli.');
      }
      if (!self.branch) self.branch = repo.default_branch || 'main';
      return repo;
    });
  };

  GitHub.prototype.loadContent = function () {
    return this.api('/contents/data/content.json?ref=' + encodeURIComponent(this.branch), {
      accept: 'application/vnd.github.raw+json', raw: true
    }).then(function (text) { return JSON.parse(text); });
  };

  /** Tek bir commit ile: content.json + yeni görseller + kullanılmayan görsellerin silinmesi */
  GitHub.prototype.save = function (content, uploads, message) {
    var self = this, b = encodeURIComponent(this.branch);
    var headSha, baseTree;
    return this.api('/git/ref/heads/' + b).then(function (ref) {
      headSha = ref.object.sha;
      return self.api('/git/commits/' + headSha);
    }).then(function (commit) {
      baseTree = commit.tree.sha;
      return self.api('/git/trees/' + baseTree + '?recursive=1');
    }).then(function (tree) {
      // Yeni görselleri sırayla yükle
      var entries = [];
      var chain = Promise.resolve();
      uploads.forEach(function (u) {
        chain = chain.then(function () {
          return self.api('/git/blobs', { method: 'POST', body: { content: u.base64, encoding: 'base64' } })
            .then(function (blob) { entries.push({ path: u.path, mode: '100644', type: 'blob', sha: blob.sha }); });
        });
      });
      return chain.then(function () {
        entries.push({ path: 'data/content.json', mode: '100644', type: 'blob', content: JSON.stringify(content, null, 4) + '\n' });
        var used = usedImages(content);
        (tree.tree || []).forEach(function (t) {
          if (t.type === 'blob' && /^uploads\/[^/]+\.(jpe?g|png|webp|gif)$/i.test(t.path) && !used[t.path]) {
            entries.push({ path: t.path, mode: '100644', type: 'blob', sha: null });
          }
        });
        return self.api('/git/trees', { method: 'POST', body: { base_tree: baseTree, tree: entries } });
      });
    }).then(function (newTree) {
      return self.api('/git/commits', { method: 'POST', body: { message: message, tree: newTree.sha, parents: [headSha] } });
    }).then(function (newCommit) {
      return self.api('/git/refs/heads/' + b, { method: 'PATCH', body: { sha: newCommit.sha } });
    });
  };

  /** Bilgisayarda deneme modu: GitHub'a hiçbir şey göndermez */
  function Demo() { this.owner = 'demo'; this.repo = 'deneme'; this.branch = 'main'; this.saved = []; }
  Demo.prototype.verify = function () { return Promise.resolve({}); };
  Demo.prototype.loadContent = function () {
    return fetch('../data/content.json', { cache: 'no-store' }).then(function (r) { return r.json(); });
  };
  Demo.prototype.save = function (content, uploads, message) {
    this.saved.push({ content: JSON.parse(JSON.stringify(content)), uploads: uploads.map(function (u) { return u.path; }), message: message });
    window.__demoSaves = this.saved;
    return new Promise(function (res) { setTimeout(res, 300); });
  };

  function usedImages(content) {
    var used = {};
    (function walk(v) {
      if (typeof v === 'string') { if (v.indexOf('uploads/') === 0) used[v] = true; }
      else if (v && typeof v === 'object') Object.keys(v).forEach(function (k) { walk(v[k]); });
    })(content);
    return used;
  }

  /* ===================== Görsel işleme ===================== */

  function randHex(n) {
    var a = new Uint8Array(n);
    (window.crypto || window.msCrypto).getRandomValues(a);
    return Array.prototype.map.call(a, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
  }

  function datePrefix() {
    var d = new Date();
    return d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
  }

  function readAsDataURL(file) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(fr.result); };
      fr.onerror = function () { rej(new Error('"' + file.name + '" okunamadı.')); };
      fr.readAsDataURL(file);
    });
  }

  /** Fotoğrafı küçültür (en fazla 1920 px) ve yüklemeye hazırlar */
  function processImage(file) {
    var okTypes = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
    if (!okTypes[file.type]) return Promise.reject(new Error('"' + file.name + '" desteklenmeyen bir dosya. JPG, PNG, WEBP veya GIF seçin.'));
    if (file.size > MAX_FILE) return Promise.reject(new Error('"' + file.name + '" çok büyük (en fazla 15 MB).'));
    var base = 'uploads/' + datePrefix() + '-' + randHex(6);

    if (file.type === 'image/gif') {
      return readAsDataURL(file).then(function (url) {
        return { path: base + '.gif', base64: url.split(',')[1], preview: url };
      });
    }
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, MAX_SIDE / Math.max(w, h));
        var cw = Math.round(w * scale), ch = Math.round(h * scale);
        var canvas = document.createElement('canvas');
        canvas.width = cw; canvas.height = ch;
        var ctx = canvas.getContext('2d');
        var png = file.type === 'image/png';
        if (!png) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, cw, ch); }
        ctx.drawImage(img, 0, 0, cw, ch);
        URL.revokeObjectURL(url);
        var dataUrl = canvas.toDataURL(png ? 'image/png' : 'image/jpeg', 0.85);
        res({ path: base + (png ? '.png' : '.jpg'), base64: dataUrl.split(',')[1], preview: dataUrl });
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('"' + file.name + '" bir görsel olarak açılamadı.')); };
      img.src = url;
    });
  }

  function imgSrc(path) {
    return state.previews[path] || ('../' + path);
  }

  /* ===================== Form parçaları ===================== */

  function fText(key, value, label, help, type, extra, isRow) {
    return '<label class="field"><span>' + esc(label) + '</span>' +
      '<input type="' + (type || 'text') + '" ' + (isRow ? 'data-f' : 'data-top') + '="' + key + '" value="' + esc(value) + '" ' + (extra || '') + '>' +
      (help ? '<small>' + esc(help) + '</small>' : '') + '</label>';
  }
  function fArea(key, value, label, help, rows, isRow) {
    return '<label class="field"><span>' + esc(label) + '</span>' +
      '<textarea ' + (isRow ? 'data-f' : 'data-top') + '="' + key + '" rows="' + (rows || 4) + '">' + esc(value) + '</textarea>' +
      (help ? '<small>' + esc(help) + '</small>' : '') + '</label>';
  }
  function rText(key, value, label, help) { return fText(key, value, label, help, 'text', '', true); }
  function rArea(key, value, label, rows) { return fArea(key, value, label, '', rows, true); }

  function fImage(value, label, help, topKey) {
    value = A.safeImage(value);
    var has = !!value;
    return '<div class="field image-field"' + (topKey ? ' data-top-image="' + topKey + '"' : '') + '><span>' + esc(label) + '</span><div class="image-box">' +
      '<div class="thumb' + (has ? '' : ' empty') + '">' + (has ? '<img src="' + esc(imgSrc(value)) + '" alt="">' : '<em>Görsel yok</em>') + '</div>' +
      '<div class="image-actions"><input type="hidden" class="img-cur" value="' + esc(value) + '">' +
      '<label class="btn btn-light file-btn">' + (has ? 'Görseli Değiştir' : 'Görsel Seç') +
      '<input type="file" class="img-file" accept="image/jpeg,image/png,image/webp,image/gif"></label>' +
      (has ? '<label class="check"><input type="checkbox" class="img-remove"> Görseli kaldır</label>' : '') +
      '<small class="file-name"></small>' + (help ? '<small>' + esc(help) + '</small>' : '') +
      '</div></div></div>';
  }

  function fIcon(value) {
    value = A.ICON_LIST[value] ? value : 'star';
    var opts = Object.keys(A.ICON_LIST).map(function (k) {
      return '<option value="' + k + '"' + (k === value ? ' selected' : '') + '>' + esc(A.ICON_LIST[k]) + '</option>';
    }).join('');
    return '<label class="field icon-field"><span>İkon</span><div class="icon-select"><span class="icon-preview">' + icon(value) + '</span>' +
      '<select data-f="icon">' + opts + '</select></div></label>';
  }

  var ROWS = {
    slides: {
      label: 'Slayt', add: 'Yeni Slayt Ekle',
      render: function (it) {
        var cur = A.safeLink(it.button_link) || 'iletisim.html';
        var opts = LINKS.map(function (l) { return '<option value="' + l[0] + '"' + (l[0] === cur ? ' selected' : '') + '>' + l[1] + '</option>'; }).join('');
        return fImage(it.image, 'Arka plan görseli') + rText('title', it.title, 'Başlık') + rArea('text', it.text, 'Açıklama', 2) +
          '<div class="grid-2">' + rText('button_text', it.button_text, 'Buton yazısı', 'Boş bırakırsanız buton gösterilmez.') +
          '<label class="field"><span>Buton nereye gitsin?</span><select data-f="button_link">' + opts + '</select></label></div>';
      }
    },
    highlights: {
      label: 'Kutu', add: 'Yeni Kutu Ekle',
      render: function (it) {
        return '<div class="grid-icon">' + fIcon(it.icon) + rText('title', it.title, 'Başlık') + '</div>' + rText('text', it.text, 'Kısa açıklama');
      }
    },
    services: {
      label: 'Hizmet', add: 'Yeni Hizmet Ekle',
      render: function (it) {
        return '<div class="grid-icon">' + fIcon(it.icon) + rText('title', it.title, 'Hizmet adı') + '</div>' + rArea('text', it.text, 'Açıklama', 2);
      }
    }
  };

  function rowWrap(type, inner, num) {
    return '<div class="rep-row"><div class="rep-bar"><strong>' + esc(ROWS[type].label) + ' <span class="rep-num">' + num + '</span></strong>' +
      '<span class="rep-tools"><button type="button" class="tool up" title="Yukarı taşı" aria-label="Yukarı taşı">↑</button>' +
      '<button type="button" class="tool down" title="Aşağı taşı" aria-label="Aşağı taşı">↓</button>' +
      '<button type="button" class="tool del" title="Sil">Sil</button></span></div><div class="rep-body">' + inner + '</div></div>';
  }

  function repeater(type, items) {
    var rows = (items || []).map(function (it, i) { return rowWrap(type, ROWS[type].render(it || {}), i + 1); }).join('');
    return '<div class="repeater" data-rep="' + type + '"><div class="rep-rows">' + rows + '</div>' +
      '<button type="button" class="btn btn-light add-row" data-rep="' + type + '">+ ' + esc(ROWS[type].add) + '</button></div>';
  }

  /* ===================== Bölüm ekranları ===================== */

  function sectionHtml(s) {
    var c = state.content;
    var site = c.site || {}, h = c.home || {}, a = c.about || {}, sv = c.services || {}, g = c.gallery || {}, ct = c.contact || {};
    switch (s) {
      case 'genel':
        return '<div class="card"><h2>Firma</h2><div class="grid-2">' +
          fText('name', site.name, 'Site adı', 'Tarayıcı sekmesinde ve sayfa başlıklarında görünür.') +
          fText('tagline', site.tagline, 'Kısa slogan', 'Örn: Kırtasiye · Fotokopi · Büro Makineleri') + '</div>' +
          fText('company', site.company, 'Şirket unvanı', 'Sayfanın en altında ve Hakkımızda sayfasında görünür.') +
          fArea('footer_text', site.footer_text, 'Alt bilgi yazısı', 'Sayfanın en altında görünen kısa açıklama.', 3) + '</div>' +
          '<div class="card"><h2>İletişim Bilgileri</h2><div class="grid-2">' +
          fText('phone', site.phone, 'Telefon', 'Örn: 0535 667 47 06', 'tel') +
          fText('whatsapp', site.whatsapp, 'WhatsApp numarası', 'Başında 90 ile, boşluksuz. Örn: 905356674706. Boş bırakırsanız WhatsApp butonu gizlenir.', 'tel') +
          fText('email1', site.email1, 'E-posta 1', '', 'email') + fText('email2', site.email2, 'E-posta 2', '', 'email') + '</div>' +
          fText('address', site.address, 'Adres') +
          fText('map_query', site.map_query, 'Harita araması', 'Haritada gösterilecek yer. Google Haritalar\'da arattığınız metni yazın.') +
          fArea('hours', site.hours, 'Çalışma saatleri', 'Örn: Pazartesi - Cumartesi 08:30 - 19:00. Boş bırakırsanız sitede gösterilmez.', 3) + '</div>' +
          '<div class="card"><h2>Sosyal Medya</h2><div class="grid-2">' +
          fText('instagram', site.instagram, 'Instagram bağlantısı', 'Boş bırakırsanız gösterilmez.', 'url', 'placeholder="https://instagram.com/..."') +
          fText('facebook', site.facebook, 'Facebook bağlantısı', 'Boş bırakırsanız gösterilmez.', 'url', 'placeholder="https://facebook.com/..."') + '</div></div>';

      case 'anasayfa':
        return '<div class="card"><h2>Büyük Slayt (en üstteki görseller)</h2>' +
          '<p class="muted">Her slayt sırayla değişir. Görsel eklemezseniz kırmızı/mavi renkli arka plan kullanılır. Yatay (geniş) fotoğraflar en iyi sonucu verir.</p>' +
          repeater('slides', h.slides) + '</div>' +
          '<div class="card"><h2>Öne Çıkan Kutular</h2><p class="muted">Slaytın hemen altında görünen küçük kutular (4 tane önerilir).</p>' +
          repeater('highlights', h.highlights) + '</div>' +
          '<div class="card"><h2>Tanıtım Yazısı</h2>' + fText('intro_title', h.intro_title, 'Başlık') +
          fArea('intro_text', h.intro_text, 'Yazı', 'Yeni paragraf için bir satır boş bırakın.', 7) +
          '<p class="muted small">Yanındaki fotoğraf "Hakkımızda" bölümündeki görseldir.</p></div>' +
          '<div class="card"><h2>Alttaki Kırmızı Bant</h2>' + fText('cta_title', h.cta_title, 'Başlık') + fText('cta_text', h.cta_text, 'Açıklama') + '</div>';

      case 'hakkimizda':
        return '<div class="card">' + fText('title', a.title, 'Sayfa başlığı') + fText('intro', a.intro, 'Başlık altındaki kısa açıklama') +
          fArea('text', a.text, 'Yazı', 'Yeni paragraf için bir satır boş bırakın.', 12) +
          fImage(a.image, 'Görsel', 'Bu görsel ana sayfadaki tanıtım yazısının yanında da görünür.', 'image') + '</div>';

      case 'hizmetler':
        return '<div class="card"><div class="grid-2">' + fText('title', sv.title, 'Sayfa başlığı') + fText('intro', sv.intro, 'Kısa açıklama') + '</div></div>' +
          '<div class="card"><h2>Hizmet Listesi</h2><p class="muted">Ana sayfada ilk 6 hizmet gösterilir. Sırayı ↑ ↓ ile değiştirebilirsiniz.</p>' +
          repeater('services', sv.items) + '</div>';

      case 'galeri':
        var items = (g.items || []).map(function (it) {
          var img = A.safeImage(it.image);
          if (!img) return '';
          return '<div class="g-item rep-row"><img src="' + esc(imgSrc(img)) + '" alt="">' +
            '<input type="hidden" data-f="image" value="' + esc(img) + '">' +
            '<input type="text" data-f="caption" value="' + esc(it.caption) + '" placeholder="Açıklama (isteğe bağlı)">' +
            '<div class="rep-tools"><button type="button" class="tool up" title="Öne al" aria-label="Öne al">←</button>' +
            '<button type="button" class="tool down" title="Sona al" aria-label="Sona al">→</button>' +
            '<button type="button" class="tool del" title="Sil">Sil</button></div></div>';
        }).join('');
        return '<div class="card"><div class="grid-2">' + fText('title', g.title, 'Sayfa başlığı') + fText('intro', g.intro, 'Kısa açıklama') + '</div></div>' +
          '<div class="card upload-card"><h2>Fotoğraf Ekle</h2><label class="dropzone">' +
          '<input type="file" class="multi-file" accept="image/jpeg,image/png,image/webp,image/gif" multiple>' +
          '<strong>Fotoğrafları seçmek için tıklayın</strong>' +
          '<span>Birden fazla fotoğraf seçebilirsiniz. Seçtikten sonra aşağıdaki <b>Kaydet</b> butonuna basın.</span>' +
          '<em class="file-name"></em></label></div>' +
          '<div class="card"><h2>Galerideki Fotoğraflar (' + (g.items || []).length + ')</h2>' +
          (items ? '' : '<p class="muted">Henüz fotoğraf yok.</p>') +
          '<div class="gallery-admin rep-rows" data-rep="gallery">' + items + '</div></div>';

      case 'iletisim':
        return '<div class="card">' + fText('title', ct.title, 'Sayfa başlığı') + fArea('intro', ct.intro, 'Açıklama', '', 3) +
          '<p class="muted small">Adres, telefon ve e-posta bilgileri <a href="#genel">Genel Bilgiler</a> bölümünden değiştirilir.</p></div>';

      case 'baglanti':
        var b = state.backend;
        return '<div class="card narrow"><h2>Bağlı depo</h2>' +
          '<p><b>' + esc(b.owner) + '/' + esc(b.repo) + '</b> (' + esc(b.branch) + ')</p>' +
          '<p class="muted">Kaydettiğiniz her değişiklik bu GitHub deposuna kaydedilir ve site birkaç dakika içinde güncellenir.</p>' +
          '<p class="muted">Bu cihazdan çıkış yaptığınızda giriş anahtarı bu cihazdan silinir. Tekrar girmek için anahtarı yeniden yapıştırmanız gerekir.</p>' +
          '<button type="button" class="btn btn-primary" id="logout">Çıkış Yap</button></div>';
    }
    return '';
  }

  /* ===================== Formdan veri toplama ===================== */

  function topVal(form, key) {
    var el = form.querySelector('[data-top="' + key + '"]');
    return el ? String(el.value).replace(/\r\n/g, '\n').trim() : '';
  }
  function rowVal(row, key) {
    var el = row.querySelector('[data-f="' + key + '"]');
    return el ? String(el.value).replace(/\r\n/g, '\n').trim() : '';
  }
  function rowsOf(form, type) {
    var box = form.querySelector('[data-rep="' + type + '"]');
    if (!box) return [];
    var rowsBox = box.classList.contains('rep-rows') ? box : box.querySelector('.rep-rows');
    return Array.prototype.filter.call(rowsBox.children, function (el) { return el.classList.contains('rep-row'); });
  }

  /** Görsel alanını oku; yeni dosya seçilmişse işle ve yükleme listesine ekle */
  function readImage(wrap, uploads, errors) {
    if (!wrap) return Promise.resolve('');
    var cur = A.safeImage(wrap.querySelector('.img-cur').value);
    var rm = wrap.querySelector('.img-remove');
    if (rm && rm.checked) cur = '';
    var fileInput = wrap.querySelector('.img-file');
    var file = fileInput && fileInput.files && fileInput.files[0];
    if (!file) return Promise.resolve(cur);
    return processImage(file).then(function (p) {
      uploads.push(p);
      state.previews[p.path] = p.preview;
      return p.path;
    }, function (err) { errors.push(err.message); return cur; });
  }

  function collect(form, s) {
    var c = JSON.parse(JSON.stringify(state.content));
    var uploads = [], errors = [];
    var validIcon = function (v) { return A.ICON_LIST[v] ? v : 'star'; };
    var p = Promise.resolve();

    switch (s) {
      case 'genel':
        var site = c.site = c.site || {};
        ['name', 'tagline', 'company', 'phone', 'address', 'map_query', 'hours', 'footer_text'].forEach(function (k) { site[k] = topVal(form, k); });
        site.whatsapp = topVal(form, 'whatsapp').replace(/\D+/g, '');
        ['email1', 'email2'].forEach(function (k) {
          var v = topVal(form, k);
          if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { errors.push('"' + v + '" geçerli bir e-posta adresi değil, kaydedilmedi.'); return; }
          site[k] = v;
        });
        ['instagram', 'facebook'].forEach(function (k) {
          var v = topVal(form, k);
          if (v && !/^https?:\/\//i.test(v)) v = 'https://' + v.replace(/^\/+/, '');
          site[k] = v;
        });
        if (!site.name) site.name = 'Aybek Kırtasiye';
        break;

      case 'anasayfa':
        var h = c.home = c.home || {};
        ['intro_title', 'intro_text', 'cta_title', 'cta_text'].forEach(function (k) { h[k] = topVal(form, k); });
        h.highlights = rowsOf(form, 'highlights').map(function (r) {
          return { icon: validIcon(rowVal(r, 'icon')), title: rowVal(r, 'title'), text: rowVal(r, 'text') };
        }).filter(function (x) { return x.title || x.text; });
        var slideRows = rowsOf(form, 'slides');
        var slides = [];
        slideRows.forEach(function (r) {
          p = p.then(function () {
            return readImage(r.querySelector('.image-field'), uploads, errors).then(function (img) {
              var it = { image: img, title: rowVal(r, 'title'), text: rowVal(r, 'text'), button_text: rowVal(r, 'button_text'), button_link: rowVal(r, 'button_link') };
              if (it.image || it.title || it.text) slides.push(it);
            });
          });
        });
        p = p.then(function () { h.slides = slides; });
        break;

      case 'hakkimizda':
        var a = c.about = c.about || {};
        a.title = topVal(form, 'title') || 'Hakkımızda';
        a.intro = topVal(form, 'intro');
        a.text = topVal(form, 'text');
        p = readImage(form.querySelector('[data-top-image="image"]'), uploads, errors).then(function (img) { a.image = img; });
        break;

      case 'hizmetler':
        var sv = c.services = c.services || {};
        sv.title = topVal(form, 'title') || 'Hizmetlerimiz';
        sv.intro = topVal(form, 'intro');
        sv.items = rowsOf(form, 'services').map(function (r) {
          return { icon: validIcon(rowVal(r, 'icon')), title: rowVal(r, 'title'), text: rowVal(r, 'text') };
        }).filter(function (x) { return x.title; });
        break;

      case 'galeri':
        var g = c.gallery = c.gallery || {};
        g.title = topVal(form, 'title') || 'Galeri';
        g.intro = topVal(form, 'intro');
        var items = rowsOf(form, 'gallery').map(function (r) {
          return { image: A.safeImage(rowVal(r, 'image')), caption: rowVal(r, 'caption') };
        }).filter(function (x) { return x.image; });
        var multi = form.querySelector('.multi-file');
        var files = multi && multi.files ? Array.prototype.slice.call(multi.files) : [];
        files.forEach(function (f) {
          p = p.then(function () {
            return processImage(f).then(function (pi) {
              uploads.push(pi);
              state.previews[pi.path] = pi.preview;
              items.push({ image: pi.path, caption: '' });
            }, function (err) { errors.push(err.message); });
          });
        });
        p = p.then(function () {
          g.items = items;
          if (files.length && uploads.length) state.flashes.push(['ok', uploads.length + ' yeni fotoğraf eklendi. İsterseniz altlarına açıklama yazabilirsiniz.']);
        });
        break;

      case 'iletisim':
        var ct = c.contact = c.contact || {};
        ct.title = topVal(form, 'title') || 'İletişim';
        ct.intro = topVal(form, 'intro');
        break;
    }
    return p.then(function () { return { content: c, uploads: uploads, errors: errors }; });
  }

  /* ===================== Ekranlar ===================== */

  function renderLogin(message) {
    var det = detectRepo();
    var saved = loadSaved() || {};
    var owner = saved.owner || det.owner, repo = saved.repo || det.repo;
    var auto = !!(det.owner && det.repo);
    root.innerHTML =
      '<div class="login-page"><main class="login-box">' +
      '<img class="login-logo" src="../assets/img/logo.jpeg" alt="Aybek Kırtasiye">' +
      '<h1>Yönetim Paneli</h1>' +
      '<p class="muted">Siteyi düzenlemek için GitHub giriş anahtarınızı yapıştırın.</p>' +
      (message ? '<div class="alert alert-error">' + esc(message) + '</div>' : '') +
      '<form id="login-form" autocomplete="off">' +
      '<details class="repo-box"' + (auto ? '' : ' open') + '><summary>Depo bilgileri' + (auto ? ': ' + esc(owner + '/' + repo) : '') + '</summary>' +
      '<label class="field"><span>GitHub kullanıcı adı</span><input type="text" id="l-owner" value="' + esc(owner) + '" required></label>' +
      '<label class="field"><span>Depo adı</span><input type="text" id="l-repo" value="' + esc(repo) + '" required></label></details>' +
      '<label class="field"><span>Giriş anahtarı (token)</span><input type="password" id="l-token" required placeholder="github_pat_..." autofocus>' +
      '<small>Anahtarı nasıl alacağınız KURULUM rehberinde anlatılıyor. Anahtarı kimseyle paylaşmayın.</small></label>' +
      '<label class="check remember"><input type="checkbox" id="l-remember" checked> Bu cihazda beni hatırla</label>' +
      '<button class="btn btn-primary btn-block" type="submit">Giriş Yap</button></form>' +
      '<p class="back"><a href="../index.html">← Siteye dön</a></p></main></div>';

    document.getElementById('login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = this.querySelector('button[type=submit]');
      var cfg = {
        owner: document.getElementById('l-owner').value.trim(),
        repo: document.getElementById('l-repo').value.trim(),
        branch: det.branch || '',
        token: document.getElementById('l-token').value.trim()
      };
      var remember = document.getElementById('l-remember').checked;
      if (!cfg.owner || !cfg.repo || !cfg.token) return;
      btn.disabled = true; btn.textContent = 'Kontrol ediliyor...';
      connect(new GitHub(cfg)).then(function () {
        saveLogin({ owner: cfg.owner, repo: cfg.repo, branch: state.backend.branch, token: cfg.token }, remember);
      }, function (err) {
        renderLogin(err.message || 'Bağlanılamadı. İnternet bağlantınızı kontrol edin.');
      });
    });
  }

  function connect(backend) {
    return backend.verify().then(function () { return backend.loadContent(); }).then(function (content) {
      state.backend = backend;
      state.content = content;
      var hash = location.hash.replace('#', '');
      state.section = SECTIONS.some(function (s) { return s[0] === hash; }) ? hash : 'genel';
      renderPanel();
    });
  }

  function renderPanel() {
    var s = state.section;
    var meta = SECTIONS.filter(function (x) { return x[0] === s; })[0];
    var flashes = state.flashes.map(function (f) {
      return '<div class="alert alert-' + (f[0] === 'ok' ? 'ok' : 'error') + '">' + esc(f[1]) + '</div>';
    }).join('');
    state.flashes = [];
    state.dirty = false;
    document.body.classList.remove('dirty');
    document.title = meta[1] + ' | Yönetim Paneli';

    root.innerHTML =
      '<div class="layout"><aside class="side" id="side">' +
      '<a class="side-logo" href="#genel"><img src="../assets/img/logo.jpeg" alt="Aybek Kırtasiye"></a>' +
      '<p class="side-title">Yönetim Paneli' + (isDemo() ? ' (DENEME)' : '') + '</p><nav class="side-nav">' +
      SECTIONS.map(function (x) { return '<a href="#' + x[0] + '"' + (x[0] === s ? ' class="active"' : '') + '>' + esc(x[1]) + '</a>'; }).join('') +
      '</nav><div class="side-bottom"><a class="btn btn-light btn-block" href="../index.html" target="_blank" rel="noopener">Siteyi Görüntüle ↗</a></div></aside>' +
      '<div class="main"><header class="main-head"><button class="menu-btn" type="button" aria-label="Menü">☰</button>' +
      '<div><h1>' + esc(meta[1]) + '</h1><p class="muted">' + esc(meta[2]) + '</p></div></header>' +
      '<div id="flashes">' + flashes + '</div>' +
      '<form class="edit-form" id="edit-form" novalidate>' + sectionHtml(s) +
      (s === 'baglanti' ? '' : '<div class="save-bar"><span class="muted unsaved">Kaydedilmemiş değişiklikler var</span>' +
        '<button class="btn btn-primary btn-lg" type="submit">Kaydet</button></div>') +
      '</form></div></div>' +
      '<div id="icon-defs" hidden>' + Object.keys(A.ICON_LIST).map(function (k) { return '<span data-icon="' + k + '">' + icon(k) + '</span>'; }).join('') + '</div>';

    bindPanel();
    window.scrollTo(0, 0);
  }

  function showFlash(type, msg) {
    var box = document.getElementById('flashes');
    if (box) {
      box.insertAdjacentHTML('beforeend', '<div class="alert alert-' + type + '">' + esc(msg) + '</div>');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /* ===================== Etkileşimler ===================== */

  function markDirty() { state.dirty = true; document.body.classList.add('dirty'); }

  function renumber(rowsBox) {
    Array.prototype.forEach.call(rowsBox.children, function (r, i) {
      var n = r.querySelector('.rep-num');
      if (n) n.textContent = String(i + 1);
    });
  }

  function bindPanel() {
    var form = document.getElementById('edit-form');
    var side = document.getElementById('side');
    root.querySelector('.menu-btn').addEventListener('click', function () { side.classList.toggle('open'); });
    side.addEventListener('click', function (e) { if (e.target.closest('a')) side.classList.remove('open'); });

    var logout = document.getElementById('logout');
    if (logout) logout.addEventListener('click', function () {
      if (!confirm('Bu cihazdan çıkış yapılsın mı?')) return;
      clearLogin();
      state.backend = null; state.content = null;
      renderLogin();
    });

    form.addEventListener('input', markDirty);

    form.addEventListener('click', function (e) {
      var add = e.target.closest('.add-row');
      if (add) {
        var type = add.getAttribute('data-rep');
        var rowsBox = add.parentElement.querySelector('.rep-rows');
        rowsBox.insertAdjacentHTML('beforeend', rowWrap(type, ROWS[type].render({}), rowsBox.children.length + 1));
        var row = rowsBox.lastElementChild;
        row.classList.add('flash');
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        var first = row.querySelector('input[type=text], textarea');
        if (first) setTimeout(function () { first.focus(); }, 300);
        markDirty();
        return;
      }
      var btn = e.target.closest('.tool');
      if (!btn) return;
      var r = btn.closest('.rep-row'), box = r.parentElement;
      if (btn.classList.contains('up') && r.previousElementSibling) box.insertBefore(r, r.previousElementSibling);
      else if (btn.classList.contains('down') && r.nextElementSibling) box.insertBefore(r.nextElementSibling, r);
      else if (btn.classList.contains('del')) {
        if (!confirm('Bu öğe silinsin mi? (Kaydet butonuna basınca kalıcı olur)')) return;
        r.remove();
      } else return;
      renumber(box);
      if (r.isConnected) { r.classList.remove('flash'); void r.offsetWidth; r.classList.add('flash'); }
      markDirty();
    });

    form.addEventListener('change', function (e) {
      markDirty();
      var input = e.target;
      if (input.type === 'file') {
        var holder = input.closest('.image-field, .dropzone');
        if (!holder) return;
        var label = holder.querySelector('.file-name');
        var files = input.files;
        if (label) label.textContent = !files.length ? '' : files.length === 1 ? 'Seçildi: ' + files[0].name : files.length + ' fotoğraf seçildi';
        var thumb = holder.querySelector('.thumb');
        if (thumb && files.length === 1) {
          thumb.classList.remove('empty');
          thumb.innerHTML = '';
          var img = document.createElement('img');
          img.src = URL.createObjectURL(files[0]);
          thumb.appendChild(img);
        }
      }
      if (input.tagName === 'SELECT' && input.closest('.icon-select')) {
        var def = document.querySelector('#icon-defs [data-icon="' + input.value + '"]');
        var prev = input.closest('.icon-select').querySelector('.icon-preview');
        if (def && prev) prev.innerHTML = def.innerHTML;
      }
    });

    var dz = form.querySelector('.dropzone');
    if (dz) {
      ['dragenter', 'dragover'].forEach(function (ev) { dz.addEventListener(ev, function () { dz.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { dz.addEventListener(ev, function () { dz.classList.remove('over'); }); });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = form.querySelector('.save-bar button');
      btn.disabled = true; btn.textContent = 'Kaydediliyor...';
      var s = state.section;
      collect(form, s).then(function (res) {
        var label = SECTIONS.filter(function (x) { return x[0] === s; })[0][1];
        return state.backend.save(res.content, res.uploads, 'Yönetim paneli: ' + label + ' güncellendi').then(function () {
          state.content = res.content;
          res.errors.forEach(function (m) { state.flashes.push(['error', m]); });
          state.flashes.push(['ok', isDemo()
            ? 'DENEME MODU: Değişiklikler GitHub\'a gönderilmedi, sadece kontrol edildi.'
            : 'Kaydedildi! Değişiklikler 1-2 dakika içinde sitede görünür.']);
          renderPanel();
        });
      }).catch(function (err) {
        btn.disabled = false; btn.textContent = 'Kaydet';
        showFlash('error', (err && err.message) || 'Kaydedilemedi. İnternet bağlantınızı kontrol edip tekrar deneyin.');
        if (err && err.status === 401) { clearLogin(); }
      });
    });
  }

  window.addEventListener('hashchange', function () {
    if (!state.backend) return;
    var h = location.hash.replace('#', '');
    if (!SECTIONS.some(function (s) { return s[0] === h; }) || h === state.section) return;
    if (state.dirty && !confirm('Kaydedilmemiş değişiklikler var. Kaydetmeden bu bölümden çıkılsın mı?')) {
      history.replaceState(null, '', '#' + state.section);
      return;
    }
    state.section = h;
    renderPanel();
  });

  window.addEventListener('beforeunload', function (e) {
    if (state.dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ===================== Başlat ===================== */

  if (isDemo()) {
    connect(new Demo()).catch(function (err) { renderLogin(err.message); });
  } else {
    var saved = loadSaved();
    if (saved && saved.token && saved.owner && saved.repo) {
      root.innerHTML = '<p class="boot">Bağlanılıyor...</p>';
      connect(new GitHub(saved)).catch(function (err) {
        if (err && err.status === 401) clearLogin();
        renderLogin(err.message || 'Bağlanılamadı.');
      });
    } else {
      renderLogin();
    }
  }
})();
