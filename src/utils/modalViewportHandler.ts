/**
 * Universal Viewport & Auto-Scroll Controller for Popups, Modals, and Overlays.
 * 
 * Ensures that whenever ANY modal, popup, dialog, or overlay opens across ANY dashboard:
 * 1. Automatically scrolls the page/viewport to bring the opened popup into immediate view (centered).
 * 2. Automatically resets internal scrollable containers inside the modal to the TOP (scrollTop = 0).
 * 3. Locks background page scrolling (overflow: hidden) and restores it upon closing.
 * 4. Ensures headers, close buttons, and content are fully accessible and scrollable.
 */

export function resetInternalScrollContainersToTop(container: HTMLElement) {
  if (!container) return;
  const resetElement = (el: HTMLElement) => {
    try {
      if (el.scrollTop !== 0) {
        el.scrollTop = 0;
      }
      if (el.scrollLeft !== 0) {
        el.scrollLeft = 0;
      }
    } catch {
      // Ignore errors
    }
  };

  // Reset the container itself
  resetElement(container);

  // Find all internal scrollable child elements
  const scrollableElements = container.querySelectorAll<HTMLElement>(
    '.overflow-y-auto, .overflow-auto, .overflow-y-scroll, [class*="overflow-y-auto"], [class*="overflow-auto"], [class*="overflow-y-scroll"], [data-scroll-container="true"]'
  );
  scrollableElements.forEach((el) => {
    resetElement(el);
  });

  const allElements = container.querySelectorAll<HTMLElement>('div, form, section, main, article, ul');
  allElements.forEach((el) => {
    try {
      if (el.scrollHeight > el.clientHeight && el.clientHeight > 0) {
        const style = window.getComputedStyle(el);
        if (
          style.overflowY === 'auto' ||
          style.overflowY === 'scroll' ||
          style.overflow === 'auto' ||
          style.overflow === 'scroll'
        ) {
          resetElement(el);
        }
      }
    } catch {
      // Ignore errors
    }
  });
}

export function ensureModalScrolledToTop(target: HTMLElement | string | null | undefined) {
  if (typeof window === 'undefined' || !target) return;
  const element = typeof target === 'string' ? (document.querySelector(target) as HTMLElement) : target;
  if (!element) return;

  const performResetAndScroll = () => {
    // 1. Reset internal scroll positions to top
    resetInternalScrollContainersToTop(element);

    // 2. Ensure body scroll is locked while modal is open
    if (document.body.style.overflow !== 'hidden') {
      document.body.style.overflow = 'hidden';
    }

    // 3. Find modal card/dialog container to center in viewport
    const modalCard = element.querySelector<HTMLElement>(
      '.bg-zinc-950, .bg-zinc-900, .bg-slate-950, .bg-slate-900, [role="dialog"], [role="alertdialog"], .max-w-xl, .max-w-2xl, .max-w-3xl, .max-w-4xl, .max-w-5xl, .max-w-lg, .rounded-3xl, .rounded-2xl, .rounded-xl'
    ) || element;

    try {
      if (!modalCard.classList.contains('max-h-[90vh]')) {
        modalCard.style.maxHeight = '90vh';
      }
      if (!modalCard.style.display || modalCard.style.display === 'block') {
        const hasOverflow = modalCard.classList.contains('overflow-y-auto') || modalCard.classList.contains('overflow-hidden');
        if (!hasOverflow) {
          modalCard.style.overflowY = 'auto';
        }
      }
    } catch {
      // ignore style errors
    }

    // Scroll window so modal is comfortably centered
    try {
      const rect = element.getBoundingClientRect();
      const absoluteTop = window.pageYOffset + rect.top;
      const targetY = absoluteTop - (window.innerHeight - rect.height) / 2;
      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: 'smooth'
      });
    } catch {
      try {
        modalCard.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      } catch {}
    }
  };

  performResetAndScroll();
  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(performResetAndScroll);
  }
  setTimeout(performResetAndScroll, 40);
  setTimeout(performResetAndScroll, 120);
}

function isVisibleModal(el: HTMLElement): boolean {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
  if (!document.body.contains(el)) return false;

  const role = el.getAttribute('role');
  if (role === 'dialog' || role === 'alertdialog') return true;

  const className = typeof el.className === 'string' ? el.className : '';
  const id = el.id || '';

  const isFixedOverlay =
    className.includes('fixed') &&
    (className.includes('inset-0') || className.includes('top-0')) &&
    (className.includes('z-') || className.includes('backdrop-blur') || className.includes('bg-black') || className.includes('bg-slate') || className.includes('bg-zinc'));

  const lowerId = id.toLowerCase();
  const lowerClass = className.toLowerCase();

  const isNamedModal =
    lowerId.includes('modal') ||
    lowerId.includes('popup') ||
    lowerId.includes('dialog') ||
    lowerId.includes('drawer') ||
    lowerId.includes('overlay') ||
    lowerId.includes('_form') ||
    lowerId.includes('wizard') ||
    lowerClass.includes('modal') ||
    lowerClass.includes('popup') ||
    lowerClass.includes('dialog') ||
    lowerClass.includes('drawer');

  if (!isFixedOverlay && !isNamedModal) return false;

  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0' || el.hasAttribute('hidden')) {
    return false;
  }

  return true;
}

let isGlobalModalViewportInitialized = false;

export function initGlobalModalViewportHandler() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return () => {};
  if (isGlobalModalViewportInitialized) return () => {};
  isGlobalModalViewportInitialized = true;

  const scannedModals = new Set<HTMLElement>();

  const checkAndUpdateModals = () => {
    const candidates = document.querySelectorAll<HTMLElement>(
      '[role="dialog"], [role="alertdialog"], .fixed.inset-0, [class*="fixed"][class*="inset-0"], [id*="modal" i], [id*="popup" i], [id*="dialog" i], [id*="drawer" i], [id*="_form"]'
    );

    const currentVisibleModals = new Set<HTMLElement>();

    candidates.forEach((el) => {
      if (isVisibleModal(el)) {
        currentVisibleModals.add(el);
        if (!scannedModals.has(el)) {
          scannedModals.add(el);
          ensureModalScrolledToTop(el);
        }
      }
    });

    scannedModals.forEach((m) => {
      if (!currentVisibleModals.has(m)) {
        scannedModals.delete(m);
      }
    });

    if (currentVisibleModals.size > 0) {
      if (document.body.style.overflow !== 'hidden') {
        document.body.style.overflow = 'hidden';
      }
    } else {
      if (document.body.style.overflow === 'hidden') {
        document.body.style.overflow = '';
      }
    }
  };

  const observer = new MutationObserver(() => {
    checkAndUpdateModals();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'open', 'data-state'],
  });

  const interval = setInterval(checkAndUpdateModals, 200);

  window.addEventListener('click', () => {
    setTimeout(checkAndUpdateModals, 40);
    setTimeout(checkAndUpdateModals, 150);
  }, true);

  window.addEventListener('focus', () => {
    setTimeout(checkAndUpdateModals, 100);
  });

  checkAndUpdateModals();

  return () => {
    observer.disconnect();
    clearInterval(interval);
    document.body.style.overflow = '';
    isGlobalModalViewportInitialized = false;
  };
}
