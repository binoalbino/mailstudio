/* Cronômetro: renderização em canvas (preview + GIF local) e montagem da URL do GIF dinâmico (PHP) */
(function (root) {
  'use strict';

  var FONTS = {
    oswald:     { label: 'Oswald',      css: 'ms-oswald',     weight: 700 },
    bebas:      { label: 'Bebas Neue',  css: 'ms-bebas',      weight: 400 },
    montserrat: { label: 'Montserrat',  css: 'ms-montserrat', weight: 700 },
    poppins:    { label: 'Poppins',     css: 'ms-poppins',    weight: 700 },
    robotomono: { label: 'Roboto Mono', css: 'ms-robotomono', weight: 700 }
  };

  var DEFAULT_LABELS = ['DIAS', 'HORAS', 'MIN', 'SEG'];

  function defaults() {
    var d = new Date(Date.now() + 3 * 86400000);
    var p = function (n) { return String(n).padStart(2, '0'); };
    return {
      end: d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T23:59',
      tz: '-03:00',
      w: 480,
      bg: '#111111', box: '#2b2b2b', fg: '#ffffff', lbl: '#a8a8a8',
      font: 'oswald', days: true, sep: true,
      labels: DEFAULT_LABELS.slice(),
      url: '', align: 'center', alt: 'Contagem regressiva'
    };
  }

  /** "2026-11-20T23:59" + "-03:00" -> timestamp unix (s) */
  function endTs(o) {
    var t = Date.parse(o.end + ':00' + (o.tz || '-03:00'));
    return isNaN(t) ? Math.floor(Date.now() / 1000) : Math.floor(t / 1000);
  }

  function parts(secs, showDays) {
    secs = Math.max(0, Math.floor(secs));
    var d = 0, h, m, s;
    if (showDays) { d = Math.floor(secs / 86400); secs -= d * 86400; }
    h = Math.floor(secs / 3600); secs -= h * 3600;
    m = Math.floor(secs / 60); s = secs - m * 60;
    return showDays ? [d, h, m, s] : [h, m, s];
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function height(w) { return Math.round(w * 0.26); }

  /** Desenha um quadro. ctx: CanvasRenderingContext2D de largura o.w e altura height(o.w) */
  function render(ctx, o, secs) {
    var W = o.w, H = height(W), f = FONTS[o.font] || FONTS.oswald;
    var vals = parts(secs, o.days), n = vals.length;
    var labels = (o.labels && o.labels.length ? o.labels : DEFAULT_LABELS);
    if (!o.days) labels = labels.slice(1);

    ctx.save();
    ctx.fillStyle = o.bg; ctx.fillRect(0, 0, W, H);

    var padX = Math.round(W * 0.04);
    var gap = Math.round(W * (o.sep ? 0.045 : 0.025));
    var bw = (W - padX * 2 - gap * (n - 1)) / n;
    var by = Math.round(H * 0.08), bh = Math.round(H * 0.60);
    var r = o.box ? Math.round(bh * 0.14) : 0;
    var fs = Math.round(bh * 0.80);
    var ls = Math.max(8, Math.round(H * 0.105));
    var labelY = by + bh + (H - by - bh) / 2;

    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    for (var i = 0; i < n; i++) {
      var x = padX + i * (bw + gap);
      if (o.box) {
        ctx.fillStyle = o.box;
        roundRect(ctx, x, by, bw, bh, r);
        ctx.fill();
      }
      ctx.fillStyle = o.fg;
      ctx.font = f.weight + ' ' + fs + 'px ' + f.css + ', Arial, sans-serif';
      var txt = pad(vals[i]);
      var m = ctx.measureText('0');
      var asc = m.actualBoundingBoxAscent || fs * 0.7;
      ctx.fillText(txt, x + bw / 2, by + bh / 2 + asc / 2);

      ctx.fillStyle = o.lbl;
      ctx.font = '700 ' + ls + 'px Arial, Helvetica, sans-serif';
      var ma = ctx.measureText('H');
      ctx.fillText(String(labels[i] || '').toUpperCase(), x + bw / 2, labelY + (ma.actualBoundingBoxAscent || ls * 0.7) / 2);

      if (o.sep && i < n - 1) {
        ctx.fillStyle = o.fg;
        ctx.font = f.weight + ' ' + Math.round(fs * 0.8) + 'px ' + f.css + ', Arial, sans-serif';
        var mc = ctx.measureText(':');
        ctx.fillText(':', x + bw + gap / 2, by + bh / 2 + asc / 2 - (mc.actualBoundingBoxAscent ? 0 : 0) - fs * 0.04);
      }
    }
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function loadFont(key) {
    var f = FONTS[key] || FONTS.oswald;
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return document.fonts.load(f.weight + ' 40px ' + f.css, '0123456789:');
  }

  /** Gera o GIF (Blob) com `frames` quadros, 1 por segundo, a partir de agora */
  function makeGif(o, frames, loop, onProgress) {
    return loadFont(o.font).then(function () {
      var W = o.w, H = height(W);
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      var ctx = cv.getContext('2d', { willReadFrequently: true });
      var left = endTs(o) - Math.floor(Date.now() / 1000);
      var count = Math.max(1, Math.min(frames, left + 1));
      var rgba = [];
      for (var i = 0; i < count; i++) {
        render(ctx, o, Math.max(0, left - i));
        rgba.push(new Uint8ClampedArray(ctx.getImageData(0, 0, W, H).data));
        if (onProgress) onProgress(i / count * 0.6);
      }
      var q = root.MSGif.quantize(rgba, [o.bg, o.box || o.bg, o.fg, o.lbl]);
      if (onProgress) onProgress(0.8);
      var bytes = root.MSGif.encode(W, H, q.frames, q.palette, { delay: 100, loop: loop ? 'infinite' : 'none' });
      if (onProgress) onProgress(1);
      return new Blob([bytes], { type: 'image/gif' });
    });
  }

  function hex(c) { return String(c || '').replace('#', ''); }

  /** URL do GIF dinâmico (countdown.php). base termina com "/" */
  function dynamicUrl(o, base) {
    var q = [
      'end=' + endTs(o), 'w=' + o.w,
      'bg=' + hex(o.bg), 'box=' + hex(o.box), 'fg=' + hex(o.fg), 'lbl=' + hex(o.lbl),
      'font=' + o.font, 'days=' + (o.days ? 1 : 0), 'sep=' + (o.sep ? 1 : 0),
      'l=' + encodeURIComponent((o.labels || DEFAULT_LABELS).join(','))
    ];
    return base + 'countdown.php?' + q.join('&');
  }

  root.MSCD = {
    FONTS: FONTS, DEFAULT_LABELS: DEFAULT_LABELS, defaults: defaults, endTs: endTs,
    height: height, render: render, makeGif: makeGif, dynamicUrl: dynamicUrl, loadFont: loadFont,
    secondsLeft: function (o) { return endTs(o) - Math.floor(Date.now() / 1000); }
  };
})(window);
