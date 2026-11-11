# CodyNick Raspberry Pi 5 — One-Hour General Demo

## Presenter guide

**Audience:** 10 researchers, approximately 20–25 years old.  
**Format:** Presenter-led demonstration with volunteer participation; no participant coding.  
**Equipment:** Two ready-to-use Raspberry Pi 5/CodyNick sets.  
**Focus:** Sensing, automation, dashboard monitoring, voice commands and offline AI conversation.  
**Duration:** 60 minutes, including course introduction and questions.

Read the blockquotes aloud in your own natural delivery. Instructions labelled **Do** are private presenter actions. Code fences contain complete Python programs: copy the whole box into a new file in the Pi’s browser IDE. These programs run on the Pi, not on the laptop. Installation is outside this session.

## 1. Equipment and preparation — before participants arrive

### Set 1: sensing and monitoring

- Ready-to-use Pi 5 with its supplied power supply and cooling.
- CodyJoy Pro/controller connected to the Pi by USB, with RGB LEDs, joystick and buzzer available.
- CodyNick temperature sensor and **standalone** seven-segment display connected to the controller using the kit’s labelled connections.
- A safe, gentle way to warm the temperature probe, such as fingers or a warm dry object. Check that this produces a visible rise with this actual sensor. Avoid liquids unless the probe is rated for immersion.
- Browser IDE and local dashboard open on the presenter’s laptop.

### Set 2: speech and conversation

- Second ready-to-use Pi 5 and CodyJoy Pro/controller.
- USB microphone or a supported webcam microphone, plus a supported USB speaker/audio output. Position the speaker away from the microphone.
- Installed English speech-recognition, local language and text-to-speech modules already available on the product.
- Voice command and conversation programs below saved in advance.

### Presenter checklist

- Ideally use two laptops, one already joined to each Pi’s hotspot, and switch the projected screen between them. With one laptop, reconnect to the correct hotspot when changing sets; both Pis use the same local address on their separate networks.
- Label the sets **Sensing** and **Speech**, and record their actual hotspot names/passwords from the supplied product information.
- On each connected laptop open `http://10.42.0.1/code/`. On Set 1 also open `http://10.42.0.1/dashboard/`.
- Save your own files in a user-created folder such as `/home/client/Demo`; do not edit the system-managed examples folder.
- Rehearse all three programs on the exact hardware. Confirm microphone selection, audible playback, sensor readings, display type and dashboard refresh.
- Set `HOT_THRESHOLD` slightly above the measured room temperature and below a temperature the planned warming method can reliably reach. The example value of 30 °C is a starting point, not a guaranteed trigger.
- Prepare the sensing dashboard before arrival. Running the sensing program clears existing dashboard cards on that Pi.
- Allow time for AI model loading. Rehearse switching from voice commands to conversation, and use the offline-AI explanation while conversation models load.
- Keep internet connected throughout. No disconnection demonstration is required.
- Only one demonstration program runs on each Pi at a time. Multiple browser tabs do not create independent hardware sessions.
- Have a saved dashboard screenshot or a short recording from the actual kit ready if hardware fails.

**Verification note:** The voice command and conversation code below is reproduced from the supplied project examples. The combined sensing code uses the supplied sensor, display and dashboard APIs. Python syntax has been checked; physical operation and AI timing must be rehearsed on the actual Pi kits.

## 2. Running order

| Time | Segment | Set |
|---|---|---|
| 0–8 min | Welcome and system explanation | Both, physically visible |
| 8–15 min | Connecting to and using the ready-to-use product | Set 1 |
| 15–30 min | Sensing, physical feedback and dashboard | Set 1 |
| 30–38 min | Speech recognition: voice commands | Set 2 |
| 38–50 min | Offline AI explanation and spoken conversation | Set 2 |
| 50–55 min | Training pathway and possible projects | Slides/brochure |
| 55–60 min | Questions and closing | Both |

Keep transitions inside the allocated times. If behind schedule, shorten volunteer turns; preserve the two distinct speech examples and course introduction.

## 3. Welcome and explain the system — 0–8 minutes

**Do:** Place both sets where everyone can see them. Point to each component as you name it.

