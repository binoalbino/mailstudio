<?php
/**
 * Cronômetro em GIF animado (60 quadros, 1 por segundo), calculado no momento em que o e-mail é aberto.
 *
 * Exemplo:
 *   countdown.php?end=1795000000&w=480&bg=111111&box=2b2b2b&fg=ffffff&lbl=a8a8a8&font=oswald&days=1&sep=1&l=DIAS,HORAS,MIN,SEG
 *
 * Requisitos: PHP 7.4+ com extensão GD + FreeType (padrão na HostGator).
 */

error_reporting(0);

if (!function_exists('mb_strtoupper')) {
    function mb_strtoupper($s, $enc = null) { return strtoupper($s); }
}
if (!function_exists('mb_substr')) {
    function mb_substr($s, $a, $b = null, $enc = null) { return substr($s, $a, $b); }
}

const FONT_DIR = __DIR__ . '/fonts/';
const CACHE_DIR = __DIR__ . '/cache/';
const MAX_FRAMES = 60;
const SS = 2; // supersampling (suaviza bordas)

$FONTS = [
    'oswald'     => 'oswald.ttf',
    'bebas'      => 'bebas.ttf',
    'montserrat' => 'montserrat.ttf',
    'poppins'    => 'poppins.ttf',
    'robotomono' => 'robotomono.ttf',
];

function hexcolor($v, $default)
{
    $v = ltrim((string)$v, '#');
    if (preg_match('/^[0-9a-fA-F]{3}$/', $v)) {
        $v = $v[0] . $v[0] . $v[1] . $v[1] . $v[2] . $v[2];
    }
    if (!preg_match('/^[0-9a-fA-F]{6}$/', $v)) {
        $v = $default;
    }
    return strtolower($v);
}

function alloc($im, $hex)
{
    return imagecolorallocate($im, hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2)));
}

function fallback_gif()
{
    header('Content-Type: image/gif');
    header('Cache-Control: no-store');
    echo base64_decode('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7');
    exit;
}

function rrect($im, $x1, $y1, $x2, $y2, $r, $col)
{
    if ($r <= 0) {
        imagefilledrectangle($im, $x1, $y1, $x2, $y2, $col);
        return;
    }
    imagefilledrectangle($im, $x1 + $r, $y1, $x2 - $r, $y2, $col);
    imagefilledrectangle($im, $x1, $y1 + $r, $x2, $y2 - $r, $col);
    $d = $r * 2;
    imagefilledellipse($im, $x1 + $r, $y1 + $r, $d, $d, $col);
    imagefilledellipse($im, $x2 - $r, $y1 + $r, $d, $d, $col);
    imagefilledellipse($im, $x1 + $r, $y2 - $r, $d, $d, $col);
    imagefilledellipse($im, $x2 - $r, $y2 - $r, $d, $d, $col);
}

/** retorna [largura, ascendente] do texto em px */
function text_metrics($size_px, $font, $text)
{
    $b = imagettfbbox($size_px * 0.75, 0, $font, $text);
    return [$b[2] - $b[0], -$b[7], $b[0]];
}

function draw_text_center($im, $cx, $cy, $size_px, $font, $col, $text, $asc_ref)
{
    $m = text_metrics($size_px, $font, $text);
    $x = $cx - $m[0] / 2 - $m[2];
    $y = $cy + $asc_ref / 2;
    imagettftext($im, $size_px * 0.75, 0, (int)round($x), (int)round($y), $col, $font, $text);
}

function render_frame($p, $secs)
{
    $W = $p['w'];
    $H = (int)round($W * 0.26);
    $S = SS;
    $font = FONT_DIR . $p['fontfile'];
    $labfont = FONT_DIR . 'poppins.ttf';

    $h = $secs;
    $vals = [];
    if ($p['days']) {
        $d = intdiv($h, 86400);
        $h -= $d * 86400;
        $vals[] = $d;
    }
    $hh = intdiv($h, 3600);
    $h -= $hh * 3600;
    $mm = intdiv($h, 60);
    $ss = $h - $mm * 60;
    array_push($vals, $hh, $mm, $ss);
    $n = count($vals);
    $labels = $p['labels'];
    if (!$p['days']) {
        $labels = array_slice($labels, 1);
    }

    $im = imagecreatetruecolor($W * $S, $H * $S);
    imagealphablending($im, true);
    $cBg = alloc($im, $p['bg']);
    imagefilledrectangle($im, 0, 0, $W * $S, $H * $S, $cBg);
    $cBox = $p['box'] !== '' ? alloc($im, $p['box']) : null;
    $cFg = alloc($im, $p['fg']);
    $cLbl = alloc($im, $p['lbl']);

    $padX = (int)round($W * 0.04);
    $gap = (int)round($W * ($p['sep'] ? 0.045 : 0.025));
    $bw = ($W - $padX * 2 - $gap * ($n - 1)) / $n;
    $by = (int)round($H * 0.08);
    $bh = (int)round($H * 0.60);
    $r = $cBox !== null ? (int)round($bh * 0.14) : 0;
    $fs = (int)round($bh * 0.80);
    $ls = max(8, (int)round($H * 0.105));
    $labelY = $by + $bh + ($H - $by - $bh) / 2;

    $ascDigit = text_metrics($fs * $S, $font, '0')[1];
    $ascLabel = text_metrics($ls * $S, $labfont, 'H')[1];
    $ascSep = text_metrics((int)round($fs * 0.8) * $S, $font, ':')[1];

    for ($i = 0; $i < $n; $i++) {
        $x = $padX + $i * ($bw + $gap);
        if ($cBox !== null) {
            rrect($im, (int)round($x * $S), $by * $S, (int)round(($x + $bw) * $S) - 1, ($by + $bh) * $S - 1, $r * $S, $cBox);
        }
        $cx = ($x + $bw / 2) * $S;
        draw_text_center($im, $cx, ($by + $bh / 2) * $S, $fs * $S, $font, $cFg, sprintf('%02d', $vals[$i]), $ascDigit);
        $lab = mb_strtoupper($labels[$i] ?? '', 'UTF-8');
        if ($lab !== '') {
            draw_text_center($im, $cx, $labelY * $S, $ls * $S, $labfont, $cLbl, $lab, $ascLabel);
        }
        if ($p['sep'] && $i < $n - 1) {
            draw_text_center($im, ($x + $bw + $gap / 2) * $S, ($by + $bh / 2) * $S - $fs * 0.04 * $S, (int)round($fs * 0.8) * $S, $font, $cFg, ':', $ascDigit);
        }
    }

    $out = imagecreatetruecolor($W, $H);
    imagecopyresampled($out, $im, 0, 0, 0, 0, $W, $H, $W * $S, $H * $S);
    imagedestroy($im);
    imagetruecolortopalette($out, false, 24);
    ob_start();
    imagegif($out);
    $bytes = ob_get_clean();
    imagedestroy($out);
    return $bytes;
}

