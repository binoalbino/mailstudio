/* Tela inicial (gerenciador de e-mails e pastas) + roteamento */
(function () {
  'use strict';

  var MS = window.MailStudio, Store = window.MSStore, ui = MS.ui, h = ui.h;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var uid = function () { return Math.random().toString(36).slice(2, 10); };

  var SEED_FOLDERS = ['Céu de Prata', 'ZPZ Shoes', 'Clush', 'Juleme Hair', 'Ateliê Algodão Doce', 'All Out Run'];

  var state = { page: 'emails', cwd: null, q: '', view: 'grid', sort: 'name', recent: false };
  var idx = null;      // índice em memória
  var current = null;  // id do e-mail aberto
  var loadError = '';

  Store.init(function () { return MS.cfg; });

  /* ---------- miniatura (desenhada a partir da estrutura) ---------- */
  function blk(b) {
    switch (b.type) {
      case 'image': return ['i'];
      case 'text': return ['t', b.color];
      case 'button': return ['b', b.bg];
      case 'countdown': return ['c', b.bg];
      case 'menu': return ['m', b.bg];
      case 'spacer': return ['s', b.height];
      case 'divider': return ['d'];
      case 'social': return ['o'];
      default: return ['h'];
    }
  }
  function thumbData(doc) {
    var s = doc.settings || {};
    return {
      bg: s.bg || '#f6f6f6', cbg: s.contentBg || '#ffffff',
      rows: (doc.rows || []).slice(0, 14).map(function (r) {
        return { bg: r.bg || '', l: r.layout, c: r.cols.map(function (col) { return col.slice(0, 4).map(blk); }) };
      })
    };
  }
  function blkEl(b) {
    var t = b[0];
    if (t === 'i') return h('div', { class: 'th-img' });
    if (t === 't') return h('div', { class: 'th-txt' }, h('i', { style: 'background:' + (b[1] || '#999') }), h('i', { style: 'width:60%;background:' + (b[1] || '#999') }));
    if (t === 'b') return h('div', { class: 'th-btn', style: 'background:' + (b[1] || '#111') });
    if (t === 'c') return h('div', { class: 'th-cd', style: 'background:' + (b[1] || '#111') }, h('i'), h('i'), h('i'), h('i'));
    if (t === 'm') return h('div', { class: 'th-menu', style: 'background:' + (b[1] || '#000') }, h('i'), h('i'), h('i'));
    if (t === 's') return h('div', { style: 'height:' + Math.min(10, Math.round((b[1] || 20) / 6)) + 'px' });
    if (t === 'd') return h('div', { class: 'th-div' });
    if (t === 'o') return h('div', { class: 'th-soc' }, h('i'), h('i'));
    return h('div', { class: 'th-img', style: 'opacity:.5' });
  }
  function thumbEl(th) {
    var wrap = h('div', { class: 'th', style: 'background:' + (th ? th.bg : '#eee') });
    if (!th) return wrap;
    var page = h('div', { class: 'th-page', style: 'background:' + th.cbg });
    th.rows.forEach(function (r) {
      var row = h('div', { class: 'th-row', style: 'background:' + (r.bg || 'transparent') });
      r.c.forEach(function (col, i) {
        var c = h('div', { class: 'th-col', style: 'width:' + r.l[i] + '%' });
        col.forEach(function (b) { c.append(blkEl(b)); });
        row.append(c);
      });
      page.append(row);
    });
    wrap.append(page);
    return wrap;
  }

  /* ---------- diálogos ---------- */
  function askText(title, label, val, okLabel) {
    return new Promise(function (res) {
      var inp = h('input', { type: 'text', value: val || '', maxlength: '80' });
      var ok;
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok.click(); });
      ui.modal(title, h('div', { class: 'f' }, h('label', null, label), inp), function (close) {
        ok = h('button', { class: 'btn primary', onclick: function () { var v = inp.value.trim(); if (!v) return; close(); res(v); } }, okLabel || 'Salvar');
        return [ok, h('button', { class: 'btn', onclick: function () { close(); res(null); } }, 'Cancelar')];
      }, 'sm');
      setTimeout(function () { inp.focus(); inp.select(); }, 40);
    });
  }
  function confirmBox(title, msg, okLabel) {
    return new Promise(function (res) {
      ui.modal(title, h('div', null, msg), function (close) {
        return [h('button', { class: 'btn danger', onclick: function () { close(); res(true); } }, okLabel || 'Excluir'),
                h('button', { class: 'btn', onclick: function () { close(); res(false); } }, 'Cancelar')];
      }, 'sm');
    });
  }
  function popMenu(anchor, items) {
    closePops();
    var r = anchor.getBoundingClientRect();
    var m = h('div', { class: 'pop' }, items.map(function (it) {
      if (it === '-') return h('div', { class: 'pop-sep' });
      return h('button', { class: it.danger ? 'danger' : '', onclick: function (e) { e.stopPropagation(); closePops(); it.fn(); } }, it.label);
    }));
    document.body.append(m);
    var left = Math.min(window.innerWidth - m.offsetWidth - 8, r.left);
    var top = r.bottom + 4;
    if (top + m.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - m.offsetHeight - 4);
    m.style.left = Math.max(8, left) + 'px';
    m.style.top = top + 'px';
  }
  function closePops() { Array.prototype.forEach.call(document.querySelectorAll('.pop'), function (e) { e.remove(); }); }
  document.addEventListener('click', closePops);
  window.addEventListener('scroll', closePops, true);

  /* ---------- dados ---------- */
  function fail(e) { ui.toast(e.message || String(e), true); }

  function refresh() {
    return Store.loadIndex().then(function (i) {
      idx = i; loadError = '';
      if (!idx.seeded && !idx.folders.length && !idx.items.length) {
        idx.seeded = true;
        SEED_FOLDERS.forEach(function (n) { idx.folders.push({ id: uid(), name: n, created: Date.now() }); });
        return Store.saveIndex(idx).catch(function () {}).then(function () { return idx; });
      }
      return idx;
    }).catch(function (e) { loadError = e.message; idx = idx || { folders: [], items: [] }; });
  }

  function limitOk() {
    if (idx.items.length >= Store.MAX_ITEMS) { ui.toast('Limite de ' + Store.MAX_ITEMS + ' e-mails atingido. Exclua alguns para criar novos.', true); return false; }
    return true;
  }

  function createEmail(make, name, folder) {
    return Store.loadIndex().then(function (i) {
      idx = i;
      if (!limitOk()) return null;
      var d = make();
      d.name = name || d.name || 'Novo e-mail';
      var id = uid(), now = Date.now();
      return Store.saveDoc(id, d).then(function () {
        return Store.mutateIndex(function (ix) {
          if (ix.items.length >= Store.MAX_ITEMS) throw new Error('Limite de ' + Store.MAX_ITEMS + ' e-mails atingido.');
          ix.items.push({ id: id, name: d.name, folder: folder || null, created: now, updated: now, th: thumbData(d) });
        });
      }).then(function () { location.hash = '#/e/' + id; });
    }).catch(fail);
  }

  function importJson(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var d = JSON.parse(fr.result);
        if (!d.rows || !d.settings) throw new Error('x');
        createEmail(function () { return d; }, d.name || file.name.replace(/\.json$/, ''), state.cwd);
      } catch (e) { ui.toast('Arquivo inválido.', true); }
    };
    fr.readAsText(file);
  }

  /* ---------- ações ---------- */
  function renameItem(it) {
    askText('Renomear e-mail', 'Nome', it.name).then(function (n) {
      if (!n) return;
      Store.mutateIndex(function (ix) { ix.items.forEach(function (x) { if (x.id === it.id) x.name = n; }); }).then(function (ix) { idx = ix; render(); }).catch(fail);
    });
  }
  function dupItem(it) {
    if (!limitOk()) return;
    Store.loadDoc(it.id).then(function (d) {
      if (!d) throw new Error('E-mail não encontrado.');
      return createDup(it, d);
    }).catch(fail);
  }
  function createDup(it, d) {
    var id = uid(), now = Date.now();
    d.name = it.name + ' (cópia)';
    return Store.saveDoc(id, d).then(function () {
      return Store.mutateIndex(function (ix) {
        if (ix.items.length >= Store.MAX_ITEMS) throw new Error('Limite de ' + Store.MAX_ITEMS + ' e-mails atingido.');
        ix.items.push({ id: id, name: d.name, folder: it.folder || null, created: now, updated: now, th: it.th });
      });
    }).then(function (ix) { idx = ix; ui.toast('E-mail duplicado'); render(); });
  }
  function moveItem(it) {
    var body = h('div', { class: 'movelist' });
    var close;
    function opt(label, fid) {
      return h('button', { class: 'btn' + ((it.folder || null) === fid ? ' primary' : ''), onclick: function () {
        close();
        Store.mutateIndex(function (ix) { ix.items.forEach(function (x) { if (x.id === it.id) x.folder = fid; }); }).then(function (ix) { idx = ix; render(); ui.toast('E-mail movido'); }).catch(fail);
      } }, label);
    }
    body.append(opt('📁 Raiz (sem pasta)', null));
    idx.folders.slice().sort(byName).forEach(function (f) { body.append(opt('📁 ' + f.name, f.id)); });
    close = ui.modal('Mover para…', body, null, 'sm');
  }
  function delItem(it) {
    confirmBox('Excluir e-mail', 'Excluir "' + it.name + '"? Essa ação não pode ser desfeita.').then(function (ok) {
      if (!ok) return;
      Store.deleteDoc(it.id).then(function () {
        return Store.mutateIndex(function (ix) { ix.items = ix.items.filter(function (x) { return x.id !== it.id; }); });
      }).then(function (ix) { idx = ix; render(); ui.toast('E-mail excluído'); }).catch(fail);
    });
  }
  function backupItem(it) {
    Store.loadDoc(it.id).then(function (d) {
      if (!d) throw new Error('E-mail não encontrado.');
      d.name = it.name;
      ui.download(ui.slug(it.name) + '.mailstudio.json', JSON.stringify(d, null, 2), 'application/json');
    }).catch(fail);
  }
  function newFolder() {
    if (idx.folders.length >= Store.MAX_FOLDERS) { ui.toast('Limite de pastas atingido.', true); return; }
    askText('Nova pasta', 'Nome da pasta', '', 'Criar').then(function (n) {
      if (!n) return;
      Store.mutateIndex(function (ix) { ix.folders.push({ id: uid(), name: n, created: Date.now() }); }).then(function (ix) { idx = ix; render(); }).catch(fail);
    });
  }
  function renameFolder(f) {
    askText('Renomear pasta', 'Nome', f.name).then(function (n) {
      if (!n) return;
      Store.mutateIndex(function (ix) { ix.folders.forEach(function (x) { if (x.id === f.id) x.name = n; }); }).then(function (ix) { idx = ix; render(); }).catch(fail);
    });
  }
  function delFolder(f) {
    var n = idx.items.filter(function (i) { return i.folder === f.id; }).length;
    confirmBox('Excluir pasta', 'Excluir a pasta "' + f.name + '"?' + (n ? ' Os ' + n + ' e-mail(s) dentro dela voltam para a raiz.' : '')).then(function (ok) {
      if (!ok) return;
      Store.mutateIndex(function (ix) {
        ix.folders = ix.folders.filter(function (x) { return x.id !== f.id; });
        ix.items.forEach(function (x) { if (x.folder === f.id) x.folder = null; });
      }).then(function (ix) { idx = ix; if (state.cwd === f.id) state.cwd = null; render(); }).catch(fail);
    });
  }

  /* ---------- modal "novo e-mail" ---------- */
  function openNew() {
    var grid = h('div', { class: 'tplgrid' });
    var close;
    MS.templates.forEach(function (t) {
      grid.append(h('div', { class: 'tpl', onclick: function () { close(); createEmail(t.make, t.name === 'Em branco' ? 'Novo e-mail' : t.name, state.cwd); } },
        thumbEl(thumbData(t.make())), h('b', null, t.name), h('span', null, t.desc)));
    });
    close = ui.modal('Nova mensagem: escolha um modelo', grid);
  }

  /* ---------- renderização ---------- */
  function byName(a, b) { return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }); }
  function fmt(ts) {
    var d = new Date(ts);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  function folderName(id) {
    var f = idx.folders.filter(function (x) { return x.id === id; })[0];
    return f ? f.name : '';
  }

  function itemMenu(it) {
    return [
      { label: 'Abrir', fn: function () { location.hash = '#/e/' + it.id; } },
      { label: 'Renomear', fn: function () { renameItem(it); } },
      { label: 'Duplicar', fn: function () { dupItem(it); } },
      { label: 'Mover para pasta…', fn: function () { moveItem(it); } },
      { label: 'Baixar backup (.json)', fn: function () { backupItem(it); } },
      '-',
      { label: 'Excluir', danger: true, fn: function () { delItem(it); } }
    ];
  }

  function folderCard(f) {
    var n = idx.items.filter(function (i) { return i.folder === f.id; }).length;
    var c = h('div', { class: 'fcard', title: f.name, onclick: function () { state.cwd = f.id; state.q = ''; render(); } },
      h('div', { class: 'ftab' }), h('div', { class: 'fbody' }, h('div', { class: 'fname' }, f.name), h('span', { class: 'fcount' }, String(n))));
    var more = h('button', { class: 'more', title: 'Opções', onclick: function (e) {
      e.stopPropagation();
      popMenu(more, [
        { label: 'Abrir', fn: function () { state.cwd = f.id; render(); } },
        { label: 'Renomear', fn: function () { renameFolder(f); } },
        '-',
        { label: 'Excluir pasta', danger: true, fn: function () { delFolder(f); } }
      ]);
    } }, '⋯');
    c.append(more);
    return c;
  }

  function emailCard(it, showFolder) {
    var c = h('div', { class: 'ecard', onclick: function () { location.hash = '#/e/' + it.id; } },
      thumbEl(it.th),
      h('div', { class: 'einfo' },
        h('div', { class: 'ename', title: it.name }, it.name),
        h('div', { class: 'emeta' }, (showFolder && it.folder ? '📁 ' + folderName(it.folder) + ' · ' : '') + fmt(it.updated))));
    var more = h('button', { class: 'more', title: 'Opções', onclick: function (e) { e.stopPropagation(); popMenu(more, itemMenu(it)); } }, '⋯');
    c.append(more);
    return c;
  }

  function emailRow(it) {
    var more = h('button', { class: 'more static', onclick: function (e) { e.stopPropagation(); popMenu(more, itemMenu(it)); } }, '⋯');
    return h('div', { class: 'erow', onclick: function () { location.hash = '#/e/' + it.id; } },
      h('div', { class: 'erow-th' }, thumbEl(it.th)),
      h('div', { class: 'erow-n' }, it.name),
      h('div', { class: 'erow-f' }, it.folder ? '📁 ' + folderName(it.folder) : 'Raiz'),
      h('div', { class: 'erow-d' }, fmt(it.updated)),
      more);
  }

  function render() {
    closePops();
    var main = $('#h-body');
    main.innerHTML = '';
    document.querySelectorAll('.h-nav button').forEach(function (b) { b.classList.toggle('on', b.dataset.page === state.page); });
    $('#h-new').disabled = false;

    var local = Store.mode() === 'local';
    $('#h-note').hidden = !local;

    if (loadError) {
      main.append(h('div', { class: 'notice err' }, 'Não foi possível carregar do servidor: ' + loadError, ' ',
        h('button', { class: 'btn sm', onclick: function () { MS.openConfig(); } }, 'Configurações'),
        h('button', { class: 'btn sm', style: 'margin-left:6px', onclick: function () { init(); } }, 'Tentar de novo')));
    }

    if (state.page === 'tpl') { renderTemplates(main); return; }

    var q = state.q.trim().toLowerCase();
    var all = idx.items.slice();
    var folders = idx.folders.slice().sort(byName);
    var items, showFolders = true, crumb = null;

    if (q) {
      folders = folders.filter(function (f) { return f.name.toLowerCase().indexOf(q) >= 0; });
      items = all.filter(function (i) { return i.name.toLowerCase().indexOf(q) >= 0; });
    } else if (state.recent) {
      folders = [];
      items = all.slice().sort(function (a, b) { return b.updated - a.updated; }).slice(0, 24);
    } else if (state.cwd) {
      folders = [];
      items = all.filter(function (i) { return i.folder === state.cwd; });
      crumb = folderName(state.cwd);
    } else {
      items = all.filter(function (i) { return !i.folder; });
    }
    if (!state.recent || q) items.sort(state.sort === 'date' ? function (a, b) { return b.updated - a.updated; } : byName);

    var title = h('div', { class: 'h-title' });
    if (crumb !== null) {
      title.append(h('button', { class: 'crumb', onclick: function () { state.cwd = null; render(); } }, 'E-mails'), h('span', { class: 'sep' }, '/'), h('span', null, crumb));
    } else {
      title.append(h('span', null, q ? 'Resultados' : (state.recent ? 'Recentes' : 'E-mails')));
    }
    title.append(h('span', { class: 'badge' + (idx.items.length >= Store.MAX_ITEMS ? ' full' : '') }, idx.items.length + ' / ' + Store.MAX_ITEMS));

    var tools = h('div', { class: 'h-tools' },
      h('button', { class: 'btn' + (state.recent ? ' on' : ''), onclick: function () { state.recent = !state.recent; state.cwd = null; render(); } }, '🕘 Recentes'),
      h('div', { class: 'seg' },
        h('button', { class: state.view === 'grid' ? 'on' : '', title: 'Grade', onclick: function () { state.view = 'grid'; render(); } }, '▦'),
        h('button', { class: state.view === 'list' ? 'on' : '', title: 'Lista', onclick: function () { state.view = 'list'; render(); } }, '☰')),
      (function () {
        var s = h('select', { class: 'sel' }, h('option', { value: 'name', selected: state.sort === 'name' }, '↓ Nome'), h('option', { value: 'date', selected: state.sort === 'date' }, '↓ Data'));
        s.addEventListener('change', function () { state.sort = s.value; render(); });
        return s;
      })());
    main.append(h('div', { class: 'h-head' }, title, tools));

    if (showFolders && folders.length) {
      var fg = h('div', { class: 'grid folders' });
      folders.forEach(function (f) { fg.append(folderCard(f)); });
      main.append(fg);
    }

    var showF = !!(q || state.recent);
    if (items.length) {
      if (state.view === 'list') {
        var list = h('div', { class: 'elist' });
        items.forEach(function (i) { list.append(emailRow(i)); });
        main.append(list);
      } else {
        var g = h('div', { class: 'grid emails' });
        items.forEach(function (i) { g.append(emailCard(i, showF)); });
        main.append(g);
      }
    } else if (!folders.length) {
      main.append(h('div', { class: 'empty' }, h('div', { class: 'big' }, q ? '🔍' : '✉️'),
        h('div', null, q ? 'Nada encontrado para "' + state.q + '".' : 'Nenhum e-mail aqui ainda.'),
        q ? null : h('button', { class: 'btn primary', style: 'margin-top:12px', onclick: openNew }, '+ Nova mensagem')));
    }
  }

  function renderTemplates(main) {
    main.append(h('div', { class: 'h-head' }, h('div', { class: 'h-title' }, h('span', null, 'Modelos'))));
    main.append(h('div', { class: 'hint', style: 'margin:0 0 14px' }, 'Escolha um modelo para criar um novo e-mail' + (state.cwd ? ' na pasta "' + folderName(state.cwd) + '"' : '') + '.'));
    var g = h('div', { class: 'grid emails' });
    MS.templates.forEach(function (t) {
      g.append(h('div', { class: 'ecard', onclick: function () { createEmail(t.make, t.name === 'Em branco' ? 'Novo e-mail' : t.name, state.cwd); } },
        thumbEl(thumbData(t.make())),
        h('div', { class: 'einfo' }, h('div', { class: 'ename' }, t.name), h('div', { class: 'emeta' }, t.desc))));
    });
    main.append(g);
  }

  /* ---------- eventos fixos da tela inicial ---------- */
  $('#h-new').addEventListener('click', function () { openNew(); });
  $('#h-new-more').addEventListener('click', function (e) {
    e.stopPropagation();
    popMenu($('#h-new-more'), [
      { label: 'Novo e-mail (escolher modelo)', fn: openNew },
      { label: 'Nova pasta', fn: newFolder },
      { label: 'Importar backup (.json)', fn: function () { $('#h-file').click(); } }
    ]);
  });
  $('#h-file').addEventListener('change', function (e) { if (e.target.files[0]) importJson(e.target.files[0]); e.target.value = ''; });
  $('#h-search').addEventListener('input', function (e) { state.q = e.target.value; if (state.page !== 'emails') state.page = 'emails'; render(); });
  document.querySelectorAll('.h-nav button').forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.dataset.page === 'cfg') { MS.openConfig(); return; }
      state.page = b.dataset.page; if (state.page === 'emails') { state.cwd = null; state.recent = false; } state.q = ''; $('#h-search').value = ''; render();
    });
  });
  $('#h-note-btn').addEventListener('click', function () { MS.openConfig(); });
  MS.hooks.cfg = function () { init(); };

  /* ---------- rotas ---------- */
  function showHome() {
    document.body.classList.remove('in-editor');
    document.title = 'Mail Studio · LA Marketing';
    current = null; MS.hooks.save = null; state.page = 'emails';
    $('#h-body').innerHTML = '<div class="hint">Carregando…</div>';
    refresh().then(render);
  }

  function openEditor(id) {
    $('#h-body').innerHTML = '';
    Promise.all([Store.loadIndex(), Store.loadDoc(id)]).then(function (r) {
      idx = r[0];
      var it = idx.items.filter(function (x) { return x.id === id; })[0], d = r[1];
      if (!it || !d) { ui.toast('E-mail não encontrado.', true); location.hash = '#/'; return; }
      d.name = it.name;
      current = id;
      MS.hooks.save = function (doc) {
        return Store.saveDoc(id, doc).then(function () {
          return Store.mutateIndex(function (ix) {
            ix.items.forEach(function (x) { if (x.id === id) { x.name = doc.name || x.name; x.updated = Date.now(); x.th = thumbData(doc); } });
          });
        });
      };
      MS.openDoc(d);
      document.title = it.name + ' · Mail Studio';
      document.body.classList.add('in-editor');
    }).catch(function (e) { fail(e); location.hash = '#/'; });
  }

  function route() {
    var m = /^#\/e\/([a-z0-9]+)$/.exec(location.hash);
    if (m) { if (current !== m[1]) MS.flush().catch(function () {}).then(function () { openEditor(m[1]); }); return; }
    MS.flush().catch(function () {}).then(showHome);
  }
  window.addEventListener('hashchange', route);

  function init() { route(); }
  init();
})();
