"""Server-style asset experiments using native RPi Python and the shared dashboard.

Before Run: in Simulation, add Temperature, Ultrasonic and Soil-moisture gadgets.
Add hot/cold cups, a target block, a soil pot and a watering can with Add asset.
Move the probes and assets while this runs. This replaces dashboard cards.
"""
import time
import Dashboard
from CodyNick import Simulator, Temperature_Sensor, Ultrasonic_Sensor, Soil_Moisture_Sensor, RGB_Matrix

Dashboard.clear()
temperature = Dashboard.Card('gauge', 'Water temperature', min_value=-10, max_value=100, value=21)
distance = Dashboard.Card('gauge', 'Target distance', min_value=0, max_value=400, value=50)
moisture = Dashboard.Card('gauge', 'Soil moisture', min_value=0, max_value=100, value=50)
status = Dashboard.Card('info', 'Asset experiment', value='Move the temperature/soil probes and ultrasonic target.')
connection = Simulator()
print('Use Add gadget and Add asset in Simulation, then switch to Dashboard to see native readings.',flush=True)
try:
    while True:
        readings = (Temperature_Sensor.read(connection), Ultrasonic_Sensor.read(connection,'Standalone'), Soil_Moisture_Sensor.read(connection))
        if all(value is not None for value in readings):
            t,d,m = readings
            temperature.set(t);distance.set(d);moisture.set(m)
            RGB_Matrix.set(connection,0,'#FF0000' if t>30 else '#00FF00')
            RGB_Matrix.set(connection,1,'#FF0000' if m<30 else '#00FF00')
            message=f'Temperature {t:.1f} C | Distance {d:.1f} cm | Soil {m:.1f}%'
            status.set(message);print(message,flush=True)
        if not connection.ensure_connected():
            raise RuntimeError('Add the required simulated sensors, then run this example again.')
        time.sleep(.5)
finally:
    connection.close()
