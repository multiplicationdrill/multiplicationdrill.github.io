import { describe, it, expect, vi } from 'vitest';
import { Signal, ComputedSignal, effect } from '../signals';

describe('Signal', () => {
  it('should store and retrieve values', () => {
    const signal = new Signal(5);
    expect(signal.get()).toBe(5);

    signal.set(10);
    expect(signal.get()).toBe(10);
  });

  it('should notify observers when value changes', () => {
    const signal = new Signal(5);
    const observer = vi.fn();

    effect(() => {
      signal.get();
      observer();
    });

    expect(observer).toHaveBeenCalledTimes(1);

    signal.set(10);
    expect(observer).toHaveBeenCalledTimes(2);
  });

  it('should not notify if value does not change', () => {
    const signal = new Signal(5);
    const observer = vi.fn();

    effect(() => {
      signal.get();
      observer();
    });

    expect(observer).toHaveBeenCalledTimes(1);

    signal.set(5);
    expect(observer).toHaveBeenCalledTimes(1);
  });
});

describe('ComputedSignal', () => {
  it('should compute value based on dependencies', () => {
    const a = new Signal(5);
    const b = new Signal(10);
    const sum = new ComputedSignal(() => a.get() + b.get());

    expect(sum.get()).toBe(15);

    a.set(7);
    expect(sum.get()).toBe(17);

    b.set(20);
    expect(sum.get()).toBe(27);
  });

  it('should only recompute when accessed after becoming stale', () => {
    const signal = new Signal(5);
    const computeFn = vi.fn(() => signal.get() * 2);
    const computed = new ComputedSignal(computeFn);

    expect(computed.get()).toBe(10);
    expect(computeFn).toHaveBeenCalledTimes(1);

    expect(computed.get()).toBe(10);
    expect(computeFn).toHaveBeenCalledTimes(1);

    signal.set(7);

    expect(computed.get()).toBe(14);
    expect(computeFn).toHaveBeenCalledTimes(2);
  });

  it('should handle nested computed signals', () => {
    const base = new Signal(2);
    const doubled = new ComputedSignal(() => base.get() * 2);
    const quadrupled = new ComputedSignal(() => doubled.get() * 2);

    expect(quadrupled.get()).toBe(8);

    base.set(3);
    expect(quadrupled.get()).toBe(12);
  });
});

describe('effect', () => {
  it('should run immediately and on dependency changes', () => {
    const signal = new Signal(5);
    const sideEffect = vi.fn();

    effect(() => {
      signal.get();
      sideEffect();
    });

    expect(sideEffect).toHaveBeenCalledTimes(1);

    signal.set(10);
    expect(sideEffect).toHaveBeenCalledTimes(2);
  });

  it('should handle multiple dependencies', () => {
    const a = new Signal(1);
    const b = new Signal(2);
    const sideEffect = vi.fn();

    effect(() => {
      a.get();
      b.get();
      sideEffect();
    });

    expect(sideEffect).toHaveBeenCalledTimes(1);

    a.set(10);
    expect(sideEffect).toHaveBeenCalledTimes(2);

    b.set(20);
    expect(sideEffect).toHaveBeenCalledTimes(3);
  });

  it('should support nested effects', () => {
    const signal = new Signal(1);
    const outer = vi.fn();
    const inner = vi.fn();

    effect(() => {
      outer();
      signal.get();

      effect(() => {
        inner();
        signal.get();
      });
    });

    expect(outer).toHaveBeenCalledTimes(1);
    expect(inner).toHaveBeenCalledTimes(1);

    signal.set(2);
    expect(outer).toHaveBeenCalledTimes(2);
    expect(inner.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
