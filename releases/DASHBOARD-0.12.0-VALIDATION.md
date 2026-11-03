# Dashboard tools 0.12.0 validation

The update retains native Python, PHP/MySQL, the eleven existing card types and
legacy click-and-reset buttons. No firmware, AI-model or network behavior changes.

Software checks performed on Windows with PHP 8.2, isolated MariaDB 10.4,
Python 3.14/MySQL Connector 26.10 and desktop Chrome:

- Existing unit suite: 172 tests run; 157 pass and 15 Linux-only tests are skipped.
- All PHP files pass syntax checks; JavaScript syntax, dashboard graph and ANSI
  terminal regressions pass.
- Real database integration verifies all eleven card types, additive card options,
  held/tapped buttons, duplicate-event handling, owner isolation, abandoned-hold
  expiry, Run/Stop input reset, slider clamping/steps, shared layout persistence,
  transactional snapshot rejection/restore and Python source bundling.
- Chrome verifies retained gauge DOM during polling, pointer/keyboard layout
  movement and resizing, fresh and saved layouts, cross-tab reopening, numeric
  slider entry, pointer/keyboard holds, legacy latch buttons, dashboard downloads,
  named Blockly design/dashboard round trips and responsive viewport bounds.
- Desktop screenshot inspected with all eleven card types and the new momentary
  button. Legacy charts/tables retain usable default sizes.
- Immutable release manifest and bootstrap helper/source pins are regenerated from
  Git-normalized bytes. Original release tags and manifests remain unchanged.

`tests/dashboard_integration.py` runs against a dedicated database ending `_test`.
Set `PHP_BIN`, `MYSQL_TEST_PORT`, `MYSQL_TEST_USER`, `MYSQL_TEST_PASSWORD` and,
optionally, `PLAYWRIGHT_MODULE`/`CHROME_BIN` for browser checks. GitHub CI also runs
the native PHP/MySQL regression on Ubuntu.

Physical Raspberry Pi installation, reboot persistence on the device, physical
gadgets and actual mobile-device acceptance remain pending. Refresh open browser
tabs after upgrading. Stop the running program before restoring dashboard data.
Application downgrade retains the additive database metadata; it is not a database
rollback. Keep important project backups as with earlier releases.
