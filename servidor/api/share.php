<?php
/**
 * Compartilhamento de prévia do e-mail com clientes (link privado).
 *   POST ?a=put&id=ID   publica/atualiza a prévia  (corpo JSON: html, name, days)
 *   GET  ?a=info&id=ID  situação do link (compartilhado? validade, visualizações)
 *   POST ?a=del&id=ID   desativa o link
 * Autenticação: cabeçalho X-Token (mesma senha do upload).
 * O link do cliente é público, mas impossível de adivinhar (24 caracteres derivados da senha do servidor).
 * Quem abre o link usa ver.php.
 */
require __DIR__ . '/config.php';

const SHARE_MAX_BODY = 1600000;   // ~1,5 MB de HTML
const SHARE_MAX_FILES = 150;
const SHARE_DEFAULT_DAYS = 30;
const SHARE_MAX_DAYS = 90;

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && in_array($origin, ALLOWED_ORIGINS, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: X-Token, Content-Type');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

if (UPLOAD_TOKEN === 'troque-esta-senha') {
    fail(403, 'Defina a senha do servidor (variável UPLOAD_TOKEN) antes de usar.');
}
if (!hash_equals(UPLOAD_TOKEN, $_SERVER['HTTP_X_TOKEN'] ?? '')) {
    fail(401, 'Senha do servidor incorreta.');
}

$dir = __DIR__ . '/data/share/';
if (!is_dir($dir) && !@mkdir($dir, 0755, true)) {
    fail(500, 'Não foi possível criar a pasta de compartilhamento.');
}

function share_token($id)
{
    return substr(hash_hmac('sha256', 'share:' . $id, UPLOAD_TOKEN), 0, 24);
}

function valid_id()
{
    $id = $_GET['id'] ?? '';
    if (!preg_match('/^[a-z0-9]{6,16}$/', $id)) {
        fail(400, 'ID inválido.');
    }
    return $id;
}

function load_meta($file)
{
    $m = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
    return is_array($m) ? $m : null;
}

function write_atomic($path, $data)
{
    $tmp = $path . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (file_put_contents($tmp, $data, LOCK_EX) === false || !rename($tmp, $path)) {
        @unlink($tmp);
        fail(500, 'Falha ao gravar.');
    }
}

// Remove prévias vencidas há mais de 7 dias.
function purge_old($dir)
{
    foreach (glob($dir . '*.json') ?: [] as $f) {
        $m = load_meta($f);
        if (!$m || ($m['expires'] ?? 0) + 7 * 86400 < time()) {
            @unlink($f);
        }
    }
}

function info_payload($m, $token)
{
    return [
        'ok' => true,
        'shared' => $m !== null,
        'token' => $token,
        'expired' => $m !== null && ($m['expires'] ?? 0) < time(),
        'expires' => $m['expires'] ?? null,
        'updated' => $m['updated'] ?? null,
        'views' => $m['views'] ?? 0,
        'last_view' => $m['last_view'] ?? null,
    ];
}

$a = $_GET['a'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$id = valid_id();
$token = share_token($id);
$file = $dir . $token . '.json';

if ($a === 'info' && $method === 'GET') {
    echo json_encode(info_payload(load_meta($file), $token));
    exit;
}

if ($a === 'put' && $method === 'POST') {
    $raw = file_get_contents('php://input');
    if (strlen($raw) > SHARE_MAX_BODY) {
        fail(413, 'E-mail grande demais para compartilhar.');
    }
    $j = json_decode($raw, true);
    if (!is_array($j) || !isset($j['html']) || !is_string($j['html']) || strlen($j['html']) < 50) {
        fail(400, 'Conteúdo inválido.');
    }
    $days = (int) ($j['days'] ?? SHARE_DEFAULT_DAYS);
    if ($days < 1) {
        $days = SHARE_DEFAULT_DAYS;
    }
    if ($days > SHARE_MAX_DAYS) {
        $days = SHARE_MAX_DAYS;
    }
    purge_old($dir);
    $old = load_meta($file);
    if (!$old && count(glob($dir . '*.json') ?: []) >= SHARE_MAX_FILES) {
        fail(413, 'Limite de links ativos atingido. Desative links antigos.');
    }
    $now = time();
    $m = [
        'name' => mb_substr(trim((string) ($j['name'] ?? 'E-mail')), 0, 120),
        'title' => mb_substr(trim((string) ($j['title'] ?? '')), 0, 200),
        'preheader' => mb_substr(trim((string) ($j['preheader'] ?? '')), 0, 300),
        'html' => $j['html'],
        'created' => $old['created'] ?? $now,
        'updated' => $now,
        'expires' => $now + $days * 86400,
        'views' => $old['views'] ?? 0,
        'last_view' => $old['last_view'] ?? null,
    ];
    write_atomic($file, json_encode($m, JSON_UNESCAPED_UNICODE));
    echo json_encode(info_payload($m, $token));
    exit;
}

if ($a === 'del' && $method === 'POST') {
    if (is_file($file)) {
        @unlink($file);
    }
    echo json_encode(info_payload(null, $token));
    exit;
}

fail(400, 'Ação inválida.');
