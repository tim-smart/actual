// @ts-strict-ignore
import { coalesced, once, sequential } from './async';

function timeout(n) {
  return new Promise(resolve => setTimeout(resolve, n));
}

function makeFunction(data) {
  return async function fn(n, { throwError = false } = {}) {
    data.push(n);
    await timeout(10);

    if (throwError) {
      throw new Error('throwing error');
    }

    data.push(n);
    await timeout(50);
    data.push(n);
  };
}

describe('async', () => {
  test('sequential fn should force concurrent calls to be in order', async () => {
    const test = async fn => {
      fn(1);
      fn(2);
      await fn(3);
    };

    const data = [];
    await test(makeFunction(data));
    expect(data).toEqual([1, 2, 3, 1, 2, 3, 1, 2, 3]);

    const seqData = [];
    await test(sequential(makeFunction(seqData)));
    expect(seqData).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3]);

    expect(data.length).toEqual(seqData.length);
  });

  test('sequential fn should always call function when queue is empty', async () => {
    const test = async fn => {
      await fn(1);
      await fn(2);
      await fn(3);
    };

    const data = [];
    await test(makeFunction(data));
    expect(data).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3]);

    const seqData = [];
    await test(sequential(makeFunction(seqData)));
    expect(seqData).toEqual([1, 1, 1, 2, 2, 2, 3, 3, 3]);

    expect(data.length).toEqual(seqData.length);
  });

  test('sequential fn should still flush queue when error is thrown', async () => {
    const test = async fn => {
      fn(1);
      fn(2, { throwError: true }).catch(() => {
        // Ignore errors
      });
      await fn(3);
    };

    const data = [];
    await test(makeFunction(data));
    expect(data).toEqual([1, 2, 3, 1, 3, 1, 3]);

    const seqData = [];
    await test(sequential(makeFunction(seqData)));
    expect(seqData).toEqual([1, 1, 1, 2, 3, 3, 3]);

    expect(data.length).toEqual(seqData.length);
  });

  test('sequential fn should ignore promise chains in the future', async () => {
    const data = [];
    const fn = sequential(makeFunction(data));

    const first = fn(1).then(() => {
      // The next call should already have started (so it should have
      // already appended 2 to the end). It shouldn't depend on this
      // promise chain at all (important part being that if any errors
      // happened in here, it wouldn't effect anything else)
      expect(data).toEqual([1, 1, 1, 2]);
    });
    const second = fn(2, { throwError: true }).catch(() => {
      // Same as above
      expect(data).toEqual([1, 1, 1, 2, 3]);
    });
    await fn(3);
    await Promise.all([first, second]);

    expect(data).toEqual([1, 1, 1, 2, 3, 3, 3]);
  });

  test('once fn should only be called once', async () => {
    let timesCalled = 0;
    const fn = once(async () => {
      await timeout(200);
      timesCalled++;
    });

    await Promise.all([fn(), fn(), fn()]);

    // It should only have been called once
    expect(timesCalled).toBe(1);

    // Make sure it's called again now that it's done executing
    await Promise.all([fn(), fn()]);
    expect(timesCalled).toBe(2);
  });

  test('once fn should coalesce multiple calls', async () => {
    let timesCalled = 0;
    const fn = once(async () => {
      await timeout(200);
      timesCalled++;
      return {};
    });

    const results = await Promise.all([fn(), fn(), fn()]);

    // It should only have been called once
    expect(timesCalled).toBe(1);

    // The results should all be identical (`toBe` is a strict
    // comparison, like ===)
    expect(results[0]).toBe(results[1]);
    expect(results[0]).toBe(results[2]);
  });

  test('coalesced fn should return overlapping calls immediately', async () => {
    let releaseFirstCall: () => void = () => {
      throw new Error('First call did not start');
    };
    const firstCall = new Promise<void>(resolve => {
      releaseFirstCall = () => resolve();
    });
    const fn = coalesced(async () => {
      await firstCall;
    });

    const running = fn();
    await expect(fn()).resolves.toBeUndefined();

    releaseFirstCall();
    await running;
  });

  test('coalesced fn should combine overlaps into one trailing rerun using the first caller arguments', async () => {
    let releaseFirstCall: () => void = () => {
      throw new Error('First call did not start');
    };
    const firstCall = new Promise<void>(resolve => {
      releaseFirstCall = () => resolve();
    });
    const calls = [];
    const fn = coalesced(async value => {
      calls.push(value);
      if (calls.length === 1) {
        await firstCall;
      }
    });

    const running = fn(1);
    await Promise.all([fn(2), fn(3)]);
    releaseFirstCall();
    await running;

    expect(calls).toEqual([1, 1]);
  });

  test('coalesced fn should preserve a trailing rerun when the active run throws', async () => {
    let releaseFirstCall: () => void = () => {
      throw new Error('First call did not start');
    };
    const firstCall = new Promise<void>(resolve => {
      releaseFirstCall = () => resolve();
    });
    const error = new Error('first run failed');
    let calls = 0;
    const fn = coalesced(async () => {
      calls++;
      if (calls === 1) {
        await firstCall;
        throw error;
      }
    });

    const running = fn();
    await fn();
    releaseFirstCall();

    await expect(running).rejects.toBe(error);
    expect(calls).toBe(2);
  });
});