> Welcome. Today we will explore how CodyNick turns sensor readings and spoken words into useful actions. You will see real measurements, a live dashboard, voice-controlled lights and a conversation with AI running on this Raspberry Pi.
>
> This is a general introduction to the system and the training opportunities around it. You do not need to write code today. We will use prepared programs, and you are welcome to help test them.

**Do:** Point first to the Pi, then the controller, sensor and outputs.

> The Raspberry Pi is the small computer running our programs. The gadget controller connects the sensors, lights, display and buzzer to that computer. A sensor provides an input; the program makes a decision; an output shows or performs the result.
>
> For speech interaction, the microphone provides the input and the speaker provides the spoken output. The AI modules also run on the Pi.
>
> Our laptop is the window into the system. Its browser lets us open programs, start and stop them, and view measurements. The program itself runs on the Pi.

**Do:** Briefly indicate the complete sensing path.

> For example, the temperature sensor measures the environment. The program compares that reading with a threshold. It updates the display and dashboard and can trigger a warning.
>
> Where might you use this pattern in your own research: monitoring an experiment, checking equipment conditions, or interacting with a device by voice?

**Do:** Take one or two short responses, then move on.

## 4. Connect and use the ready-to-use product — 8–15 minutes

**Do:** Show the laptop’s Wi-Fi selection and the actual Set 1 hotspot name. If already connected, point it out without disconnecting. Open the IDE and dashboard.

> The product is already prepared. To use it, power it on, connect the laptop to its Wi-Fi hotspot, and open its local browser interface. The connection details come with the product.
>
> This is a local Wi-Fi connection to the Pi. Wi-Fi and internet are different things: we can communicate with a nearby device over Wi-Fi without sending the work to an internet service.
>
> Here is the program editor, here is the terminal showing messages from the running program, and here is the dashboard. For today, we select a prepared program and press Run This File. Stop ends the running demonstration.

**Do:** Open `01_sensing_dashboard.py` prepared from the next section. Point briefly to `HOT_THRESHOLD`; do not teach syntax or ask participants to type.

> This single setting defines the warning temperature. The courses will teach you how to create and adapt programs like this. Today we will focus on what the system does and how we can test it.

## 5. Sensing, automation and monitoring — 15–30 minutes

### Presenter actions and narration

**Do:** Run `01_sensing_dashboard.py`. Show the sensor, display, LEDs and dashboard. Allow several readings to accumulate.

> The same temperature reading is now visible on the physical display and the dashboard. The graph records how that measurement changes over time. Green means the reading is at or below our chosen threshold.
>
> This is a local dashboard served by the Pi. We do not need a cloud dashboard for this demonstration.

**Do:** Invite one volunteer to warm the probe using the rehearsed method. Point out the reading, threshold crossing, red LEDs and sound.

> Please warm the sensor gently. Watch the measurement rise. Once it passes our threshold, the program changes the lights to red and sounds a warning. The sensor supplies a measurement; the program applies our rule; the outputs make the condition visible and audible.

**Do:** Invite a volunteer to press and hold the joystick centre for about one second, then release. Demonstrate muting while hot. Repeat to enable the alarm if useful. Keep the sensor warm enough to remain above threshold.

> We can acknowledge the audible warning with the joystick. Muting the sound does not change the measured temperature or the red warning light. The condition and the audible notification are separate parts of the design.

**Do:** Let the probe cool or return it to the room-temperature surface. If cooling is slow, describe the expected return and proceed on time.

> When the reading returns to the normal range, the lights return to green. The graph helps us see the whole change, rather than just the latest number.
>
> The same structure could monitor a refrigerator, a greenhouse or laboratory equipment. A real application would need suitable sensors, calibrated measurements and thresholds chosen for its purpose.

**Do:** Ask one short audience question.

> What would you change first for your application: the sensor, the threshold, the output, or the way the measurements are displayed?

**Do:** Stop Set 1’s program before moving on, or leave it running only if an assistant manages its alarm. Switch the projected screen to Set 2.

### Copyable program 1 — `01_sensing_dashboard.py`

