<?php
require __DIR__.'/archive.php';
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function reply(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo advanced_project_json($data);
}

function project_name($value): string {
    $name = is_string($value) ? trim($value) : '';
    if ($name === '' || strlen($name) > 120 || !preg_match('//u', $name)
        || preg_match('~[\x00-\x1f\x7f/\\\\]~', $name)) {
        throw new InvalidArgumentException('Use a project name up to 120 bytes without slashes.');
    }
    return $name;
}

function project_directory(): string {
    $dir = __DIR__.'/../blocks/data/advanced/projects';
    if (is_link(dirname($dir)) || is_link($dir)
        || (!is_dir($dir) && !@mkdir($dir, 0750, true) && !is_dir($dir))) {
        throw new RuntimeException('The project directory is unavailable.');
    }
    return $dir;
}

function serve_projects(): void {
    if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '') === 'cross-site') {
        reply(['ok'=>false,'error'=>'Local requests only.'], 403);
        return;
    }
    if (!class_exists('ZipArchive')) throw new RuntimeException('The Pi ZIP extension is unavailable.');
    $action = $_GET['action'] ?? '';
    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'GET' && $action === 'list') {
        $items = [];
        foreach (new DirectoryIterator(project_directory()) as $file) {
            if (!$file->isFile() || $file->isLink() || $file->getExtension() !== 'codynick') continue;
            $name = base64_decode(strtr($file->getBasename('.codynick'), '-_', '+/'), true);
            if ($name !== false && preg_match('//u', $name)) $items[] = $name;
        }
        natcasesort($items);
        reply(['ok'=>true, 'projects'=>array_values($items)]);
        return;
    }
    if ($method === 'GET' && $action === 'load') {
        $name = project_name($_GET['name'] ?? null);
        $path = project_directory().'/'.rtrim(strtr(base64_encode($name), '+/', '-_'), '=').'.codynick';
        if (is_link($path) || !is_file($path)) {
            reply(['ok'=>false, 'error'=>'Project not found.'], 404);
            return;
        }
        reply(['ok'=>true, 'project'=>advanced_project_decode($path)]);
        return;
    }
    $type = $action === 'decode' ? 'application/octet-stream' : 'application/json';
    if ($method !== 'POST' || !in_array($action, ['decode','encode','save'], true)
        || ($_SERVER['CONTENT_TYPE'] ?? '') !== $type) {
        reply(['ok'=>false, 'error'=>'Unsupported project request.'], 405);
        return;
    }
    $body = file_get_contents('php://input', false, null, 0, ADVANCED_PROJECT_LIMIT + 1);
    if ($body === false || strlen($body) > ADVANCED_PROJECT_LIMIT) {
        throw new InvalidArgumentException('Project exceeds 8 MB.');
    }
    $dir = $action === 'save' ? project_directory() : sys_get_temp_dir();
    $temp = tempnam($dir, '.codynick-');
    if ($temp === false) throw new RuntimeException('Could not create a temporary project file.');
    try {
        if ($action === 'decode') {
            if (file_put_contents($temp, $body) !== strlen($body)) throw new RuntimeException('Could not read project.');
            reply(['ok'=>true, 'project'=>advanced_project_decode($temp)]);
            return;
        }
        $request = json_decode($body, false, 512, JSON_THROW_ON_ERROR);
        if (!is_object($request->project ?? null)) throw new InvalidArgumentException('Project required.');
        advanced_project_encode($request->project, $temp);
        if ($action === 'encode') {
            header('Content-Type: application/zip');
            readfile($temp);
            return;
        }
        $name = project_name($request->name ?? null);
        $destination = $dir.'/'.rtrim(strtr(base64_encode($name), '+/', '-_'), '=').'.codynick';
        $lock = fopen($dir.'/.projects.lock', 'c');
        if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('Could not lock saved projects.');
        try {
            if (is_link($destination)) throw new InvalidArgumentException('Invalid saved project path.');
            if (is_file($destination) && ($request->overwrite ?? false) !== true) {
                reply(['ok'=>false, 'exists'=>true, 'error'=>'A project with this name exists.'], 409);
                return;
            }
            if (!is_file($destination) && count(glob($dir.'/*.codynick') ?: []) >= 500) {
                throw new InvalidArgumentException('Saved project limit reached.');
            }
            if (!rename($temp, $destination)) throw new RuntimeException('Could not save project.');
            reply(['ok'=>true, 'name'=>$name]);
        } finally {
            fclose($lock);
        }
    } finally {
        if (is_file($temp)) unlink($temp);
    }
}

try { serve_projects(); }
catch (InvalidArgumentException | JsonException $error) { reply(['ok'=>false,'error'=>$error->getMessage()],400); }
catch (Throwable $error) { error_log($error->getMessage()); reply(['ok'=>false,'error'=>'Project storage is unavailable.'],500); }
