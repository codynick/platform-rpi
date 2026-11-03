"""Test every dashboard card and the interactive layout tools without hardware.

This replaces the current dashboard. Open Dashboard, choose Edit layout, drag a
card's header to move it, or drag its bottom-right corner to resize it. Lock layout
when done. Stop this program before uploading/restoring a dashboard snapshot.
"""
import time
from pathlib import Path
import Dashboard


def main():
    Dashboard.clear()

    # All eleven original card types, plus the new momentary button.
    led = Dashboard.Card("led", "Enabled", color="green", value=False)
    gauge = Dashboard.Card("gauge", "Selected level",
                           min_value=0, max_value=100, value=50)
    text = Dashboard.Card("textarea", "Type a message", value="Hello CodyNick")
    info = Dashboard.Card("info", "Live status", value="Starting...")
    save_button = Dashboard.Card("button", "Save test snapshot", value=False,
                                 description="Legacy button: click once to save.")
    power = Dashboard.Card("switch", "Power", value=False)
    slider = Dashboard.Card("slider", "Level", min_value=0, max_value=100,
                            value=50, step=5,
                            description="Try dragging, arrow keys, or typing 53.")
    graph = Dashboard.Card("graph", "Level history", value=[[0, 50], [0.1, 50]],
                           x_axis_label="Time (seconds)", y_axis_label="Level")
    bar = Dashboard.Card("bar", "Level versus remaining",
                         value={"Level": 50, "Remaining": 50})
    pie = Dashboard.Card("pie", "Level share", value={"Level": 50, "Remaining": 50})
    table = Dashboard.Card("table", "Readings",
                           value={"Level": 50, "Power": "OFF", "Taps": 0})
    hold = Dashboard.Card("button", "Hold or tap", value=False,
                          button_mode="momentary",
                          description="Hold with mouse/touch or Space/Enter. Quick taps are counted.")

    snapshot = Path("/home/client/userfiles/dashboard_feature_test.json")
    started = time.monotonic()
    history = [[0, 50]]
    tap_count = 0
    last_graph_update = 0

    print("Open Dashboard from the Main Panel.", flush=True)
    print("Edit layout: drag headers to move; drag bottom-right corners to resize.", flush=True)
    print("Focus a header/corner and use arrow keys. Escape cancels a drag.", flush=True)
    print("Lock layout, refresh, or open another browser to check the saved arrangement.", flush=True)
    print("Click Save test snapshot to bundle cards, values, layout and Python source.", flush=True)
    print("Snapshot:", snapshot, flush=True)

    try:
        while True:
            elapsed = time.monotonic() - started
            power.sync()
            slider.sync()
            text.sync()
            save_button.sync()

            power_on = str(power.value).lower() in {"true", "1", "on", "yes"}
            level = float(slider.value)
            held = hold.pressed()
            while hold.clicked():
                tap_count += 1

            led.set(power_on or held)
            gauge.set(level)
            info.set(f"Power: {'ON' if power_on else 'OFF'}\n"
                     f"Button: {'HELD' if held else 'released'}\n"
                     f"Taps: {tap_count}\nMessage: {text.value}")
            table.set({"Level": level, "Power": "ON" if power_on else "OFF",
                       "Held": held, "Taps": tap_count, "Message": text.value})

            if elapsed - last_graph_update >= 1:
                history.append([round(elapsed, 1), level])
                history = history[-30:]
                graph.set(history)
                bar.set({"Level": level, "Remaining": 100 - level})
                # Keep both slices visible at the slider endpoints.
                pie.set({"Level": max(level, 0.1), "Remaining": max(100 - level, 0.1)})
                last_graph_update = elapsed

            if str(save_button.value).lower() in {"true", "1", "on", "yes"}:
                save_button.set(False)
                try:
                    Dashboard.save_project(snapshot, program_path=__file__)
                    print(f"Saved dashboard, layout and Python source: {snapshot}", flush=True)
                except Exception as error:
                    print(f"Could not save snapshot: {error}", flush=True)

            time.sleep(0.1)
    except KeyboardInterrupt:
        print("Test stopped.", flush=True)


if __name__ == "__main__":
    main()