Run on **Set 1**. Requires the temperature sensor, standalone seven-segment display and CodyJoy Pro. Hold the joystick centre long enough to be sampled; a very quick tap can be missed. History displays the latest 120 valid samples and is restarted each run; it is not a permanent experiment log.

```python
import math
import time
import CodyNick
import Dashboard

# Set this slightly ABOVE the room temperature before the session.
HOT_THRESHOLD = 30.0
SAMPLE_INTERVAL = 1.0


def fill_leds(cody, color):
    for led in range(16):
        CodyNick.RGB_Matrix.set(cody, led, color)


def main():
    cody = CodyNick.CN()
    try:
        if not cody.ensure_connected():
            raise RuntimeError("Connect CodyJoy Pro and run again.")
        Dashboard.clear()
        gauge = Dashboard.Card(
            "gauge", "Temperature (C)", color="green",
            min_value=0, max_value=50, value=0
        )
        graph = Dashboard.Card(
            "graph", "Temperature history", color="blue", value=[],
            column_span=3, x_axis_label="Time (s)",
            y_axis_label="Temperature (C)"
        )
        history = []
        started = time.monotonic()
        alarm_enabled = True
        was_clicked = False
        previous_hot = None
        print("Sensing ready. Press the joystick to mute/unmute the alarm.", flush=True)
        print("Hot threshold:", HOT_THRESHOLD, "C", flush=True)

        while True:
            clicked = bool(CodyNick.Joystick.click(cody, "CJP"))
            if clicked and not was_clicked:
                alarm_enabled = not alarm_enabled
                print("Alarm enabled:", alarm_enabled, flush=True)
            was_clicked = clicked

            reading = CodyNick.Temperature_Sensor.read(cody)
            if reading is None:
                print("No temperature reading; check the sensor connection.", flush=True)
                time.sleep(SAMPLE_INTERVAL)
                continue
            temperature = float(reading)
            if not math.isfinite(temperature):
                time.sleep(SAMPLE_INTERVAL)
                continue
            temperature = round(temperature, 1)
            hot = temperature > HOT_THRESHOLD
            CodyNick.Seven_Segment.display(cody, "Stand-Alone", temperature)
            if hot != previous_hot:
                fill_leds(cody, "#FF0000" if hot else "#00FF00")
                previous_hot = hot
            gauge.set(temperature)
            history.append([round(time.monotonic() - started, 1), temperature])
            graph.set(history[-120:])
            history = history[-120:]
            print(f"Temperature: {temperature:.1f} C | Hot: {hot} | Alarm enabled: {alarm_enabled}", flush=True)
            if hot and alarm_enabled:
                CodyNick.CJP_Sound_Maker.play_until_done(cody, "C6", 100)
                CodyNick.CJP_Sound_Maker.play_until_done(cody, "E6", 100)
            time.sleep(SAMPLE_INTERVAL)
    finally:
        CodyNick.RGB_Matrix.clear(cody)
        cody.close()


if __name__ == "__main__":
    main()
```

## 6. Speech recognition example 1: voice commands — 30–38 minutes

**Do:** Open and run `02_voice_commands.py` on Set 2. Wait for the printed command list before inviting speech.

> Our first speech example recognises a small set of commands. Say a colour, and the physical LEDs change to that colour. The allowed phrases are listed on the screen.
>
> Speech recognition converts the sound into a recognised command. Our program then chooses a predefined action. This example does not need a language model to invent an answer.

**Do:** Say `red`, wait for the LEDs, then say `blue`. Invite two or three volunteers to try `green`, `yellow` or `purple`, one person at a time.

> Please say one command clearly, then pause for the response. Different voices and background noise can affect recognition. The terminal lets us see what the system accepted.

**Do:** Say `lights off`, then another colour, then `stop listening`.

> “Lights off” turns off the LEDs while the program keeps listening. “Stop listening” ends the program. These are different actions that we explicitly defined.
>
> This pattern can provide a hands-free interface to equipment or an accessible control panel. The supported actions are determined by the program.

**Do:** Confirm the program has stopped before starting conversation. Keep the microphone close to the next speaker and minimise side conversations.

### Copyable program 2 — `02_voice_commands.py`

