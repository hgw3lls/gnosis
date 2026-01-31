import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MODE_PATHS, MODE_STORAGE_KEY, getModeFromPath } from '../routes';

const ModeSwitch = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const currentMode = getModeFromPath(location.pathname) ?? 'shelf';

  useEffect(() => {
    localStorage.setItem(MODE_STORAGE_KEY, currentMode);
  }, [currentMode]);

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Browse modes">
      {Object.entries(MODE_PATHS).map(([mode, path]) => {
        const isActive = currentMode === mode;
        return (
          <button
            key={mode}
            type="button"
            onClick={() => {
              localStorage.setItem(MODE_STORAGE_KEY, mode);
              navigate(path);
            }}
            aria-pressed={isActive}
            className={`border-2 border-black px-3 py-2 text-xs uppercase tracking-[0.3em] focus-visible:outline focus-visible:outline-2 focus-visible:outline-black ${
              isActive ? 'bg-black text-white' : 'hover:bg-black hover:text-white'
            }`}
          >
            {mode}
          </button>
        );
      })}
    </div>
  );
};

export default ModeSwitch;
