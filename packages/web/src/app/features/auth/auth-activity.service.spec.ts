import { TestBed } from "@angular/core/testing";
import { vi } from "vitest";
import { AUTH_INACTIVITY_TIMEOUT_MS, AuthActivityService } from "./auth-activity.service";

describe("AuthActivityService", () => {
  let service: AuthActivityService;
  beforeEach(() => { vi.useFakeTimers(); TestBed.configureTestingModule({ providers: [AuthActivityService] }); service = TestBed.inject(AuthActivityService); });
  afterEach(() => { service.stop(); vi.useRealTimers(); });

  it("expires once at five minutes", () => {
    // given activity monitoring is running
    const onInactive = vi.fn(); service.start(onInactive);
    // when five minutes elapse
    vi.advanceTimersByTime(AUTH_INACTIVITY_TIMEOUT_MS - 1);
    // then it remains active until the exact deadline
    expect(onInactive).not.toHaveBeenCalled(); vi.advanceTimersByTime(1); expect(onInactive).toHaveBeenCalledOnce();
  });

  it.each(["pointerdown", "keydown", "touchstart", "scroll"])("resets for %s activity", (eventName) => {
    // given most of the inactivity window has elapsed
    const onInactive = vi.fn(); service.start(onInactive); vi.advanceTimersByTime(200_000);
    // when qualifying activity occurs
    document.dispatchEvent(new Event(eventName)); vi.advanceTimersByTime(299_999);
    // then a full new window is granted
    expect(onInactive).not.toHaveBeenCalled(); vi.advanceTimersByTime(1); expect(onInactive).toHaveBeenCalledOnce();
  });

  it("stops and can restart without duplicate expiry", () => {
    // given monitoring is stopped and restarted
    const first = vi.fn(); const second = vi.fn(); service.start(first); service.stop(); service.start(second);
    // when the deadline elapses
    vi.advanceTimersByTime(AUTH_INACTIVITY_TIMEOUT_MS);
    // then only the current callback runs
    expect(first).not.toHaveBeenCalled(); expect(second).toHaveBeenCalledOnce();
  });
});
