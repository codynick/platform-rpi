<?php
const ADVANCED_PROJECT_LIMIT = 8 * 1024 * 1024;
const ADVANCED_PROJECT_FILES = [
    'programs/blocks.json' => 'workspace',
    'programs/main.py' => 'python',
    'state/editor.json' => 'editor',
    'state/live.json' => 'live',
    'state/sprite.json' => 'sprite',
    'state/dashboard-layout.json' => 'layout',
    'state/simulator-view.json' => 'simulatorView',
];

function advanced_project_json($value): string {
    return json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
}

function advanced_project_validate(object $project): void {
    if (!is_object($project->workspace ?? null) || !is_string($project->python ?? null)
        || strlen($project->python) > 1048576 || !is_object($project->editor ?? null)
        || !in_array($project->editor->language ?? null, ['blocks', 'python'], true)
        || !is_object($project->live ?? null) || !is_object($project->live->scene ?? null)
        || !is_array($project->live->rpiCards ?? null) || !is_object($project->sprite ?? null)
        || !is_object($project->layout ?? null) || !property_exists($project, 'simulatorView')) {
        throw new InvalidArgumentException('Incomplete Advanced IDE project.');
    }
}

function advanced_project_encode(object $project, string $path): void {
    advanced_project_validate($project);
    $zip = new ZipArchive();
    if ($zip->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        throw new RuntimeException('Could not create project archive.');
    }
    try {
        $manifest = ['format'=>'codynick-project', 'version'=>1, 'platform'=>'rpi',
            'applicationVersion'=>'0.15.0', 'createdAt'=>gmdate('c'), 'files'=>[]];
        $size = 0;
        foreach (ADVANCED_PROJECT_FILES as $name => $key) {
            $bytes = $key === 'python' ? $project->python : advanced_project_json($project->$key);
            $size += strlen($bytes);
            if (strlen($bytes) > 4194304 || $size > ADVANCED_PROJECT_LIMIT - 4096) {
                throw new InvalidArgumentException('Project exceeds the archive size limits.');
            }
            if (!$zip->addFromString($name, $bytes)) throw new RuntimeException('Could not write project entry.');
            $manifest['files'][$name] = hash('sha256', $bytes);
        }
        if (!$zip->addFromString('manifest.json', advanced_project_json($manifest))) {
            throw new RuntimeException('Could not write project manifest.');
        }
    } finally {
        if (!$zip->close()) throw new RuntimeException('Could not finalize project archive.');
    }
    if (filesize($path) > ADVANCED_PROJECT_LIMIT) throw new InvalidArgumentException('Project ZIP exceeds 8 MB.');
}

function advanced_project_decode(string $path): object {
    if (filesize($path) > ADVANCED_PROJECT_LIMIT) throw new InvalidArgumentException('Project ZIP exceeds 8 MB.');
    $zip = new ZipArchive();
    if ($zip->open($path, ZipArchive::RDONLY | ZipArchive::CHECKCONS) !== true) {
        throw new InvalidArgumentException('Invalid project ZIP.');
    }
    try {
        $allowed = array_fill_keys([...array_keys(ADVANCED_PROJECT_FILES), 'manifest.json'], true);
        $sizes = [];
        $total = 0;
        if ($zip->numFiles !== count($allowed)) throw new InvalidArgumentException('Unexpected ZIP entries.');
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $entry = $zip->statIndex($i);
            if (!$entry || !isset($allowed[$entry['name']]) || isset($sizes[$entry['name']])
                || ($entry['encryption_method'] ?? 0) !== 0
                || !in_array($entry['comp_method'], [ZipArchive::CM_STORE, ZipArchive::CM_DEFLATE], true)
                || $entry['size'] > 4194304) throw new InvalidArgumentException('Unexpected ZIP entry.');
            $total += $entry['size'];
            $sizes[$entry['name']] = $entry['size'];
        }
        if ($total > ADVANCED_PROJECT_LIMIT) throw new InvalidArgumentException('Expanded project exceeds 8 MB.');
        $read = static function(string $name) use ($zip, $sizes): string {
            $bytes = $zip->getFromName($name, $sizes[$name] + 1);
            if (!is_string($bytes) || strlen($bytes) !== $sizes[$name]) {
                throw new InvalidArgumentException('Corrupt project entry.');
            }
            return $bytes;
        };
        $manifest = json_decode($read('manifest.json'), false, 32, JSON_THROW_ON_ERROR);
        if (($manifest->format ?? null) !== 'codynick-project' || ($manifest->version ?? null) !== 1
            || ($manifest->platform ?? null) !== 'rpi' || !is_object($manifest->files ?? null)) {
            throw new InvalidArgumentException('Open an RPi Advanced IDE project. Server programs use different APIs.');
        }
        $project = new stdClass();
        foreach (ADVANCED_PROJECT_FILES as $name => $key) {
            $bytes = $read($name);
            $checksum = $manifest->files->$name ?? null;
            if (!is_string($checksum) || !hash_equals(hash('sha256', $bytes), $checksum)) {
                throw new InvalidArgumentException('Project checksum failed: ' . $name);
            }
            $project->$key = $key === 'python' ? $bytes : json_decode($bytes, false, 512, JSON_THROW_ON_ERROR);
        }
        advanced_project_validate($project);
        return $project;
    } finally {
        $zip->close();
    }
}
