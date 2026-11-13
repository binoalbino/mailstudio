<?php
/**
 * Armazenamento dos e-mails do editor (pastas e projetos), em arquivos JSON.
 *   GET  ?a=index          lista (pastas + e-mails)
 *   POST ?a=index          grava a lista (máximo de 100 e-mails)
 *   GET  ?a=doc&id=ID      lê um e-mail
 *   POST ?a=doc&id=ID      grava um e-mail
 *   POST ?a=docdel&id=ID   apaga um e-mail
 * Autenticação: cabeçalho X-Token (mesma senha do upload).
 */
require __DIR__ . '/config.php';

const MAX_ITEMS = 100;
const MAX_FOLDERS = 50;
const MAX_BODY = 700000;

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

$base = __DIR__ . '/data/';
$docs = $base . 'docs/';
if (!is_dir($docs) && !@mkdir($docs, 0755, true)) {
    fail(500, 'Não foi possível criar a pasta de dados.');
}

function body_json()
{
    $raw = file_get_contents('php://input');
    if (strlen($raw) > MAX_BODY) {
        fail(413, 'Conteúdo grande demais.');
    }
    $j = json_decode($raw, true);
    if (!is_array($j)) {
        fail(400, 'JSON inválido.');
    }
    return $j;
}

function write_atomic($path, $data)
{
    $tmp = $path . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (file_put_contents($tmp, $data, LOCK_EX) === false || !rename($tmp, $path)) {
        @unlink($tmp);
        fail(500, 'Falha ao gravar.');
    }
}

function valid_id()
{
    $id = $_GET['id'] ?? '';
    if (!preg_match('/^[a-z0-9]{6,16}$/', $id)) {
        fail(400, 'ID inválido.');
    }
    return $id;
}

$a = $_GET['a'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];

if ($a === 'index') {
    $file = $base . 'index.json';
    if ($method === 'GET') {
        $idx = is_file($file) ? json_decode(file_get_contents($file), true) : null;
        if (!is_array($idx)) {
            $idx = ['v' => 1, 'seeded' => false, 'folders' => [], 'items' => []];
        }
        echo json_encode(['ok' => true, 'index' => $idx]);
        exit;
    }
    if ($method === 'POST') {
        $idx = body_json();
        if (!isset($idx['items'], $idx['folders']) || !is_array($idx['items']) || !is_array($idx['folders'])) {
            fail(400, 'Formato inválido.');
        }
        if (count($idx['items']) > MAX_ITEMS) {
            fail(413, 'Limite de ' . MAX_ITEMS . ' e-mails atingido.');
        }
        if (count($idx['folders']) > MAX_FOLDERS) {
            fail(413, 'Limite de ' . MAX_FOLDERS . ' pastas atingido.');
        }
        write_atomic($file, json_encode($idx, JSON_UNESCAPED_UNICODE));
        echo json_encode(['ok' => true]);
        exit;
    }
}

if ($a === 'doc') {
    $id = valid_id();
    $file = $docs . $id . '.json';
    if ($method === 'GET') {
        $d = is_file($file) ? json_decode(file_get_contents($file), true) : null;
        echo json_encode(['ok' => true, 'doc' => $d]);
        exit;
    }
    if ($method === 'POST') {
        $d = body_json();
        if (!isset($d['rows'], $d['settings']) || !is_array($d['rows'])) {
            fail(400, 'E-mail inválido.');
        }
        if (!is_file($file) && count(glob($docs . '*.json') ?: []) >= MAX_ITEMS + 10) {
            fail(413, 'Limite de e-mails atingido.');
        }
        write_atomic($file, json_encode($d, JSON_UNESCAPED_UNICODE));
        echo json_encode(['ok' => true]);
        exit;
    }
}

if ($a === 'docdel' && $method === 'POST') {
    $id = valid_id();
    $file = $docs . $id . '.json';
    if (is_file($file)) {
        @unlink($file);
    }
    echo json_encode(['ok' => true]);
    exit;
}

fail(400, 'Ação inválida.');
