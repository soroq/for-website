// Reuses the exact same Firebase client pattern as the operator app in App.tsx:
// fetch the public config from /api/operator/firebase-config, then dynamically
// load the gstatic firebase-*-compat SDKs and initialize a single app instance.
// This intentionally does NOT import App.tsx (184k operator surface) so it cannot
// regress the operator page.

export type FirebaseNamespace = any;

export type FirebaseAuthUser = {
  email?: string | null;
  displayName?: string | null;
  photoURL?: string | null;
  getIdToken: () => Promise<string>;
};

type FirebaseConfigResponse = {
  firebase: Record<string, string>;
  provider?: string;
};

declare global {
  interface Window {
    firebase?: FirebaseNamespace;
  }
}

const firebaseCompatScripts = [
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.4/firebase-auth-compat.js",
] as const;

const scriptLoads = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const existing = scriptLoads.get(src);
  if (existing) {
    return existing;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const current = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

    if (current?.dataset.ready === "true") {
      resolve();
      return;
    }

    const script = current || document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.ready = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Could not load ${src}`));

    if (!current) {
      document.head.appendChild(script);
    }
  });

  scriptLoads.set(src, promise);
  return promise;
}

async function loadFirebaseCompat(): Promise<FirebaseNamespace> {
  for (const src of firebaseCompatScripts) {
    await loadScript(src);
  }

  if (!window.firebase) {
    throw new Error("Firebase browser SDK did not initialize.");
  }

  return window.firebase;
}

let authPromise: Promise<FirebaseNamespace> | null = null;

async function initAuth(): Promise<FirebaseNamespace> {
  const response = await fetch("/api/operator/firebase-config", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Could not load sign-in configuration (HTTP ${response.status}).`);
  }
  const config = (await response.json()) as FirebaseConfigResponse;

  const firebase = await loadFirebaseCompat();
  if (!firebase.apps?.length) {
    firebase.initializeApp(config.firebase);
  }
  return firebase.auth();
}

export function getFirebaseAuth(): Promise<FirebaseNamespace> {
  if (!authPromise) {
    authPromise = initAuth();
  }
  return authPromise;
}

export async function signInWithGoogle(): Promise<void> {
  const firebase = await loadFirebaseCompat();
  const auth = await getFirebaseAuth();
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
  } catch (error) {
    // Popups can be blocked (e.g. Safari / embedded contexts); fall back to redirect.
    const code = (error as { code?: string })?.code || "";
    if (code.includes("popup")) {
      await auth.signInWithRedirect(provider);
      return;
    }
    throw error;
  }
}

export async function signOut(): Promise<void> {
  const auth = await getFirebaseAuth();
  await auth.signOut();
}
