/* Mail Studio - editor de e-mail marketing (HTML) */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var uid = function () { return Math.random().toString(36).slice(2, 9); };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var P = function (t, r, b, l) { return { t: t, r: r, b: b, l: l }; };
  var FONT = 'Arial, Helvetica, sans-serif';

  /* ================= estado ================= */
  var doc, sel = { kind: 'global' }, tab = 'sel';
  var hist = [], hi = -1;
  var cfg = loadCfg();
  var dragData = null;

  function loadCfg() {
    var c = {};
    try { c = JSON.parse(localStorage.getItem('ms_cfg') || '{}'); } catch (e) {}
    if (!c.apiBase && window.MS_CONFIG && window.MS_CONFIG.apiBase) c.apiBase = window.MS_CONFIG.apiBase;
    if (!c.apiBase && /^https?:\/\/(127\.0\.0\.1|localhost)/.test(location.href)) c.apiBase = new URL('api/', location.href).href;
    c.apiBase = c.apiBase || '';
    c.token = c.token || '';
    return c;
  }
  function saveCfg() { try { localStorage.setItem('ms_cfg', JSON.stringify(cfg)); } catch (e) {} }

  /* ================= modelos de dados ================= */
  var BLOCKS = {
    image:     { label: 'Imagem',      icon: '🖼', def: function () { return { src: '', alt: '', url: '', widthPct: 100, align: 'center', pad: P(0, 0, 0, 0) }; } },
    text:      { label: 'Texto',       icon: 'T',  def: function () { return { html: '<p>Escreva seu texto aqui. Clique para editar.</p>', font: FONT, size: 16, lh: 1.5, color: '#333333', align: 'left', pad: P(10, 24, 10, 24) }; } },
    button:    { label: 'Botão',       icon: '▭',  def: function () { return { text: 'Comprar agora', url: '', bg: '#111111', color: '#ffffff', radius: 6, font: FONT, size: 16, bold: true, padV: 14, padH: 32, full: false, align: 'center', border: false, borderColor: '#111111', borderW: 2, pad: P(10, 24, 10, 24) }; } },
    spacer:    { label: 'Espaço',      icon: '↕',  def: function () { return { height: 30 }; } },
    divider:   { label: 'Divisor',     icon: '―',  def: function () { return { color: '#dddddd', thick: 1, style: 'solid', widthPct: 100, pad: P(10, 24, 10, 24) }; } },
    social:    { label: 'Redes',       icon: '◎',  def: function () { return { items: [{ net: 'instagram', url: '' }, { net: 'facebook', url: '' }], align: 'center', size: 13, radius: 6, uniform: '', pad: P(10, 24, 10, 24) }; } },
    menu:      { label: 'Menu',        icon: '☰',  def: function () { return { items: [{ text: 'Feminino', url: '' }, { text: 'Masculino', url: '' }, { text: 'Inverno', url: '' }, { text: 'Sale', url: '', color: '#d4f44a' }], bg: '#000000', color: '#ffffff', font: FONT, size: 13, padV: 16, padH: 14, spread: true, pad: P(0, 0, 0, 0) }; } },
    countdown: { label: 'Cronômetro',  icon: '⏱',  def: function () { var d = MSCD.defaults(); d.pad = P(10, 0, 10, 0); return d; } },
    html:      { label: 'HTML',        icon: '</>', def: function () { return { code: '<p style="text-align:center;font-family:Arial,sans-serif;">Seu HTML aqui</p>', pad: P(0, 0, 0, 0) }; } }
  };
  var ORDER = ['image', 'text', 'button', 'countdown', 'spacer', 'divider', 'social', 'menu', 'html'];

  var LAYOUTS = [
    [100], [50, 50], [33.33, 33.33, 33.34], [30, 70], [70, 30], [25, 25, 25, 25], [20, 20, 20, 20, 20]
  ];

  function newSettings() {
    return { bg: '#f6f6f6', contentBg: '#ffffff', width: 600, align: 'center', underline: true, responsive: true, font: FONT, linkColor: '#1a73e8', preheader: '', title: '' };
  }
  function newRow(layout, extra) {
    layout = layout || [100];
    var r = { id: uid(), layout: layout.slice(), bg: '', pad: P(0, 0, 0, 0), hideMobile: false, noStack: false, valign: 'top', cols: layout.map(function () { return []; }) };
    return Object.assign(r, extra || {});
  }
  function newBlock(type, over) {
    var b = BLOCKS[type].def();
    b.id = uid(); b.type = type;
    return Object.assign(b, over || {});
  }
  function reId(row) {
    row.id = uid();
    row.cols.forEach(function (c) { c.forEach(function (b) { b.id = uid(); }); });
    return row;
  }

  /* ================= modelos prontos ================= */
  var TEMPLATES = [
    { name: 'Promoção com cronômetro', desc: 'Menu, banner, cronômetro, botão e tamanhos', make: function () {
      var d = { name: 'Promoção com cronômetro', settings: newSettings(), rows: [] };
      var r;
      r = newRow([100], { bg: '#000000' }); r.cols[0].push(newBlock('text', { html: '<p style="text-align:center"><b>SUA MARCA</b></p>', color: '#ffffff', size: 34, align: 'center', pad: P(22, 20, 0, 20) })); d.rows.push(r);
      r = newRow([100]); r.cols[0].push(newBlock('menu')); d.rows.push(r);
      r = newRow([100]); r.cols[0].push(newBlock('image', { alt: 'Banner da campanha' })); d.rows.push(r);
      r = newRow([100]); r.cols[0].push(newBlock('text', { html: '<h1>ÚLTIMAS HORAS</h1><p>Aproveite as ofertas antes que acabem.</p>', align: 'center', pad: P(24, 24, 6, 24) })); r.cols[0].push(newBlock('countdown')); r.cols[0].push(newBlock('button', { text: 'APROVEITAR AGORA', pad: P(14, 24, 24, 24) })); d.rows.push(r);
      r = newRow([100]); r.cols[0].push(newBlock('text', { html: '<h2>COMPRE POR TAMANHO</h2><p>Escolha o seu e veja só o que tem em estoque:</p>', align: 'center', pad: P(18, 24, 6, 24) })); d.rows.push(r);
      r = newRow([20, 20, 20, 20, 20], { pad: P(0, 20, 20, 20), noStack: true });
      ['PP', 'P', 'M', 'G', 'GG'].forEach(function (t, i) { r.cols[i].push(newBlock('button', { text: t, bg: '#ffffff', color: '#111111', border: true, borderColor: '#555555', borderW: 1, radius: 0, padV: 12, padH: 6, full: true, size: 22, pad: P(0, 3, 0, 3) })); });
      d.rows.push(r);
      r = newRow([100]); r.cols[0].push(newBlock('divider')); r.cols[0].push(newBlock('social')); r.cols[0].push(newBlock('text', { html: '<p style="text-align:center">Você recebeu este e-mail porque se cadastrou em nossa loja.</p>', size: 12, color: '#888888', align: 'center' })); d.rows.push(r);
      return d;
    } },
    { name: 'Newsletter 2 colunas', desc: 'Banner, texto e dois destaques lado a lado', make: function () {
      var d = { name: 'Newsletter 2 colunas', settings: newSettings(), rows: [] };
      var r;
      r = newRow([100]); r.cols[0].push(newBlock('image', { alt: 'Banner' })); d.rows.push(r);
      r = newRow([100]); r.cols[0].push(newBlock('text', { html: '<h1>Novidades da semana</h1><p>Separamos os lançamentos que você não pode perder.</p>', align: 'center', pad: P(26, 28, 8, 28) })); d.rows.push(r);
      r = newRow([50, 50], { pad: P(0, 12, 0, 12) });
      [0, 1].forEach(function (i) {
        r.cols[i].push(newBlock('image', { alt: 'Produto ' + (i + 1), pad: P(10, 8, 0, 8) }));
        r.cols[i].push(newBlock('text', { html: '<p style="text-align:center"><b>Produto ' + (i + 1) + '</b><br>R$ 00,00</p>', align: 'center', pad: P(8, 8, 0, 8) }));
        r.cols[i].push(newBlock('button', { text: 'Ver produto', pad: P(8, 8, 16, 8) }));
      });
      d.rows.push(r);
      r = newRow([100]); r.cols[0].push(newBlock('divider')); r.cols[0].push(newBlock('social')); r.cols[0].push(newBlock('text', { html: '<p style="text-align:center">Para deixar de receber, clique em descadastrar.</p>', size: 12, color: '#888888', align: 'center' })); d.rows.push(r);
      return d;
    } },
    { name: 'Em branco', desc: 'Comece do zero', make: function () {
      var d = { name: 'Novo e-mail', settings: newSettings(), rows: [newRow([100])] };
      return d;
    } }
  ];

  /* ================= busca ================= */
  function findRow(id) {
    for (var i = 0; i < doc.rows.length; i++) if (doc.rows[i].id === id) return { ri: i, row: doc.rows[i] };
    return null;
  }
  function findBlock(id) {
    for (var i = 0; i < doc.rows.length; i++) {
      var r = doc.rows[i];
      for (var c = 0; c < r.cols.length; c++) {
        for (var b = 0; b < r.cols[c].length; b++) {
          if (r.cols[c][b].id === id) return { ri: i, row: r, ci: c, bi: b, b: r.cols[c][b] };
        }
      }
    }
    return null;
  }

  /* ================= histórico / persistência ================= */
  var persistTimer;
  function persist() {
    $('#savestate').textContent = 'Salvando…';
    clearTimeout(persistTimer);
    persistTimer = setTimeout(function () {
      try { localStorage.setItem('ms_doc', JSON.stringify(doc)); $('#savestate').textContent = 'Salvo ✓'; }
      catch (e) { $('#savestate').textContent = 'Não foi possível salvar'; }
    }, 400);
  }
  function commit() {
    var s = JSON.stringify(doc);
    if (hist[hi] === s) return;
    hist = hist.slice(0, hi + 1);
    hist.push(s);
    if (hist.length > 100) hist.shift();
    hi = hist.length - 1;
    persist();
    updateUndo();
  }
  function restore() {
    if (sel.kind === 'block' && !findBlock(sel.id)) sel = { kind: 'global' };
    if (sel.kind === 'row' && !findRow(sel.id)) sel = { kind: 'global' };
    $('#doc-name').value = doc.name || '';
    renderAll();
    persist();
    updateUndo();
  }
  function undo() { if (hi > 0) { hi--; doc = JSON.parse(hist[hi]); restore(); } }
  function redo() { if (hi < hist.length - 1) { hi++; doc = JSON.parse(hist[hi]); restore(); } }
  function updateUndo() { $('#b-undo').disabled = hi <= 0; $('#b-redo').disabled = hi >= hist.length - 1; }

  function setDoc(d) {
    doc = d;
    if (!doc.settings) doc.settings = newSettings();
    doc.settings = Object.assign(newSettings(), doc.settings);
    doc.rows = doc.rows || [];
    sel = { kind: 'global' };
    hist = []; hi = -1;
    $('#doc-name').value = doc.name || '';
    renderAll();
    commit();
  }

  /* ================= DOM helper ================= */
  function h(tag, props) {
    var e = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === false || v == null) return;
      if (k === 'class') e.className = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else if (k === 'value' || k === 'checked' || k === 'selected' || k === 'disabled') e[k] = v;
      else e.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) {
      [].concat(arguments[i]).forEach(function (c) {
        if (c == null || c === false) return;
        e.append(c.nodeType ? c : document.createTextNode(c));
      });
    }
    return e;
  }

  function toast(msg, err) {
    var t = $('#toast');
    t.textContent = msg;
    t.className = 'show' + (err ? ' err' : '');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.className = ''; }, err ? 4500 : 2200);
  }

  /* ================= renderização do canvas ================= */
  var cdTimer;
  function renderCanvas() {
    var s = doc.settings, c = $('#canvas');
    c.style.background = s.bg;
    var margin = s.align === 'left' ? '0 0 0 30px' : (s.align === 'right' ? '0 30px 0 auto' : '0 auto');
    var rows = MSExport.rowsHtml(doc, { editor: true, apiBase: cfg.apiBase });
    var chips = LAYOUTS.map(function (l, i) {
      return '<div class="lay" data-addrow="' + i + '" title="Adicionar faixa">' + l.map(function (p) { return '<i style="width:' + p + '%"></i>'; }).join('') + '</div>';
    }).join('');
    c.innerHTML = '<div class="page" style="width:' + s.width + 'px;max-width:100%;margin:' + margin + ';background:' + s.contentBg + ';font-family:' + s.font + ';">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%">' + rows + '</table></div>' +
      '<div class="add-row"><div class="hint" style="margin-bottom:0">Adicionar nova faixa:</div><div class="layouts">' + chips + '</div></div>';
    decorate();
  }

  function decorate() {
    $$('.row-tools').forEach(function (t) {
      var id = t.dataset.row;
      t.append(h('span', { class: 'tag' }, 'Faixa'));
      [['row-up', '▲', 'Subir'], ['row-down', '▼', 'Descer'], ['row-dup', '⧉', 'Duplicar'], ['row-del', '✕', 'Excluir']].forEach(function (a) {
        t.append(h('button', { 'data-act': a[0], 'data-row': id, title: a[2] }, a[1]));
      });
    });
    applySelection();
    drawCountdowns();
    var fonts = {};
    doc.rows.forEach(function (r) { r.cols.forEach(function (c) { c.forEach(function (b) { if (b.type === 'countdown') fonts[b.font] = 1; }); }); });
    Object.keys(fonts).forEach(function (f) { MSCD.loadFont(f).then(drawCountdowns); });
  }

  function applySelection() {
    $$('.blk.sel').forEach(function (e) { e.classList.remove('sel'); });
    $$('.blk-tools,.blk-tag').forEach(function (e) { e.remove(); });
    $$('.row-sel').forEach(function (e) { e.classList.remove('row-sel'); });
    if (sel.kind === 'block') {
      var el = $('.blk[data-bid="' + sel.id + '"]');
      var f = findBlock(sel.id);
      if (el && f) {
        el.classList.add('sel');
        el.append(h('div', { class: 'blk-tag' }, BLOCKS[f.b.type].label));
        el.append(h('div', { class: 'blk-tools' },
          h('button', { 'data-act': 'drag', draggable: 'true', title: 'Arrastar para mover', style: 'cursor:grab' }, '⠿'),
          h('button', { 'data-act': 'blk-up', title: 'Subir' }, '▲'),
          h('button', { 'data-act': 'blk-down', title: 'Descer' }, '▼'),
          h('button', { 'data-act': 'blk-dup', title: 'Duplicar' }, '⧉'),
          h('button', { 'data-act': 'blk-del', title: 'Excluir' }, '✕')));
      }
    } else if (sel.kind === 'row') {
      var tr = $('[data-rowtr="' + sel.id + '"]');
      if (tr) tr.classList.add('row-sel');
    }
  }

  function drawCountdowns() {
    var dpr = window.devicePixelRatio || 1;
    $$('canvas.cd-live').forEach(function (cv) {
      var f = findBlock(cv.dataset.bid);
      if (!f) return;
      var b = f.b, w = b.w, hh = MSCD.height(w);
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hh * dpr); }
      cv.style.width = w + 'px'; cv.style.height = 'auto';
      var ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      MSCD.render(ctx, b, Math.max(0, MSCD.secondsLeft(b)));
    });
  }

  function renderAll() { renderCanvas(); renderPanel(); updateUndo(); }

  /* ================= seleção ================= */
  function select(kind, id) {
    var same = sel.kind === kind && sel.id === id && tab === 'sel';
    sel = { kind: kind, id: id };
    tab = 'sel';
    applySelection();
    if (!same) renderPanel();
  }

  /* ================= operações ================= */
  function addRow(layout, at) {
    var r = newRow(layout);
    if (at == null) at = doc.rows.length;
    doc.rows.splice(at, 0, r);
    sel = { kind: 'row', id: r.id }; tab = 'sel';
    commit(); renderAll();
    return r;
  }
  function addBlock(type, rowId, ci, index) {
    var b = newBlock(type);
    var r = findRow(rowId).row;
    var col = r.cols[ci];
    col.splice(index == null ? col.length : index, 0, b);
    sel = { kind: 'block', id: b.id }; tab = 'sel';
    commit(); renderAll();
    return b;
  }
  function addBlockSmart(type) {
    var rowId, ci = 0;
    if (sel.kind === 'block') { var f = findBlock(sel.id); rowId = f.row.id; ci = f.ci; var idx = f.bi + 1; return addBlock(type, rowId, ci, idx); }
    if (sel.kind === 'row') { rowId = sel.id; }
    else {
      if (!doc.rows.length) addRow([100]);
      rowId = doc.rows[doc.rows.length - 1].id;
    }
    return addBlock(type, rowId, ci);
  }
  function moveRow(id, d) {
    var f = findRow(id), to = f.ri + d;
    if (to < 0 || to >= doc.rows.length) return;
    doc.rows.splice(f.ri, 1); doc.rows.splice(to, 0, f.row);
    commit(); renderAll();
  }
  function dupRow(id) {
    var f = findRow(id), c = reId(clone(f.row));
    doc.rows.splice(f.ri + 1, 0, c);
    sel = { kind: 'row', id: c.id };
    commit(); renderAll();
  }
  function delRow(id) {
    var f = findRow(id);
    doc.rows.splice(f.ri, 1);
    sel = { kind: 'global' };
    commit(); renderAll();
  }
  function moveBlock(id, d) {
    var f = findBlock(id), col = f.row.cols[f.ci], to = f.bi + d;
    if (to < 0 || to >= col.length) return;
    col.splice(f.bi, 1); col.splice(to, 0, f.b);
    commit(); renderAll();
  }
  function dupBlock(id) {
    var f = findBlock(id), c = clone(f.b); c.id = uid();
    f.row.cols[f.ci].splice(f.bi + 1, 0, c);
    sel = { kind: 'block', id: c.id };
    commit(); renderAll();
  }
  function delBlock(id) {
    var f = findBlock(id);
    f.row.cols[f.ci].splice(f.bi, 1);
    sel = { kind: 'row', id: f.row.id };
    commit(); renderAll();
  }
  function setRowLayout(row, layout) {
    var old = row.cols;
    var cols = layout.map(function (_, i) { return old[i] || []; });
    for (var i = layout.length; i < old.length; i++) cols[layout.length - 1] = cols[layout.length - 1].concat(old[i]);
    row.layout = layout.slice(); row.cols = cols;
  }

  /* ================= eventos do canvas ================= */
  var canvasEl = $('#canvas');

  canvasEl.addEventListener('click', function (e) {
    var act = e.target.closest('[data-act]');
    if (act) {
      var a = act.dataset.act, rid = act.dataset.row;
      var bid = sel.kind === 'block' ? sel.id : null;
      if (a === 'row-up') moveRow(rid, -1);
      else if (a === 'row-down') moveRow(rid, 1);
      else if (a === 'row-dup') dupRow(rid);
      else if (a === 'row-del') delRow(rid);
      else if (a === 'blk-up') moveBlock(bid, -1);
      else if (a === 'blk-down') moveBlock(bid, 1);
      else if (a === 'blk-dup') dupBlock(bid);
      else if (a === 'blk-del') delBlock(bid);
      e.stopPropagation();
      return;
    }
    var chip = e.target.closest('[data-addrow]');
    if (chip) { addRow(LAYOUTS[+chip.dataset.addrow]); return; }
    var blk = e.target.closest('.blk');
    if (blk) { select('block', blk.dataset.bid); return; }
    var tr = e.target.closest('[data-rowtr]');
    if (tr) { select('row', tr.dataset.rowtr); return; }
    if (e.target.closest('.add-row')) return;
    sel = { kind: 'global' }; tab = 'sel'; applySelection(); renderPanel();
  });

  canvasEl.addEventListener('focusin', function (e) {
    var ed = e.target.closest('[data-edit]');
    if (ed) select('block', ed.dataset.edit);
  });
  canvasEl.addEventListener('input', function (e) {
    var ed = e.target.closest('[data-edit]');
    if (!ed) return;
    var f = findBlock(ed.dataset.edit);
    if (f) { f.b.html = ed.innerHTML; persist(); }
  });
  canvasEl.addEventListener('focusout', function (e) {
    if (e.target.closest && e.target.closest('[data-edit]')) commit();
  });
  canvasEl.addEventListener('paste', function (e) {
    var ed = e.target.closest('[data-edit]');
    if (!ed) return;
    e.preventDefault();
    var txt = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, txt);
  });

  /* ---- arrastar e soltar ---- */
  var dropLine = null;
  function clearDrop() {
    if (dropLine) { dropLine.remove(); dropLine = null; }
    $$('.drop-on').forEach(function (e) { e.classList.remove('drop-on'); });
  }
  function dropIndex(col, y) {
    var blks = $$('.blk', col).filter(function (b) { return b.closest('.ms-col') === col; });
    var idx = blks.length, line = null;
    for (var i = 0; i < blks.length; i++) {
      var r = blks[i].getBoundingClientRect();
      if (y < r.top + r.height / 2) { idx = i; line = r.top; break; }
    }
    if (line == null) {
      if (blks.length) line = blks[blks.length - 1].getBoundingClientRect().bottom;
      else line = col.getBoundingClientRect().top + 8;
    }
    return { idx: idx, y: line };
  }
  canvasEl.addEventListener('dragstart', function (e) {
    var h0 = e.target.closest && e.target.closest('[data-act="drag"]');
    if (!h0 || sel.kind !== 'block') { return; }
    dragData = { move: sel.id };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'move');
    var el = $('.blk[data-bid="' + sel.id + '"]');
    if (el) e.dataTransfer.setDragImage(el, 20, 10);
  });
  canvasEl.addEventListener('dragover', function (e) {
    if (!dragData) return;
    var col = e.target.closest('.ms-col[data-row]');
    if (!col) return;
    e.preventDefault();
    var info = dropIndex(col, e.clientY);
    var r = col.getBoundingClientRect();
    if (!dropLine) { dropLine = h('div', { class: 'drop-line' }); document.body.append(dropLine); }
    dropLine.style.cssText = 'position:fixed;left:' + (r.left + 6) + 'px;width:' + (r.width - 12) + 'px;top:' + (info.y - 2) + 'px;';
    $$('.drop-on').forEach(function (x) { if (x !== col) x.classList.remove('drop-on'); });
    col.classList.add('drop-on');
  });
  canvasEl.addEventListener('dragleave', function (e) {
    if (!e.relatedTarget || !canvasEl.contains(e.relatedTarget)) clearDrop();
  });
  canvasEl.addEventListener('drop', function (e) {
    if (!dragData) return;
    var col = e.target.closest('.ms-col[data-row]');
    var d = dragData; dragData = null;
    if (!col) { clearDrop(); return; }
    e.preventDefault();
    var info = dropIndex(col, e.clientY);
    clearDrop();
    var rowId = col.dataset.row, ci = +col.dataset.col;
    if (d.add) {
      addBlock(d.add, rowId, ci, info.idx);
    } else if (d.move) {
      var f = findBlock(d.move);
      if (!f) return;
      var idx = info.idx;
      var tr = findRow(rowId).row;
      if (tr === f.row && ci === f.ci && f.bi < idx) idx--;
      f.row.cols[f.ci].splice(f.bi, 1);
      tr.cols[ci].splice(idx, 0, f.b);
      sel = { kind: 'block', id: f.b.id };
      commit(); renderAll();
    }
  });
  document.addEventListener('dragend', function () { dragData = null; clearDrop(); });

  /* ================= barra lateral (paleta) ================= */
  (function buildRail() {
    var rail = $('#rail');
    ORDER.forEach(function (t) {
      var d = h('div', { class: 'pal', draggable: 'true', title: 'Arraste para o e-mail ou clique para adicionar' },
        h('span', { class: 'ic' }, BLOCKS[t].icon), h('span', { class: 'lb' }, BLOCKS[t].label));
      d.addEventListener('dragstart', function (e) {
        dragData = { add: t };
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', 'new:' + t);
      });
      d.addEventListener('click', function () { addBlockSmart(t); });
      rail.append(d);
    });
  })();

  /* ================= painel de propriedades ================= */
  function renderPanel() {
    $$('.tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
    var body = $('#panel-body');
    var keepScroll = body.scrollTop;
    body.innerHTML = '';
    if (tab === 'global' || sel.kind === 'global') { body.append.apply(body, globalPanel(sel.kind === 'global' && tab === 'sel')); }
    else if (sel.kind === 'row') { var fr = findRow(sel.id); if (fr) body.append.apply(body, rowPanel(fr.row)); }
    else if (sel.kind === 'block') { var fb = findBlock(sel.id); if (fb) body.append.apply(body, blockPanel(fb.b)); }
    body.scrollTop = keepScroll;
  }
  $$('.tabs button').forEach(function (b) {
    b.addEventListener('click', function () { tab = b.dataset.tab; renderPanel(); });
  });

  function changed(opt) {
    renderCanvas();
    persist();
    if (opt && opt.panel) renderPanel();
    if (opt && opt.after) opt.after();
  }
  function wrapF(label, ctl, cls) {
    return h('div', { class: 'f ' + (cls || '') }, label ? h('label', null, label) : null, ctl);
  }
  function fText(label, o, k, opt) {
    opt = opt || {};
    var i = h('input', { type: 'text', value: o[k] == null ? '' : o[k], placeholder: opt.ph || '' });
    i.addEventListener('input', function () { o[k] = i.value; changed(opt); });
    i.addEventListener('change', commit);
    return wrapF(label, i);
  }
  function fNum(label, o, k, opt) {
    opt = opt || {};
    var i = h('input', { type: 'number', value: o[k], min: opt.min, max: opt.max, step: opt.step || 1 });
    i.addEventListener('input', function () {
      var v = parseFloat(i.value);
      if (isNaN(v)) return;
      if (opt.min != null) v = Math.max(opt.min, v);
      if (opt.max != null) v = Math.min(opt.max, v);
      o[k] = v; changed(opt);
    });
    i.addEventListener('change', commit);
    return wrapF(label, i);
  }
  function fColor(label, o, k, opt) {
    opt = opt || {};
    var val = o[k] || (opt.empty ? '' : '#000000');
    var pick = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(val) ? val : '#ffffff' });
    var txt = h('input', { type: 'text', value: val, placeholder: opt.empty ? 'sem cor' : '#000000' });
    function set(v) { o[k] = v; changed(opt); }
    pick.addEventListener('input', function () { txt.value = pick.value; set(pick.value); });
    pick.addEventListener('change', commit);
    txt.addEventListener('input', function () {
      var v = txt.value.trim();
      if (v === '' && opt.empty) { set(''); return; }
      if (/^#[0-9a-f]{6}$/i.test(v)) { pick.value = v; set(v); }
    });
    txt.addEventListener('change', commit);
    return wrapF(label, h('div', { class: 'colorf' }, pick, txt));
  }
  function fSel(label, o, k, options, opt) {
    opt = opt || {};
    var s = h('select', null, options.map(function (x) { return h('option', { value: x[0], selected: String(o[k]) === String(x[0]) }, x[1]); }));
    s.addEventListener('change', function () {
      var v = s.value;
      o[k] = opt.num ? parseFloat(v) : v;
      changed(opt); commit();
    });
    return wrapF(label, s);
  }
  function fSwitch(label, o, k, opt) {
    opt = opt || {};
    var b = h('button', { class: 'sw' + (o[k] ? ' on' : ''), type: 'button', role: 'switch' });
    b.addEventListener('click', function () {
      o[k] = !o[k]; b.classList.toggle('on', !!o[k]);
      changed(opt); commit();
    });
    return h('div', { class: 'f inline' }, h('label', null, label), b);
  }
  function fSeg(label, o, k, options, opt) {
    opt = opt || {};
    var seg = h('div', { class: 'seg' }, options.map(function (x) {
      var b = h('button', { type: 'button', class: String(o[k]) === String(x[0]) ? 'on' : '' }, x[1]);
      b.addEventListener('click', function () {
        o[k] = x[0];
        $$('button', seg).forEach(function (bb) { bb.classList.remove('on'); }); b.classList.add('on');
        changed(opt); commit();
      });
      return b;
    }));
    return wrapF(label, seg);
  }
  function fArea(label, o, k, rows) {
    var t = h('textarea', { rows: rows || 6, spellcheck: 'false' });
    t.value = o[k] || '';
    t.addEventListener('input', function () { o[k] = t.value; changed(); });
    t.addEventListener('change', commit);
    return wrapF(label, t);
  }
  function fPad(label, o, k) {
    var g = h('div', { class: 'padgrid' });
    [['t', 'Topo'], ['r', 'Dir.'], ['b', 'Base'], ['l', 'Esq.']].forEach(function (x) {
      var i = h('input', { type: 'number', min: 0, max: 200, value: o[k][x[0]] });
      i.addEventListener('input', function () { var v = parseInt(i.value, 10); if (!isNaN(v)) { o[k][x[0]] = Math.max(0, v); changed(); } });
      i.addEventListener('change', commit);
      g.append(h('div', null, i, h('small', null, x[1])));
    });
    return wrapF(label, g);
  }
  function head(title, tag) { return h('div', { class: 'ph' }, title, tag ? h('span', { class: 'tagx' }, tag) : null); }
  function sec(t) { return h('div', { class: 'sec' }, t); }
  function row2() { return h('div', { class: 'f row2' }, [].slice.call(arguments)); }
  function inner(f) { return f.children[1] ? f : f; }
  function fieldPair(a, b) { var d = h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:8px' }); d.append(a, b); return d; }

  var ALIGN = [['left', 'Esq.'], ['center', 'Centro'], ['right', 'Dir.']];
  var FONT_OPTS = MSExport.FONT_OPTIONS;

  /* ----- global ----- */
  function globalPanel(noSel) {
    var s = doc.settings, out = [];
    out.push(head('Estilos globais', 'E-mail inteiro'));
    if (noSel) out.push(h('div', { class: 'hint' }, 'Clique em uma faixa ou bloco do e-mail para editá-lo. Arraste os blocos da barra à esquerda para dentro das colunas.'));
    out.push(fColor('Cor de fundo geral', s, 'bg'));
    out.push(fColor('Cor de fundo do conteúdo', s, 'contentBg'));
    out.push(fNum('Largura do conteúdo (px)', s, 'width', { min: 320, max: 800 }));
    out.push(fSeg('Alinhamento da mensagem', s, 'align', ALIGN));
    out.push(fSel('Fonte padrão', s, 'font', FONT_OPTS));
    out.push(fColor('Cor dos links', s, 'linkColor'));
    out.push(fSwitch('Sublinhar links', s, 'underline'));
    out.push(fSwitch('Design responsivo (1 coluna no celular)', s, 'responsive'));
    out.push(sec('Caixa de entrada'));
    out.push(fText('Pré-cabeçalho (texto de prévia)', s, 'preheader', { ph: 'Ex.: Só hoje: frete grátis em tudo' }));
    out.push(fText('Título do HTML (<title>)', s, 'title'));
    return out;
  }

  /* ----- faixa ----- */
  function rowPanel(r) {
    var out = [head('Faixa', r.cols.length + ' coluna' + (r.cols.length > 1 ? 's' : ''))];
    var lay = h('div', { class: 'layouts', style: 'justify-content:flex-start;margin:0 0 12px' }, LAYOUTS.map(function (l) {
      var on = JSON.stringify(l) === JSON.stringify(r.layout);
      var d = h('div', { class: 'lay', style: 'width:64px;height:34px;' + (on ? 'border-color:#22c55e' : '') }, l.map(function (p) { return h('i', { style: 'width:' + p + '%' }); }));
      d.addEventListener('click', function () { setRowLayout(r, l); commit(); renderAll(); });
      return d;
    }));
    out.push(wrapF('Estrutura (colunas)', lay));
    out.push(fColor('Cor de fundo da faixa', r, 'bg', { empty: true }));
    out.push(fPad('Espaçamento interno (px)', r, 'pad'));
    out.push(fSel('Alinhamento vertical das colunas', r, 'valign', [['top', 'Topo'], ['middle', 'Meio'], ['bottom', 'Base']]));
    out.push(fSwitch('Manter colunas lado a lado no celular', r, 'noStack'));
    out.push(fSwitch('Ocultar no celular', r, 'hideMobile'));
    out.push(h('div', { class: 'btnrow' },
      h('button', { class: 'btn sm', onclick: function () { moveRow(r.id, -1); } }, '▲ Subir'),
      h('button', { class: 'btn sm', onclick: function () { moveRow(r.id, 1); } }, '▼ Descer'),
      h('button', { class: 'btn sm', onclick: function () { dupRow(r.id); } }, '⧉ Duplicar'),
      h('button', { class: 'btn sm danger', onclick: function () { delRow(r.id); } }, 'Excluir')));
    return out;
  }

  /* ----- bloco ----- */
  function blockPanel(b) {
    var out = [head(BLOCKS[b.type].label, 'Bloco')];
    var fn = PANELS[b.type];
    if (fn) fn(b, out);
    out.push(h('div', { class: 'btnrow', style: 'margin-top:14px' },
      h('button', { class: 'btn sm', onclick: function () { dupBlock(b.id); } }, '⧉ Duplicar'),
      h('button', { class: 'btn sm danger', onclick: function () { delBlock(b.id); } }, 'Excluir')));
    return out;
  }

  function listEditor(label, arr, mk, cols) {
    var box = h('div');
    function draw() {
      box.innerHTML = '';
      arr.forEach(function (it, i) {
        var row = h('div', { class: 'list-item' });
        cols(it, row);
        row.append(h('button', { class: 'btn sm danger', title: 'Remover', onclick: function () { arr.splice(i, 1); changed(); commit(); draw(); } }, '✕'));
        box.append(row);
      });
      box.append(h('button', { class: 'btn sm', onclick: function () { arr.push(mk()); changed(); commit(); draw(); } }, '+ Adicionar item'));
    }
    draw();
    return wrapF(label, box);
  }

  function uploadControl(b) {
    var fi = h('input', { type: 'file', accept: 'image/*', hidden: true });
    var status = h('div', { class: 'hint' });
    fi.addEventListener('change', function () {
      var file = fi.files[0];
      if (!file) return;
      status.textContent = 'Enviando…';
      uploadImage(file).then(function (url) {
        b.src = url; changed({ panel: true }); commit(); toast('Imagem enviada ✓');
      }).catch(function (err) {
        status.textContent = err.message; status.className = 'hint warn';
        toast(err.message, true);
      });
    });
    return h('div', null,
      h('div', { class: 'btnrow', style: 'margin-top:0' }, h('button', { class: 'btn sm', onclick: function () { fi.click(); } }, '⬆ Enviar imagem'), fi),
      status);
  }
  function uploadImage(file) {
    var canServer = /^https?:/.test(cfg.apiBase) && cfg.token;
    if (!canServer) {
      return new Promise(function (res, rej) {
        if (file.size > 1.5 * 1024 * 1024) { rej(new Error('Para enviar imagens, defina o endereço do servidor e a senha em ⚙ Configurações.')); return; }
        var fr = new FileReader();
        fr.onload = function () { toast('Imagem só para visualização (base64). Configure o servidor para exportar.', true); res(fr.result); };
        fr.onerror = function () { rej(new Error('Não foi possível ler o arquivo.')); };
        fr.readAsDataURL(file);
      });
    }
    var fd = new FormData();
    fd.append('file', file);
    return fetch(cfg.apiBase + 'upload.php', { method: 'POST', headers: { 'X-Token': cfg.token }, body: fd })
      .then(function (r) { return r.json().catch(function () { throw new Error('Resposta inválida do servidor.'); }); })
      .then(function (j) { if (!j.ok) throw new Error(j.error || 'Falha no upload.'); return j.url; });
  }

  var PANELS = {};

  PANELS.image = function (b, out) {
    out.push(fText('URL da imagem', b, 'src', { ph: 'https://…', panel: false }));
    out.push(uploadControl(b));
    out.push(fText('Texto alternativo (ALT)', b, 'alt'));
    out.push(fText('Link ao clicar', b, 'url', { ph: 'https://…' }));
    out.push(fNum('Largura da imagem (%)', b, 'widthPct', { min: 10, max: 100 }));
    out.push(fSeg('Alinhamento', b, 'align', ALIGN));
    out.push(fPad('Espaçamento (px)', b, 'pad'));
  };

  PANELS.text = function (b, out) {
    var cmd = function (c, v) { document.execCommand(c, false, v || null); var ed = $('[data-edit="' + b.id + '"]'); if (ed) { b.html = ed.innerHTML; persist(); } };
    var mk = function (label, fnc, title) {
      var bt = h('button', { type: 'button', title: title || label }, label);
      bt.addEventListener('mousedown', function (e) { e.preventDefault(); });
      bt.addEventListener('click', fnc);
      return bt;
    };
    out.push(h('div', { class: 'tb' },
      mk('B', function () { cmd('bold'); }, 'Negrito'),
      mk('I', function () { cmd('italic'); }, 'Itálico'),
      mk('U', function () { cmd('underline'); }, 'Sublinhado'),
      mk('🔗', function () { var u = prompt('Endereço do link (https://…)'); if (u) cmd('createLink', u); }, 'Inserir link'),
      mk('⛓', function () { cmd('unlink'); }, 'Remover link'),
      mk('• Lista', function () { cmd('insertUnorderedList'); }),
      mk('H1', function () { cmd('formatBlock', 'h1'); }, 'Título grande'),
      mk('H2', function () { cmd('formatBlock', 'h2'); }, 'Título médio'),
      mk('¶', function () { cmd('formatBlock', 'p'); }, 'Parágrafo')));
    var cs = h('input', { type: 'color', value: '#e11d48', title: 'Cor do trecho selecionado', style: 'width:34px;height:30px;padding:0;border:1px solid var(--line);background:none;border-radius:6px' });
    cs.addEventListener('mousedown', function () { /* mantém seleção */ });
    cs.addEventListener('input', function () { cmd('foreColor', cs.value); });
    cs.addEventListener('change', commit);
    out.push(wrapF('Cor do trecho selecionado', cs));
    out.push(fSel('Fonte', b, 'font', FONT_OPTS));
    out.push(row2(fNum('Tamanho (px)', b, 'size', { min: 8, max: 72 }), fNum('Altura da linha', b, 'lh', { min: 1, max: 3, step: 0.1 })));
    out.push(fColor('Cor do texto', b, 'color'));
    out.push(fSeg('Alinhamento', b, 'align', ALIGN.concat([['justify', 'Just.']])));
    out.push(fPad('Espaçamento (px)', b, 'pad'));
    out.push(h('div', { class: 'hint' }, 'Edite o texto diretamente no e-mail. Selecione um trecho para formatar.'));
  };

  PANELS.button = function (b, out) {
    out.push(fText('Texto do botão', b, 'text'));
    out.push(fText('Link', b, 'url', { ph: 'https://…' }));
    out.push(row2(fColor('Fundo', b, 'bg'), fColor('Texto', b, 'color')));
    out.push(row2(fNum('Arredondamento', b, 'radius', { min: 0, max: 60 }), fNum('Tamanho (px)', b, 'size', { min: 10, max: 40 })));
    out.push(row2(fNum('Padding vertical', b, 'padV', { min: 4, max: 60 }), fNum('Padding horizontal', b, 'padH', { min: 4, max: 120 })));
    out.push(fSel('Fonte', b, 'font', FONT_OPTS));
    out.push(fSwitch('Negrito', b, 'bold'));
    out.push(fSwitch('Largura total', b, 'full'));
    out.push(fSwitch('Borda', b, 'border', { panel: true }));
    if (b.border) out.push(row2(fColor('Cor da borda', b, 'borderColor'), fNum('Espessura', b, 'borderW', { min: 1, max: 8 })));
    out.push(fSeg('Alinhamento', b, 'align', ALIGN));
    out.push(fPad('Espaçamento (px)', b, 'pad'));
  };

  PANELS.spacer = function (b, out) { out.push(fNum('Altura (px)', b, 'height', { min: 4, max: 300 })); };

  PANELS.divider = function (b, out) {
    out.push(fColor('Cor', b, 'color'));
    out.push(row2(fNum('Espessura (px)', b, 'thick', { min: 1, max: 12 }), fNum('Largura (%)', b, 'widthPct', { min: 10, max: 100 })));
    out.push(fSel('Estilo', b, 'style', [['solid', 'Contínuo'], ['dashed', 'Tracejado'], ['dotted', 'Pontilhado']]));
    out.push(fPad('Espaçamento (px)', b, 'pad'));
  };

  PANELS.social = function (b, out) {
    var nets = Object.keys(MSExport.SOCIAL).map(function (k) { return [k, MSExport.SOCIAL[k].label]; });
    out.push(listEditor('Redes sociais', b.items, function () { return { net: 'site', url: '' }; }, function (it, row) {
      var s = h('select', null, nets.map(function (n) { return h('option', { value: n[0], selected: it.net === n[0] }, n[1]); }));
      s.addEventListener('change', function () { it.net = s.value; changed(); commit(); });
      var u = h('input', { type: 'text', value: it.url, placeholder: 'https://…' });
      u.addEventListener('input', function () { it.url = u.value; changed(); });
      u.addEventListener('change', commit);
      row.append(s, u);
    }));
    out.push(fColor('Cor única (vazio = cor de cada rede)', b, 'uniform', { empty: true }));
    out.push(row2(fNum('Tamanho (px)', b, 'size', { min: 10, max: 24 }), fNum('Arredondamento', b, 'radius', { min: 0, max: 30 })));
    out.push(fSeg('Alinhamento', b, 'align', ALIGN));
    out.push(fPad('Espaçamento (px)', b, 'pad'));
  };

  PANELS.menu = function (b, out) {
    out.push(listEditor('Itens do menu', b.items, function () { return { text: 'Novo item', url: '' }; }, function (it, row) {
      var t = h('input', { type: 'text', value: it.text, placeholder: 'Texto' });
      t.addEventListener('input', function () { it.text = t.value; changed(); });
      t.addEventListener('change', commit);
      var u = h('input', { type: 'text', value: it.url, placeholder: 'https://…' });
      u.addEventListener('input', function () { it.url = u.value; changed(); });
      u.addEventListener('change', commit);
      row.append(t, u);
    }));
    out.push(row2(fColor('Fundo', b, 'bg'), fColor('Texto', b, 'color')));
    out.push(row2(fNum('Tamanho (px)', b, 'size', { min: 9, max: 28 }), fSel('Fonte', b, 'font', FONT_OPTS)));
    out.push(row2(fNum('Padding vertical', b, 'padV', { min: 0, max: 60 }), fNum('Padding horizontal', b, 'padH', { min: 0, max: 80 })));
    out.push(fSwitch('Distribuir em toda a largura', b, 'spread'));
    out.push(fPad('Espaçamento externo (px)', b, 'pad'));
  };

  PANELS.html = function (b, out) {
    out.push(fArea('Código HTML', b, 'code', 10));
    out.push(h('div', { class: 'hint warn' }, 'Use HTML compatível com e-mail (tabelas e estilos inline). Scripts não funcionam em e-mail.'));
    out.push(fPad('Espaçamento (px)', b, 'pad'));
  };

  PANELS.countdown = function (b, out) {
    var urlBox = h('div', { class: 'urlbox' });
    function updUrl() {
      var ok = /^https?:/.test(cfg.apiBase);
      urlBox.textContent = ok ? MSCD.dynamicUrl(b, cfg.apiBase) : 'Defina o endereço do servidor em ⚙ Configurações para gerar o link do GIF dinâmico.';
    }
    var opt = { after: updUrl };

    var endIn = h('input', { type: 'datetime-local', value: b.end });
    endIn.addEventListener('input', function () { if (endIn.value) { b.end = endIn.value; changed(opt); } });
    endIn.addEventListener('change', commit);
    out.push(wrapF('Data e hora do fim', endIn));
    out.push(fSel('Fuso horário', b, 'tz', [['-03:00', 'Brasília (UTC-3)'], ['-04:00', 'Manaus / Cuiabá (UTC-4)'], ['-05:00', 'Acre (UTC-5)'], ['-02:00', 'Fernando de Noronha (UTC-2)'], ['+00:00', 'UTC'], ['+01:00', 'Portugal / Europa (UTC+1)']], opt));
    out.push(fNum('Largura do GIF (px)', b, 'w', { min: 240, max: 800, step: 10, after: updUrl }));
    // as funções acima não recebem opt; usamos wrapper para atualizar a URL também
    out.push(row2(fColor('Fundo', b, 'bg', opt), fColor('Caixa dos números', b, 'box', { empty: true, after: updUrl })));
    out.push(row2(fColor('Números', b, 'fg', opt), fColor('Legendas', b, 'lbl', opt)));
    out.push(fSel('Fonte dos números', b, 'font', Object.keys(MSCD.FONTS).map(function (k) { return [k, MSCD.FONTS[k].label]; }), opt));
    out.push(fSwitch('Mostrar dias', b, 'days', opt));
    out.push(fSwitch('Mostrar ":" entre os números', b, 'sep', opt));
    var lg = h('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:6px' });
    [0, 1, 2, 3].forEach(function (i) {
      var t = h('input', { type: 'text', value: b.labels[i] || '', style: 'width:100%;background:var(--bg);border:1px solid var(--line);border-radius:7px;padding:6px 8px' });
      t.addEventListener('input', function () { b.labels[i] = t.value; changed(opt); });
      t.addEventListener('change', commit);
      lg.append(t);
    });
    out.push(wrapF('Legendas (dias, horas, min, seg)', lg));
    out.push(fText('Link ao clicar', b, 'url', { ph: 'https://…' }));
    out.push(fText('Texto alternativo (ALT)', b, 'alt'));
    out.push(fSeg('Alinhamento', b, 'align', ALIGN));
    out.push(fPad('Espaçamento (px)', b, 'pad'));

    out.push(sec('GIF dinâmico (use no e-mail)'));
    out.push(h('div', { class: 'hint' }, 'A imagem é gerada pelo servidor no momento em que o e-mail é aberto, então mostra o tempo real restante. O HTML exportado já usa este link.'));
    out.push(urlBox);
    out.push(h('div', { class: 'btnrow' },
      h('button', { class: 'btn sm', onclick: function () { copyText(urlBox.textContent); toast('Link copiado'); } }, 'Copiar link'),
      h('button', { class: 'btn sm', onclick: function () { if (/^https?:/.test(cfg.apiBase)) window.open(MSCD.dynamicUrl(b, cfg.apiBase), '_blank'); else toast('Configure o servidor em ⚙', true); } }, 'Abrir GIF')));
    updUrl();

    out.push(sec('GIF estático (baixar arquivo)'));
    var frames = { n: 60, loop: false };
    out.push(h('div', { class: 'hint' }, 'Gera um GIF no seu navegador contando a partir de agora (1 quadro por segundo). Útil para testar ou usar em outra plataforma.'));
    out.push(fNum('Quadros (segundos)', frames, 'n', { min: 5, max: 180 }));
    out.push(fSwitch('Repetir em loop', frames, 'loop'));
    var prog = h('div', { class: 'progress' }, h('i'));
    var st = h('div', { class: 'hint' });
    out.push(h('div', { class: 'btnrow' }, h('button', { class: 'btn primary sm', onclick: function () {
      st.textContent = 'Gerando…'; prog.firstChild.style.width = '0%';
      setTimeout(function () {
        MSCD.makeGif(b, frames.n, frames.loop, function (p) { prog.firstChild.style.width = Math.round(p * 100) + '%'; }).then(function (blob) {
          download('cronometro.gif', blob);
          st.textContent = 'GIF gerado: ' + Math.round(blob.size / 1024) + ' KB';
        }).catch(function (e) { st.textContent = 'Erro: ' + e.message; });
      }, 30);
    } }, '⬇ Gerar e baixar GIF')));
    out.push(prog, st);
  };

  /* wrappers para que os campos do cronômetro atualizem a URL: fColor/fSel/fSwitch já repassam opt via changed(opt) */

  /* ================= utilidades ================= */
  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) { return navigator.clipboard.writeText(t).catch(function () { legacyCopy(t); }); }
    legacyCopy(t);
  }
  function legacyCopy(t) {
    var ta = h('textarea', { style: 'position:fixed;opacity:0' }); ta.value = t; document.body.append(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
  }
  function download(name, data, type) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: type || 'text/plain' });
    var a = h('a', { href: URL.createObjectURL(blob), download: name });
    document.body.append(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function slug(s) { return (s || 'email').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'email'; }

  function modal(title, body, footer, size) {
    var root = $('#modal-root');
    var back = h('div', { class: 'back' });
    var close = function () { back.remove(); };
    back.addEventListener('mousedown', function (e) { if (e.target === back) close(); });
    var m = h('div', { class: 'modal ' + (size || '') },
      h('header', null, title, h('button', { class: 'btn sm', onclick: close }, '✕')),
      h('div', { class: 'mb' }, body),
      footer ? h('footer', null, footer(close)) : null);
    back.append(m); root.append(back);
    return close;
  }

  /* ----- preview ----- */
  function cdPreviewSrc(b) {
    var cv = document.createElement('canvas');
    cv.width = b.w; cv.height = MSCD.height(b.w);
    MSCD.render(cv.getContext('2d'), b, Math.max(0, MSCD.secondsLeft(b)));
    return cv.toDataURL('image/png');
  }
  function openPreview() {
    var html = MSExport.buildHtml(doc, { apiBase: cfg.apiBase, cdSrc: cdPreviewSrc });
    var frame = h('iframe', { style: 'width:100%' });
    frame.srcdoc = html;
    var wrapper = h('div', { class: 'prevwrap' }, frame);
    var seg = h('div', { class: 'seg', style: 'margin-bottom:10px' });
    [['100%', '🖥 Desktop'], ['375px', '📱 Mobile']].forEach(function (x, i) {
      var b = h('button', { class: i === 0 ? 'on' : '' }, x[1]);
      b.addEventListener('click', function () { frame.style.width = x[0]; $$('button', seg).forEach(function (q) { q.classList.remove('on'); }); b.classList.add('on'); });
      seg.append(b);
    });
    modal('Pré-visualização', h('div', null, seg, h('div', { class: 'hint' }, 'O cronômetro aqui é um instantâneo. No e-mail real o GIF é gerado ao abrir.'), wrapper));
  }

  /* ----- exportar ----- */
  function openExport() {
    var issues = MSExport.lint(doc, { apiBase: cfg.apiBase });
    var html = MSExport.buildHtml(doc, { apiBase: cfg.apiBase });
    var lb = h('div', { class: 'lintbox' });
    if (!issues.length) lb.append(h('div', { class: 'lint ok' }, '✓ Tudo certo. Nenhum problema encontrado.'));
    issues.forEach(function (i) { lb.append(h('div', { class: 'lint ' + i.lvl }, (i.lvl === 'err' ? '✕ ' : '⚠ ') + i.msg)); });
    var ta = h('textarea', { class: 'code', readonly: true, spellcheck: 'false' });
    ta.value = html;
    modal('Exportar HTML', h('div', null, lb, ta, h('div', { class: 'hint' }, 'Tamanho: ' + Math.round(html.length / 1024) + ' KB (o Gmail corta e-mails acima de ~102 KB).')), function (close) {
      return [
        h('button', { class: 'btn', onclick: function () { ta.select(); copyText(html); toast('HTML copiado ✓'); } }, 'Copiar HTML'),
        h('button', { class: 'btn primary', onclick: function () { download(slug(doc.name) + '.html', html, 'text/html'); } }, 'Baixar .html'),
        h('button', { class: 'btn', onclick: close }, 'Fechar')
      ];
    });
  }

  /* ----- configurações ----- */
  function openConfig() {
    var api = h('input', { type: 'text', value: cfg.apiBase, placeholder: 'https://mailstudio.lamarketing.com.br/api/' });
    var tok = h('input', { type: 'password', value: cfg.token, placeholder: 'Senha definida em api/config.php' });
    var body = h('div', null,
      wrapF('Endereço público da pasta /api/ do servidor', api),
      h('div', { class: 'hint' }, 'Usado no link do cronômetro dentro do e-mail e para enviar imagens. Precisa começar com https:// e terminar com /.'),
      wrapF('Senha de upload de imagens', tok),
      h('div', { class: 'hint' }, 'A senha fica salva apenas neste navegador.'));
    modal('Configurações do servidor', body, function (close) {
      return [
        h('button', { class: 'btn primary', onclick: function () {
          var v = api.value.trim();
          if (v && !/\/$/.test(v)) v += '/';
          cfg.apiBase = v; cfg.token = tok.value;
          saveCfg(); close(); renderAll(); toast('Configurações salvas ✓');
        } }, 'Salvar'),
        h('button', { class: 'btn', onclick: close }, 'Cancelar')
      ];
    }, 'sm');
  }

  /* ----- modelos ----- */
  function openTemplates() {
    var grid = h('div', { class: 'tplgrid' });
    var close;
    TEMPLATES.forEach(function (t) {
      grid.append(h('div', { class: 'tpl', onclick: function () {
        if (doc.rows.length && !confirm('Substituir o e-mail atual por este modelo?')) return;
        setDoc(t.make()); close();
      } }, h('b', null, t.name), h('span', null, t.desc)));
    });
    close = modal('Modelos', grid);
  }

  /* ================= barra superior ================= */
  $('#b-undo').addEventListener('click', undo);
  $('#b-redo').addEventListener('click', redo);
  $('#b-prev').addEventListener('click', openPreview);
  $('#b-export').addEventListener('click', openExport);
  $('#b-cfg').addEventListener('click', openConfig);
  $('#b-tpl').addEventListener('click', openTemplates);
  $('#b-save').addEventListener('click', function () { download(slug(doc.name) + '.mailstudio.json', JSON.stringify(doc, null, 2), 'application/json'); toast('Projeto salvo no seu computador'); });
  $('#b-open').addEventListener('click', function () { $('#f-open').click(); });
  $('#f-open').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (!f) return;
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var d = JSON.parse(fr.result);
        if (!d.rows || !d.settings) throw new Error('x');
        setDoc(d); toast('Projeto aberto ✓');
      } catch (err) { toast('Arquivo inválido.', true); }
    };
    fr.readAsText(f);
    e.target.value = '';
  });
  $('#doc-name').addEventListener('input', function (e) { doc.name = e.target.value; persist(); });
  $('#doc-name').addEventListener('change', commit);
  $$('#device button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('#device button').forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      canvasEl.className = b.dataset.d;
    });
  });

  document.addEventListener('keydown', function (e) {
    var t = e.target, editing = t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
    if ((e.ctrlKey || e.metaKey) && !editing) {
      var k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); redo(); }
    }
    if (!editing && (e.key === 'Delete' || e.key === 'Backspace') && sel.kind === 'block') { e.preventDefault(); delBlock(sel.id); }
  });

  setInterval(drawCountdowns, 1000);
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); document.execCommand('styleWithCSS', false, true); } catch (e) {}

  /* ================= início ================= */
  var saved = null;
  try { saved = JSON.parse(localStorage.getItem('ms_doc') || 'null'); } catch (e) {}
  setDoc(saved && saved.rows ? saved : TEMPLATES[0].make());
  window.MailStudio = { get doc() { return doc; }, setDoc: setDoc, cfg: cfg };
})();
