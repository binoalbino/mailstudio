/* Mini encoder de GIF animado (GIF89a, LZW) - sem dependências */
(function (root) {
  'use strict';

  function lzwEncode(indices, minCode) {
    var clear = 1 << minCode, eoi = clear + 1;
    var codeSize = minCode + 1, next = eoi + 1;
    var out = [], cur = 0, bits = 0;
    var table = new Map();

    function emit(code) {
      cur |= code << bits;
      bits += codeSize;
      while (bits >= 8) { out.push(cur & 255); cur >>>= 8; bits -= 8; }
    }

    emit(clear);
    var prefix = indices[0];
    for (var i = 1; i < indices.length; i++) {
      var k = indices[i];
      var key = (prefix << 8) | k;
      var found = table.get(key);
      if (found !== undefined) { prefix = found; continue; }
      emit(prefix);
      if (next === 4096) {
        emit(clear);
        next = eoi + 1;
        codeSize = minCode + 1;
        table.clear();
      } else {
        if (next >= (1 << codeSize)) codeSize++;
        table.set(key, next++);
      }
      prefix = k;
    }
    emit(prefix);
    emit(eoi);
    if (bits > 0) out.push(cur & 255);
    return out;
  }

  /**
   * frames: array de Uint8Array (índices de paleta), todos width*height
   * palette: array de [r,g,b] (até 256)
   * opts: { delay (centésimos), loop: 'none' | 'infinite' }
   */
  function encode(width, height, frames, palette, opts) {
    opts = opts || {};
    var delay = opts.delay == null ? 100 : opts.delay;
    var bitsN = 1;
    while ((1 << bitsN) < palette.length) bitsN++;
    if (bitsN < 2) bitsN = 2;
    var tableSize = 1 << bitsN;
    var minCode = bitsN;

    var buf = [];
    function w8(v) { buf.push(v & 255); }
    function w16(v) { buf.push(v & 255, (v >> 8) & 255); }
    function wstr(s) { for (var i = 0; i < s.length; i++) buf.push(s.charCodeAt(i)); }

    wstr('GIF89a');
    w16(width); w16(height);
    w8(0x80 | 0x70 | (bitsN - 1));
    w8(0); w8(0);
    for (var i = 0; i < tableSize; i++) {
      var c = palette[i] || [0, 0, 0];
      w8(c[0]); w8(c[1]); w8(c[2]);
    }
    if (opts.loop === 'infinite') {
      w8(0x21); w8(0xff); w8(11); wstr('NETSCAPE2.0'); w8(3); w8(1); w16(0); w8(0);
    }

    for (var f = 0; f < frames.length; f++) {
      w8(0x21); w8(0xf9); w8(4); w8(0x04); w16(delay); w8(0); w8(0);
      w8(0x2c); w16(0); w16(0); w16(width); w16(height); w8(0);
      w8(minCode);
      var data = lzwEncode(frames[f], minCode);
      for (var p = 0; p < data.length; p += 255) {
        var chunk = data.slice(p, p + 255);
        w8(chunk.length);
        for (var q = 0; q < chunk.length; q++) buf.push(chunk[q]);
      }
      w8(0);
    }
    w8(0x3b);
    return new Uint8Array(buf);
  }

  function hexToRgb(h) {
    h = String(h || '').replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    if (isNaN(n)) return [0, 0, 0];
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  /**
   * Converte quadros RGBA (Uint8ClampedArray) em índices com paleta global (<=256).
   * pinned: cores hex que devem ser preservadas exatamente.
   */
  function quantize(rgbaFrames, pinned) {
    var pinnedRgb = (pinned || []).map(hexToRgb);
    for (var shift = 0; shift <= 6; shift++) {
      var res = tryQuantize(rgbaFrames, pinnedRgb, shift);
      if (res) return res;
    }
    throw new Error('Falha ao reduzir paleta');
  }

  function tryQuantize(rgbaFrames, pinnedRgb, shift) {
    var map = new Map(), palette = [];
    function key(r, g, b) { return ((r >> shift) << 16) | ((g >> shift) << 8) | (b >> shift); }
    for (var p = 0; p < pinnedRgb.length; p++) {
      var c = pinnedRgb[p], kk = key(c[0], c[1], c[2]);
      if (!map.has(kk)) { map.set(kk, palette.length); palette.push(c); }
    }
    var out = [];
    for (var f = 0; f < rgbaFrames.length; f++) {
      var d = rgbaFrames[f], n = d.length / 4, idx = new Uint8Array(n);
      var lastKey = -1, lastIdx = 0;
      for (var i = 0, j = 0; i < n; i++, j += 4) {
        var r = d[j], g = d[j + 1], b = d[j + 2];
        var k = key(r, g, b);
        if (k === lastKey) { idx[i] = lastIdx; continue; }
        var v = map.get(k);
        if (v === undefined) {
          if (palette.length >= 256) return null;
          v = palette.length;
          map.set(k, v);
          palette.push([r, g, b]);
        }
        idx[i] = v; lastKey = k; lastIdx = v;
      }
      out.push(idx);
    }
    return { frames: out, palette: palette };
  }

  root.MSGif = { encode: encode, quantize: quantize, hexToRgb: hexToRgb };
})(typeof window !== 'undefined' ? window : globalThis);