/** extrai paleta e dados LZW de um GIF de 1 quadro gerado pelo GD */
function parse_frame($g)
{
    $packed = ord($g[10]);
    $pos = 13;
    $gct = '';
    if ($packed & 0x80) {
        $size = 3 * (1 << (($packed & 7) + 1));
        $gct = substr($g, $pos, $size);
        $pos += $size;
    }
    while ($g[$pos] !== "\x2C") {
        if ($g[$pos] === "\x21") {
            $pos += 2;
            while (($len = ord($g[$pos])) !== 0) {
                $pos += $len + 1;
            }
            $pos++;
        } else {
            return null;
        }
    }
    $ipacked = ord($g[$pos + 9]);
    $pos += 10;
    $lct = $gct;
    if ($ipacked & 0x80) {
        $size = 3 * (1 << (($ipacked & 7) + 1));
        $lct = substr($g, $pos, $size);
        $pos += $size;
    }
    $start = $pos;
    $pos++;
    while (($len = ord($g[$pos])) !== 0) {
        $pos += $len + 1;
    }
    $pos++;
    return [$lct, substr($g, $start, $pos - $start)];
}

function build_gif($W, $H, $frames)
{
    $out = 'GIF89a' . pack('vv', $W, $H) . chr(0x70) . "\x00\x00";
    foreach ($frames as $bytes) {
        $f = parse_frame($bytes);
        if (!$f || strlen($f[0]) === 0) {
            continue;
        }
        $bits = (int)round(log(strlen($f[0]) / 3, 2));
        $out .= "\x21\xF9\x04\x04" . pack('v', 100) . "\x00\x00";
        $out .= "\x2C" . pack('vvvv', 0, 0, $W, $H) . chr(0x80 | ($bits - 1));
        $out .= $f[0] . $f[1];
    }
    return $out . "\x3B";
}

// ---------- parâmetros ----------
$labels = array_map(function ($s) {
    $s = preg_replace('/[^\p{L}\p{N} .\-]/u', '', $s);
    return mb_substr(trim($s), 0, 10, 'UTF-8');
}, explode(',', (string)($_GET['l'] ?? 'DIAS,HORAS,MIN,SEG')));
$labels = array_pad($labels, 4, '');

$fontKey = $_GET['font'] ?? 'oswald';
if (!isset($FONTS[$fontKey])) {
    $fontKey = 'oswald';
}

$boxRaw = $_GET['box'] ?? '2b2b2b';
$p = [
    'w'        => max(200, min(800, (int)($_GET['w'] ?? 480))),
    'bg'       => hexcolor($_GET['bg'] ?? '', '111111'),
    'box'      => $boxRaw === '' ? '' : hexcolor($boxRaw, '2b2b2b'),
    'fg'       => hexcolor($_GET['fg'] ?? '', 'ffffff'),
    'lbl'      => hexcolor($_GET['lbl'] ?? '', 'a8a8a8'),
    'fontfile' => $FONTS[$fontKey],
    'days'     => (int)($_GET['days'] ?? 1) === 1,
    'sep'      => (int)($_GET['sep'] ?? 1) === 1,
    'labels'   => $labels,
];

$end = (int)($_GET['end'] ?? 0);
if ($end <= 0 || !function_exists('imagettftext')) {
    fallback_gif();
}
$left = max(0, $end - time());
$count = (int)min(MAX_FRAMES, $left + 1);

$key = md5(json_encode($p) . 'v3');
$dir = CACHE_DIR . $key . '/';
if (!is_dir($dir)) {
    @mkdir($dir, 0755, true);
}

$frames = [];
for ($i = 0; $i < $count; $i++) {
    $t = max(0, $left - $i);
    $file = $dir . $t . '.gif';
    if (is_file($file)) {
        $frames[] = file_get_contents($file);
        continue;
    }
    $bytes = render_frame($p, $t);
    @file_put_contents($file, $bytes);
    $frames[] = $bytes;
}

// limpeza ocasional do cache (arquivos com mais de 3h)
if (mt_rand(1, 100) === 1) {
    foreach (glob(CACHE_DIR . '*/*.gif') ?: [] as $f) {
        if (filemtime($f) < time() - 10800) {
            @unlink($f);
        }
    }
}

$H = (int)round($p['w'] * 0.26);
$gif = build_gif($p['w'], $H, $frames);

header('Content-Type: image/gif');
header('Content-Length: ' . strlen($gif));
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');
echo $gif;
