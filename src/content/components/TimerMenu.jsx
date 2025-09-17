import {Menu as MenuIcon, Moon, Settings, Sun} from "lucide-react";

export function TimerMenu({
  isOpen,
  onToggle,
  theme,
  onToggleTheme,
  onOpenSettings,
}) {
  return (
    <div className="relative inline-block text-left min-w-max">
      <button
        className="gipo-button"
        onClick={onToggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <MenuIcon size={16} />
      </button>
      {isOpen && (
        <div
          id="menu-content"
          className="absolute flex flex-col gap-2 left-0 mt-2 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded shadow-md z-20"
        >
          <button
            className="flex w-full h-8 items-center justify-center gap-2 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 whitespace-nowrap"
            onClick={onToggleTheme}
          >
            {theme === "dark" ? (
              <Moon size={18} style={{color: "inherit"}} />
            ) : (
              <Sun size={18} style={{color: "inherit"}} />
            )}
          </button>
          <button
            className="flex w-full h-8 items-center justify-center gap-2 text-gray-700 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600 whitespace-nowrap"
            onClick={onOpenSettings}
          >
            <Settings size={18} style={{color: "inherit"}} />
          </button>
        </div>
      )}
    </div>
  );
}
