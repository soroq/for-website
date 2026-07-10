import { useEffect } from "react";
import {
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";

export type PointerMotion = {
  softX: MotionValue<number>;
  softY: MotionValue<number>;
  sceneX: MotionValue<number>;
  sceneY: MotionValue<number>;
};

export function usePointerMotion(enabled: boolean): PointerMotion {
  const normalX = useMotionValue(0);
  const normalY = useMotionValue(0);
  const softX = useSpring(useTransform(normalX, [-1, 1], [-12, 12]), {
    stiffness: 90,
    damping: 24,
  });
  const softY = useSpring(useTransform(normalY, [-1, 1], [-10, 10]), {
    stiffness: 90,
    damping: 24,
  });
  const sceneX = useSpring(useTransform(normalX, [-1, 1], [16, -16]), {
    stiffness: 78,
    damping: 22,
  });
  const sceneY = useSpring(useTransform(normalY, [-1, 1], [12, -12]), {
    stiffness: 78,
    damping: 22,
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      normalX.set((event.clientX / window.innerWidth - 0.5) * 2);
      normalY.set((event.clientY / window.innerHeight - 0.5) * 2);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [enabled, normalX, normalY]);

  return { softX, softY, sceneX, sceneY };
}
