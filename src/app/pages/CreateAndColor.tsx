import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Wand2 } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { VeridianKidsStudio } from '../components/VeridianKidsStudio';
import {
  coloringCategories,
  getSketchesByCategory,
  type ColoringSketch,
} from '../data/coloringSketches';

type Step = 'category' | 'character' | 'coloring';

export function CreateAndColor() {
  const [step, setStep] = useState<Step>('category');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [sketch, setSketch] = useState<ColoringSketch | null>(null);

  // "Something else?" — live AI drawing for anything not in the preset
  // library. This is the only part of the feature that costs money per
  // use (calls our /api/generate-coloring-sketch function), so it's a
  // deliberate extra step rather than the default.
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawError, setDrawError] = useState<string | null>(null);

  const pickCategory = (id: string) => {
    setCategoryId(id);
    setStep('character');
  };

  const pickCharacter = (s: ColoringSketch) => {
    setSketch(s);
    setStep('coloring');
  };

  const drawCustom = async () => {
    const subject = customText.trim();
    if (!subject || isDrawing) return;
    setIsDrawing(true);
    setDrawError(null);
    try {
      const res = await fetch('/api/generate-coloring-sketch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject }),
      });
      const data = await res.json();
      if (!res.ok || !data.imageUrl) {
        throw new Error(data?.error || 'Could not draw that.');
      }
      setSketch({
        id: `custom-${Date.now()}`,
        categoryId: categoryId || 'custom',
        name: subject,
        imageUrl: data.imageUrl,
      });
      setStep('coloring');
      setShowCustomInput(false);
      setCustomText('');
    } catch (err: any) {
      setDrawError("Hmm, couldn't draw that one — try a different idea!");
    } finally {
      setIsDrawing(false);
    }
  };

  const startOver = () => {
    setStep('category');
    setCategoryId(null);
    setSketch(null);
    setShowCustomInput(false);
    setCustomText('');
    setDrawError(null);
  };

  const backToCategory = () => {
    setStep('category');
    setCategoryId(null);
    setShowCustomInput(false);
    setCustomText('');
    setDrawError(null);
  };

  const category = coloringCategories.find((c) => c.id === categoryId);

  return (
    <div className="space-y-8 pb-8 min-h-screen">
      {step !== 'coloring' && (
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
            Create & Color! 🖍️
          </h1>
        </div>
      )}

      <AnimatePresence mode="wait">
        {step === 'category' && (
          <motion.div
            key="category"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <p className="text-2xl md:text-3xl text-center font-bold text-gray-800">
              What do you want to draw today? 🎨
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              {coloringCategories.map((cat) => (
                <motion.button
                  key={cat.id}
                  whileHover={{ scale: 1.08, rotate: [0, -3, 3, 0] }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => pickCategory(cat.id)}
                >
                  <Card className="p-8 w-48 text-center space-y-3 border-4 border-purple-200 rounded-3xl shadow-xl bg-white hover:border-purple-400 transition-all">
                    <div className="text-6xl">{cat.icon}</div>
                    <p className="text-xl font-black text-gray-800">{cat.label}</p>
                  </Card>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'character' && category && (
          <motion.div
            key="character"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <button
              onClick={backToCategory}
              className="flex items-center gap-1 mx-auto text-gray-500 font-bold hover:text-gray-700"
            >
              <ArrowLeft className="w-5 h-5" /> Back
            </button>
            <p className="text-2xl md:text-3xl text-center font-bold text-gray-800">
              {category.question} Which kind do you like? {category.icon}
            </p>
            <div className="flex flex-wrap justify-center gap-6">
              {getSketchesByCategory(category.id).map((s) => (
                <motion.button
                  key={s.id}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => pickCharacter(s)}
                >
                  <Card className="p-6 w-40 text-center space-y-3 border-4 border-purple-200 rounded-3xl shadow-xl bg-white hover:border-purple-400 transition-all overflow-hidden">
                    <div className="w-full aspect-square rounded-2xl overflow-hidden bg-gray-50">
                      <img
                        src={s.imageUrl}
                        alt={s.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <p className="text-lg font-black text-gray-800">{s.name}</p>
                  </Card>
                </motion.button>
              ))}
            </div>

            <div className="flex flex-col items-center gap-3 pt-2">
              {!showCustomInput ? (
                <button
                  onClick={() => setShowCustomInput(true)}
                  className="flex items-center gap-2 text-purple-600 font-bold text-lg hover:text-purple-800"
                >
                  <Wand2 className="w-5 h-5" />
                  Something else? Type it!
                </button>
              ) : (
                <Card className="p-5 w-full max-w-md border-4 border-purple-200 rounded-3xl shadow-xl bg-white space-y-3">
                  <p className="text-center font-bold text-gray-700">
                    What do you want to draw? 🪄
                  </p>
                  <Input
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && drawCustom()}
                    placeholder="a dolphin, a rocket, a puppy..."
                    disabled={isDrawing}
                    className="text-center text-lg rounded-2xl border-2 py-5"
                  />
                  {drawError && (
                    <p className="text-center text-red-500 font-bold text-sm">{drawError}</p>
                  )}
                  <Button
                    onClick={drawCustom}
                    disabled={!customText.trim() || isDrawing}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl font-bold text-lg py-5 shadow-lg"
                  >
                    {isDrawing ? (
                      <motion.span
                        animate={{ opacity: [1, 0.4, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity }}
                      >
                        Drawing it... ✨
                      </motion.span>
                    ) : (
                      'Draw it!'
                    )}
                  </Button>
                </Card>
              )}
            </div>
          </motion.div>
        )}

        {step === 'coloring' && sketch && (
          <motion.div
            key="coloring"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="pb-24 lg:pb-6"
          >
            <VeridianKidsStudio
              sketch={sketch}
              otherSketches={
                categoryId ? getSketchesByCategory(categoryId).filter((s) => s.id !== sketch.id) : []
              }
              onSwitchSketch={(s) => setSketch(s)}
              onBack={startOver}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
