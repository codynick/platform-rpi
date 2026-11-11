"""Before Run, add a Temperature sensor in Simulation."""
from time import sleep
from CodyNick import RGB_Matrix, Simulator, Temperature_Sensor

sensor = Simulator()
try:
    while True:
        temperature = Temperature_Sensor.read(sensor)
        if temperature is not None:
            color = "#FF0000" if temperature > 25 else "#00FF00"
            RGB_Matrix.set(sensor, 0, color)
        sleep(0.05)
finally:
    sensor.close()
