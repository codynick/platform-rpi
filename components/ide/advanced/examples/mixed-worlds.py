"""Connect a real CodyJoy Pro and temperature sensor, and add Temperature in Simulation."""
from time import sleep
from CodyNick import CN, RGB_Matrix, Simulator, Temperature_Sensor


def show_temperature(connection, temperature):
    if temperature is not None:
        color = "#FF0000" if temperature > 25 else "#00FF00"
        RGB_Matrix.set(connection, 0, color)


hardware = CN()
try:
    simulation = Simulator()
    try:
        while True:
            # Each sensor drives the LED in the other world.
            show_temperature(simulation, Temperature_Sensor.read(hardware))
            show_temperature(hardware, Temperature_Sensor.read(simulation))
            sleep(0.05)
    finally:
        simulation.close()
finally:
    hardware.close()
