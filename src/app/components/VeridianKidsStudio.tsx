import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Menu,
  Hand,
  SquareDashedMousePointer,
  Eraser as ClearIcon,
  Palette,
  ChevronRight,
  Paintbrush,
  PenLine,
  Pencil,
  PaintBucket,
  Eraser,
  Trash2,
  Undo2,
  Redo2,
  Download,
  Send,
  ArrowLeft,
  Settings,
} from 'lucide-react';
import { PaintEngine, type PaintEngineHandle, type PaintTool, type FillPattern, type PaintLayer } from './PaintEngine';
import type { ColoringSketch } from '../data/coloringSketches';

interface VeridianKidsStudioProps {
  sketch: ColoringSketch;
  otherSketches: ColoringSketch[];
  onSwitchSketch: (sketch: ColoringSketch) => void;
}

const BRUSHES: { id: PaintTool; label: string; icon: typeof Paintbrush }[] = [
  { id: 'draw', label: 'Paintbrush', icon: Paintbrush },
  { id: 'draw-crayon', label: 'Crayon', icon: PenLine },
  { id: 'draw-pencil', label: 'Pencil', icon: Pencil },
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
  { name: 'Grey', hex: '#9ca3af' },
  { name: 'Lavender', hex: '#c4b5fd' },
  { name: 'Turquoise', hex: '#2dd4bf' },
  { name: 'Magenta', hex: '#d946ef' },
  { name: 'Gold', hex: '#eab308' },
  { name: 'Mint', hex: '#6ee7b7' },
];

const FILL_PATTERNS: { id: FillPattern; label: string }[] = [
  { id: 'solid', label: 'Solid' },
  { id: 'dots', label: 'Dots' },
  { id: 'stripes', label: 'Stripes' },
  { id: 'checker', label: 'Checkers' },
];

