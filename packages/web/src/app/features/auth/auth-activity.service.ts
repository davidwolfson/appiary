import { DOCUMENT } from "@angular/common";
import { Injectable, inject } from "@angular/core";

export const AUTH_INACTIVITY_TIMEOUT_MS = 300_000;

const ACTIVITY_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"] as const;

@Injectable({ providedIn: "root" })
export class AuthActivityService {
  private readonly document = inject(DOCUMENT);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private deadline = 0;
  private onInactive: (() => void) | null = null;

  start(onInactive: () => void): void {
    this.stop();
    this.onInactive = onInactive;
    for (const eventName of ACTIVITY_EVENTS) {
      this.document.addEventListener(eventName, this.handleActivity, { passive: true });
    }
    this.resetDeadline();
  }

  stop(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    for (const eventName of ACTIVITY_EVENTS) {
      this.document.removeEventListener(eventName, this.handleActivity);
    }
    this.onInactive = null;
    this.deadline = 0;
  }

  private readonly handleActivity = (): void => this.resetDeadline();

  private resetDeadline(): void {
    if (!this.onInactive) return;
    if (this.timer !== null) clearTimeout(this.timer);
    this.deadline = Date.now() + AUTH_INACTIVITY_TIMEOUT_MS;
    this.timer = setTimeout(() => this.checkDeadline(), AUTH_INACTIVITY_TIMEOUT_MS);
  }

  private checkDeadline(): void {
    if (!this.onInactive) return;
    const remaining = this.deadline - Date.now();
    if (remaining > 0) {
      this.timer = setTimeout(() => this.checkDeadline(), remaining);
      return;
    }
    const callback = this.onInactive;
    this.stop();
    callback();
  }
}
