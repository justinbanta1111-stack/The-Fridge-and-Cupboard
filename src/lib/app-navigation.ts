import type { RouterHistory } from "@tanstack/history";

/** Keep a local recovery target when WKWebView ignores a history traversal. */
export function createAppNavigation(history: RouterHistory, goTo: (href: string) => void) {
  const screens = new Map<number, string>();
  let pending: ReturnType<typeof setTimeout> | undefined;
  const remember = () => {
    const index = history.location.state.__TSR_index;
    if (Number.isInteger(index) && index >= 0) screens.set(index, history.location.href);
  };
  const cancel = () => {
    clearTimeout(pending);
    pending = undefined;
  };
  remember();
  const unsubscribe = history.subscribe(({ action, location }) => {
    cancel();
    if (action.type === "PUSH") {
      for (const index of screens.keys()) {
        if (index >= location.state.__TSR_index) screens.delete(index);
      }
    }
    remember();
  });
  return {
    home() {
      cancel();
      goTo("/");
    },
    back() {
      if (pending) return;
      history.flush();
      const index = history.location.state.__TSR_index;
      if (!Number.isInteger(index) || index <= 0) {
        goTo("/");
        return;
      }
      const previous = screens.get(index - 1) ?? "/";
      const key = history.location.state.__TSR_key;
      pending = setTimeout(() => {
        pending = undefined;
        if (history.location.state.__TSR_index === index && history.location.state.__TSR_key === key) {
          goTo(previous);
        }
      }, 700);
      try {
        history.back();
      } catch {
        cancel();
        goTo(previous);
      }
    },
    dispose() {
      cancel();
      unsubscribe();
    },
  };
}