function Toast({ message }: { message: string | null }) {
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

function Section({
  id,
  title,
  icon: Icon,
  openId,
  setOpenId,
  action,
  children,
}: {
  id: string;
  title: string;
  icon: typeof Paintbrush;
  openId: string | null;
  setOpenId: (id: string | null) => void;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const isOpen = openId === id;
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpenId(isOpen ? null : id)}
        className="w-full flex items-center justify-between py-3 px-1 text-left"
      >
        <span className="flex items-center gap-2 font-black text-sm text-purple-700 uppercase tracking-wide">
          <Icon className="w-4 h-4" />
          {title}
        </span>
        <span className="flex items-center gap-1">
          {action}
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pb-4 px-1 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function VeridianKidsStudio({ sketch, otherSketches, onSwitchSketch }: VeridianKidsStudioProps) {
  const engineRef = useRef<PaintEngineHandle>(null);

  const [tool, setTool] = useState<PaintTool>('fill');
  const [color, setColor] = useState(CRAYON_COLORS[0].hex);
  const [brushSize, setBrushSize] = useState(20);
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [fillPattern, setFillPattern] = useState<FillPattern>('solid');
  // Rulers/Layers/Adjust are built into the engine but hidden from this
  // page's UI for now (per feedback) — showRulers always false here, and
  // the engine still runs its one default layer under the hood.
  const [showRulers] = useState(false);

  const [layers, setLayers] = useState<PaintLayer[]>([]);
  const [activeLayerId, setActiveLayerId] = useState<string | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('brushes');
  const [stencilMenuOpen, setStencilMenuOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flashToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  };

  const pickBrush = (id: PaintTool) => {
    setTool(id);
  };

  const pickFillPattern = (p: FillPattern) => {
    setFillPattern(p);
    setTool('fill');
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      {/* Top utility bar — mirrors Veridian Q's icon row + Reference dropdown + settings gear */}
      <div className="flex items-center justify-between bg-white rounded-2xl shadow-lg px-4 py-2.5 mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOpenSection(openSection ? null : 'brushes')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-purple-100 text-purple-600"
            aria-label="Toggle panel"
          >
            <Menu className="w-4 h-4" />
          </button>
          <button
            onClick={() => flashToast('Move Canvas is coming soon! ✋')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500"
            aria-label="Pan"
          >
            <Hand className="w-4 h-4" />
          </button>
          <button
            onClick={() => flashToast('Select Area is coming soon! 🔲')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500"
            aria-label="Select"
          >
            <SquareDashedMousePointer className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              engineRef.current?.resetActiveLayer();
              flashToast('Layer cleared!');
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-red-100 text-red-500"
            aria-label="Clear active layer"
          >
            <ClearIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setOpenSection('brushes')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-pink-100 text-pink-500"
            aria-label="Color palette"
          >
            <Palette className="w-4 h-4" />
          </button>
        </div>

        <div className="relative">
          <button
            onClick={() => setStencilMenuOpen((v) => !v)}
            className="flex items-center gap-2 bg-purple-50 text-purple-700 font-bold text-sm px-4 py-2 rounded-xl"
          >
            Stencil: {sketch.name}
          </button>
          <AnimatePresence>
            {stencilMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-xl p-2 grid grid-cols-3 gap-2 z-30 w-56"
              >
                {[sketch, ...otherSketches].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setStencilMenuOpen(false);
                      if (s.id !== sketch.id) onSwitchSketch(s);
                    }}
                    className={`aspect-square rounded-xl overflow-hidden border-2 ${
                      s.id === sketch.id ? 'border-purple-500' : 'border-gray-200'
                    }`}
                  >
                    <img src={s.imageUrl} alt={s.name} className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => flashToast('Settings are coming soon! ⚙️')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-100 text-gray-500"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: accordion panel */}
        <AnimatePresence initial={false}>
          {openSection !== null && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="lg:w-72 bg-white rounded-3xl shadow-xl p-4 overflow-hidden shrink-0"
            >
              <div className="w-64 lg:w-full">
                <Section id="brushes" title="Brushes" icon={Paintbrush} openId={openSection} setOpenId={setOpenSection}>
                  <div className="grid grid-cols-3 gap-2">
                    {BRUSHES.map((b) => {
                      const Icon = b.icon;
                      const active = tool === b.id;
                      return (
                        <button
                          key={b.id}
                          onClick={() => pickBrush(b.id)}
                          className={`flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-bold ${
                            active ? 'bg-purple-200 text-purple-800 ring-2 ring-purple-400' : 'bg-purple-50 text-purple-600'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                          {b.label}
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Colors</p>
                    <div className="grid grid-cols-6 gap-1.5">
                      {CRAYON_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          onClick={() => setColor(c.hex)}
                          title={c.name}
                          aria-label={c.name}
                          className={`aspect-square rounded-full border-2 ${
                            color === c.hex ? 'ring-2 ring-purple-400 scale-110' : 'border-white'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Size</p>
                    <input
                      type="range"
                      min={8}
                      max={48}
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Opacity</p>
                    <input
                      type="range"
                      min={20}
                      max={100}
                      value={Math.round(brushOpacity * 100)}
                      onChange={(e) => setBrushOpacity(Number(e.target.value) / 100)}
                      className="w-full accent-purple-500"
                    />
                  </div>
                </Section>

                <Section id="tools" title="Tools" icon={PaintBucket} openId={openSection} setOpenId={setOpenSection}>
                  <button
                    onClick={() => pickFillPattern('solid')}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold ${
                      tool === 'fill' && fillPattern === 'solid' ? 'bg-green-200 text-green-800 ring-2 ring-green-400' : 'bg-green-50 text-green-700'
                    }`}
                  >
                    <PaintBucket className="w-4 h-4" /> Fill Bucket
                  </button>
                  <div className="grid grid-cols-3 gap-1.5">
                    {FILL_PATTERNS.filter((p) => p.id !== 'solid').map((p) => (
                      <button
                        key={p.id}
                        onClick={() => pickFillPattern(p.id)}
                        className={`py-1.5 rounded-lg text-xs font-bold ${
                          tool === 'fill' && fillPattern === p.id
                            ? 'bg-fuchsia-200 text-fuchsia-800 ring-2 ring-fuchsia-400'
                            : 'bg-fuchsia-50 text-fuchsia-600'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setTool('erase')}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold ${
                      tool === 'erase' ? 'bg-blue-200 text-blue-800 ring-2 ring-blue-400' : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    <Eraser className="w-4 h-4" /> Eraser
                  </button>
                </Section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center: canvas + floating reference monitor */}
        <div className="flex-1 bg-white rounded-3xl shadow-xl p-4 relative">
          <div className="flex items-center justify-center gap-3 mb-3">
            <button
              onClick={() => engineRef.current?.undo()}
              disabled={!canUndo}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 disabled:opacity-30"
              aria-label="Undo"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => engineRef.current?.redo()}
              disabled={!canRedo}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600 disabled:opacity-30"
              aria-label="Redo"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          {/* 8x10 page, fit to the screen: no manual size control, no fixed
              pixel number. The box sizes itself off the viewport (width up
              to a sane cap, height up to 65% of the screen's height), and
              the canvas inside is object-contain, so the whole picture
              always fits with nothing cut off — consistently, on any
              device, without a slider. */}
          <div className="mx-auto w-full max-w-[900px] aspect-[4/5]" style={{ maxHeight: '65vh' }}>
            <PaintEngine
              ref={engineRef}
              imageUrl={sketch.imageUrl}
              tool={tool}
              color={color}
              brushSize={brushSize}
              brushOpacity={brushOpacity}
              fillPattern={fillPattern}
              showRulers={showRulers}
              layers={layers}
              activeLayerId={activeLayerId}
              onLayersChange={(next, nextActive) => {
                setLayers(next);
                setActiveLayerId(nextActive);
              }}
              onHistoryChange={(u, r) => {
                setCanUndo(u);
                setCanRedo(r);
              }}
            />
          </div>
        </div>
      </div>

      <Toast message={toast} />

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:static bg-white lg:bg-transparent border-t lg:border-0 border-gray-100 p-3 lg:p-0 lg:mt-4">
        <div className="flex flex-wrap items-center justify-center gap-3 max-w-7xl mx-auto">
          <button
            onClick={() => engineRef.current?.resetAll()}
            className="flex items-center gap-2 bg-red-100 text-red-600 font-bold px-5 py-3 rounded-2xl"
          >
            <Trash2 className="w-5 h-5" />
            Clear Board
          </button>
          <button
            onClick={() => {
              engineRef.current?.download(`${sketch.name}-my-painting.png`);
              flashToast('Saved to your downloads!');
            }}
            className="flex items-center gap-2 bg-blue-100 text-blue-600 font-bold px-5 py-3 rounded-2xl"
          >
            <Download className="w-5 h-5" />
            Save &amp; Download
          </button>
          <button
            onClick={() => flashToast('Submit to Teacher is coming soon!')}
            className="flex items-center gap-2 bg-purple-100 text-purple-600 font-bold px-5 py-3 rounded-2xl"
          >
            <Send className="w-5 h-5" />
            Submit to Teacher!
          </button>
          <button
            onClick={() => setStencilMenuOpen(true)}
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
