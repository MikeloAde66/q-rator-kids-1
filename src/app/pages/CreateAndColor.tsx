import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ColoringCanvas } from '../components/ColoringCanvas';
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

  const pickCategory = (id: string) => {
    setCategoryId(id);
    setStep('character');
  };

  const pickCharacter = (s: ColoringSketch) => {
    setSketch(s);
    setStep('coloring');
  };

  const startOver = () => {
    setStep('category');
    setCategoryId(null);
    setSketch(null);
  };

  const backToCategory = () => {
    setStep('category');
    setCategoryId(null);
  };

  const category = coloringCategories.find((c) => c.id === categoryId);

  return (
    <div className="space-y-8 pb-8 min-h-screen">
      <div className="text-center space-y-2">
        <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 bg-clip-text text-transparent">
          Create & Color! 🖍️
        </h1>
      </div>

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
          </motion.div>
        )}

        {step === 'coloring' && sketch && (
          <motion.div
            key="coloring"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <button
              onClick={backToCategory}
              className="flex items-center gap-1 mx-auto text-gray-500 font-bold hover:text-gray-700"
            >
              <ArrowLeft className="w-5 h-5" /> Pick a different one
            </button>
            <p className="text-2xl md:text-3xl text-center font-bold text-gray-800 flex items-center justify-center gap-2">
              Color your {sketch.name}! <Sparkles className="w-7 h-7 text-yellow-500" />
            </p>
            <ColoringCanvas imageUrl={sketch.imageUrl} title={sketch.name} />
            <div className="flex justify-center pt-2">
              <Button
                onClick={startOver}
                variant="outline"
                className="rounded-2xl border-2 font-bold text-lg px-8 py-5"
              >
                Draw Something New!
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
