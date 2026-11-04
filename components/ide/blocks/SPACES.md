# Simulation, Dashboard and Sprites (RPi 0.14.0)

The right side of Block Coding now has three spaces. Switch between **Simulation**,
**Dashboard** and **Sprites**, or use **Hide Spaces / Show Spaces** to expand the
coding workspace. Arrow keys navigate the space tabs. The existing separate
Simulator and Dashboard links remain available.

These are the existing RPi tools. Blocks still generate native Python and Run/Stop
still use the existing student script service. The server/browser Python runtime,
account system and firmware uploader are not introduced.

## Gadget block targets

Supported gadget blocks have a **Hardware / Simulation** dropdown. Choose the
target independently on each block, including sensor values inside conditions.
One program can read a real sensor and update a simulated light, then read a
simulated sensor and update a real light. Hardware uses the existing `CN()` driver;
Simulation uses the existing `Simulator()` transport. The generator opens only the
connections needed by enabled blocks attached to Start/Main Loop, and closes them
when the program exits. General/sprite-only and simulation-only programs do not
discover physical serial ports. Unattached/disabled blocks do not open connections.

Old designs without a target retain Hardware. Target selections and the selected
space/visibility are saved in autosave, named designs and downloaded `.codynick`
files. Existing sprite settings and dashboard snapshots are retained. Simulator
gadgets/layout/readings remain shared on the Pi and are managed in the simulator;
they are not copied into a Blockly design by this release.

Simulation supports:

- CJP RGB LEDs, buzzer and built-in joystick.
- Standalone joystick, temperature, soil moisture, ultrasonic, seven-segment and
  8Ã—8 LED matrix gadgets supported by the existing simulator.
- Motion detection, RFID and UltraSeg (ultrasonic + seven-segment).
- The existing offline Wi-Fi/IoT protocol model; it does not contact a real cloud.

Choose CJP or Standalone for a simulated joystick, and Standalone or UltraSeg for
simulated seven-segment/ultrasonic blocks. Add the required standalone gadgets in Simulation
**before Run**. Stop before adding/removing gadgets; changing readings while the
program runs is supported. Unknown custom gadget APIs remain Hardware-only. Unsupported simulated device selections are rejected during
generation, with no fallback to physical hardware.

This release does not add a Dashboard block category. Its Dashboard space displays
the same shared cards created by existing Python/dashboard programs, with the
0.12.1 header-dragging and corner-resizing tools preserved.

## Examples

Use **Examples** in Block Coding. Loading replaces the workspace after confirmation,
leaves execution stopped, and preserves the existing simulator scene. Set up the
required gadgets shown in the description, then Run.

| Example | Requirements and behavior |
| --- | --- |
| Simulation: temperature and light | No hardware. Add Temperature; above 25 C simulated LED 0 is red, otherwise green. |
| Hardware + Simulation: crossed lights | Real CJP and temperature sensor; add simulated Temperature. Each sensor controls the opposite world's LED 0, using the same 25 C threshold. |
| Simulation + Sprites: joystick pilot | No hardware. Hold the simulated CJP joystick Right to move the rocket. Switch to Sprites to inspect it. Switching spaces releases the joystick. |

For an all-spaces Python companion, run
`CodyNick examples/blocks/spaces_dashboard.py` in the Python IDE, then open Block
Coding. Add Temperature before running. It shows the same simulated temperature
through a dashboard gauge/history, simulated light and sprite size/speech. It
replaces dashboard cards. Stop it before running a Blockly program.

Hidden spaces release their momentary inputs. Switching to another tab or hiding
Spaces releases simulated joysticks, dashboard holds and sprite keys/pointer holds;
the program itself keeps running on the Pi. The stage/dashboard/simulator remain
shared device tools, not separate student sessions.

Refresh existing block-editor and dashboard tabs after upgrading. New target-aware
designs must be reviewed before running in an older editor: older versions do not
understand Simulation targets and default gadget blocks to Hardware. Preserve a
downloaded copy before downgrading. Physical Pi and gadget acceptance for this
release remain pending; software tests use a mocked physical transport.

## Server-style assets (0.14.0)

Use **Add gadget** for devices and **Add asset** for hot/cold water cups, ultrasonic
targets, soil pots and watering cans. Drag probes into cups/pots; aim the ultrasonic
sensor at target blocks. Asset settings change temperatures, target sizes and soil
type/initial moisture. Manual sensor values remain available when world sensing is
off. See [the simulator guide](../../simulator/README.md).

`CodyNick examples/simulator/world_assets.py` displays native sensor readings on
dashboard gauges and LEDs. Add Temperature, Ultrasonic and Soil-moisture before
Run. It replaces dashboard cards; stop it before running another program.
