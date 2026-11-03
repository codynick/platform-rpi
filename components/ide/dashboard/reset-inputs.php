<?php
function dashboard_reset_inputs(): void {
    require __DIR__ . '/config.php';
    $pdo=new PDO("mysql:host={$db_host};dbname={$db_name};charset=utf8mb4",$db_user,$db_pass,
        [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION]);
    $check=$pdo->prepare('SHOW TABLES LIKE ?');$check->execute([$cards_table.'_inputs']);
    if ($check->fetchColumn()) $pdo->exec("DELETE FROM `{$cards_table}_inputs`");
}
