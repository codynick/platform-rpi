"""Build RPi JSON Blockly examples. Uses the existing design format, not server ZIPs."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'components/ide/blocks/examples'


def block(kind, fields=None, inputs=None, next_block=None):
    value = {'type': kind}
    if fields: value['fields'] = fields
    if inputs: value['inputs'] = {name: {'block': child} for name, child in inputs.items()}
    if next_block: value['next'] = {'block': next_block}
    return value


def temperature(target, led_target, next_block=None):
    return block('controls_if', inputs={
        'IF0': block('logic_compare', {'OP': 'GT'}, {
            'A': block('cn_temperature_read', {'TARGET': target}),
            'B': block('math_number', {'NUM': 25})}),
        'DO0': block('cn_rgb_matrix_set', {'led': 0, 'color': '#FF0000', 'TARGET': led_target}),
        'ELSE': block('cn_rgb_matrix_set', {'led': 0, 'color': '#00FF00', 'TARGET': led_target}),
    }, next_block=next_block) | {'extraState': {'hasElse': True}}


def project(name, body, space, stage=None):
    start = block('cn_event_start', inputs={'DO': block('cn_log', {'message': name})})
    start.update(x=30, y=30)
    loop = block('cn_event_loop', inputs={'DO': body}); loop.update(x=30, y=150)
    return {'codynick_design': {'name': name},
            'codynick_spaces': {'selected': space, 'visible': True},
            'codynick_stage': stage or {'x': 0, 'y': 0, 'direction': 90, 'size': 100, 'backdrop': 'sky'},
            'blocks': {'languageVersion': 0, 'blocks': [start, loop]}}


def main():
    items = [
        {'id': 'simulation-temperature', 'title': 'Simulation: temperature and light', 'space': 'simulation',
         'description': 'No hardware. Before Run, add Temperature in Simulation. Change it across 25 C: simulated LED 0 is red above 25, green otherwise.'},
        {'id': 'mixed-worlds', 'title': 'Hardware + Simulation: crossed lights', 'space': 'simulation',
         'description': 'Requires a real CJP and temperature sensor. Add Temperature in Simulation before Run. The real sensor controls simulated LED 0; simulated temperature controls real LED 0 (red above 25 C, green otherwise).'},
        {'id': 'simulation-sprite', 'title': 'Simulation + Sprites: joystick pilot', 'space': 'simulation',
         'description': 'No hardware. Run, then hold the simulated CJP joystick Right to move the rocket. Switch to Sprites to see it; switching spaces releases the joystick.'},
    ]
    pilot = block('controls_if', inputs={
        'IF0': block('cn_joystick_position', {'device': "'CJP'", 'pos': "'right'", 'TARGET': 'SIMULATION'}),
        'DO0': block('sprite_change_x', inputs={'AMOUNT': block('math_number', {'NUM': 5})},
                     next_block=block('sprite_bounce'))})
    programs = [temperature('SIMULATION', 'SIMULATION'),
                temperature('HARDWARE', 'SIMULATION', temperature('SIMULATION', 'HARDWARE')), pilot]
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for item, program in zip(items, programs):
        (OUTPUT / (item['id'] + '.codynick')).write_text(
            json.dumps(project(item['title'], program, item['space']), indent=2) + '\n', encoding='utf-8', newline='\n')
    (OUTPUT / 'catalog.json').write_text(json.dumps(items, indent=2) + '\n', encoding='utf-8', newline='\n')
    print('Built three RPi block-space examples.')


if __name__ == '__main__': main()
