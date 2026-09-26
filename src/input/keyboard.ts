import { classifyKey } from "./classifyKey";

export interface KeyboardHandlers {
  /** A character was typed (the character produced, i.e. event.key). */
  onChar(char: string, timeMs: number): void;
  onEnter(): void;
  /** Called whenever Caps Lock turns on or off (and once on the first key). */
  onCapsLock(on: boolean): void;
}

// The game's one and only keyboard listener. Returns a function that removes it.
export function attachKeyboard(
  target: Window,
  handlers: KeyboardHandlers,
): () => void {
  let capsLock: boolean | undefined;

  const checkCapsLock = (e: KeyboardEvent) => {
    const on = e.getModifierState("CapsLock");
    if (on !== capsLock) {
      capsLock = on;
      handlers.onCapsLock(on);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    checkCapsLock(e);
    const action = classifyKey(e);
    switch (action.kind) {
      case "char":
        e.preventDefault();
        handlers.onChar(action.char, performance.now());
        break;
      case "enter":
        e.preventDefault();
        handlers.onEnter();
        break;
      case "ignore":
        if (action.preventDefault) e.preventDefault();
        break;
    }
  };

  // Caps Lock's own key-up is where some browsers report the new state.
  const onKeyUp = (e: KeyboardEvent) => checkCapsLock(e);

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);
  return () => {
    target.removeEventListener("keydown", onKeyDown);
    target.removeEventListener("keyup", onKeyUp);
  };
}
