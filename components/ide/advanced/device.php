<?php
require __DIR__.'/status.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function device_reply(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data);
    exit;
}

if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') {
    device_reply(['ok'=>false, 'error'=>'Local requests only.'], 403);
}
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';
if ($action === 'status' && $method === 'GET') device_reply(['ok'=>true, 'state'=>advanced_script_status()]);
if ($action !== 'simulator' || !in_array($method, ['GET','POST'], true)) {
    device_reply(['ok'=>false, 'error'=>'Unsupported device request.'], 405);
}
$token = trim((string) @file_get_contents('/opt/codynick-simulator/token'));
if (!preg_match('/^[a-f0-9]{64}$/D', $token)) device_reply(['ok'=>false,'error'=>'Simulator is unavailable.'],503);
$body = '';
if ($method === 'POST') {
    if (($_SERVER['CONTENT_TYPE'] ?? '') !== 'application/json') device_reply(['ok'=>false,'error'=>'JSON required.'],415);
    $input = file_get_contents('php://input', false, null, 0, 262145);
    $data = is_string($input) && strlen($input) <= 262144 ? json_decode($input) : null;
    if (!is_object($data)) device_reply(['ok'=>false,'error'=>'Invalid simulation snapshot.'],400);
    $body = json_encode(['action'=>'restore_project', 'snapshot'=>$data]);
    if (!is_string($body) || strlen($body) > 262144) device_reply(['ok'=>false,'error'=>'Simulation snapshot is too large.'],413);
}
$context = stream_context_create(['http'=>[
    'method'=>$method, 'timeout'=>5, 'ignore_errors'=>true, 'follow_location'=>0,
    'header'=>"Content-Type: application/json\r\nAuthorization: Bearer {$token}\r\nConnection: close\r\n", 'content'=>$body,
]]);
$result = @file_get_contents('http://127.0.0.1:8091'.($method === 'GET' ? '/state' : '/command'), false, $context);
$state = is_string($result) ? json_decode($result, true) : null;
if (!is_array($state)) device_reply(['ok'=>false,'error'=>'Simulator is unavailable.'],503);
if ($method === 'POST' && ($state['ok'] ?? false) !== true) {
    device_reply(['ok'=>false,'error'=>$state['error'] ?? 'Simulation state could not be restored.'],400);
}
if ($method === 'GET' && !isset($state['scene'])) device_reply(['ok'=>false,'error'=>'Simulator is unavailable.'],503);
device_reply($state);
