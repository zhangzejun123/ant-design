const isDev = process.env.NODE_ENV !== 'production';
let recording = true;

const proxySymbol = Symbol('statistic');

/**
 * This function will do as `Object.assign` in production. But will use Object.defineProperty:get to
 * pass all value access in development. To support statistic field usage with alias token.
 */
export function merge<T extends object>(...objs: Partial<T>[]): T {
  if (!isDev) {
    return Object.assign({}, ...objs);
  }

  recording = false;

  const ret = {} as T;

  objs.forEach(obj => {
    const keys = Object.keys(obj);

    keys.forEach(key => {
      Object.defineProperty(ret, key, {
        configurable: true,
        enumerable: true,
        get: () => (obj as any)[key],
      });
    });
  });

  recording = true;
  return ret;
}

/** @private Internal Usage. Not use in your production. */
export const statistic: Record<string, string[]> = {};

function noop() {}

/** Statistic token usage case. Should use `merge` function if you do not want spread record. */
export default function statisticToken<T extends object>(token: T) {
  let tokenKeys: Set<string> | undefined;
  let proxy = token;
  let flush: (componentName: string) => void = noop;

  if (isDev) {
    tokenKeys = new Set<string>();

    proxy = new Proxy(token, {
      get(obj: any, prop: any) {
        if (prop === proxySymbol) {
          return true;
        }

        if (recording) {
          tokenKeys!.add(prop);
        }
        return obj[prop];
      },
    });

    flush = componentName => {
      statistic[componentName] = Array.from(tokenKeys!);
    };
  }

  return { token: proxy, keys: tokenKeys, flush };
}
