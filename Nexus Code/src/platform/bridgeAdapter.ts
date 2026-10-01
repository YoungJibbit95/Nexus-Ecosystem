import type { Capability, Dispose, PlatformResult } from './contracts.ts';
import { failure, isRecord, success } from './errors.ts';
export type Decoder<T> = (value: unknown) => T;
export const decodeUnknown: Decoder<unknown> = value => value;
export const decodeVoid: Decoder<void> = () => undefined;
export const decodeBoolean: Decoder<boolean> = value => {
  if (typeof value !== 'boolean') throw new TypeError('Invalid boolean response');
  return value;
};
export const decodeString: Decoder<string> = value => {
  if (typeof value !== 'string') throw new TypeError('Invalid text response');
  return value;
};
export function createBridgeAdapter(source: unknown) {
  const bridge = isRecord(source) ? source : {};
  function capability(names: readonly string[]): Capability {
    const missingOperations = names.filter(name => typeof bridge[name] !== 'function');
    return { state: !missingOperations.length ? 'available' : missingOperations.length === names.length ? 'unavailable' : 'degraded',
      missingOperations, ...(missingOperations.length ? { reason: 'Required desktop bridge operations are unavailable.' } : {}), };
  }
  async function call<T>(operation: string, method: string, args: unknown[], decode: Decoder<T>, envelope = false): Promise<PlatformResult<T>> {
    const fn = bridge[method];
    if (typeof fn !== 'function') return failure(operation, undefined, 'UNAVAILABLE');
    let value: unknown;
    try { value = await Reflect.apply(fn, source, args); }
    catch (error) { return failure(operation, error); }
    if (envelope) {
      if (!isRecord(value) || typeof value.ok !== 'boolean') return failure(operation, undefined, 'INVALID_RESPONSE');
      if (!value.ok) return failure(operation, value.error);
      if (!('data' in value)) return failure(operation, undefined, 'INVALID_RESPONSE');
      value = value.data;
    }
    try { return success(decode(value)); }
    catch { return failure(operation, undefined, 'INVALID_RESPONSE'); }
  }
  function subscribe<T>(operation: string, method: string, args: unknown[], callback: (value: T) => void, decode: Decoder<T>): PlatformResult<Dispose> {
    const fn = bridge[method];
    if (typeof fn !== 'function') return failure(operation, undefined, 'UNAVAILABLE');
    let active = true;
    try {
      const listener = (raw: unknown) => {
        if (!active) return;
        let value: T;
        try { value = decode(raw); } catch { return; }
        callback(value);
      };
      const off: unknown = Reflect.apply(fn, source, [...args, listener]);
      if (typeof off !== 'function') { active = false; return failure(operation, undefined, 'INVALID_RESPONSE'); }
      return success(() => {
        if (!active) return success(undefined);
        active = false;
        try { Reflect.apply(off, undefined, []); return success(undefined); }
        catch (error) { return failure(`${operation}.dispose`,error); }
      });
    } catch (error) { active = false; return failure(operation, error); }
  }
  return { call, subscribe, capability };
}
