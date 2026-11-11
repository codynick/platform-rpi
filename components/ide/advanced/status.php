<?php
function advanced_script_status(): string {
    $process = @proc_open(['/usr/bin/systemctl', 'show', 'script.service',
        '--property=ActiveState', '--value'], [
        0 => ['file', '/dev/null', 'r'], 1 => ['pipe', 'w'], 2 => ['file', '/dev/null', 'a']
    ], $pipes);
    if (!is_resource($process)) return 'unknown';
    $state = trim(stream_get_contents($pipes[1]));
    fclose($pipes[1]);
    return proc_close($process) === 0 && in_array($state,
        ['active', 'activating', 'reloading', 'deactivating', 'inactive', 'failed'], true)
        ? $state : 'unknown';
}
