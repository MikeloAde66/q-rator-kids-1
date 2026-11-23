import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Lock, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';

interface GrownUpGateProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// A simple speed-bump, not real security: a quick math question a young
// child can't easily answer by accident, so kids don't wander into
// account/billing/settings screens while tapping around.
function makeQuestion() {
  const a = Math.floor(Math.random() * 8) + 4; // 4-11
  const b = Math.floor(Math.random() * 8) + 4; // 4-11
  return { a, b, answer: a * b };
}

export function GrownUpGate({ isOpen, onClose, onSuccess }: GrownUpGateProps) {
  const [question, setQuestion] = useState(makeQuestion);
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setQuestion(makeQuestion());
      setValue('');
      setWrong(false);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(value) === question.answer) {
      onSuccess();
    } else {
      setWrong(true);
      setQuestion(makeQuestion());
      setValue('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-3xl border-4 border-gray-300">
        <div className="bg-gradient-to-br from-gray-700 to-gray-900 p-6 text-white text-center">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-2 text-2xl font-black">
              <Lock className="w-8 h-8" />
              Grown-Ups Only
            </DialogTitle>
          </DialogHeader>
          <p className="text-gray-300 mt-1 text-sm">
            Quick check so this stays a grown-up area
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-center">
          <p className="text-xl font-bold text-gray-800">
            What is {question.a} &times; {question.b}?
          </p>
          <input
            type="number"
            inputMode="numeric"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full text-center text-2xl font-black p-4 rounded-2xl border-2 border-gray-300 focus:border-gray-600 outline-none"
          />
          {wrong && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-600 text-sm font-bold"
            >
              Not quite — try the new question!
            </motion.p>
          )}
          <Button
            type="submit"
            className="w-full bg-gray-800 hover:bg-gray-900 text-white text-lg py-5 rounded-2xl font-black"
          >
            Continue
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center gap-1 w-full text-gray-500 text-sm font-medium pt-1"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
