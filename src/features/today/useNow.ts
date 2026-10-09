import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/** Current time, refreshed every minute and on foreground (greeting slot, hours since workout). */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = setInterval(tick, 60_000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, []);
  return now;
}
