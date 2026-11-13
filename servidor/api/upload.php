<?php
/**
 * Upload de imagens para usar nos e-mails (retorna a URL pública).
 * POST multipart: campo "file". Cabeçalho: X-Token: <UPLOAD_TOKEN>
 */
require __DIR__ . '/config.php';

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
$ext = $types[$info[2]];
$sub = date('Ym');
$dir = dirname(__DIR__) . '/uploads/' . $sub . '/';
if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
    fail(500, 'Não foi possível criar a pasta de uploads.');
}
$name = bin2hex(random_bytes(8)) . '.' . $ext;
if (!move_uploaded_file($f['tmp_name'], $dir . $name)) {
    fail(500, 'Falha ao salvar o arquivo.');
}

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https';
$base = ($https ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/');
echo json_encode(['ok' => true, 'url' => $base . '/uploads/' . $sub . '/' . $name, 'width' => $info[0], 'height' => $info[1]]);
