import { create } from "zustand";

// Theme is controlled by adding/removing the "light" class on <html>.
// Default (no class) = dark mode. "light" class = light mode.
const applyTheme = (theme) => {
  if (theme === "light") {
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
  } else {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.remove("dark");
  }
};

const getInitialTheme = () => {
  const stored = localStorage.getItem("nexus-theme");
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
};

const useThemeStore = create((set, get) => {
  const initial = getInitialTheme();
  applyTheme(initial);

  return {
    theme: initial,
    toggleTheme: () => {
      const next = get().theme === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem("nexus-theme", next);
      set({ theme: next });
    },
  };
});

export default useThemeStore;