Run on **Set 2**. Supported phrases: `red`, `green`, `blue`, `yellow`, `white`, `purple`, `lights off`, `stop listening`. Recognition is English and offline. This is the supplied `voice_led_colors.py` example with its behaviour unchanged.

```python
"""CodyNick 0.5.3 demo: control the RGB matrix with offline voice commands."""
import CodyNick
from codynick_ai import CodyNickAI


COMMAND_COLORS = {
    "red": "#FF0000",
    "green": "#00FF00",
    "blue": "#0000FF",
    "yellow": "#FFFF00",
    "white": "#FFFFFF",
    "purple": "#FF00FF",
}
COMMANDS = list(COMMAND_COLORS) + ["lights off", "stop listening"]


def fill_matrix(cody, color):
    for led in range(16):
        CodyNick.RGB_Matrix.set(cody, led, color)


def main():
    cody = CodyNick.CN()
    ai = CodyNickAI(workspace="/home/client")
    listener = None
    try:
        if not cody.ensure_connected():
            raise RuntimeError("CodyNick gadget not found. Connect it and run again.")
        print("Loading offline English speech recognition...", flush=True)
        ai.load_stt(model="small", language="en")
        print("Say: red, green, blue, yellow, white, purple, lights off, or stop listening.", flush=True)
        listener = ai.listen(commands=COMMANDS, min_confidence=0.45, device="auto")
        for event in listener:
            if not event.get("accepted"):
                continue
            command = event["matched_command"]
            score = event.get("confidence", 0.0)
            print(f"Heard: {command} (score {score:.2f})", flush=True)
            if command == "stop listening":
                break
            if command == "lights off":
                CodyNick.RGB_Matrix.clear(cody)
            else:
                fill_matrix(cody, COMMAND_COLORS[command])
    finally:
        if listener is not None:
            listener.stop()
        ai.close()
        CodyNick.RGB_Matrix.clear(cody)
        cody.close()
        print("Voice demo stopped; LEDs are off.", flush=True)


if __name__ == "__main__":
    main()
```

## 7. Explain offline AI and demonstrate conversation — 38–50 minutes

### Start loading, then explain

**Do:** Run `03_local_ai_conversation.py` on Set 2. Give the explanation below while its models load. Leave the internet connection unchanged.

> Our second speech example combines three AI modules. Speech-to-text turns a spoken question into text. A local language model generates a short answer. Text-to-speech turns that answer into sound through the speaker.
>
> These modules and their model files are already included on this prepared product. The program loads them from the Pi, uses them, and releases them when it finishes. We are not setting up software during this session.
>
> For these examples, the speech recognition, language-model processing and speech generation happen on the Pi. The audio and questions do not need to be sent to an online AI service. Internet can remain connected, as it is today, but these AI functions do not depend on it during operation.
>
> Our laptop communicates with the Pi through the browser. That local connection is separate from the AI processing. Other features, such as an external cloud service, can have their own internet requirements.
>
> Loading the models can take time, and generating a reply also takes time. The lights show whether the system is waiting, listening, processing or answering.

### Wait for readiness

**Do:** Wait for all three messages:

```text
Text-to-speech is ready.
Speech recognition is ready.
Local AI is ready. Say: Wake up
```

**Do:** Explain the LED states briefly as they appear.

| Visible feedback | Meaning |
|---|---|
| One dim blue LED | Waiting for “wake up” |
| Green lights and rising notes | Wake phrase accepted |
| Cyan centre LEDs | Listening for a question |
| Yellow side LEDs | Processing the question |
| Green answer pattern | Speaking the answer |
| Purple lights and melody | Sleep/exit feedback |

### Demonstrate the conversation

> The system is ready. I will wake it first, wait for its acknowledgement, then ask a question.

**Do:** Say `wake up`. Wait for “I am listening” and the cyan listening lights. Ask `What is a temperature sensor?` Wait for the full answer and cyan lights before speaking again.

> The recognised question appears after “You” in the terminal. The generated answer appears after “AI”, and the speaker reads it aloud. The wording can vary because this answer is generated locally.

