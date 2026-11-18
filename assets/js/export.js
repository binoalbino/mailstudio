/* Geração do HTML de e-mail (tabelas, estilos inline, compatível com Gmail/Outlook/Apple Mail) */
(function (root) {
  'use strict';

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  };

  var FONT_OPTIONS = [
    ['Arial, Helvetica, sans-serif', 'Arial'],
    ['Verdana, Geneva, sans-serif', 'Verdana'],
    ['Tahoma, Geneva, sans-serif', 'Tahoma'],
    ['"Trebuchet MS", Helvetica, sans-serif', 'Trebuchet'],
    ['Georgia, "Times New Roman", serif', 'Georgia'],
    ['"Times New Roman", Times, serif', 'Times New Roman'],
    ['"Courier New", Courier, monospace', 'Courier New']
  ];

  var SOCIAL = {
    instagram: { label: 'Instagram', color: '#E1306C' },
    facebook:  { label: 'Facebook',  color: '#1877F2' },
    tiktok:    { label: 'TikTok',    color: '#111111' },
    youtube:   { label: 'YouTube',   color: '#FF0000' },
    whatsapp:  { label: 'WhatsApp',  color: '#25A244' },
    x:         { label: 'X',         color: '#111111' },
    pinterest: { label: 'Pinterest', color: '#E60023' },
    site:      { label: 'Site',      color: '#444444' }
  };

  function pad(p) {
    p = p || { t: 0, r: 0, b: 0, l: 0 };
    return p.t + 'px ' + p.r + 'px ' + p.b + 'px ' + p.l + 'px';
  }
  function wrap(inner, attrs) {
    return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"' + (attrs || '') + '><tr>' + inner + '</tr></table>';
  }
  function link(url, inner, style) {
    if (!url) return inner;
    return '<a href="' + esc(url) + '" target="_blank" style="' + (style || 'text-decoration:none;') + '">' + inner + '</a>';
  }

  /* ---------- texto ---------- */
  function finalizeText(html, b, s) {
    var t = document.createElement('div');
    t.innerHTML = html || '';
    t.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach(function (e) { e.remove(); });
    t.querySelectorAll('*').forEach(function (e) {
      Array.prototype.slice.call(e.attributes).forEach(function (a) {
        if (/^on/i.test(a.name) || a.name === 'contenteditable' || a.name === 'data-edit') e.removeAttribute(a.name);
      });
    });
    var mb = Math.round(b.size * 0.6);
    t.querySelectorAll('p,div').forEach(function (e) { e.style.margin = '0 0 ' + mb + 'px 0'; });
    t.querySelectorAll('h1').forEach(function (e) { e.style.cssText += ';margin:0 0 ' + mb + 'px 0;font-size:' + Math.round(b.size * 1.9) + 'px;line-height:1.2;'; });
    t.querySelectorAll('h2').forEach(function (e) { e.style.cssText += ';margin:0 0 ' + mb + 'px 0;font-size:' + Math.round(b.size * 1.4) + 'px;line-height:1.25;'; });
    t.querySelectorAll('ul,ol').forEach(function (e) { e.style.cssText += ';margin:0 0 ' + mb + 'px 0;padding-left:22px;'; });
    t.querySelectorAll('a').forEach(function (e) {
      e.setAttribute('target', '_blank');
      if (!e.style.color) e.style.color = s.linkColor;
      e.style.textDecoration = s.underline ? 'underline' : 'none';
    });
    t.querySelectorAll('font').forEach(function (e) {
      var sp = document.createElement('span');
      if (e.getAttribute('color')) sp.style.color = e.getAttribute('color');
      sp.innerHTML = e.innerHTML;
      e.replaceWith(sp);
    });
    var last = t.lastElementChild;
    if (last && /^(P|DIV|H1|H2|UL|OL)$/.test(last.tagName)) last.style.marginBottom = '0';
    return t.innerHTML;
  }

  /* ---------- blocos ---------- */
  var R = {};

  R.image = function (b, c) {
    var avail = Math.max(20, c.colPx - b.pad.l - b.pad.r);
    var px = Math.max(20, Math.round(avail * (b.widthPct || 100) / 100));
    var margin = b.align === 'center' ? 'margin:0 auto;' : (b.align === 'right' ? 'margin:0 0 0 auto;' : '');
    var src = b.src;
    if (!src) {
      if (c.editor) {
        return wrap('<td style="padding:' + pad(b.pad) + '"><div class="ph-img" style="height:' + Math.round(px * 0.45) + 'px"><span>Imagem</span><small>Selecione e envie ou cole a URL</small></div></td>');
      }
      src = 'https://placehold.co/' + px + 'x' + Math.round(px * 0.45) + '/eeeeee/999999?text=Imagem';
    }
    var img = '<img class="ms-img" src="' + esc(src) + '" alt="' + esc(b.alt) + '" width="' + px + '" style="display:block;border:0;outline:none;text-decoration:none;width:100%;max-width:' + px + 'px;height:auto;' + margin + '">';
    return wrap('<td align="' + b.align + '" style="padding:' + pad(b.pad) + '">' + link(b.url, img) + '</td>');
  };

  R.text = function (b, c, s) {
    var inner = c.editor ? (b.html || '') : finalizeText(b.html, b, s);
    var st = 'padding:' + pad(b.pad) + ';font-family:' + b.font + ';font-size:' + b.size + 'px;line-height:' + Math.round(b.size * b.lh) + 'px;color:' + b.color + ';text-align:' + b.align + ';';
    var ed = c.editor ? ' contenteditable="true" spellcheck="false" data-edit="' + b.id + '"' : '';
    return wrap('<td class="ms-text" align="' + b.align + '"' + ed + ' style="' + st + '">' + inner + '</td>');
  };

  R.button = function (b, c) {
    var full = !!b.full;
    var border = b.border ? 'border:' + b.borderW + 'px solid ' + b.borderColor + ';' : '';
    var a = '<a href="' + esc(b.url || '#') + '" target="_blank" style="display:' + (full ? 'block' : 'inline-block') + ';padding:' + b.padV + 'px ' + b.padH + 'px;font-family:' + b.font + ';font-size:' + b.size + 'px;font-weight:' + (b.bold ? 'bold' : 'normal') + ';color:' + b.color + ';text-decoration:none;text-align:center;border-radius:' + b.radius + 'px;">' + esc(b.text) + '</a>';
    var tbl = '<table role="presentation" cellpadding="0" cellspacing="0" border="0"' + (full ? ' width="100%"' : ' align="' + b.align + '"') + '><tr><td align="center" bgcolor="' + b.bg + '" style="background-color:' + b.bg + ';border-radius:' + b.radius + 'px;' + border + '">' + a + '</td></tr></table>';
    return wrap('<td align="' + b.align + '" style="padding:' + pad(b.pad) + '">' + tbl + '</td>');
  };

  R.spacer = function (b) {
    return wrap('<td height="' + b.height + '" style="height:' + b.height + 'px;line-height:' + b.height + 'px;font-size:1px;">&nbsp;</td>');
  };

  R.divider = function (b) {
    var w = b.widthPct || 100;
    var line = '<table role="presentation" width="' + w + '%" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td height="' + b.thick + '" style="border-top:' + b.thick + 'px ' + b.style + ' ' + b.color + ';font-size:1px;line-height:1px;height:' + b.thick + 'px;">&nbsp;</td></tr></table>';
    return wrap('<td style="padding:' + pad(b.pad) + '">' + line + '</td>');
  };

  R.social = function (b) {
    var cells = (b.items || []).map(function (it) {
      var n = SOCIAL[it.net] || SOCIAL.site;
      var col = b.uniform || n.color;
      return '<td style="padding:0 4px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="' + col + '" style="background-color:' + col + ';border-radius:' + b.radius + 'px;"><a href="' + esc(it.url || '#') + '" target="_blank" style="display:inline-block;padding:8px 14px;font-family:Arial,Helvetica,sans-serif;font-size:' + b.size + 'px;font-weight:bold;color:#ffffff;text-decoration:none;">' + n.label + '</a></td></tr></table></td>';
    }).join('');
    var inner = '<table role="presentation" align="' + b.align + '" cellpadding="0" cellspacing="0" border="0"><tr>' + cells + '</tr></table>';
    return wrap('<td align="' + b.align + '" style="padding:' + pad(b.pad) + '">' + inner + '</td>');
  };

  R.menu = function (b) {
    var items = b.items || [];
    var cw = b.spread ? ' width="' + Math.floor(100 / Math.max(1, items.length)) + '%"' : '';
    var cells = items.map(function (it) {
      return '<td align="center"' + cw + ' style="padding:' + b.padV + 'px ' + b.padH + 'px;"><a href="' + esc(it.url || '#') + '" target="_blank" style="font-family:' + b.font + ';font-size:' + b.size + 'px;font-weight:bold;color:' + (it.color || b.color) + ';text-decoration:none;text-transform:uppercase;">' + esc(it.text) + '</a></td>';
    }).join('');
    var tbl = '<table role="presentation" ' + (b.spread ? 'width="100%"' : 'align="center"') + ' cellpadding="0" cellspacing="0" border="0"><tr>' + cells + '</tr></table>';
    return wrap('<td align="center" bgcolor="' + b.bg + '" style="background-color:' + b.bg + ';padding:' + pad(b.pad) + '">' + tbl + '</td>');
  };

  R.html = function (b, c) {
    var code = (b.code || '');
    if (c.editor) code = code.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+="[^"]*"/gi, '');
    return wrap('<td style="padding:' + pad(b.pad) + '">' + code + '</td>');
  };

  R.countdown = function (b, c) {
    var w = Math.min(b.w, Math.max(120, c.colPx - b.pad.l - b.pad.r));
    var h = root.MSCD.height(b.w);
    var inner;
    if (c.editor) {
      inner = '<canvas class="cd-live" data-bid="' + b.id + '" style="display:block;max-width:100%;' + (b.align === 'center' ? 'margin:0 auto;' : (b.align === 'right' ? 'margin:0 0 0 auto;' : '')) + '"></canvas>';
    } else {
      var margin = b.align === 'center' ? 'margin:0 auto;' : (b.align === 'right' ? 'margin:0 0 0 auto;' : '');
      var src = c.cdSrc ? c.cdSrc(b) : root.MSCD.dynamicUrl(b, c.apiBase || 'https://SEU-SUBDOMINIO/api/');
      inner = link(b.url, '<img class="ms-img" src="' + esc(src) + '" alt="' + esc(b.alt) + '" width="' + b.w + '" height="' + h + '" style="display:block;border:0;width:100%;max-width:' + b.w + 'px;height:auto;' + margin + '">');
    }
    return wrap('<td align="' + b.align + '" style="padding:' + pad(b.pad) + '">' + inner + '</td>');
  };

  function blockHtml(b, c, s) {
    var fn = R[b.type];
    return fn ? fn(b, c, s) : '';
  }

  /* ---------- faixas ---------- */
  function rowHtml(row, s, opts) {
    opts = opts || {};
    var innerW = s.width - row.pad.l - row.pad.r;
    var bg = row.bg || s.contentBg;
    var cols = row.cols.map(function (blocks, i) {
      var pct = row.layout[i];
      var colPx = Math.round(innerW * pct / 100);
      var html = blocks.map(function (b) {
        var h = blockHtml(b, { colPx: colPx, editor: opts.editor, apiBase: opts.apiBase, cdSrc: opts.cdSrc }, s);
        return opts.editor ? '<div class="blk" data-bid="' + b.id + '">' + h + '</div>' : h;
      }).join('');
      if (!html) html = opts.editor ? '<div class="empty-col">Arraste um bloco aqui<br><small>ou clique em um bloco à esquerda</small></div>' : '&nbsp;';
      var attrs = opts.editor ? ' data-row="' + row.id + '" data-col="' + i + '"' : '';
      var colCls = opts.editor ? 'ms-col' + (row.noStack ? ' ms-keep' : '') : (row.noStack ? '' : 'ms-col');
      return '<td' + (colCls ? ' class="' + colCls + '"' : '') + attrs + ' width="' + pct + '%" valign="' + (row.valign || 'top') + '" style="width:' + pct + '%;vertical-align:' + (row.valign || 'top') + ';">' + html + '</td>';
    }).join('');
    var inner = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' + cols + '</tr></table>';
    var cls = row.hideMobile ? ' class="ms-hide-m"' : '';
    var tools = opts.editor ? '<div class="row-tools" data-row="' + row.id + '"></div>' : '';
    return '<tr' + (opts.editor ? ' data-rowtr="' + row.id + '"' : '') + '><td' + cls + ' bgcolor="' + bg + '" style="background-color:' + bg + ';padding:' + pad(row.pad) + ';' + (opts.editor ? 'position:relative;' : '') + '">' + tools + inner + '</td></tr>';
  }

  function rowsHtml(doc, opts) {
    return doc.rows.map(function (r) { return rowHtml(r, doc.settings, opts); }).join('\n');
  }

  /* ---------- documento completo ---------- */
  function buildHtml(doc, opts) {
    opts = opts || {};
    var s = doc.settings;
    var W = s.width;
    var css = [
      'body{margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}',
      'table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}',
      'img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}',
      'a{' + (s.underline ? '' : 'text-decoration:none;') + '}',
      'p{margin:0;}'
    ];
    if (s.responsive) {
      css.push('@media only screen and (max-width:' + (W + 20) + 'px){',
        '.ms-wrap{width:100%!important;max-width:100%!important;}',
        '.ms-col{display:block!important;width:100%!important;max-width:100%!important;}',
        '.ms-img{width:100%!important;height:auto!important;}',
        '.ms-hide-m{display:none!important;max-height:0!important;overflow:hidden!important;}',
        '}');
    }
    // Preenche o resto da linha de prévia com caracteres invisíveis, para o texto do corpo do e-mail não aparecer depois do pré-cabeçalho.
    var padReps = Math.max(80, Math.ceil((320 - String(s.preheader || '').length) / 4));
    var padding = new Array(padReps + 1).join('&#8199;&#847;&zwnj;&nbsp;');
    var pre = s.preheader ? '<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">' + esc(s.preheader) + padding + '</div>' : '';
    var ghostOpen = s.align === 'center' ? '<!--[if mso]><table role="presentation" width="' + W + '" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->' : '';
    var ghostClose = s.align === 'center' ? '<!--[if mso]></td></tr></table><![endif]-->' : '';

    return '<!DOCTYPE html>\n<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta http-equiv="X-UA-Compatible" content="IE=edge">\n<meta name="x-apple-disable-message-reformatting">\n<meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">\n<title>' + esc(s.title || doc.name || 'E-mail') + '</title>\n<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->\n<style>\n' + css.join('\n') + '\n</style>\n</head>\n<body style="margin:0;padding:0;background-color:' + s.bg + ';font-family:' + s.font + ';">\n' + pre +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="' + s.bg + '" style="background-color:' + s.bg + ';"><tr><td align="' + s.align + '" style="padding:0;">\n' + ghostOpen +
      '<table role="presentation" class="ms-wrap" width="' + W + '" cellpadding="0" cellspacing="0" border="0" align="' + s.align + '" style="width:100%;max-width:' + W + 'px;">\n' +
      rowsHtml(doc, { apiBase: opts.apiBase, cdSrc: opts.cdSrc }) + '\n</table>\n' + ghostClose + '\n</td></tr></table>\n</body>\n</html>';
  }

  /* ---------- código legível (identação + cores) ---------- */
  var VOID = { img: 1, br: 1, hr: 1, meta: 1, link: 1, input: 1 };
  var INLINE = { b: 1, strong: 1, i: 1, em: 1, u: 1, span: 1, font: 1, small: 1, sup: 1, sub: 1, s: 1, br: 1 };

  function prettyCss(css, ind) {
    var out = [], d = 0, parts = css.split(/([{};])/), buf = '';
    function pad2() { return new Array(ind + d + 1).join('  '); }
    parts.forEach(function (p) {
      if (p === '{') { out.push(pad2() + buf.trim() + ' {'); buf = ''; d++; }
      else if (p === ';') { if (buf.trim()) out.push(pad2() + buf.trim() + ';'); buf = ''; }
      else if (p === '}') { if (buf.trim()) out.push(pad2() + buf.trim() + ';'); buf = ''; d = Math.max(0, d - 1); out.push(pad2() + '}'); }
      else buf += p;
    });
    if (buf.trim()) out.push(pad2() + buf.trim());
    return out;
  }

  function splitTag(tag, indent) {
    var line = new Array(indent + 1).join('  ') + tag;
    if (line.length <= 110) return [line];
    var m = /^<([^\s>\/]+)([\s\S]*?)(\/?)>$/.exec(tag);
    if (!m) return [line];
    var attrs = [], re = /\s+([^\s=\/>]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g, a;
    while ((a = re.exec(m[2]))) attrs.push([a[1], a[2]]);
    if (attrs.length < 2) return [line];
    var pad1 = new Array(indent + 1).join('  '), pad2 = pad1 + '  ';
    var out = [pad1 + '<' + m[1]];
    attrs.forEach(function (at, i) {
      var txt = at[0];
      if (at[1] != null) {
        var v = at[1];
        if (at[0].toLowerCase() === 'style' && v.length > 70 && v.indexOf('url(') < 0 && v.charAt(0) === '"') {
          var decl = v.slice(1, -1).split(';').map(function (x) { return x.trim(); }).filter(Boolean);
          v = '"\n' + decl.map(function (x) { return pad2 + '  ' + x + ';'; }).join('\n') + '"';
        }
        txt += '=' + v;
      }
      out.push(pad2 + txt + (i === attrs.length - 1 ? m[3] + '>' : ''));
    });
    return out;
  }

  function pretty(html) {
    var toks = String(html).split(/(<!--[\s\S]*?-->|<style[\s\S]*?<\/style>|<[^>]+>)/).filter(function (t) { return t !== ''; });
    var lines = [], run = [], indent = 0, aStack = [], inA = 0;
    var pad = function () { return new Array(indent + 1).join('  '); };
    function flush() {
      if (!run.length) return;
      var t = run.join('').replace(/\s+/g, ' ').trim();
      run = [];
      if (t) lines.push(pad() + t);
    }
    function tagInfo(t) {
      var m = /^<(\/?)([a-zA-Z][^\s>\/]*)/.exec(t);
      return m ? { close: !!m[1], name: m[2].toLowerCase(), self: /\/>$/.test(t) } : null;
    }
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i];
      if (/^<!--/.test(t)) { flush(); lines.push(pad() + t.replace(/\s*\n\s*/g, ' ')); continue; }
      if (/^<style/i.test(t)) {
        flush();
        var sm = /^(<style[^>]*>)([\s\S]*?)(<\/style>)$/i.exec(t);
        lines.push(pad() + sm[1]);
        prettyCss(sm[2], indent + 1).forEach(function (l) { lines.push(l); });
        lines.push(pad() + sm[3]);
        continue;
      }
      if (t.charAt(0) !== '<') { run.push(t); continue; }
      if (/^<![^-]/.test(t) || /^<\?/.test(t)) { flush(); lines.push(pad() + t); continue; }
      var info = tagInfo(t);
      if (!info) { run.push(t); continue; }
      var n = info.name;
      if (INLINE[n]) { run.push(t); continue; }
      if (n === 'a') {
        if (!info.close) {
          var nx = toks[i + 1];
          var inl = nx !== undefined && (nx.charAt(0) !== '<' || (tagInfo(nx) && INLINE[tagInfo(nx).name]));
          aStack.push(inl);
          if (inl) { inA++; run.push(t); }
          else { flush(); splitTag(t, indent).forEach(function (l) { lines.push(l); }); indent++; }
        } else {
          var was = aStack.pop();
          if (was) { inA = Math.max(0, inA - 1); run.push(t); }
          else { flush(); indent = Math.max(0, indent - 1); lines.push(pad() + t); }
        }
        continue;
      }
      if (n === 'img' && (run.length || inA)) { run.push(t); continue; }
      flush();
      if (info.close) { indent = Math.max(0, indent - 1); lines.push(pad() + t); continue; }
      if (VOID[n] || info.self) { splitTag(t, indent).forEach(function (l) { lines.push(l); }); continue; }
      var t1 = toks[i + 1], t2 = toks[i + 2];
      if (t1 !== undefined && t1.charAt(0) !== '<' && t2 !== undefined) {
        var i2 = tagInfo(t2);
        if (i2 && i2.close && i2.name === n) { lines.push(pad() + t + t1.replace(/\s+/g, ' ').trim() + t2); i += 2; continue; }
      }
      if (t1 !== undefined) {
        var i1 = tagInfo(t1);
        if (i1 && i1.close && i1.name === n) { lines.push(pad() + t + t1); i += 1; continue; }
      }
      splitTag(t, indent).forEach(function (l) { lines.push(l); });
      indent++;
    }
    flush();
    return lines.join('\n');
  }

  function hesc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function hlCssLine(line) {
    var e = hesc(line);
    if (/\{\s*$/.test(e)) return e.replace(/^(\s*)(.*?)(\s*\{)\s*$/, '$1<span class="hs">$2</span>$3');
    return e.replace(/^(\s*)([a-zA-Z-]+)(\s*:)(.*?)(;?)\s*$/, '$1<span class="hp">$2</span>$3<span class="hv">$4</span>$5');
  }
  function hlTag(tag) {
    var m = /^<(\/?)([^\s>\/]+)([\s\S]*?)(\/?)>$/.exec(tag);
    if (!m) return hesc(tag);
    var attrs = m[3].replace(/(\s+)([^\s=\/>]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+))?/g, function (x, sp, name, eq, val) {
      var o = sp + '<span class="ha">' + hesc(name) + '</span>';
      if (val !== undefined) {
        var v = hesc(val);
        if (name.toLowerCase() === 'style') v = v.replace(/(^|[";\s])([a-zA-Z-]+)(\s*:)(?!\/\/)/g, '$1<span class="hp">$2</span>$3');
        o += hesc(eq) + '<span class="hv">' + v + '</span>';
      }
      return o;
    });
    return '&lt;' + m[1] + '<span class="ht">' + hesc(m[2]) + '</span>' + attrs + m[4] + '&gt;';
  }
  function highlight(code) {
    var parts = String(code).split(/(<!--[\s\S]*?-->|<style[\s\S]*?<\/style>|<[^>]+>)/);
    return parts.map(function (t) {
      if (t === '') return '';
      if (/^<!--/.test(t)) return '<span class="hc">' + hesc(t) + '</span>';
      if (/^<style/i.test(t)) {
        var sm = /^(<style[^>]*>)([\s\S]*?)(<\/style>)$/i.exec(t);
        return hlTag(sm[1]) + sm[2].split('\n').map(hlCssLine).join('\n') + hlTag(sm[3]);
      }
      if (/^<![^-]/.test(t)) return '<span class="hc">' + hesc(t) + '</span>';
      if (t.charAt(0) === '<') return hlTag(t);
      return hesc(t);
    }).join('');
  }

  /* ---------- partes do e-mail (para copiar só um bloco) ---------- */
  var TYPE_LABEL = { image: 'Imagem', text: 'Texto', button: 'Botão', spacer: 'Espaço', divider: 'Divisor', social: 'Redes', menu: 'Menu', html: 'HTML', countdown: 'Cronômetro' };
  function snippets(doc, opts) {
    var s = doc.settings, out = [];
    doc.rows.forEach(function (row, ri) {
      var innerW = s.width - row.pad.l - row.pad.r;
      row.cols.forEach(function (blocks, ci) {
        var colPx = Math.round(innerW * row.layout[ci] / 100);
        blocks.forEach(function (b) {
          var label = 'Faixa ' + (ri + 1) + (row.cols.length > 1 ? ', coluna ' + (ci + 1) : '') + ' · ' + (TYPE_LABEL[b.type] || b.type);
          if (b.type === 'text') { var tx = String(b.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); if (tx) label += ': ' + tx.slice(0, 28) + (tx.length > 28 ? '…' : ''); }
          if (b.type === 'button' && b.text) label += ': ' + b.text.slice(0, 28);
          out.push({ label: label, html: blockHtml(b, { colPx: colPx, apiBase: opts && opts.apiBase }, s) });
        });
      });
    });
    return out;
  }

  /* ---------- verificações antes de exportar ---------- */
  function lint(doc, opts) {
    var out = [];
    var apiOk = opts && opts.apiBase && /^https?:\/\//.test(opts.apiBase);
    var group = {};
    function add(key, lvl, where, singular, plural) {
      var g = group[key] || (group[key] = { lvl: lvl, where: where, singular: singular, plural: plural, n: 0 });
      g.n++;
    }
    var order = [];
    doc.rows.forEach(function (r, ri) {
      r.cols.forEach(function (col) {
        col.forEach(function (b) {
          var where = 'Faixa ' + (ri + 1), k;
          function g(name, lvl, sing, plur) { k = where + '|' + name; if (!group[k]) order.push(k); add(k, lvl, where, sing, plur); }
          if (b.type === 'image' && !b.src) g('imgsrc', 'err', 'imagem sem URL', 'imagens sem URL');
          if (b.type === 'image' && b.src && /^data:/.test(b.src)) g('imgb64', 'err', 'imagem em base64 (Gmail bloqueia; envie para o servidor)', 'imagens em base64 (Gmail bloqueia; envie para o servidor)');
          if (b.type === 'image' && b.src && !b.alt) g('imgalt', 'warn', 'imagem sem texto alternativo (ALT)', 'imagens sem texto alternativo (ALT)');
          if (b.type === 'button' && !b.url) g('btn', 'err', 'botão sem link', 'botões sem link');
          if (b.type === 'countdown' && !apiOk) g('cdapi', 'err', 'cronômetro sem o endereço público do servidor (veja ⚙ Configurações)', 'cronômetros sem o endereço público do servidor');
          if (b.type === 'countdown' && root.MSCD.secondsLeft(b) <= 0) g('cdold', 'warn', 'a data do cronômetro já passou', 'cronômetros com data já passada');
          if (b.type === 'menu' && (b.items || []).some(function (i) { return !i.url; })) g('menu', 'warn', 'item de menu sem link', 'menus com item sem link');
        });
      });
    });
    order.forEach(function (k) {
      var x = group[k];
      out.push({ lvl: x.lvl, msg: x.where + ': ' + (x.n > 1 ? x.n + ' ' + x.plural : x.singular) + '.' });
    });
    if (!doc.settings.preheader) out.push({ lvl: 'warn', msg: 'Sem pré-cabeçalho (texto de prévia na caixa de entrada).' });
    if (!doc.rows.length) out.push({ lvl: 'err', msg: 'O e-mail está vazio.' });
    return out;
  }

  root.MSExport = {
    esc: esc, FONT_OPTIONS: FONT_OPTIONS, SOCIAL: SOCIAL,
    blockHtml: blockHtml, rowHtml: rowHtml, rowsHtml: rowsHtml, buildHtml: buildHtml, lint: lint,
    pretty: pretty, highlight: highlight, snippets: snippets
  };
})(window);
