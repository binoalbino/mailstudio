/* Armazenamento dos e-mails: servidor (projects.php) quando configurado; senão, neste navegador. */
(function (root) {
  'use strict';

  var MAX_ITEMS = 100;
  var MAX_FOLDERS = 50;
  var getCfg = function () { return {}; };

  function server() {
    var c = getCfg() || {};
    return /^https?:\/\//.test(c.apiBase || '') && c.token ? c : null;
  }

  function api(action, id, body) {
    var c = server();
    var url = c.apiBase + 'projects.php?a=' + action + (id ? '&id=' + encodeURIComponent(id) : '');
    var opt = { headers: { 'X-Token': c.token } };
    if (body !== undefined) {
      opt.method = 'POST';
      opt.headers['Content-Type'] = 'application/json';
      opt.body = JSON.stringify(body);
    }
    return fetch(url, opt).then(function (r) {
      return r.json().catch(function () { throw new Error('Resposta inválida do servidor (' + r.status + ').'); });
    }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'Erro no servidor.');
      return j;
    }, function (e) {
      if (e instanceof TypeError) throw new Error('Não foi possível conectar ao servidor.');
      throw e;
    });
  }

  function lget(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lset(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); }
    catch (e) { throw new Error('Armazenamento do navegador cheio. Configure o servidor em Configurações.'); }
  }

  function emptyIndex() { return { v: 1, seeded: false, folders: [], items: [] }; }

  var Store = {
    MAX_ITEMS: MAX_ITEMS,
    MAX_FOLDERS: MAX_FOLDERS,
    init: function (fn) { getCfg = fn; },
    mode: function () { return server() ? 'server' : 'local'; },

    loadIndex: function () {
      if (server()) return api('index').then(function (j) { return j.index; });
      return Promise.resolve(lget('ms_index') || emptyIndex());
    },
    saveIndex: function (idx) {
      if (server()) return api('index', null, idx);
      try { lset('ms_index', idx); return Promise.resolve(); } catch (e) { return Promise.reject(e); }
    },
    /** lê o índice mais recente, aplica fn e grava */
    mutateIndex: function (fn) {
      return Store.loadIndex().then(function (idx) {
        var r = fn(idx);
        return Store.saveIndex(idx).then(function () { return idx; });
      });
    },
    loadDoc: function (id) {
      if (server()) return api('doc', id).then(function (j) { return j.doc; });
      return Promise.resolve(lget('ms_d_' + id));
    },
    saveDoc: function (id, doc) {
      if (server()) return api('doc', id, doc);
      try { lset('ms_d_' + id, doc); return Promise.resolve(); } catch (e) { return Promise.reject(e); }
    },
    deleteDoc: function (id) {
      if (server()) return api('docdel', id, {});
      try { localStorage.removeItem('ms_d_' + id); } catch (e) {}
      return Promise.resolve();
    }
  };

  root.MSStore = Store;
})(window);
