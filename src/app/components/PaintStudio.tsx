import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Paintbrush,
  PenLine,
  Pencil,
  PaintBucket,
  Eraser,
  Droplets,
  Grid3x3,
  Sticker,
  Wand2,
  Undo2,
  Redo2,
  Trash2,
  Save,
  Send,
  ArrowLeft,
} from 'lucide-react';
import { PaintCanvas, type PaintCanvasHandle, type PaintTool } from './PaintCanvas';
import type { ColoringSketch } from '../data/coloringSketches';

interface PaintStudioProps {
  sketch: ColoringSketch;
  otherSketches: ColoringSketch[];
  onSwitchSketch: (sketch: ColoringSketch) => void;
  onBack: () => void;
}

// Working tools today. Everything past "erase" in the list below is the
// visual foundation for tools we're lighting up one at a time — tapping
// them shows a friendly "coming soon" instead of doing nothing.
type ToolDef = {
  id: PaintTool | string;
  label: string;
  icon: typeof Paintbrush;
  bg: string;
  live: boolean;
};

const TOOLS: ToolDef[] = [
  { id: 'draw', label: 'Paintbrush', icon: Paintbrush, bg: 'bg-purple-100 text-purple-600', live: true },
  { id: 'draw-crayon', label: 'Crayons', icon: PenLine, bg: 'bg-orange-100 text-orange-600', live: false },
  { id: 'draw-pencil', label: 'Colored Pencils', icon: Pencil, bg: 'bg-yellow-100 text-yellow-700', live: false },
  { id: 'fill', label: 'Paint Bucket', icon: PaintBucket, bg: 'bg-green-100 text-green-600', live: true },
  { id: 'erase', label: 'Eraser', icon: Eraser, bg: 'bg-blue-100 text-blue-600', live: true },
  { id: 'blend', label: 'Blend', icon: Droplets, bg: 'bg-slate-100 text-slate-600', live: false },
  { id: 'textures', label: 'Textures & Patterns', icon: Grid3x3, bg: 'bg-fuchsia-100 text-fuchsia-600', live: false },
  { id: 'stickers', label: 'Sticker Box', icon: Sticker, bg: 'bg-pink-100 text-pink-600', live: false },
  { id: 'magic', label: 'Magic FX', icon: Wand2, bg: 'bg-violet-100 text-violet-600', live: false },
];

const CRAYON_COLORS: { name: string; hex: string }[] = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Yellow', hex: '#facc15' },
  { name: 'Green', hex: '#22c55e' },
  { name: 'Teal', hex: '#14b8a6' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Indigo', hex: '#6366f1' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Brown', hex: '#92400e' },
  { name: 'Black', hex: '#1f2937' },
  { name: 'White', hex: '#ffffff' },
];

