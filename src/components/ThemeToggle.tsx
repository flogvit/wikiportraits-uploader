'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary">
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'light' 
            ? 'bg-primary text-primary-foreground' 
            : 'hover:bg-accent hover:text-accent-foreground'
        }`}
        title="Light mode"
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'dark' 
            ? 'bg-primary text-primary-foreground' 
            : 'hover:bg-accent hover:text-accent-foreground'
        }`}
        title="Dark mode"
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded-md transition-colors ${
          theme === 'system' 
            ? 'bg-primary text-primary-foreground' 
            : 'hover:bg-accent hover:text-accent-foreground'
        }`}
        title="System theme"
      >
        <Monitor className="h-4 w-4" />
      </button>
    </div>
  );
}