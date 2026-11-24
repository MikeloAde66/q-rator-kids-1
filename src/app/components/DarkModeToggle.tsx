import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'qrk-dark-preview';

// Quick "what would this look like dark?" toggle — inverts the whole page
// (colors + the line-art coloring pages, which actually look great as white
// lines on black) rather than hand-theming every component. Good for
// trying the idea out; if it's a keeper, a real per-component dark theme
// is the next step instead of this blanket filter.
export function DarkModeToggle() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('qrk-dark-preview', dark);
    try {
      localStorage.setItem(STORAGE_KEY, dark ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [dark]);

  return (
    <button
      onClick={() => setDark((d) => !d)}
      className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
      aria-label={dark ? 'Turn off dark preview' : 'Try dark screen'}
      title={dark ? 'Turn off dark preview' : 'Try dark screen'}
    >
      {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
