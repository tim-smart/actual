// oxlint-disable-next-line typescript/no-explicit-any
type AnyFunction = (...args: any[]) => any;

export function sequential<T extends AnyFunction>(
  fn: T,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  const sequenceState: {
    running: Promise<Awaited<ReturnType<T>>> | null;
    queue: Array<{
      args: Parameters<T>;
      resolve: (
        value: Awaited<ReturnType<T>> | PromiseLike<Awaited<ReturnType<T>>>,
      ) => void;
      reject: (reason?: unknown) => void;
    }>;
  } = {
    running: null,
    queue: [],
  };

  function pump() {
    const next = sequenceState.queue.shift();
    if (next !== undefined) {
      run(next.args, next.resolve, next.reject);
    } else {
      sequenceState.running = null;
    }
  }

  function run(
    args: Parameters<T>,
    resolve: (
      value: Awaited<ReturnType<T>> | PromiseLike<Awaited<ReturnType<T>>>,
    ) => void,
    reject: (reason?: unknown) => void,
  ) {
    sequenceState.running = fn.apply(null, args).then(
      (val: Awaited<ReturnType<T>> | PromiseLike<Awaited<ReturnType<T>>>) => {
        pump();
        resolve(val);
      },
      (err: unknown) => {
        pump();
        reject(err);
      },
    );
  }

  return ((...args: Parameters<T>) => {
    if (!sequenceState.running) {
      return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
        return run(args, resolve, reject);
      });
    } else {
      return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
        sequenceState.queue.push({ resolve, reject, args });
      });
    }
  }) as T;
}

export function once<T extends AnyFunction>(
  fn: T,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> | null {
  let promise: Promise<Awaited<ReturnType<T>>> | null = null;
  return (...args: Parameters<T>) => {
    if (!promise) {
      promise = fn.apply(null, args).finally(() => {
        promise = null;
      });
      return promise;
    }

    return promise;
  };
}

/**
 * Ensures that the function is only called one at a time. Overlapping
 * calls return immediately and are coalesced into a single trailing
 * rerun using the first caller's arguments. A pending rerun still runs
 * when an earlier run throws, so an overlapping call is never lost; the
 * first error is then rethrown to the initial caller.
 */
export function coalesced<T extends AnyFunction>(
  fn: T,
): (...args: Parameters<T>) => Promise<void> {
  let running = false;
  let pending = false;
  return async (...args: Parameters<T>) => {
    if (running) {
      pending = true;
      return;
    }
    running = true;
    let firstError: { reason: unknown } | null = null;
    try {
      do {
        pending = false;
        try {
          await fn(...args);
        } catch (reason) {
          firstError ??= { reason };
        }
      } while (pending);
    } finally {
      running = false;
    }
    if (firstError) {
      throw firstError.reason;
    }
  };
}
