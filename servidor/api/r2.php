<?php
/**
 * Cliente mínimo para Cloudflare R2 (API compatível com S3, assinatura AWS SigV4), sem bibliotecas.
 * Variáveis de ambiente: R2_ACCOUNT_ID, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_PUBLIC_URL
 */

function r2_enabled()
{
    foreach (['R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_URL'] as $k) {
        if (!getenv($k)) {
            return false;
        }
    }
    return (bool)(getenv('R2_ENDPOINT') ?: getenv('R2_ACCOUNT_ID'));
}

/**
 * Calcula o cabeçalho Authorization (AWS Signature V4).
 * $headers: nome minúsculo => valor (já com host, x-amz-date e x-amz-content-sha256).
 */
function sigv4_authorization($method, $path, $query, array $headers, $payloadHash, $region, $service, $accessKey, $secretKey, $amzDate)
{
    ksort($headers);
    $canonHeaders = '';
    foreach ($headers as $k => $v) {
        $canonHeaders .= $k . ':' . trim(preg_replace('/\s+/', ' ', $v)) . "\n";
    }
    $signedHeaders = implode(';', array_keys($headers));
    $canonical = $method . "\n" . $path . "\n" . $query . "\n" . $canonHeaders . "\n" . $signedHeaders . "\n" . $payloadHash;
    $date = substr($amzDate, 0, 8);
    $scope = $date . '/' . $region . '/' . $service . '/aws4_request';
    $toSign = "AWS4-HMAC-SHA256\n" . $amzDate . "\n" . $scope . "\n" . hash('sha256', $canonical);
    $k = hash_hmac('sha256', $date, 'AWS4' . $secretKey, true);
    $k = hash_hmac('sha256', $region, $k, true);
    $k = hash_hmac('sha256', $service, $k, true);
    $k = hash_hmac('sha256', 'aws4_request', $k, true);
    $sig = hash_hmac('sha256', $toSign, $k);
    return [
        'signature' => $sig,
        'header' => 'AWS4-HMAC-SHA256 Credential=' . $accessKey . '/' . $scope . ', SignedHeaders=' . $signedHeaders . ', Signature=' . $sig,
    ];
}

/** Faz uma requisição ao bucket. Retorna [status HTTP, corpo] */
function r2_request($method, $key, $body = '', array $extra = [])
{
    // R2_ENDPOINT é opcional (testes ou outro serviço compatível com S3)
    $endpoint = rtrim(getenv('R2_ENDPOINT') ?: ('https://' . getenv('R2_ACCOUNT_ID') . '.r2.cloudflarestorage.com'), '/');
    $p = parse_url($endpoint);
    $host = $p['host'] . (isset($p['port']) ? ':' . $p['port'] : '');
    $path = '/' . rawurlencode(getenv('R2_BUCKET')) . '/' . implode('/', array_map('rawurlencode', explode('/', $key)));
    $amzDate = gmdate('Ymd\THis\Z');
    $hash = hash('sha256', $body);
    $headers = array_merge($extra, ['host' => $host, 'x-amz-content-sha256' => $hash, 'x-amz-date' => $amzDate]);
    $auth = sigv4_authorization($method, $path, '', $headers, $hash, 'auto', 's3', getenv('R2_ACCESS_KEY_ID'), getenv('R2_SECRET_ACCESS_KEY'), $amzDate);

    $send = ['Authorization: ' . $auth['header']];
    foreach ($headers as $k => $v) {
        if ($k !== 'host') {
            $send[] = $k . ': ' . $v;
        }
    }
    $ch = curl_init($endpoint . $path);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $send,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_NOBODY => $method === 'HEAD',
    ]);
    if ($method === 'PUT') {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $out = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($out === false) {
        return [0, $err];
    }
    return [$status, (string)$out];
}

function r2_exists($key)
{
    list($s) = r2_request('HEAD', $key);
    return $s === 200;
}

function r2_put($key, $bytes, $contentType)
{
    list($s, $b) = r2_request('PUT', $key, $bytes, [
        'content-type' => $contentType,
        'cache-control' => 'public, max-age=31536000, immutable',
    ]);
    return [$s >= 200 && $s < 300, $s, $b];
}
