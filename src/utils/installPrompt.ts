// El navegador dispara `beforeinstallprompt` una sola vez, al cargar la página.
// Se captura acá (importado desde main.tsx) para poder ofrecer "Instalar" más tarde.

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    emit();
  });
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred;
}

export function subscribeInstallPrompt(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Muestra el diálogo de instalación. Devuelve true si el usuario aceptó. */
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  const event = deferred;
  await event.prompt();
  const choice = await event.userChoice;
  deferred = null;
  emit();
  return choice.outcome === 'accepted';
}
