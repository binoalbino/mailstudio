<?php
/**
 * Upload de imagens para usar nos e-mails (retorna a URL pública).
 * POST multipart: campo "file". Cabeçalho: X-Token: <UPLOAD_TOKEN>
 *
 * Para poupar espaço no servidor, a imagem é:
 *   - reduzida para no máximo MAX_WIDTH px de largura (padrão 1200; basta para e-mail em tela retina);
 *   - recomprimida (JPEG qualidade 82, PNG e WEBP otimizados). GIFs animados ficam intactos;
 *   - guardada pelo hash do conteúdo, então a mesma imagem enviada duas vezes ocupa espaço uma vez só;
 *   - recusada se o total de /uploads passar de MAX_UPLOADS_MB (padrão 1500 MB).
 */
require __DIR__ . '/config.php';
require __DIR__ . '/r2.php';

const MAX_WIDTH = 1200;
const JPEG_QUALITY = 82;
const MAX_PIXELS = 40000000; // 40 megapixels, protege a memória

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: X-Token, Content-Type');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Max-Age: 86400');
}
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function fail($code, $msg)
{
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg]);
    exit;
}

function dir_size($dir)
{
    $total = 0;
    if (!is_dir($dir)) {
        return 0;
    }
    $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
    foreach ($it as $f) {
        if ($f->isFile()) {
            $total += $f->getSize();
        }
    }
    return $total;
}

