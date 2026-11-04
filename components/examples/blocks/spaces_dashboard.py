"""No-hardware companion for the block editor's Simulation/Dashboard/Sprites spaces.

Before Run, add Temperature in Simulation. This replaces dashboard cards. Run in
the Python IDE, then open Block Coding and switch its spaces to inspect the same
simulated sensor, dashboard and sprite. Stop before running another program.
"""
import time
import Dashboard
from CodyNick import Simulator, Temperature_Sensor, RGB_Matrix
from SpriteStage import SpriteStage

Dashboard.clear()
gauge = Dashboard.Card('gauge', 'Simulated temperature', min_value=-10, max_value=50, value=21)
history = Dashboard.Card('graph', 'Temperature history', value=[[0, 21], [0.1, 21]],
                         x_axis_label='Seconds', y_axis_label='Temperature (C)')
status = Dashboard.Card('info', 'Spaces test', value='Change simulated temperature across 25 C.')
stage = SpriteStage(x=0, y=0, direction=90, size=100, backdrop='sky')
connection = Simulator()
start = time.monotonic()
points = []
try:
    while True:
        reading = Temperature_Sensor.read(connection)
        if reading is not None:
            gauge.set(reading)
            points.append([round(time.monotonic() - start, 1), reading])
            points = points[-30:]
            if len(points) >= 2: history.set(points)
            hot = reading > 25
            RGB_Matrix.set(connection, 0, '#FF0000' if hot else '#00FF00')
            stage.say('Hot' if hot else 'Comfortable')
            stage.set_size(150 if hot else 100)
            status.set(f'{reading} C: ' + ('Hot' if hot else 'Comfortable'))
        time.sleep(0.5)
finally:
    connection.close()
