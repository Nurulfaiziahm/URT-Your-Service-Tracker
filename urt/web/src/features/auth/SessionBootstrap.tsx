import { useEffect } from 'react';
import { useAppStore } from '../../redux/hooks';
import { restoreSession } from '../../redux/sessionLifecycle';

export function SessionBootstrap() {
  const store = useAppStore();

  useEffect(() => {
    void restoreSession(store);
  }, [store]);

  return null;
}