/** Reduz e recomprime. Retorna [bytes, ext, largura, altura] */
function optimize($path, $type, $w, $h)
{
    @ini_set('memory_limit', '512M');
    if ($type === IMAGETYPE_GIF) {
        return [file_get_contents($path), 'gif', $w, $h]; // preserva animação
    }
    $im = null;
    if ($type === IMAGETYPE_JPEG) {
        $im = @imagecreatefromjpeg($path);
        if ($im && function_exists('exif_read_data')) {
            $exif = @exif_read_data($path);
            $o = $exif['Orientation'] ?? 1;
            $angle = [3 => 180, 6 => -90, 8 => 90][$o] ?? 0;
            if ($angle) {
                $rot = imagerotate($im, $angle, 0);
                if ($rot) {
                    imagedestroy($im);
                    $im = $rot;
                }
            }
        }
    } elseif ($type === IMAGETYPE_PNG) {
        $im = @imagecreatefrompng($path);
    } elseif ($type === IMAGETYPE_WEBP && function_exists('imagecreatefromwebp')) {
        $im = @imagecreatefromwebp($path);
    }
    if (!$im) {
        return null;
    }
    $w = imagesx($im);
    $h = imagesy($im);
    if ($w > MAX_WIDTH) {
        $nh = (int)round($h * MAX_WIDTH / $w);
        $dst = imagecreatetruecolor(MAX_WIDTH, $nh);
        if ($type !== IMAGETYPE_JPEG) {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            imagefill($dst, 0, 0, imagecolorallocatealpha($dst, 0, 0, 0, 127));
        }
        imagecopyresampled($dst, $im, 0, 0, 0, 0, MAX_WIDTH, $nh, $w, $h);
        imagedestroy($im);
        $im = $dst;
        $w = MAX_WIDTH;
        $h = $nh;
    }
    ob_start();
    if ($type === IMAGETYPE_JPEG) {
        imageinterlace($im, true);
        imagejpeg($im, null, JPEG_QUALITY);
        $ext = 'jpg';
    } elseif ($type === IMAGETYPE_PNG) {
        imagesavealpha($im, true);
        imagepng($im, null, 9);
        $ext = 'png';
    } else {
        imagesavealpha($im, true);
        imagewebp($im, null, JPEG_QUALITY);
        $ext = 'webp';
    }
    $bytes = ob_get_clean();
    imagedestroy($im);
    return [$bytes, $ext, $w, $h];
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    fail(405, 'Use POST.');
}
if (UPLOAD_TOKEN === 'troque-esta-senha') {
    fail(403, 'Defina a senha em api/config.php antes de usar o upload.');
}
$token = $_SERVER['HTTP_X_TOKEN'] ?? '';
if (!hash_equals(UPLOAD_TOKEN, $token)) {
    fail(401, 'Senha de upload incorreta.');
}
if (empty($_FILES) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 7 * 1048576) {
    fail(413, 'Arquivo maior que o limite do servidor (6 MB).');
}
if (!empty($_FILES['file']) && in_array($_FILES['file']['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) {
    fail(413, 'Arquivo maior que o limite do servidor (6 MB).');
}
if (empty($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    fail(400, 'Nenhum arquivo recebido.');
}
$f = $_FILES['file'];
if ($f['size'] > UPLOAD_MAX_BYTES) {
    fail(413, 'Arquivo maior que o limite.');
}
$info = @getimagesize($f['tmp_name']);
$types = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_GIF => 'gif', IMAGETYPE_WEBP => 'webp'];
if (!$info || !isset($types[$info[2]])) {
    fail(415, 'Envie apenas JPG, PNG, GIF ou WEBP.');
}
if ($info[0] * $info[1] > MAX_PIXELS) {
    fail(413, 'Imagem com resolução grande demais. Reduza antes de enviar.');
}

$root = dirname(__DIR__) . '/uploads/';
$maxBytes = (int)(getenv('MAX_UPLOADS_MB') ?: 1500) * 1048576;
if (!r2_enabled() && dir_size($root) >= $maxBytes) {
    fail(507, 'O espaço de imagens do servidor está cheio. Rode a limpeza (limpar.php) ou aumente MAX_UPLOADS_MB.');
}

$opt = optimize($f['tmp_name'], $info[2], $info[0], $info[1]);
if ($opt === null) {
    // não foi possível reprocessar: guarda o original
    $opt = [file_get_contents($f['tmp_name']), $types[$info[2]], $info[0], $info[1]];
}
list($bytes, $ext, $w, $h) = $opt;
// se a otimização não ajudou, fica com o original
if (strlen($bytes) >= $f['size'] && $ext === $types[$info[2]] && $w === $info[0]) {
    $bytes = file_get_contents($f['tmp_name']);
}

$hash = substr(sha1($bytes), 0, 20);
$mime = ['jpg' => 'image/jpeg', 'png' => 'image/png', 'gif' => 'image/gif', 'webp' => 'image/webp'][$ext];

if (r2_enabled()) {
    // armazenamento no Cloudflare R2 (nome pelo conteúdo: a mesma imagem não é enviada duas vezes)
    $key = 'i/' . $hash . '.' . $ext;
    $reused = r2_exists($key);
    if (!$reused) {
        list($okPut, $st, $msg) = r2_put($key, $bytes, $mime);
        if (!$okPut) {
            error_log('R2 PUT falhou: ' . $st . ' ' . substr($msg, 0, 300));
            fail(502, 'Não foi possível salvar a imagem no armazenamento (R2). Código ' . $st . '.');
        }
    }
    echo json_encode([
        'ok' => true,
        'url' => rtrim(getenv('R2_PUBLIC_URL'), '/') . '/' . $key,
        'width' => $w,
        'height' => $h,
        'bytes' => strlen($bytes),
        'original_bytes' => (int)$f['size'],
        'reused' => $reused,
    ]);
    exit;
}

$sub = date('Ym');
$dir = $root . $sub . '/';
if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
    fail(500, 'Não foi possível criar a pasta de uploads.');
}
$name = $hash . '.' . $ext;
$existing = glob($root . '*/' . $name);
if ($existing) {
    // mesma imagem já enviada antes: reaproveita (e renova a data para a limpeza não apagar)
    @touch($existing[0]);
    $sub = basename(dirname($existing[0]));
    $reused = true;
} else {
    if (file_put_contents($dir . $name, $bytes, LOCK_EX) === false) {
        fail(500, 'Falha ao salvar o arquivo.');
    }
    $reused = false;
}

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
$base = ($https ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/');
echo json_encode([
    'ok' => true,
    'url' => $base . '/uploads/' . $sub . '/' . $name,
    'width' => $w,
    'height' => $h,
    'bytes' => strlen($bytes),
    'original_bytes' => (int)$f['size'],
    'reused' => $reused,
]);
