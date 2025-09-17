export function TimerAnalogClock({secondHandRef}) {
  return (
    <div className="w-24 h-24 rounded-full border-4 border-black dark:border-white relative">
      <div className="absolute w-2 h-2 bg-black dark:bg-white rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"></div>
      <div
        ref={secondHandRef}
        id="second-hand"
        className="absolute left-1/2 top-1/2 w-0.5 h-12 bg-red-500 origin-top -translate-x-1/2 -translate-y-1/2 z-0"
        style={{transform: "rotate(-180deg)"}}
      ></div>
    </div>
  );
}
