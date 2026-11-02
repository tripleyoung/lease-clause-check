import { useEffect, useRef, useState } from 'react';
import { authRevision, finishGoogleLogin } from '../auth';
import { mountGoogleSignIn } from '../googleIdentity';

export function GoogleSignIn({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: () => void;
}) {
  const parent = useRef<HTMLDivElement>(null);
  const handlers = useRef({ onSuccess, onError });
  handlers.current = { onSuccess, onError };
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!parent.current) return;
    let active = true;
    let pending = false;
    const revision = authRevision();
    const dispose = mountGoogleSignIn(
      parent.current,
      'ko',
      (credential, nonce, isCurrent) => {
        if (pending) return;
        pending = true;
        setBusy(true);
        void finishGoogleLogin(credential, nonce, revision, () => active && isCurrent())
          .then((signedIn) => {
            if (signedIn && active) handlers.current.onSuccess();
          })
          .catch(() => {
            if (active) handlers.current.onError();
          })
          .finally(() => {
            pending = false;
            if (active) setBusy(false);
          });
      },
      () => handlers.current.onError(),
    );
    return () => {
      active = false;
      dispose();
    };
  }, []);

  return (
    <div
      ref={parent}
      aria-busy={busy}
      style={{
        display: 'flex',
        justifyContent: 'center',
        minHeight: 44,
        pointerEvents: busy ? 'none' : undefined,
      }}
    />
  );
}
