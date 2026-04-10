import { useEffect } from "react";

const SELECTOR = 'input, textarea, [contenteditable="true"], [contenteditable=""]';

export function useGlobalTypingAnimation(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return;

    const timers = new WeakMap<HTMLElement, number>();

    const pulse = (target: HTMLElement) => {
      target.classList.remove("nx-typing-active");
      requestAnimationFrame(() => {
        target.classList.add("nx-typing-active");
      });

      const prev = timers.get(target);
      if (typeof prev === "number") {
        window.clearTimeout(prev);
      }

      const timeoutId = window.setTimeout(() => {
        target.classList.remove("nx-typing-active");
      }, 180);

      timers.set(target, timeoutId);
    };

    const onInput = (event: Event) => {
      const target = event.target as HTMLElement | null;
      if (!target || typeof target.matches !== "function") return;
      if (!target.matches(SELECTOR)) return;
      pulse(target);
    };

    document.addEventListener("input", onInput, true);
    return () => {
      document.removeEventListener("input", onInput, true);
    };
  }, [enabled]);
}
