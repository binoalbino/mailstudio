<?php
/**
 * Página pública da prévia (o que o cliente abre).
 *   ver.php?t=TOKEN            moldura com botões Desktop/Celular
 *   ver.php?t=TOKEN&raw=1      o e-mail em si (carregado dentro da moldura)
 * Não exige senha: o acesso é pelo link secreto criado em share.php.
 */
date_default_timezone_set('America/Sao_Paulo');

header('X-Robots-Tag: noindex, nofollow, noarchive');
header('Referrer-Policy: no-referrer');
header('Cache-Control: no-store');

function page($code, $title, $msg)
{
    http_response_code($code);
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<meta name="robots" content="noindex,nofollow"><title>' . htmlspecialchars($title) . '</title>'
        . '<style>body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#eef0f3;color:#222;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:20px}'
        . '.c{background:#fff;border-radius:12px;padding:32px 28px;max-width:420px;text-align:center;box-shadow:0 2px 14px rgba(0,0,0,.08)}h1{font-size:20px;margin:0 0 10px}p{margin:0;color:#555;line-height:1.5}</style>'
        . '</head><body><div class="c"><h1>' . htmlspecialchars($title) . '</h1><p>' . htmlspecialchars($msg) . '</p></div></body></html>';
    exit;
}

$t = $_GET['t'] ?? '';
if (!preg_match('/^[a-f0-9]{24}$/', $t)) {
    page(404, 'Link não encontrado', 'Confira se o endereço foi copiado por inteiro.');
}
$file = __DIR__ . '/data/share/' . $t . '.json';
$m = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
if (!is_array($m) || !isset($m['html'])) {
    page(404, 'Link não encontrado', 'Esta prévia não existe ou foi desativada. Peça um novo link a quem enviou.');
}
if (($m['expires'] ?? 0) < time()) {
    page(410, 'Prévia expirada', 'O prazo deste link terminou. Peça um novo link a quem enviou.');
}

// O e-mail em si: isolado (sandbox), sem scripts e sem acesso ao site.
if (($_GET['raw'] ?? '') === '1') {
    header('Content-Type: text/html; charset=utf-8');
    header('Content-Security-Policy: sandbox allow-popups allow-popups-to-escape-sandbox');
    echo $m['html'];
    exit;
}

// Conta a visualização (ignora robôs e pré-visualizadores de link como o do WhatsApp).
$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';
if (!preg_match('/bot|crawl|spider|facebookexternalhit|whatsapp|slack|telegram|preview|curl|wget|embedly|skype|discord|python|headless/i', $ua)) {
    $fp = @fopen($file, 'c+');
    if ($fp && flock($fp, LOCK_EX)) {
        $cur = json_decode((string) stream_get_contents($fp), true);
        if (is_array($cur)) {
            $cur['views'] = (int) ($cur['views'] ?? 0) + 1;
            $cur['last_view'] = time();
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, json_encode($cur, JSON_UNESCAPED_UNICODE));
        }
        flock($fp, LOCK_UN);
    }
    if ($fp) {
        fclose($fp);
    }
}

// Título e pré-cabeçalho definidos na edição (se vazios, usa o nome do e-mail / um texto padrão).
$title = trim((string) ($m['title'] ?? '')) !== '' ? $m['title'] : ($m['name'] ?: 'E-mail');
$name = htmlspecialchars($title, ENT_QUOTES, 'UTF-8');
$pre = htmlspecialchars(trim((string) ($m['preheader'] ?? '')) !== '' ? $m['preheader'] : 'Prévia para aprovação', ENT_QUOTES, 'UTF-8');
$until = date('d/m/Y', (int) $m['expires']);
$rawUrl = htmlspecialchars('?t=' . $t . '&raw=1', ENT_QUOTES, 'UTF-8');

header('Content-Type: text/html; charset=utf-8');
?><!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title><?= $name ?> · Prévia</title>
<style>
*{box-sizing:border-box}
html,body{height:100%}
body{margin:0;font-family:Arial,Helvetica,sans-serif;background:#e9ecf0;color:#222;display:flex;flex-direction:column}
header{background:#fff;border-bottom:1px solid #d9dde3;padding:10px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}
header .t{font-weight:700;font-size:15px;flex:1;min-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
header .t small{display:block;font-weight:400;color:#6b7280;font-size:12px;margin-top:2px}
.seg{display:inline-flex;border:1px solid #cfd4db;border-radius:8px;overflow:hidden}
.seg button{background:#fff;border:0;padding:7px 12px;font-size:13px;cursor:pointer;border-right:1px solid #cfd4db}
.seg button:last-child{border-right:0}
.seg button.on{background:#222;color:#fff}
main{flex:1;display:flex;justify-content:center;padding:16px;min-height:0}
iframe{border:0;background:#fff;width:100%;height:100%;border-radius:6px;box-shadow:0 2px 14px rgba(0,0,0,.12);transition:width .2s}
iframe.mobile{width:375px;max-width:100%}
footer{text-align:center;color:#7a8190;font-size:12px;padding:8px 12px 12px}
@media (max-width:700px){.seg{display:none}main{padding:0}iframe{border-radius:0;box-shadow:none}}
</style>
</head>
<body>
<header>
  <div class="t"><?= $name ?><small><?= $pre ?></small></div>
  <div class="seg" id="seg">
    <button type="button" data-m="" class="on">🖥 Computador</button>
    <button type="button" data-m="mobile">📱 Celular</button>
  </div>
</header>
<main><iframe id="f" src="<?= $rawUrl ?>" title="<?= $name ?>" sandbox="allow-popups allow-popups-to-escape-sandbox"></iframe></main>
<footer>Prévia para aprovação · o cronômetro mostra o tempo real restante · link privado, válido até <?= $until ?>.</footer>
<script>
(function(){
  var f=document.getElementById('f'),b=document.querySelectorAll('#seg button');
  Array.prototype.forEach.call(b,function(x){x.addEventListener('click',function(){
    Array.prototype.forEach.call(b,function(y){y.classList.remove('on')});
    x.classList.add('on'); f.className=x.getAttribute('data-m');
  });});
})();
</script>
</body>
</html>