**Do:** Ask `Name one use for an RGB LED.` Invite one or two volunteers to ask a short, complete question, such as `What is a joystick?` or `Why do plants need water?`

> Please ask one short, complete question and wait for the answer. This particular example handles each question independently. It does not remember earlier questions, and it is not connected to the temperature readings from our other set.
>
> The answers are deliberately kept short for this demonstration. AI can still make mistakes, so we should judge the result rather than assume every answer is correct.

**Do:** Say `sleep`. Wait for “Going to sleep.” Explain, then say `wake up` again. If the program returns to sleep after a pause, wake it again before the next question. End with `goodbye` or `stop listening`.

> “Sleep” returns it to waiting for the wake phrase. After about ten seconds without an accepted question, it also returns to that waiting state. “Goodbye” ends this demonstration.
>
> We have now seen two uses of speech recognition: a defined command leading to a defined action, and a spoken question leading to a locally generated spoken answer.

### Copyable program 3 — `03_local_ai_conversation.py`

Run on **Set 2 only after stopping program 2**. Requires microphone, speaker, CodyJoy Pro and the prepared local STT, language-model and TTS modules. This is the supplied `local_ai_voice_conversation.py` example with its behaviour unchanged. The `;;;` prefix is retained from the project’s prepared TTS playback convention. Each answer replaces the same `llm_answer` audio file rather than creating an accumulating collection.

```python
"""Offline voice conversation using STT, Gemma, TTS, and CodyJoy Pro feedback."""
import time

import CodyNick
from codynick_ai import CodyNickAI


WAKE_PHRASES = ["wake up"]
SLEEP_PHRASES = {"sleep", "go to sleep"}
STOP_PHRASES = {"stop listening", "goodbye"}
QUESTION_TIMEOUT = 10


def set_leds(cody, leds, color):
    CodyNick.RGB_Matrix.clear(cody)
    for led in leds:
        CodyNick.RGB_Matrix.set(cody, led, color)
        time.sleep(0.002)


def waiting_effect(cody):
    set_leds(cody, [0], "#003080")


def wake_effect(cody):
    set_leds(cody, range(16), "#00FF00")
    CodyNick.CJP_Sound_Maker.play_until_done(cody, "C5", 100)
    CodyNick.CJP_Sound_Maker.play_until_done(cody, "E5", 160)


def listening_effect(cody):
    set_leds(cody, [5, 6, 9, 10], "#00FFFF")


def processing_effect(cody):
    set_leds(cody, [0, 4, 8, 12], "#FFFF00")


def answering_effect(cody):
    set_leds(cody, [0, 3, 5, 6, 9, 10, 12, 15], "#00FF00")
    CodyNick.CJP_Sound_Maker.play_until_done(cody, "G5", 100)


def goodbye_effect(cody):
    set_leds(cody, range(16), "#FF00FF")
    for note in ["G5", "E5", "C5"]:
        CodyNick.CJP_Sound_Maker.play_until_done(cody, note, 130)


def hear_wake_phrase(speech_in):
    listener = speech_in.listen(
        commands=WAKE_PHRASES, min_confidence=0.45, device="auto"
    )
    try:
        for event in listener:
            if event.get("accepted"):
                print("Heard: Wake up", flush=True)
                return
    finally:
        listener.stop()


def hear_question(speech_in):
    listener = speech_in.listen(
        commands=None, min_confidence=0.35, device="auto"
    )
    started = time.monotonic()
    try:
        while time.monotonic() - started < QUESTION_TIMEOUT:
            event = listener.get(timeout=0.25)
            if event and event.get("accepted"):
                question = event.get("text", "").strip()
                if question:
                    return question
        return None
    finally:
        listener.stop()


def speak_answer(speech_out, answer):
    result = speech_out.tts(
        ";;;" + answer, "llm_answer", speaker="speaker1"
    )
    if not result.get("ok"):
        raise RuntimeError(result.get("message", "TTS generation failed."))
    playback = speech_out.speak("llm_answer", device="auto", volume=100)
    if not playback.get("ok"):
        raise RuntimeError(playback.get("message", "Playback failed."))


def main():
    cody = CodyNick.CN()
    speech_out = CodyNickAI(workspace="/home/client")
    speech_in = CodyNickAI(workspace="/home/client")
    local_ai = CodyNickAI(workspace="/home/client")
    try:
        if not cody.ensure_connected():
            raise RuntimeError("CodyJoy Pro was not found.")

        print("Loading text-to-speech...", flush=True)
        status = speech_out.load_app("tts", model="fast", language="en")
        if not status.get("ok"):
            raise RuntimeError(status.get("message", "TTS failed to load."))
        print("Text-to-speech is ready.", flush=True)

        print("Loading speech recognition...", flush=True)
        speech_in.load_stt(model="small", language="en")
        print("Speech recognition is ready.", flush=True)

        print("Loading local AI...", flush=True)
        local_ai.load_llm()
        print("Local AI is ready. Say: Wake up", flush=True)

        running = True
        while running:
            waiting_effect(cody)
            hear_wake_phrase(speech_in)
            wake_effect(cody)
            speak_answer(speech_out, "I am listening.")

            while running:
                listening_effect(cody)
                question = hear_question(speech_in)
                if question is None:
                    print("No speech for 10 seconds. Returning to sleep.", flush=True)
                    break

                print("You:", question, flush=True)
                normalized = question.lower().strip()
                if normalized in SLEEP_PHRASES:
                    goodbye_effect(cody)
                    speak_answer(speech_out, "Going to sleep.")
                    break
                if normalized in STOP_PHRASES:
                    goodbye_effect(cody)
                    speak_answer(speech_out, "Goodbye.")
                    running = False
                    break

                processing_effect(cody)
                answer = local_ai.ask(
                    question,
                    system_prompt=(
                        "Answer using one complete sentence of 1 to 9 words. "
                        "Never use more than 9 words. Be friendly and accurate."
                    ),
                    max_tokens=20,
                    temperature=0.2,
                ).strip()
                if len(answer.split()) > 9:
                    answer = " ".join(answer.split()[:9])
                if not answer:
                    answer = "I could not answer that."

                print("AI:", answer, flush=True)
                answering_effect(cody)
                speak_answer(speech_out, answer)
    finally:
        speech_in.close()
        speech_out.close()
        local_ai.close()
        CodyNick.RGB_Matrix.clear(cody)
        cody.close()
        print("Conversation stopped.", flush=True)


if __name__ == "__main__":
    main()
```

