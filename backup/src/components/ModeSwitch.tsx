import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MODE_PATHS, MODE_STORAGE_KEY, getModeFromPath } from '../routes';
import InkButton from './ui/InkButton';
import { cn } from '../utils/cn';

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
          <InkButton
            key={mode}
            onClick={() => {
              localStorage.setItem(MODE_STORAGE_KEY, mode);
              navigate(path);
            }}
            aria-pressed={isActive}
            variant={isActive ? 'primary' : 'ghost'}
            className={cn('min-w-[84px]')}
          >
            {mode}
          </InkButton>
        );
      })}
    </div>
  );
};

export default ModeSwitch;
