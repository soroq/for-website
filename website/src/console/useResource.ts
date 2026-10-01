import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiState } from "@/operator/types";
import { errorMessage, isAbortError } from "./api";

export function idleState<T>(): ApiState<T> {
  return { status: "idle", data: null, error: null };
}

/**
 * One server answer and its state. `load` cancels the request still in flight, so a slow answer for an
 * old selection can never overwrite the answer for the current one. A refresh keeps showing the last
 * answer while the new one loads (status "loading", data still set), so screens do not blank out.
 */
export function useResource<T>() {
  const [state, setState] = useState<ApiState<T>>(idleState);
  const inFlight = useRef<AbortController | null>(null);

  const load = useCallback(async (fetcher: (signal: AbortSignal) => Promise<T>, options: { keepData?: boolean } = {}) => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setState((prev) => ({
      status: "loading",
      data: options.keepData ? prev.data : null,
      error: null,
      receivedAt: options.keepData ? prev.receivedAt : undefined,
    }));
    try {
      const data = await fetcher(controller.signal);
      if (controller.signal.aborted) return null;
      setState({ status: "ready", data, error: null, receivedAt: new Date().toISOString() });
      return data;
    } catch (error) {
      if (isAbortError(error) || controller.signal.aborted) return null;
      setState({ status: "error", data: null, error: errorMessage(error) });
      return null;
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    inFlight.current?.abort();
    inFlight.current = null;
    setState(idleState());
  }, []);

  useEffect(() => () => inFlight.current?.abort(), []);

  return { state, load, reset };
}