## 8. Introduce the training pathway — 50–55 minutes

**Do:** Show the course list in the brochure. Describe computer vision as an available course only; no vision demonstration is part of this session.

> Today you have used the finished system. The courses teach you how to design, program, test and adapt systems of your own, using the same ready-to-use platform.
>
> Python and Smart Sensors develops the foundations: reading inputs, making decisions and controlling physical outputs.
>
> Speech and Voice Interaction develops spoken commands, speech recognition and interactive responses like the examples you have just seen.
>
> IoT Monitoring and Automation develops connected measurements, dashboards, remote monitoring and automated actions.
>
> Computer Vision is another available branch, covering cameras and AI-based interpretation of images.
>
> AI and IoT Prototype Development brings these skills together. Participants select their own project and build and demonstrate a working prototype.
>
> The proposed pathway starts with Python and Smart Sensors. The vision, speech and IoT courses build on that foundation. The final prototype course follows IoT plus either vision or speech. We can discuss the most appropriate starting point for your group’s existing experience.

**Do:** If duration is discussed, use the current brochure’s proposed structure and avoid quoting unconfirmed commercial terms.

> The brochure proposes five courses, each with 30 hours across six sessions. The detailed programme can be shaped around your research priorities. Today is the general introduction; a focused demonstration can explore an individual course in more depth.

## 9. Questions and closing — 55–60 minutes

> Which part would be most useful in your work: sensing, automated responses, monitoring, or speech interaction?
>
> Can you suggest one small prototype you would like to build? What would it measure or hear, and what action should follow?

**Do:** Take questions. Use the answer bank below where relevant. Stop the active program at the end.

> Thank you. The aim of the training is to help you move from an idea to a working prototype, then test whether it performs the task you intended. We can use your examples to choose the most useful course pathway for this group.

