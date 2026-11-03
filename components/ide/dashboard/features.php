<?php
// Additive dashboard features; existing card types and latch buttons remain compatible.
function dashboard_schema(PDO $pdo): void {
    global $cards_table;
    if (!column_exists($pdo, $cards_table, 'input_options')) {
        $pdo->exec("ALTER TABLE `{$cards_table}` ADD COLUMN input_options TEXT DEFAULT NULL");
    }
    $pdo->exec("CREATE TABLE IF NOT EXISTS `{$cards_table}_state` (id INT PRIMARY KEY, layout MEDIUMTEXT NOT NULL) ENGINE=InnoDB");
    $pdo->exec("CREATE TABLE IF NOT EXISTS `{$cards_table}_inputs` (
        card_id INT NOT NULL, owner VARCHAR(64) NOT NULL, sequence BIGINT NOT NULL DEFAULT 0,
        held_until DOUBLE NOT NULL DEFAULT 0, taps INT NOT NULL DEFAULT 0,
        PRIMARY KEY(card_id, owner)) ENGINE=InnoDB");
}

function dashboard_options($raw): array {
    $value = is_array($raw) ? $raw : json_decode((string)$raw, true);
    $value = is_array($value) ? $value : [];
    $step = $value['step'] ?? 1;
    return ['button_mode'=>($value['button_mode'] ?? '') === 'momentary' ? 'momentary' : 'latch',
        'step'=>is_numeric($step) && is_finite((float)$step) && $step >= 0.000001 && $step <= 1000000000 ? (float)$step : 1];
}

function dashboard_layout($value): array {
    if (!is_array($value) || count($value)>1000) throw new InvalidArgumentException('Invalid dashboard layout.');
    $result=[];
    foreach ($value as $key=>$rect) {
        if (!is_array($rect) || strlen((string)$key)>400) throw new InvalidArgumentException('Invalid card position.');
        $out=[];
        foreach (['x'=>11,'y'=>1000,'w'=>12,'h'=>6] as $field=>$limit) {
            $number=$rect[$field] ?? null;
            if (!is_numeric($number) || !is_finite((float)$number)) throw new InvalidArgumentException('Invalid card size.');
            $out[$field]=max(in_array($field,['w','h'],true)?1:0,min($limit,(int)$number));
        }
        $result[(string)$key]=$out;
    }
    return $result;
}

function dashboard_get_layout(): array {
    global $cards_table;
    $raw=db()->query("SELECT layout FROM `{$cards_table}_state` WHERE id=1")->fetchColumn();
    return $raw ? dashboard_layout(json_decode($raw,true)) : [];
}

function dashboard_put_layout(array $layout): void {
    global $cards_table;
    $stmt=db()->prepare("INSERT INTO `{$cards_table}_state` (id,layout) VALUES (1,?) ON DUPLICATE KEY UPDATE layout=VALUES(layout)");
    $stmt->execute([json_encode(dashboard_layout($layout),JSON_THROW_ON_ERROR)]);
}

function dashboard_enrich(array $cards): array {
    global $cards_table;
    $pdo=db();
    $holds=$pdo->prepare("SELECT card_id, MAX(held_until)>? AS held FROM `{$cards_table}_inputs` GROUP BY card_id");
    $holds->execute([microtime(true)]);
    $pressed=[];
    foreach ($holds->fetchAll() as $row) $pressed[$row['card_id']]=(bool)$row['held'];
    foreach ($cards as &$card) {
        $card['input_options']=dashboard_options($card['input_options'] ?? null);
        if ($card['type']==='button' && $card['input_options']['button_mode']==='momentary') {
            $card['value']=!empty($pressed[$card['id']]) ? 'true' : 'false';
        }
    }
    return $cards;
}

