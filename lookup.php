<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

const RATE_LIMIT_SECONDS = 2;
const API_TIMEOUT = 8;

function jsonResponse(array $data, int $status = 200): never
{
    http_response_code($status);

    echo json_encode(
        $data,
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );

    exit;
}

function getClientIp(): ?string
{
    $ip = $_SERVER['REMOTE_ADDR'] ?? null;

    if ($ip && filter_var($ip, FILTER_VALIDATE_IP)) {
        return $ip;
    }

    return null;
}

function getLookupTarget(): ?string
{
    $lookup = trim((string) ($_GET['lookup'] ?? ''));

    if ($lookup !== '') {
        // Only allow valid IP addresses.
        if (!filter_var($lookup, FILTER_VALIDATE_IP)) {
            return null;
        }

        return $lookup;
    }

    return getClientIp();
}

function isRateLimited(): bool
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_start();
    }

    $now = time();
    $lastLookup = $_SESSION['last_lookup'] ?? 0;

    if (($now - $lastLookup) < RATE_LIMIT_SECONDS) {
        return true;
    }

    $_SESSION['last_lookup'] = $now;

    return false;
}

/*
|--------------------------------------------------------------------------
| Rate limit
|--------------------------------------------------------------------------
*/

if (isRateLimited()) {
    jsonResponse([
        'success' => false,
        'error' => 'Rate limit: wait a moment.',
    ], 429);
}

/*
|--------------------------------------------------------------------------
| Get target IP
|--------------------------------------------------------------------------
*/

$target = getLookupTarget();

if ($target === null) {
    jsonResponse([
        'success' => false,
        'error' => 'Please enter a valid IP address.',
    ], 400);
}

/*
|--------------------------------------------------------------------------
| IP lookup API
|--------------------------------------------------------------------------
*/

$url = 'https://ipwho.is/' . rawurlencode($target);

$curl = curl_init($url);

if ($curl === false) {
    jsonResponse([
        'success' => false,
        'error' => 'Unable to initialize HTTP client.',
    ], 500);
}

curl_setopt_array($curl, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT => API_TIMEOUT,
    CURLOPT_HTTPHEADER => [
        'Accept: application/json',
    ],
    CURLOPT_USERAGENT => 'AK74-IP-Lookup/1.0',
]);

$response = curl_exec($curl);
$error = curl_error($curl);
$status = curl_getinfo($curl, CURLINFO_HTTP_CODE);

curl_close($curl);

/*
|--------------------------------------------------------------------------
| cURL error
|--------------------------------------------------------------------------
*/

if ($response === false) {
    jsonResponse([
        'success' => false,
        'error' => 'IP lookup service unavailable.',
        'details' => $error ?: null,
    ], 502);
}

/*
|--------------------------------------------------------------------------
| HTTP error
|--------------------------------------------------------------------------
*/

if ($status < 200 || $status >= 300) {
    jsonResponse([
        'success' => false,
        'error' => 'IP lookup service returned an error.',
        'status' => $status,
    ], 502);
}

/*
|--------------------------------------------------------------------------
| Decode API response
|--------------------------------------------------------------------------
*/

$data = json_decode($response, true);

if (!is_array($data)) {
    jsonResponse([
        'success' => false,
        'error' => 'Invalid response from IP lookup service.',
    ], 502);
}

/*
|--------------------------------------------------------------------------
| Return API response
|--------------------------------------------------------------------------
*/

echo json_encode(
    $data,
    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
);
