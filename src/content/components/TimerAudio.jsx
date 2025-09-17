export function TimerAudio({beepRef, tickRef}) {
  return (
    <>
      <audio
        ref={beepRef}
        src={chrome.runtime.getURL("assets/sounds/beep.mp3")}
        preload="auto"
      />
      <audio
        ref={tickRef}
        src={chrome.runtime.getURL("assets/sounds/tick.mp3")}
        preload="auto"
      />
    </>
  );
}