function ComingSoonToast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-xl font-bold text-sm z-50"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function PaintStudio({ sketch, otherSketches, onSwitchSketch, onBack }: PaintStudioProps) {
  const canvasRef = useRef<PaintCanvasHandle>(null);
  const [tool, setTool] = useState<PaintTool>('fill');
  const [color, setColor] = useState(CRAYON_COLORS[0].hex);
  const [brushSize, setBrushSize] = useState(20);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [paletteTab, setPaletteTab] = useState<'basic' | 'advanced'>('basic');
  const [toast, setToast] = useState<string | null>(null);

  const showComingSoon = (label: string) => {
    setToast(`${label} is coming soon! ✨`);
    window.setTimeout(() => setToast(null), 1800);
  };

  const handleToolClick = (toolDef: ToolDef) => {
    if (!toolDef.live) {
      showComingSoon(toolDef.label);
      return;
    }
    setTool(toolDef.id as PaintTool);
  };

  const activeToolId = tool === 'draw' ? 'draw' : tool;

  return (
    <div className="flex flex-col lg:flex-row gap-5 max-w-7xl mx-auto">
      {/* Left: Art Toolkit */}
      <div className="lg:w-44 bg-white rounded-3xl shadow-xl p-4 space-y-4">
        <h2 className="text-lg font-black text-purple-700 text-center">Art Toolkit</h2>
        <div className="grid grid-cols-3 lg:grid-cols-2 gap-3">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            const isActive = activeToolId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleToolClick(t)}
                className={`flex flex-col items-center gap-1 py-3 rounded-2xl transition-all ${t.bg} ${
                  isActive ? 'ring-4 ring-purple-400 scale-105' : 'opacity-90 hover:opacity-100'
                } ${!t.live ? 'grayscale-[0.3]' : ''}`}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[11px] font-bold text-center leading-tight px-1">{t.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex justify-center gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={() => {
              canvasRef.current?.undo();
            }}
            disabled={!canUndo}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-blue-100 text-blue-600 disabled:opacity-30"
            aria-label="Undo"
          >
            <Undo2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              canvasRef.current?.redo();
            }}
            disabled={!canRedo}
            className="flex items-center justify-center w-11 h-11 rounded-full bg-blue-100 text-blue-600 disabled:opacity-30"
            aria-label="Redo"
          >
            <Redo2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center: canvas */}
      <div className="flex-1 bg-white rounded-3xl shadow-xl p-4 flex flex-col items-center gap-3">
        <div className="w-full max-w-xl">
          <PaintCanvas
            ref={canvasRef}
            imageUrl={sketch.imageUrl}
            tool={tool}
            color={color}
            brushSize={brushSize}
            onHistoryChange={(u, r) => {
              setCanUndo(u);
              setCanRedo(r);
            }}
          />
        </div>
        {otherSketches.length > 0 && (
          <div className="flex gap-2">
            {otherSketches.map((s) => (
              <button
                key={s.id}
                onClick={() => onSwitchSketch(s)}
                className="w-2.5 h-2.5 rounded-full bg-gray-300 hover:bg-purple-400 transition-colors"
                aria-label={`Switch to ${s.name}`}
                title={s.name}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right: Palette & Stencil Gallery */}
      <div className="lg:w-72 bg-white rounded-3xl shadow-xl p-4 space-y-4">
        <h2 className="text-lg font-black text-purple-700 text-center">Palette & Stencil Gallery</h2>

        <div className="flex rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => setPaletteTab('basic')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              paletteTab === 'basic' ? 'bg-white shadow text-purple-700' : 'text-gray-500'
            }`}
          >
            Basic Colors
          </button>
          <button
            onClick={() => {
              setPaletteTab('advanced');
              showComingSoon('Advanced Mixes');
            }}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              paletteTab === 'advanced' ? 'bg-white shadow text-purple-700' : 'text-gray-500'
            }`}
          >
            Advanced Mixes
          </button>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {CRAYON_COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => setColor(c.hex)}
              title={c.name}
              aria-label={c.name}
              className={`aspect-square rounded-full border-2 shadow-sm transition-all ${
                color === c.hex ? 'ring-4 ring-purple-400 scale-110' : 'border-white'
              }`}
              style={{ backgroundColor: c.hex }}
            />
          ))}
        </div>

        {otherSketches.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">Stencils</p>
            <div className="grid grid-cols-3 gap-2">
              {[sketch, ...otherSketches].map((s) => (
                <button
                  key={s.id}
                  onClick={() => (s.id === sketch.id ? undefined : onSwitchSketch(s))}
                  className={`aspect-square rounded-xl overflow-hidden border-2 ${
                    s.id === sketch.id ? 'border-purple-500' : 'border-gray-200'
                  }`}
                >
                  <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Stickers</p>
          <div className="grid grid-cols-3 gap-2">
            {['⭐', '💖', '🌈'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => showComingSoon('Stickers')}
                className="aspect-square rounded-xl bg-gray-50 border-2 border-gray-200 flex items-center justify-center text-2xl"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-purple-50 rounded-2xl p-3 text-center text-sm font-bold text-purple-700">
          Let's create some magic! 🐰
        </div>

        <div>
          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Brush Size</p>
          <input
            type="range"
            min={8}
            max={48}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-full accent-purple-500"
          />
        </div>
      </div>

      <ComingSoonToast message={toast} />

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:static bg-white lg:bg-transparent border-t lg:border-0 border-gray-100 p-3 lg:p-0 lg:mt-2">
        <div className="flex flex-wrap items-center justify-center gap-3 max-w-7xl mx-auto">
          <button
            onClick={() => canvasRef.current?.reset()}
            className="flex items-center gap-2 bg-red-100 text-red-600 font-bold px-5 py-3 rounded-2xl"
          >
            <Trash2 className="w-5 h-5" />
            Clear Board
          </button>
          <button
            onClick={() => canvasRef.current?.download(`${sketch.name}-my-painting.png`)}
            className="flex items-center gap-2 bg-blue-100 text-blue-600 font-bold px-5 py-3 rounded-2xl"
          >
            <Save className="w-5 h-5" />
            Save to Gallery
          </button>
          <button
            onClick={() => showComingSoon('Submit to Teacher')}
            className="flex items-center gap-2 bg-purple-100 text-purple-600 font-bold px-5 py-3 rounded-2xl"
          >
            <Send className="w-5 h-5" />
            Submit to Teacher!
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-2 bg-gray-100 text-gray-600 font-bold px-5 py-3 rounded-2xl"
          >
            <ArrowLeft className="w-5 h-5" />
            Pick Another
          </button>
        </div>
      </div>
    </div>
  );
}
