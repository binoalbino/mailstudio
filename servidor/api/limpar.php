<?php
/**
 * Limpeza de imagens que nenhum e-mail do editor usa mais.
 * Só roda pelo terminal:
 *   php limpar.php                 simula (mostra o que seria apagado)
 *   php limpar.php --apply         apaga de verdade
 *   php limpar.php --dias=60       só considera imagens sem uso há mais de 60 dias (padrão 30)
 *
 * ATENÇÃO: uma imagem que não aparece mais em nenhum e-mail do editor pode ainda estar
 * em uma campanha já enviada (o HTML foi colado no Klaviyo, por exemplo). Apagar quebra
 * essa imagem nos e-mails antigos. Por isso o padrão é simular e esperar 30 dias.
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
$apply = in_array('--apply', $argv, true);
$days = 30;
foreach ($argv as $a) {
    if (preg_match('/^--dias=(\d+)$/', $a, $m)) {
        $days = (int)$m[1];
    }
}
$uploads = dirname(__DIR__) . '/uploads/';
$docs = __DIR__ . '/data/docs/';

$used = [];
foreach (glob($docs . '*.json') ?: [] as $file) {
    if (preg_match_all('#/uploads/\d{6}/([a-f0-9]{16,40}\.(?:jpg|png|gif|webp))#i', str_replace('\\/', '/', file_get_contents($file)), $m)) {
        foreach ($m[1] as $n) {
            $used[strtolower($n)] = true;
        }
    }
}

$limit = time() - $days * 86400;
$total = 0;
$free = 0;
$count = 0;
foreach (glob($uploads . '*/*') ?: [] as $f) {
    if (!is_file($f) || basename($f) === '.htaccess') {
        continue;
    }
    $total++;
    $name = strtolower(basename($f));
    if (isset($used[$name]) || filemtime($f) > $limit) {
        continue;
    }
    $count++;
    $free += filesize($f);
    echo ($apply ? 'apagando ' : 'apagaria  ') . $f . ' (' . round(filesize($f) / 1024) . " KB)\n";
    if ($apply) {
        @unlink($f);
    }
}
printf("\n%d imagens no total, %d sem uso há mais de %d dias, %.1f MB %s.\n", $total, $count, $days, $free / 1048576, $apply ? 'liberados' : 'seriam liberados (rode com --apply)');
