# Dashboard handles 0.12.1

- Use Edit layout, then drag card headers to move and bottom-right grips to resize.
  Lock layout disables both. Headers and corner grips retain arrow-key access;
  Escape cancels a drag. Existing saved layouts and all card types are retained.
- Commit the whole resolved arrangement so a dropped card stays in its chosen
  position when neighboring cards move aside. Dashboard inputs are inert while
  editing to prevent accidental operation.
- Include `CodyNick examples/dashboard/dashboard_feature_test.py`, covering all
  eleven original card types, momentary hold/tap buttons, stepped sliders, live
  displays/charts and optional source/dashboard snapshots. It replaces the current
  dashboard and needs no hardware. Stop before restoring snapshots.
- Native example regression checks all card types, tap counting, outputs and source
  snapshot saving. Installer regression explicitly accepts upgrades from 0.12.0.
- Chrome regression exercises header/corner geometry, mouse/touch dragging,
  keyboard controls, lock/cancel, shared saved layouts, snapshot/design round trips
  and existing input/display behavior. PHP/MySQL integration remains included.
- New tag/pins are sealed from Git-normalized source. Existing releases and
  manifests remain unchanged. Underlying technology is unchanged.

Physical Raspberry Pi installation/reboot and physical mobile-device acceptance
remain pending. Refresh existing dashboard tabs after updating; new dashboard
asset URLs include the 0.12.1 version. The existing one-line setup command is reused.
