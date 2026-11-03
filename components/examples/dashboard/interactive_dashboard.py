"""No hardware needed: hold/tap buttons, stepped slider and live dashboard outputs.

Open Dashboard. Use Edit layout to move/resize cards, then Lock layout.
Stop this program before uploading a saved dashboard/project.
"""
import time
import Dashboard

Dashboard.clear()
hold = Dashboard.Card("button", "Hold or tap", value=False, button_mode="momentary")
power = Dashboard.Card("switch", "Power", value=False)
level = Dashboard.Card("slider", "Level", min_value=0, max_value=100, value=50, step=5)
led = Dashboard.Card("led", "Enabled", color="green", value=False)
gauge = Dashboard.Card("gauge", "Selected level", min_value=0, max_value=100, value=50)
counter = Dashboard.Card("info", "Tap count", value="0")

taps = 0
try:
    while True:
        power.sync()
        level.sync()
        led.set(hold.pressed() or str(power.value).lower() in {"true", "1", "on", "yes"})
        gauge.set(level.value)
        while hold.clicked():
            taps += 1
        counter.set(str(taps))
        time.sleep(0.1)
finally:
    led.set(False)
