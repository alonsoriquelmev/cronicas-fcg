"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";

const DOUBLE_CLICK_DELAY_MS = 220;
const CLICK_MOVEMENT_TOLERANCE = 6;

export function useCardClick(
  onClick?: () => void,
  onDoubleClick?: () => void,
) {
  const clickTimer = useRef<number | null>(null);
  const pointerStart = useRef<{
    pointerId: number;
    x: number;
    y: number;
  } | null>(null);

  const clearPendingClick = useCallback(() => {
    if (clickTimer.current === null) return;
    window.clearTimeout(clickTimer.current);
    clickTimer.current = null;
  }, []);

  useEffect(() => clearPendingClick, [clearPendingClick]);

  const scheduleClick = useCallback(() => {
    if (!onClick) return;
    if (!onDoubleClick) {
      onClick();
      return;
    }

    clearPendingClick();
    clickTimer.current = window.setTimeout(() => {
      clickTimer.current = null;
      onClick();
    }, DOUBLE_CLICK_DELAY_MS);
  }, [clearPendingClick, onClick, onDoubleClick]);

  const handlePointerDownCapture = useCallback((event: PointerEvent) => {
    if (event.button !== 0) {
      pointerStart.current = null;
      clearPendingClick();
      return;
    }
    pointerStart.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
    };
  }, [clearPendingClick]);

  const handlePointerUpCapture = useCallback(
    (event: PointerEvent) => {
      if (event.button !== 0) {
        pointerStart.current = null;
        return;
      }
      const start = pointerStart.current;
      pointerStart.current = null;
      if (!start || start.pointerId !== event.pointerId) return;
      const movement = Math.hypot(
        event.clientX - start.x,
        event.clientY - start.y,
      );
      if (movement <= CLICK_MOVEMENT_TOLERANCE) scheduleClick();
    },
    [scheduleClick],
  );

  const handlePointerCancelCapture = useCallback(() => {
    pointerStart.current = null;
  }, []);

  const handleDoubleClick = useCallback(() => {
    clearPendingClick();
    onDoubleClick?.();
  }, [clearPendingClick, onDoubleClick]);

  return {
    onPointerDownCapture: onClick ? handlePointerDownCapture : undefined,
    onPointerUpCapture: onClick ? handlePointerUpCapture : undefined,
    onPointerCancelCapture: onClick ? handlePointerCancelCapture : undefined,
    onDoubleClick: onDoubleClick ? handleDoubleClick : undefined,
  };
}