function dashboard_input(int $id, string $owner, int $sequence, string $event): void {
    global $cards_table;
    if ($id<1 || !preg_match('/^[a-zA-Z0-9-]{8,64}$/D',$owner) || $sequence<1 || !in_array($event,['down','renew','up'],true)) {
        throw new InvalidArgumentException('Invalid button event.');
    }
    $pdo=db();
    $pdo->beginTransaction();
    try {
        // Lock the card so a simultaneous project restore cannot attach input to a replacement.
        $stmt=$pdo->prepare("SELECT type,input_options FROM `{$cards_table}` WHERE id=? FOR UPDATE");
        $stmt->execute([$id]); $card=$stmt->fetch();
        if (!$card || $card['type']!=='button' || dashboard_options($card['input_options'])['button_mode']!=='momentary') {
            throw new InvalidArgumentException('This card is not a momentary button.');
        }
        $stmt=$pdo->prepare("INSERT IGNORE INTO `{$cards_table}_inputs` (card_id,owner) VALUES (?,?)");
        $stmt->execute([$id,$owner]);
        $stmt=$pdo->prepare("SELECT * FROM `{$cards_table}_inputs` WHERE card_id=? AND owner=? FOR UPDATE");
        $stmt->execute([$id,$owner]); $row=$stmt->fetch();
        $now=microtime(true);
        if ($sequence>(int)$row['sequence']) {
            $held=(float)$row['held_until']>$now;
            $until=$event==='up' ? 0 : (($event==='down' || $held) ? $now+1.5 : 0);
            $taps=min(1000,(int)$row['taps']+(($event==='down' && !$held)?1:0));
            $stmt=$pdo->prepare("UPDATE `{$cards_table}_inputs` SET sequence=?,held_until=?,taps=? WHERE card_id=? AND owner=?");
            $stmt->execute([$sequence,$until,$taps,$id,$owner]);
        }
        $pdo->commit();
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
}

const DASHBOARD_FIELDS=['type','title','color','min_value','max_value','value','description','font_size','font_name',
    'horizontal_alignment','vertical_alignment','column_span','height_multiplier','y_padding_percent','x_axis_label','y_axis_label','input_options'];

function dashboard_snapshot(): array {
    $cards=dashboard_enrich(get_cards());
    foreach ($cards as &$card) {
        $card=array_intersect_key($card,array_flip(DASHBOARD_FIELDS));
        if ($card['type']==='button') $card['value']='false';
    }
    return ['format'=>'codynick-rpi-dashboard','version'=>1,'cards'=>$cards,'layout'=>dashboard_get_layout()];
}

function dashboard_validate_snapshot($snapshot): array {
    if (!is_array($snapshot) || ($snapshot['format'] ?? '')!=='codynick-rpi-dashboard' || ($snapshot['version'] ?? 0)!==1 ||
        !is_array($snapshot['cards'] ?? null) || count($snapshot['cards'])>500) throw new InvalidArgumentException('Invalid dashboard project.');
    $cards=[];
    foreach ($snapshot['cards'] as $card) {
        if (!is_array($card)) throw new InvalidArgumentException('Invalid card.');
        $card=array_intersect_key($card,array_flip(DASHBOARD_FIELDS));
        foreach ($card as $key=>$value) if ($key!=='input_options' && !is_scalar($value) && $value!==null) throw new InvalidArgumentException('Invalid card property.');
        if (!validate_card($card)['valid'] || strlen((string)($card['title'] ?? ''))>100 || strlen((string)($card['value'] ?? ''))>65535) throw new InvalidArgumentException('Invalid card configuration.');
        $card['input_options']=json_encode(dashboard_options($card['input_options'] ?? null),JSON_THROW_ON_ERROR);
        if ($card['type']==='button') $card['value']='false';
        $cards[]=$card;
    }
    return ['format'=>'codynick-rpi-dashboard','version'=>1,'cards'=>$cards,'layout'=>dashboard_layout($snapshot['layout'] ?? [])];
}

function dashboard_restore($snapshot): void {
    global $cards_table;
    $snapshot=dashboard_validate_snapshot($snapshot);
    $pdo=db(); $pdo->beginTransaction();
    try {
        $pdo->exec("DELETE FROM `{$cards_table}`");
        $pdo->exec("DELETE FROM `{$cards_table}_inputs`");
        foreach ($snapshot['cards'] as $card) {
            $columns=array_keys($card);
            $stmt=$pdo->prepare("INSERT INTO `{$cards_table}` (`".implode('`,`',$columns)."`) VALUES (".implode(',',array_fill(0,count($columns),'?')).")");
            $stmt->execute(array_values($card));
        }
        dashboard_put_layout($snapshot['layout']);
        $pdo->commit();
    } catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
}

function dashboard_feature_action(string $action): void {
    if (!in_array($action,['layout','input','export','restore'],true)) return;
    try {
        if ($action==='export') json_response(['ok'=>true,'dashboard'=>dashboard_snapshot()]);
        if (($_SERVER['REQUEST_METHOD'] ?? '')!=='POST') json_response(['ok'=>false,'error'=>'POST required.'],405);
        if (($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '')==='cross-site') json_response(['ok'=>false,'error'=>'Local requests only.'],403);
        if (strpos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')!==0) json_response(['ok'=>false,'error'=>'JSON required.'],415);
        $raw=file_get_contents('php://input',false,null,0,2097153);
        if ($raw===false || strlen($raw)>2097152) throw new InvalidArgumentException('Dashboard is too large.');
        $data=json_decode($raw,true,64,JSON_THROW_ON_ERROR);
        if (!is_array($data)) throw new InvalidArgumentException('Invalid request.');
        if ($action==='layout') dashboard_put_layout(dashboard_layout($data['layout'] ?? null));
        if ($action==='input') dashboard_input((int)($data['id'] ?? 0),(string)($data['owner'] ?? ''),(int)($data['sequence'] ?? 0),(string)($data['event'] ?? ''));
        if ($action==='restore') dashboard_restore($data['dashboard'] ?? null);
        json_response(['ok'=>true]);
    } catch (InvalidArgumentException|JsonException $e) { json_response(['ok'=>false,'error'=>$e->getMessage()],400); }
    catch (Throwable $e) { json_response(['ok'=>false,'error'=>'Dashboard operation failed.'],500); }
}
