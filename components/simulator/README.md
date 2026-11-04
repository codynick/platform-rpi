# RPi simulator: gadgets and assets (0.14.0)

Open **Simulation** beside Blockly, or the separate **Simulator** tool. The view
uses the appearance, artwork, viewport and asset interactions of server 3.20.4.
Python programs still use the RPi native runtime and `Simulator()` transport.

## Try the asset experiment

1. Stop the running program. Choose **Add gadget** and add Temperature sensor,
   Ultrasonic sensor and Soil-moisture sensor. CodyJoy Pro is already present.
2. Choose **Add asset** and add hot/cold water cups, a target block, a soil pot and
   a watering can. Asset settings adjust cup temperature, target dimensions, soil
   type (sand/loam/clay) and initial moisture.
3. Run `CodyNick examples/simulator/world_assets.py` from the Python IDE. This
   replaces existing dashboard cards with sensor gauges and an experiment message.
4. Drag the temperature probe into each cup: it warms/cools gradually. Drag both
   soil probe prongs into the pot. Place the watering can over the pot to pour;
   watch soaking, drainage, moisture and overflow. Aim the ultrasonic sensor at
   the target: the nearest target inside its cone determines distance; no echo
   reads zero. Switch to Dashboard to inspect the native readings.

In Blockly, select **Simulation** on sensor/output blocks. The temperature/light
example also works with cups. Per-block Hardware/Simulation mixing remains
available. Stop the Python companion before running a Blockly program.

## Controls and gadgets

**Add gadget** offers standalone joystick, temperature, ultrasonic, soil moisture,
seven-segment, LED matrix, Wi-Fi/IoT, motion, RFID and UltraSeg. The built-in CJP
has lights, joystick and buzzer. Drag gadget headers and asset bodies; use the
viewport controls to pan/zoom. Select an asset for settings or removal.

Standalone ultrasound and soil sensors have **World sensing** controls; disable
them for manual readings. A temperature probe responds to water contact and air
when cups are present; remove cups to return to the manual temperature control.
Motion and RFID have manual controls. UltraSeg combines its own manual distance
with its display. Wi-Fi/IoT remains an offline protocol model.

Add/remove gadgets before Run. While a native simulator session is connected,
the gadget set is locked, while asset editing, probe movement, settings and
manual inputs remain available. Hidden spaces release momentary inputs.

## State and compatibility

The native service is authoritative: readings evolve on the Pi even when the view
is closed. Its shared `scene.json` retains gadgets, positions, assets, probes and
soil/water state across restarts. Multiple views share this scene. Incremental
edits preserve other-view changes and evolving sensor values. Scenes are separate
from saved Blockly designs; this release does not adopt the server account/file
format. Existing dashboard cards and saved Blockly targets remain compatible.

On first loading a legacy scene, the service preserves its original bytes once
as `/var/lib/codynick-simulator/scene.pre-assets.json` alongside `scene.json`.
Older releases cannot interpret new assets/gadget kinds. Before downgrading,
preserve your current scene and use that legacy backup if needed while the
simulator service is stopped. Previous release manifests/tags are unchanged.

The models are teaching approximations with the server's geometry and response
rules. They do not reproduce physical sensor calibration. Physical Pi/gadget
validation remains pending; automated hardware-transport checks use mocks.
