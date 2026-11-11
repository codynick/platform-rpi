"""Hold Right on the simulated CodyJoy Pro to move the rocket."""
from time import sleep
from CodyNick import Joystick, Simulator
from SpriteStage import SpriteStage

rocket = SpriteStage(x=0, y=0, direction=90, size=100, backdrop="sky")
simulation = Simulator()
try:
    while True:
        if Joystick.position(simulation, "CJP", "right"):
            rocket.change_x(5)
            rocket.bounce()
        sleep(0.05)
finally:
    simulation.close()
