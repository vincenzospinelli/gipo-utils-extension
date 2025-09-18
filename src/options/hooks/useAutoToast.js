import {useEffect, useRef, useState} from "react";

export function useAutoToast(timeout = 1200) {
  const [message, setMessage] = useState("");
  const timer = useRef(null);

  const showToast = (msg = "Impostazioni salvate") => {
    setMessage(msg);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(""), timeout);
  };

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  return {toastMessage: message, showToast};
}
