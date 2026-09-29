/** true si hay un modal abierto (ModalShell usa aria-modal). */
export function isModalOpen(): boolean {
  return Boolean(document.querySelector('[aria-modal="true"]'));
}

/**
 * Los atajos de una sola tecla (S, N, +, -, Enter) no se aplican mientras se escribe,
 * con un modal abierto o con teclas modificadoras.
 */
export function shouldIgnoreShortcut(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return true;
  const el = document.activeElement as HTMLElement | null;
  const tag = el?.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select' || el?.isContentEditable) return true;
  return isModalOpen();
}
