export const waitForSelector = (selector, {timeout = 2000, interval = 100} = {}) =>
  new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const timer = setInterval(() => {
      const element = document.querySelector(selector);
      if (element && element.offsetParent !== null) {
        clearInterval(timer);
        resolve(element);
        return;
      }
      if (performance.now() - startedAt > timeout) {
        clearInterval(timer);
        reject(new Error(`Selector ${selector} not found in time`));
      }
    }, interval);
  });

export const makeElementDraggable = (element, {onDrop} = {}) => {
  if (!element) return;
  element.style.cursor = "move";
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  const onMouseDown = (event) => {
    isDragging = true;
    const rect = element.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    element.style.cursor = "move";
    element.style.userSelect = "none";
  };

  const onMouseMove = (event) => {
    if (!isDragging) return;
    element.style.left = `${event.clientX - offsetX}px`;
    element.style.top = `${event.clientY - offsetY}px`;
    element.style.right = "auto";
    element.style.bottom = "auto";
  };

  const onMouseUp = () => {
    isDragging = false;
    element.style.userSelect = "auto";
    if (typeof onDrop === "function") {
      onDrop({left: element.style.left, top: element.style.top});
    }
  };

  element.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);

  return () => {
    element.removeEventListener("mousedown", onMouseDown);
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  };
};
