<?php
/**
 * CONFIGURAÇÃO DO SERVIDOR (lida de variáveis de ambiente; nenhum segredo fica no código).
 *   UPLOAD_TOKEN     senha do upload de imagens
 *   ALLOWED_ORIGINS  endereços do editor autorizados, separados por vírgula
 */
$__tok = getenv('UPLOAD_TOKEN');
define('UPLOAD_TOKEN', ($__tok !== false && $__tok !== '') ? $__tok : 'troque-esta-senha');

// Tamanho máximo por imagem (bytes). 5 MB por padrão.
define('UPLOAD_MAX_BYTES', 5 * 1024 * 1024);

$__orig = getenv('ALLOWED_ORIGINS');
define('ALLOWED_ORIGINS', ($__orig !== false && $__orig !== '')
    ? array_values(array_filter(array_map('trim', explode(',', $__orig))))
    : ['https://mailstudio.lamarketing.com.br']);