## 10. Short answer bank for likely questions

| Question | Suggested presenter answer |
|---|---|
| Does this need internet? | “The local sensing dashboard and the AI processing shown here operate on the prepared Pi. Internet is not required for these AI tasks. External online services would have their own requirements.” |
| Is the AI running on the laptop? | “No. The laptop provides the browser interface. These programs and models run on the Pi.” |
| Do we need to install anything in this session? | “No. You use a prepared product. We are showing how to connect to it and use it.” |
| Is this training an AI model? | “Today we are using existing trained models. We are demonstrating how to use their results in an application.” |
| Are the conversation answers recorded? | “In this conversation example, the local language model generates the answer and text-to-speech generates its audio. The voice-command example instead maps recognised phrases to predefined actions.” |
| Can it answer questions about the sensor? | “This conversation example does not read our sensor. Connecting live measurements to a spoken interface would be a further project.” |
| Can we use other languages? | “Today’s prepared examples use English. Another language would need suitable recognition and speech models and testing on this device.” |
| Can it control other outputs? | “Yes, within the connected hardware and supported interfaces. The program must define and test each action.” |
| Why did it misunderstand me? | “Let’s check the recognised text. Microphone position, background noise and pronunciation can affect the result. We can repeat the question clearly.” |
| Does its confidence score prove it is right? | “No. It is a model output that helps filtering; we still evaluate the actual behaviour.” |
| Can all ten people run separate programs on one Pi? | “This setup shares the running program and hardware. Today we take turns. Independent group work needs appropriate separate workstations or an explicitly designed shared workflow.” |

## 11. Recovery prompts and time management

| Situation | Presenter action | What to say |
|---|---|---|
| No sensor reading | Stop; check the sensor/controller connection; rerun. | “The program has not received a valid measurement. We will check the connection before interpreting the result.” |
| Alarm does not trigger | Check the actual reading against the rehearsed threshold. If necessary stop, adjust `HOT_THRESHOLD`, rerun and explain the chosen threshold. | “The warning depends on crossing our chosen threshold. Let’s compare that setting with the measured value.” |
| Joystick mute seems unresponsive | Hold the centre for about one second and release; wait for terminal confirmation. | “This program checks the button periodically, so a longer press is easier to observe.” |
| Dashboard appears stale | Confirm Set 1’s program is running; refresh the dashboard on the correct hotspot. | “Let’s check that this page is displaying the running sensing set.” |
| Speech command is ignored | Wait for readiness; reduce nearby conversation; repeat a listed phrase near the mic. | “Let’s try one supported phrase clearly after the system is ready.” |
| Conversation goes quiet | Check cyan/blue LEDs; if blue, say `wake up`; wait for acknowledgement. | “It has returned to wake mode. We will wake it before asking again.” |
| Reply is slow | Show processing feedback; allow the rehearsed latency. | “The Pi is generating the answer and then its speech locally.” |
| Wrong spoken answer | Inspect `You:` first, then `AI:`; distinguish recognition from answer generation. | “First let’s see whether the question was recognised correctly. Then we can judge the generated answer.” |
| Persistent audio/hardware failure | Stop the failed program. Use the rehearsed recording and continue to the course discussion. | “The live example needs a connection check. Here is a recording from this kit showing the intended behaviour.” |

If time is short, use one volunteer per speech example and two conversation questions. Do not add extra demos. Keep the final five minutes for participant priorities and questions.

## 12. Source and scope notes

Prepared against the supplied `platform-rpi.zip` snapshot (README entry version 0.14.0) and `ADTI_CodyNick_AI_Proposal_Rev.B0.pdf`.

Code references inside the project:

- `components/examples/temperature_color_display.py`
- `components/examples/dashboard/temperature_on_dashboard.py`
- `components/examples/voice_led_colors.py`
- `components/examples/local_ai_voice_conversation.py`
- `components/ide/teachers/guides/01-temperature-alarm-live-coding.md`

The sensing example combines the supplied APIs into one demo; speech examples retain the project implementations. No simulation, computer vision activity, software installation or internet-disconnection task is included. The group uses two prepared products, and participants do not write code.
