import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Paintbrush } from 'lucide-react';

export type PaintTool = 'fill' | 'draw' | 'draw-crayon' | 'draw-pencil' | 'erase';
export type FillPattern = 'solid' | 'dots' | 'stripes' | 'checker';

export interface PaintLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number; // 0..1
}

export interface Adjustments {
  brightness: number; // -100..100
  contrast: number; // -100..100
  saturation: number; // -100..100
}

export const DEFAULT_ADJUSTMENTS: Adjustments = { brightness: 0, contrast: 0, saturation: 0 };

export interface PaintEngineHandle {
  undo: () => void;
  redo: () => void;
  resetActiveLayer: () => void;
  resetAll: () => void;
  download: (filename: string) => void;
  addLayer: () => void;
  deleteLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  moveLayer: (id: string, direction: 'up' | 'down') => void;
  setActiveLayerId: (id: string) => void;
  applyAdjustments: (adj: Adjustments) => void;
}

interface PaintEngineProps {
  imageUrl: string;
  tool: PaintTool;
  color: string;
  brushSize: number;
  brushOpacity: number;
  fillPattern: FillPattern;
  showRulers: boolean;
  layers: PaintLayer[];
  activeLayerId: string | null;
  onLayersChange: (layers: PaintLayer[], activeLayerId: string) => void;
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void;
  onLoadStateChange?: (loading: boolean, error: boolean) => void;
  onPreviewFrame?: (dataUrl: string) => void;
}

const MAX_HISTORY = 20;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function patternMatch(x: number, y: number, pattern: FillPattern): boolean {
  switch (pattern) {
    case 'dots': {
      const cx = x % 14;
      const cy = y % 14;
      const dx = cx - 6;
      const dy = cy - 6;
      return dx * dx + dy * dy < 16;
    }
    case 'stripes':
      return (x + y) % 16 < 8;
    case 'checker':
      return (Math.floor(x / 9) + Math.floor(y / 9)) % 2 === 0;
    default:
      return true;
  }
}

// Scans the flattened composite (what the child actually sees) to find the
// bounded region, bordered by the sketch's dark outlines — but the fill
// color only gets written onto the active layer, the way real layered
// paint apps work.
function floodFillMask(composite: ImageData, startX: number, startY: number, tolerance = 40): Uint8Array | null {
  const { data, width, height } = composite;
  const startIdx = (startY * width + startX) * 4;
  const startR = data[startIdx];
  const startG = data[startIdx + 1];
  const startB = data[startIdx + 2];
  if (startR < 60 && startG < 60 && startB < 60) return null;

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

  const mask = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const stack: [number, number][] = [[startX, startY]];
  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const pos = y * width + x;
    if (visited[pos]) continue;
    const idx = pos * 4;
    if (!matches(idx)) continue;
    visited[pos] = 1;
    mask[pos] = 1;
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return mask;
}

function applyFillMask(
  layerData: ImageData,
  mask: Uint8Array,
  fillColor: [number, number, number],
  pattern: FillPattern
) {
  const { data, width, height } = layerData;
  const [fr, fg, fb] = fillColor;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y * width + x;
      if (!mask[pos]) continue;
      if (!patternMatch(x, y, pattern)) continue;
      const idx = pos * 4;
      data[idx] = fr;
      data[idx + 1] = fg;
      data[idx + 2] = fb;
      data[idx + 3] = 255;
    }
  }
}

function applyAdjustmentsToImageData(imageData: ImageData, adj: Adjustments) {
  const { data } = imageData;
  const brightness = (adj.brightness / 100) * 127;
  const c = (adj.contrast / 100) * 255;
  const contrastFactor = (259 * (c + 255)) / (255 * (259 - c));
  const satFactor = 1 + adj.saturation / 100;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    let r = data[i] + brightness;
    let g = data[i + 1] + brightness;
    let b = data[i + 2] + brightness;

    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    r = gray + (r - gray) * satFactor;
    g = gray + (g - gray) * satFactor;
    b = gray + (b - gray) * satFactor;

    data[i] = Math.max(0, Math.min(255, r));
    data[i + 1] = Math.max(0, Math.min(255, g));
    data[i + 2] = Math.max(0, Math.min(255, b));
  }
}

