const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ??
  '133048024494-v9q4qimam6cl70set38o8tdbj3mcr0ss.apps.googleusercontent.com';
const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

type Credential = { credential: string };
type GoogleIdentity = {
  initialize(options: {
    client_id: string;
    nonce: string;
    auto_select: boolean;
    callback: (response: Credential) => void;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type: string;
      theme: string;
      size: string;
      text: string;
      locale: string;
      width: number;
    },
  ): void;
  prompt(): void;
  cancel(): void;
  disableAutoSelect(): void;
};
type GoogleWindow = Window & { google?: { accounts?: { id?: GoogleIdentity } } };
const identity = () => (window as GoogleWindow).google?.accounts?.id;
let sdk: Promise<GoogleIdentity> | undefined;
let attempt: { cancelled: boolean } | undefined;

function loadIdentity(): Promise<GoogleIdentity> {
  const ready = identity();
  if (ready) return Promise.resolve(ready);
  if (sdk) return sdk;
  sdk = new Promise<GoogleIdentity>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    const timeout = setTimeout(() => fail(), 15_000);
    const fail = () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error('Google sign-in unavailable'));
    };
    script.onerror = fail;
    script.onload = () => {
      clearTimeout(timeout);
      const loaded = identity();
      if (loaded) resolve(loaded);
      else fail();
    };
    document.head.append(script);
  }).catch((error: unknown) => {
    sdk = undefined;
    throw error;
  });
  return sdk;
}

/** 로그인 화면을 떠나거나 로그아웃한 뒤 도착한 Google 콜백을 무효화한다. */
export function cancelGoogleSignIn(disableAutoSelect = false) {
  if (attempt) attempt.cancelled = true;
  attempt = undefined;
  const google = identity();
  google?.cancel();
  if (disableAutoSelect) google?.disableAutoSelect();
}

export function mountGoogleSignIn(
  parent: HTMLElement,
  locale: string,
  onCredential: (credential: string, nonce: string, isCurrent: () => boolean) => void,
  onError: () => void,
): () => void {
  cancelGoogleSignIn();
  const current = { cancelled: false };
  attempt = current;
  const nonce = crypto.randomUUID();
  void loadIdentity()
    .then((google) => {
      if (current.cancelled) return;
      google.initialize({
        client_id: GOOGLE_CLIENT_ID,
        nonce,
        auto_select: false,
        callback: ({ credential }) => {
          if (!current.cancelled) onCredential(credential, nonce, () => !current.cancelled);
        },
      });
      google.renderButton(parent, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        locale,
        width: Math.min(400, Math.max(200, parent.clientWidth)),
      });
      google.prompt();
    })
    .catch(() => {
      if (!current.cancelled) onError();
    });
  return () => {
    current.cancelled = true;
    if (attempt === current) cancelGoogleSignIn();
    parent.replaceChildren();
  };
}
