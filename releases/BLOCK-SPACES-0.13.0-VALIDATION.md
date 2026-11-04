# RPi block spaces 0.13.0 validation

Scope: integrate the existing RPi simulator/dashboard/sprite tools into Blockly,
add per-supported-gadget targets, mixed routing and three useful block examples.
Retain native Python, PHP/MySQL, the existing simulator/sprite services, student
script controls, dashboard features and physical gadget driver implementation.
The server 3.20.4 project is a read-only capability reference.

Checks:

- Real headless Blockly loads the shipped JSON examples and generates native
  Python. Tests retain old Hardware defaults and serialize targets, verify mixed
  routes, preserve user text, reject unsupported devices and exclude disabled or
  unattached blocks from connection creation.
- Generated native Python executes over the production simulator transport and
  real local simulator/sprite HTTP services. Tests verify simulated temperature
  controlling LEDs, crossed real/simulated inputs/outputs, simulated joystick
  controlling the sprite and connection cleanup. The physical connection is mocked;
  simulation-only programs cannot discover a physical port.
- Chrome loads the real PHP editor, simulator and sprite services plus a disposable
  MySQL dashboard. Tests exercise all three spaces, embedded views, all examples,
  actual target dropdowns, saved targets/space state, keyboard tabs, show/hide,
  responsive bounds and releasing hidden-space joystick/dashboard/sprite inputs.
  Browser-generated Python matches headless generation and runs through native tests.
- Existing dashboard integration/browser checks are retained, including all eleven
  card types, header/corner layout interactions, snapshots and named designs.
- Release files and bootstrap pins are sealed from Git-normalized source. Existing
  published manifests/tags remain unchanged. The same single-line updater is reused.

Run `node tests/block_generator.cjs` and
`python -m unittest discover -s tests -p test_block_routing.py -v` for native checks.
`tests/block_spaces_browser.py` requires the same disposable database settings as
`dashboard_integration.py`, plus PLAYWRIGHT_MODULE/CHROME_BIN for local Chrome.

Limitations: simulator scene state is shared and is not bundled into designs by
this release; Dashboard blocks are not added. RFID/motion detection and unknown
custom gadget APIs remain Hardware-only. No physical Raspberry Pi installation,
reboot, actual sensors/CJP or physical mobile-device validation is claimed.
