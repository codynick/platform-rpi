# 0.14.0 simulator assets validation — 2026-11-03

The RPi simulator adopts the server 3.20.4 simulator UI/artwork and asset behavior.
The server project was read only. Existing RPi Python/PHP/MySQL services, physical
`CodyNick.py`, saved Blockly designs and dashboard card implementation remain.

## Coverage

- Full Python regression suite: 184 tests, 169 passed and 15 Linux-only skips locally,
  including five new world-model/native-state tests
  and a mocked native dashboard experiment. Local Windows runs skip Linux-only
  user/ACL/permission cases; Linux CI supplies those checks before publishing.
- 85 deterministic comparisons against the copied server JavaScript models:
  hot/cold cups, three soil types, elapsed time, ultrasonic angles/target positions.
  Nested results agree to six decimal places. Both-prong contact, malformed assets,
  duplicate IDs and nonfinite values are tested separately.
- Native unmodified gadget API calls over simulator transport: existing gadgets
  plus motion, RFID and both UltraSeg functions. Sensor reads advance without an
  open view; restart preserves asset configuration. Legacy scenes get a one-time
  original-byte backup. Three-way edits preserve evolving/other-view state.
- Real Chrome plus native service: gadget/asset pickers, UUID fallback for Pi HTTP,
  cup/temperature-probe dragging, gradual hot/cold response, target resizing/aim/no
  echo, soil settings/probe insertion/watering, motion/RFID/UltraSeg controls,
  connected-program gadget locking, editable assets, second view and reload.
- Real Chrome combined Blockly spaces with local PHP/MySQL, simulator and sprite
  service: actual Blockly generation, mixed targets, saved settings, embedded
  layouts, keyboard tabs, responsive layout and hidden-input release. Generated
  programs execute natively; physical transport is mocked.
- Existing dashboard PHP/MySQL/native/Chrome regression: all 11 legacy card types,
  metadata, buttons/sliders, header dragging/corner resizing with mouse/touch,
  keyboard layout editing, shared persistence, safe project roundtrip and bounds.
- PHP/JavaScript/shell syntax, ANSI/graph/Blockly regressions and sealed manifest
  checks. New manifest covers 212 core files; prior manifests/tags are retained.

## Limits

No physical Raspberry Pi installation, gadget, audio, browser-on-Pi or real serial
validation was performed. Physics remains a classroom approximation. Multi-view
editing merges independent changes; simultaneous edits to the same property use
the last accepted edit. Scenes are device-shared and separate from Blockly designs.
Old versions cannot interpret the new world data; see the simulator guide before
downgrading. No server account system or browser Python runtime was introduced.
