"use client";

import React, { createContext, useState, useContext, ReactNode } from "react";

// Simplified theme interface - let LiftKit handle the complexity
interface SimpleTheme {
  primary: string;
  mode: "light" | "dark";
}

interface ThemeContextType {
  theme: SimpleTheme;
  updateTheme: (newTheme: Partial<SimpleTheme>) => void;
  colorMode: "light" | "dark";
  setColorMode: (mode: "light" | "dark") => void;
}

export const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export default function ThemeProvider({ children }: { children: ReactNode }) {
  // Simple theme - let LiftKit handle golden ratio calculations
  const [theme, setTheme] = useState<SimpleTheme>({
    primary: "#7c4dff", // Deep purple
    mode: "dark"
  });

  const [colorMode, setColorMode] = useState<"light" | "dark">("dark");

  const updateTheme = (newTheme: Partial<SimpleTheme>) => {
    setTheme(prev => ({ ...prev, ...newTheme }));
  };

  // Set CSS custom properties for LiftKit integration
  // Much simpler - just the essentials
  React.useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--lk-primary', theme.primary);
    root.style.setProperty('--lk-mode', theme.mode);
  }, [theme]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        updateTheme,
        colorMode,
        setColorMode,
      }}
    >
      <div className={`lk-theme-${theme.mode}`} data-lk-theme={theme.mode}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  return useContext(ThemeContext);
};