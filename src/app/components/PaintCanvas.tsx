import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Paintbrush } from 'lucide-react';

export type PaintTool = 'fill' | 'draw' | 'erase';

export interface PaintCanvasHandle {
  undo: () => void;
  redo: () => void;
  reset: () => void;
  download: (filename: string) => void;
}

interface PaintCanvasProps {
  imageUrl: string;
  tool: PaintTool;
  color: string;
  brushSize: number;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  onLoadStateChange?: (loading: boolean, error: boolean) => void;
}

const MAX_HISTORY = 20;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Classic paint-bucket flood fill, bounded by the sketch's dark outlines.
function floodFill(
  imageData: ImageData,
  startX: number,
  startY: number,
  fillColor: [number, number, number],
  tolerance = 40
) {
  const { data, width, height } = imageData;
  const startIdx = (startY * width + startX) * 4;
  const startR = data[startIdx];
  const startG = data[startIdx + 1];
  const startB = data[startIdx + 2];

  if (startR < 60 && startG < 60 && startB < 60) return false;

  const [fr, fg, fb] = fillColor;
  if (Math.abs(startR - fr) < 10 && Math.abs(startG - fg) < 10 && Math.abs(startB - fb) < 10) {
    return false;
  }

  const matches = (idx: number) => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    if (r < 60 && g < 60 && b < 60) return false;
    return (
      Math.abs(r - startR) <= tolerance &&
      Math.abs(g - startG) <= tolerance &&
      Math.abs(b - startB) <= tolerance
    );
  };

  const stack: [number, number][] = [[startX, startY]];
  const visited = new Uint8Array(width * height);

  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const pos = y * width + x;
    if (visited[pos]) continue;
    const idx = pos * 4;
    if (!matches(idx)) continue;

    visited[pos] = 1;
    data[idx] = fr;
    data[idx + 1] = fg;
    data[idx + 2] = fb;
    data[idx + 3] = 255;

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  return true;
}

export const PaintCanvas = forwardRef<PaintCanvasHandle, PaintCanvasProps>(function PaintCanvas(
  { imageUrl, tool, color, brushSize, onHistoryChange, onLoadStateChange },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const isDrawingRef = useRef(false);

  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);

  const reportHistory = () => {
    onHistoryChange?.(undoStack.current.length > 1, redoStack.current.length > 0);
  };

  const pushHistory = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    try {
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStack.current.push(snapshot);
      if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
      redoStack.current = [];
      reportHistory();
    } catch {
      // Tainted canvas (CORS) — history just won't work.
    }
  };

  const loadImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    setLoading(true);
    setLoadError(false);
    onLoadStateChange?.(true, false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      const original = document.createElement('canvas');
      original.width = img.naturalWidth;
      original.height = img.naturalHeight;
      original.getContext('2d')?.drawImage(img, 0, 0);
      originalCanvasRef.current = original;

      try {
        const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        undoStack.current = [snapshot];
        redoStack.current = [];
        reportHistory();
        setLoading(false);
        onLoadStateChange?.(false, false);
      } catch {
        setLoadError(true);
        setLoading(false);
        onLoadStateChange?.(false, true);
      }
    };
    img.onerror = () => {
      setLoadError(true);
      setLoading(false);
      onLoadStateChange?.(false, true);
    };
    img.src = imageUrl;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrl]);

  useEffect(() => {
    loadImage();
  }, [loadImage]);

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width),
      y: Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height),
    };
  };

  const strokeAt = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    if (tool === 'erase') {
      const original = originalCanvasRef.current;
      if (!original) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(original, 0, 0);
      ctx.restore();
    } else {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || loadError || loading) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.setPointerCapture(e.pointerId);
    const { x, y } = getCanvasPoint(e);

    if (tool === 'fill') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const filled = floodFill(imageData, x, y, hexToRgb(color));
      if (filled) {
        ctx.putImageData(imageData, 0, 0);
        pushHistory();
      }
      return;
    }

    isDrawingRef.current = true;
    strokeAt(ctx, x, y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || tool === 'fill') return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    const { x, y } = getCanvasPoint(e);
    strokeAt(ctx, x, y);
  };

  const handlePointerUp = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      pushHistory();
    }
  };

  const applySnapshot = (snapshot: ImageData) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    ctx.putImageData(snapshot, 0, 0);
  };

  useImperativeHandle(ref, () => ({
    undo: () => {
      if (undoStack.current.length <= 1) return;
      const current = undoStack.current.pop()!;
      redoStack.current.push(current);
      applySnapshot(undoStack.current[undoStack.current.length - 1]);
      reportHistory();
    },
    redo: () => {
      if (redoStack.current.length === 0) return;
      const next = redoStack.current.pop()!;
      undoStack.current.push(next);
      applySnapshot(next);
      reportHistory();
    },
    reset: () => loadImage(),
    download: (filename: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    },
  }));

  return (
    <div className="relative bg-white rounded-3xl shadow-inner overflow-hidden w-full">
      {loading && (
        <div className="aspect-square flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Paintbrush className="w-12 h-12 text-purple-400" />
          </motion.div>
        </div>
      )}
      {loadError && !loading && (
        <div className="aspect-square flex flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-xl font-bold text-gray-700">
            Oops! This picture doesn't want to be colored right now.
          </p>
          <p className="text-gray-500">Let's pick a different one!</p>
        </div>
      )}
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`w-full h-auto touch-none ${loading || loadError ? 'hidden' : 'cursor-crosshair'}`}
      />
    </div>
  );
});