export const PaintEngine = forwardRef<PaintEngineHandle, PaintEngineProps>(function PaintEngine(
  {
    imageUrl,
    tool,
    color,
    brushSize,
    brushOpacity,
    fillPattern,
    showRulers,
    layers,
    activeLayerId,
    onLayersChange,
    onHistoryChange,
    onLoadStateChange,
    onPreviewFrame,
  },
  ref
) {
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const layerCanvases = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const layersRef = useRef<PaintLayer[]>(layers);
  const activeLayerIdRef = useRef<string | null>(activeLayerId);

  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const isDrawingRef = useRef(false);

  // History stores { layerId, imageData } snapshots of whichever layer
  // changed, so undo/redo can target the right layer even after switching.
  const undoStack = useRef<{ layerId: string; imageData: ImageData }[]>([]);
  const redoStack = useRef<{ layerId: string; imageData: ImageData }[]>([]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);
  useEffect(() => {
    activeLayerIdRef.current = activeLayerId;
  }, [activeLayerId]);

  const reportHistory = () => {
    onHistoryChange?.(undoStack.current.length > 0, redoStack.current.length > 0);
  };

  const compositeToDisplay = useCallback(() => {
    const display = displayCanvasRef.current;
    const bg = backgroundCanvasRef.current;
    if (!display || !bg) return;
    const ctx = display.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, display.width, display.height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(bg, 0, 0);
    for (const layer of layersRef.current) {
      if (!layer.visible) continue;
      const canvas = layerCanvases.current.get(layer.id);
      if (!canvas) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.drawImage(canvas, 0, 0);
    }
    ctx.globalAlpha = 1;

    if (onPreviewFrame) {
      try {
        onPreviewFrame(display.toDataURL('image/png'));
      } catch {
        // tainted canvas — skip the live preview, main canvas still works
      }
    }
  }, [onPreviewFrame]);

  const makeLayerCanvas = (width: number, height: number) => {
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    return c;
  };

  const loadImage = useCallback(() => {
    const display = displayCanvasRef.current;
    if (!display) return;

    setLoading(true);
    setLoadError(false);
    onLoadStateChange?.(true, false);

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      display.width = w;
      display.height = h;

      const bg = makeLayerCanvas(w, h);
      bg.getContext('2d')?.drawImage(img, 0, 0);
      backgroundCanvasRef.current = bg;

      layerCanvases.current.clear();
      const initialLayer: PaintLayer = { id: crypto.randomUUID(), name: 'Coloring', visible: true, opacity: 1 };
      layerCanvases.current.set(initialLayer.id, makeLayerCanvas(w, h));

      undoStack.current = [];
      redoStack.current = [];
      reportHistory();

      onLayersChange([initialLayer], initialLayer.id);

      try {
        bg.getContext('2d')?.getImageData(0, 0, w, h);
        setLoading(false);
        onLoadStateChange?.(false, false);
        compositeToDisplay();
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

  // Re-composite whenever layer visibility/opacity/order changes.
  useEffect(() => {
    if (!loading) compositeToDisplay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, loading]);

  const getActiveLayerCanvas = () => {
    const id = activeLayerIdRef.current;
    if (!id) return null;
    return layerCanvases.current.get(id) ?? null;
  };

  const pushHistory = () => {
    const id = activeLayerIdRef.current;
    const canvas = getActiveLayerCanvas();
    if (!id || !canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    try {
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStack.current.push({ layerId: id, imageData: snapshot });
      if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
      redoStack.current = [];
      reportHistory();
    } catch {
      // tainted canvas, history just won't work for this sketch
    }
  };

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = displayCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width),
      y: Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height),
    };
  };

  const strokeAt = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    if (tool === 'erase') {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (tool === 'draw-crayon') {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = color;
      const dabs = 6;
      for (let i = 0; i < dabs; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * brushSize * 0.35;
        const ox = x + Math.cos(angle) * dist;
        const oy = y + Math.sin(angle) * dist;
        ctx.globalAlpha = (0.16 + Math.random() * 0.14) * brushOpacity;
        ctx.beginPath();
        ctx.arc(ox, oy, (brushSize / 2) * (0.6 + Math.random() * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    if (tool === 'draw-pencil') {
      ctx.save();
      ctx.fillStyle = color;
      const dabs = 4;
      for (let i = 0; i < dabs; i++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * brushSize * 0.15;
        const ox = x + Math.cos(angle) * dist;
        const oy = y + Math.sin(angle) * dist;
        ctx.globalAlpha = (0.55 + Math.random() * 0.3) * brushOpacity;
        ctx.beginPath();
        ctx.arc(ox, oy, Math.max(1, brushSize * 0.12), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.globalAlpha = brushOpacity;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const display = displayCanvasRef.current;
    const layerCanvas = getActiveLayerCanvas();
    if (!display || !layerCanvas || loadError || loading) return;
    const layerCtx = layerCanvas.getContext('2d', { willReadFrequently: true });
    if (!layerCtx) return;

    display.setPointerCapture(e.pointerId);
    const { x, y } = getCanvasPoint(e);

    if (tool === 'fill') {
      const displayCtx = display.getContext('2d', { willReadFrequently: true });
      if (!displayCtx) return;
      const composite = displayCtx.getImageData(0, 0, display.width, display.height);
      const mask = floodFillMask(composite, x, y);
      if (mask) {
        const layerData = layerCtx.getImageData(0, 0, layerCanvas.width, layerCanvas.height);
        applyFillMask(layerData, mask, hexToRgb(color), fillPattern);
        layerCtx.putImageData(layerData, 0, 0);
        pushHistory();
        compositeToDisplay();
      }
      return;
    }

    isDrawingRef.current = true;
    strokeAt(layerCtx, x, y);
    compositeToDisplay();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || tool === 'fill') return;
    const layerCanvas = getActiveLayerCanvas();
    const layerCtx = layerCanvas?.getContext('2d', { willReadFrequently: true });
    if (!layerCanvas || !layerCtx) return;
    const { x, y } = getCanvasPoint(e);
    strokeAt(layerCtx, x, y);
    compositeToDisplay();
  };

  const handlePointerUp = () => {
    if (isDrawingRef.current) {
      isDrawingRef.current = false;
      pushHistory();
    }
  };

  const applySnapshot = (entry: { layerId: string; imageData: ImageData }) => {
    const canvas = layerCanvases.current.get(entry.layerId);
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    ctx.putImageData(entry.imageData, 0, 0);
    compositeToDisplay();
  };

  useImperativeHandle(ref, () => ({
    undo: () => {
      const entry = undoStack.current.pop();
      if (!entry) return;
      const canvas = layerCanvases.current.get(entry.layerId);
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      if (canvas && ctx) {
        try {
          const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
          redoStack.current.push({ layerId: entry.layerId, imageData: current });
        } catch {
          // ignore
        }
      }
      applySnapshot(entry);
      reportHistory();
    },
    redo: () => {
      const entry = redoStack.current.pop();
      if (!entry) return;
      const canvas = layerCanvases.current.get(entry.layerId);
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      if (canvas && ctx) {
        try {
          const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
          undoStack.current.push({ layerId: entry.layerId, imageData: current });
        } catch {
          // ignore
        }
      }
      applySnapshot(entry);
      reportHistory();
    },
    resetActiveLayer: () => {
      const canvas = getActiveLayerCanvas();
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      pushHistory();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      compositeToDisplay();
    },
    resetAll: () => loadImage(),
    download: (filename: string) => {
      const display = displayCanvasRef.current;
      if (!display) return;
      const link = document.createElement('a');
      link.download = filename;
      link.href = display.toDataURL('image/png');
      link.click();
    },
    addLayer: () => {
      const display = displayCanvasRef.current;
      if (!display) return;
      const newLayer: PaintLayer = {
        id: crypto.randomUUID(),
        name: `Layer ${layersRef.current.length + 1}`,
        visible: true,
        opacity: 1,
      };
      layerCanvases.current.set(newLayer.id, makeLayerCanvas(display.width, display.height));
      onLayersChange([...layersRef.current, newLayer], newLayer.id);
    },
    deleteLayer: (id: string) => {
      if (layersRef.current.length <= 1) return;
      const remaining = layersRef.current.filter((l) => l.id !== id);
      layerCanvases.current.delete(id);
      const nextActive = activeLayerIdRef.current === id ? remaining[remaining.length - 1].id : activeLayerIdRef.current!;
      onLayersChange(remaining, nextActive);
    },
    toggleLayerVisibility: (id: string) => {
      const next = layersRef.current.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));
      onLayersChange(next, activeLayerIdRef.current!);
    },
    setLayerOpacity: (id: string, opacity: number) => {
      const next = layersRef.current.map((l) => (l.id === id ? { ...l, opacity } : l));
      onLayersChange(next, activeLayerIdRef.current!);
    },
    moveLayer: (id: string, direction: 'up' | 'down') => {
      const list = [...layersRef.current];
      const idx = list.findIndex((l) => l.id === id);
      const swapWith = direction === 'up' ? idx + 1 : idx - 1;
      if (idx < 0 || swapWith < 0 || swapWith >= list.length) return;
      [list[idx], list[swapWith]] = [list[swapWith], list[idx]];
      onLayersChange(list, activeLayerIdRef.current!);
    },
    setActiveLayerId: (id: string) => {
      onLayersChange(layersRef.current, id);
    },
    applyAdjustments: (adj: Adjustments) => {
      const canvas = getActiveLayerCanvas();
      const ctx = canvas?.getContext('2d', { willReadFrequently: true });
      if (!canvas || !ctx) return;
      pushHistory();
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      applyAdjustmentsToImageData(data, adj);
      ctx.putImageData(data, 0, 0);
      compositeToDisplay();
    },
  }));

  return (
    <div className="relative bg-white rounded-3xl shadow-inner overflow-hidden w-full h-full">
      {loading && (
        <div className="w-full h-full flex items-center justify-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
            <Paintbrush className="w-12 h-12 text-purple-400" />
          </motion.div>
        </div>
      )}
      {loadError && !loading && (
        <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-xl font-bold text-gray-700">Oops! This picture doesn't want to be colored right now.</p>
          <p className="text-gray-500">Let's pick a different one!</p>
        </div>
      )}
      <canvas
        ref={displayCanvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`w-full h-full object-contain touch-none ${loading || loadError ? 'hidden' : 'cursor-crosshair'}`}
      />
      {showRulers && !loading && !loadError && (
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage:
              'linear-gradient(to right, #a855f7 1px, transparent 1px), linear-gradient(to bottom, #a855f7 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      )}
    </div>
  );
});
