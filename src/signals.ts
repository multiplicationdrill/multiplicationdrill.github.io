export type EffectFn = () => void;

let currentEffect: EffectFn | null = null;

function track(observers: Set<EffectFn>): void {
  if (currentEffect) observers.add(currentEffect);
}

function notify(observers: ReadonlySet<EffectFn>): void {
  for (const observer of [...observers]) observer();
}

function runTracked<T>(effectFn: EffectFn, fn: () => T): T {
  const previous = currentEffect;
  currentEffect = effectFn;
  try {
    return fn();
  } finally {
    currentEffect = previous;
  }
}

export class Signal<T> {
  #value: T;
  readonly #observers = new Set<EffectFn>();

  constructor(initialValue: T) {
    this.#value = initialValue;
  }

  get(): T {
    track(this.#observers);
    return this.#value;
  }

  set(value: T): void {
    if (Object.is(this.#value, value)) return;
    this.#value = value;
    notify(this.#observers);
  }
}

export class ComputedSignal<T> {
  readonly #compute: () => T;
  readonly #observers = new Set<EffectFn>();
  #cache: { readonly value: T } | undefined;

  constructor(compute: () => T) {
    this.#compute = compute;
  }

  readonly #markStale: EffectFn = () => {
    if (this.#cache === undefined) return;
    this.#cache = undefined;
    notify(this.#observers);
  };

  get(): T {
    track(this.#observers);
    this.#cache ??= { value: runTracked(this.#markStale, this.#compute) };
    return this.#cache.value;
  }
}

export function effect(effectFn: EffectFn): void {
  const execute = (): void => {
    runTracked(execute, effectFn);
  };
  execute();
}
