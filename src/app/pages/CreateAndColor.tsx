import { useState } from 'react';
import { VeridianKidsStudio } from '../components/VeridianKidsStudio';
import { DEFAULT_SKETCH, getAllSketches, type ColoringSketch } from '../data/coloringSketches';

// We're only working on one page right now: tapping Paint! goes straight
// into the coloring editor with a sample drawing already loaded, instead
// of the old category -> character picker wizard. The sketch library
// (coloringSketches.ts) and the "type what to draw" AI endpoint
// (/api/generate-coloring-sketch) are untouched and can be wired back
// into a picker UI later — just not here right now.
export function CreateAndColor() {
  const [sketch, setSketch] = useState<ColoringSketch>(DEFAULT_SKETCH);

  return (
    <div className="min-h-screen pb-6">
      <VeridianKidsStudio
        sketch={sketch}
        otherSketches={getAllSketches().filter((s) => s.id !== sketch.id)}
        onSwitchSketch={setSketch}
      />
    </div>
  );
}
