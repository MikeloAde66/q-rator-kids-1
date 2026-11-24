import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Download, RotateCcw, Paintbrush, Undo2, Redo2, PaintBucket, Eraser } from 'lucide-react';
import { Button } from './ui/button';

interface ColoringCanvasProps {
  imageUrl: string;
  title: string;
}

type Tool = 'fill' | 'draw' | 'erase';

// Child-friendly "digital crayon box" — simple named colors, not a
// technical color-picker. This is a coloring book, not a design tool.
const CRAYON_COLORS: { name: string; hex: string }[] = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Yellow', hex: '#facc15' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Brown', hex: '#92400e' },
  { name: 'Black', hex: '#1f2937' },
  { name: 'White', hex: '#ffffff' },
];

const BRUSH_SIZE = 20;
const MAX_HISTORY = 20;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Classic paint-bucket flood fill, bounded by the sketch's dark outlines.
// Walks connected pixels close in color to the one tapped and repaints
// them, stopping at anything close to black (the line art).
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

  // Don't fill onto the black outline itself.
  if (startR < 60 && startG < 60 && startB < 60) return false;

  // Already (close to) this color — nothing to do.
  const [fr, fg, fb] = fillColor;
  if (
    Math.abs(startR - fr) < 10 &&
    Math.abs(startG - fg) < 10 &&
    Math.abs(startB - fb) < 10
  ) {
    return false;
  }

  const matches = (idx: number) => {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    if (r < 60 && g < 60 && b < 60) return false; // outline boundary
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

export function ColoringCanvas({ imageUrl, title }: ColoringCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Off-screen copy of the untouched sketch — used so the Erase tool can
  // restore the original line art under the cursor instead of leaving a
  // blank hole.
  const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedColor, setSelectedColor] = useState(CRAYON_COLORS[0].hex);
  const [tool, setTool] = useState<Tool>('fill');
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const isDrawingRef = useRef(false);

  // Simple undo/redo as a stack of full-canvas snapshots. Fine at this
  // image size (1024x1024) and dramatically simpler than tracking strokes.
  const undoStack = useRef<ImageData[]>([]);
  const redoStack = useRef<ImageData[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const updateHistoryFlags = () => {
    setCanUndo(undoStack.current.length > 1);
    setCanRedo(redoStack.current.length > 0);
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
      updateHistoryFlags();
    } catch {
      // Tainted canvas (CORS) — history just won't work; drawing itself
      // already fails gracefully elsewhere.
    }
  };

  const loadImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    setLoading(true);
    setLoadError(false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      // Keep a pristine off-screen copy for the eraser to restore from.
      const original = document.createElement('canvas');
      original.width = img.naturalWidth;
      original.height = img.naturalHeight;
      original.getContext('2d')?.drawImage(img, 0, 0);
      originalCanvasRef.current = original;

      try {
        const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
        undoStack.current = [snapshot];
        redoStack.current = [];
        updateHistoryFlags();
        setLoading(false);
      } catch {
        // This throws if the image's CDN didn't allow cross-origin pixel
        // reads — can't be known ahead of time for a hotlinked/generated
        // image, so we handle it gracefully instead of crashing.
        setLoadError(true);
        setLoading(false);
      }
    };
    img.onerror = () => {
      setLoadError(true);
      setLoading(false);
    };
    img.src = imageUrl;
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
      ctx.arc(x, y, BRUSH_SIZE, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(original, 0, 0);
      ctx.restore();
    } else {
      ctx.fillStyle = selectedColor;
      ctx.beginPath();
      ctx.arc(x, y, BRUSH_SIZE / 2, 0, Math.PI * 2);
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
      const filled = floodFill(imageData, x, y, hexToRgb(selectedColor));
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

  const handleUndo = () => {
    if (undoStack.current.length <= 1) return;
    const current = undoStack.current.pop()!;
    redoStack.current.push(current);
    applySnapshot(undoStack.current[undoStack.current.length - 1]);
    updateHistoryFlags();
  };

  const handleRedo = () => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push(next);
    applySnapshot(next);
    updateHistoryFlags();
  };

  const handleReset = () => {
    loadImage();
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-my-painting.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const tools: { id: Tool; label: string; icon: typeof PaintBucket }[] = [
    { id: 'fill', label: 'Fill', icon: PaintBucket },
    { id: 'draw', label: 'Draw', icon: Paintbrush },
    { id: 'erase', label: 'Erase', icon: Eraser },
  ];

  return (
    <div className="space-y-6">
      {/* Tool picker */}
      <div className="flex justify-center gap-3">
        {tools.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTool(id)}
            className={`flex flex-col items-center gap-1 px-5 py-3 rounded-2xl border-4 font-bold transition-all ${
              tool === id
                ? 'border-purple-500 bg-purple-100 text-purple-700 scale-105'
                : 'border-gray-200 bg-white text-gray-500 hover:border-purple-200'
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </div>

      <div className="relative bg-white rounded-3xl border-4 border-purple-200 shadow-xl overflow-hidden max-w-xl mx-auto">
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

      {/* Digital crayon box — only matters for Fill/Draw, but harmless to leave visible for Erase */}
      <div className="flex flex-wrap justify-center gap-3 max-w-xl mx-auto">
        {CRAYON_COLORS.map((color) => (
          <motion.button
            key={color.hex}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSelectedColor(color.hex)}
            title={color.name}
            aria-label={color.name}
            className={`w-12 h-12 rounded-full border-4 shadow-md transition-all ${
              selectedColor === color.hex ? 'border-gray-800 scale-110' : 'border-white'
            }`}
            style={{ backgroundColor: color.hex }}
          />
        ))}
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Button
          onClick={handleUndo}
          disabled={!canUndo}
          variant="outline"
          className="rounded-2xl border-2 font-bold px-4 py-5"
          aria-label="Undo"
        >
          <Undo2 className="w-5 h-5" />
        </Button>
        <Button
          onClick={handleRedo}
          disabled={!canRedo}
          variant="outline"
          className="rounded-2xl border-2 font-bold px-4 py-5"
          aria-label="Redo"
        >
          <Redo2 className="w-5 h-5" />
        </Button>
        <Button
          onClick={handleReset}
          variant="outline"
          className="rounded-2xl border-2 font-bold text-lg px-6 py-5"
        >
          <RotateCcw className="w-5 h-5 mr-2" />
          Start Over
        </Button>
        <Button
          onClick={handleDownload}
          disabled={loading || loadError}
          className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-2xl font-bold text-lg px-6 py-5 shadow-lg"
        >
          <Download className="w-5 h-5 mr-2" />
          Save My Art!
        </Button>
      </div>
    </div>
  );
}
