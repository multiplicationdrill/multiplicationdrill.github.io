// Robust Signal System with TypeScript
export type EffectFn = () => void;

let currentEffect: EffectFn | null = null;

export class Signal<T> {
  private _value: T;
  private readonly observers = new Set<EffectFn>();

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  get(): T {
    if (currentEffect) {
      this.observers.add(currentEffect);
    }
    return this._value;
  }

  set(newValue: T): void {
    if (this._value === newValue) return;
    this._value = newValue;
    // Create a copy to prevent issues if observers modify the set during iteration
    for (const observer of [...this.observers]) {
      observer();
    }
  }

  // For testing purposes
  getObserverCount(): number {
    return this.observers.size;
  }
}

export class ComputedSignal<T> {
  private readonly computeFn: () => T;
  private readonly observers = new Set<EffectFn>();
  private _value: T | undefined = undefined;
  private isStale = true;
  private readonly markStaleEffect: EffectFn;

  constructor(computeFn: () => T) {
    this.computeFn = computeFn;

    // This effect runs when a dependency changes, marking this computed signal as stale
    this.markStaleEffect = () => {
      if (!this.isStale) {
        this.isStale = true;
        for (const observer of [...this.observers]) {
          observer();
        }
      }
    };
  }

  private _compute(): void {
    // Set this computed signal's effect as the current one to register dependencies
    const prevEffect = currentEffect;
    currentEffect = this.markStaleEffect;
    try {
      this._value = this.computeFn();
      this.isStale = false;
    } finally {
      // Restore the previous effect
      currentEffect = prevEffect;
    }
  }

  get(): T {
    // Register the outer effect as an observer of this computed signal
    if (currentEffect) {
      this.observers.add(currentEffect);
    }
    // Re-compute the value only if it's stale
    if (this.isStale) {
      this._compute();
    }
    return this._value as T;
  }
}

export function effect(effectFn: EffectFn): void {
  const execute = () => {
    // Manage a stack of effects to allow for nesting
    const prevEffect = currentEffect;
    currentEffect = execute;
    try {
      effectFn();
    } finally {
      currentEffect = prevEffect;
    }
  };
  execute();
}
