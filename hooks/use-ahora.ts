import { useEffect, useState } from "react";

export function useAhora(intervalMs = 60_000) {
  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setAhora(Date.now());
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return ahora;
}
