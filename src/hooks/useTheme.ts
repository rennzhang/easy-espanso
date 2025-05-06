import { ref, onMounted, watch, computed } from 'vue';

type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'app-theme';

// Reactive state for the current theme
const currentTheme = ref<Theme>(getInitialTheme());

// Computed property for easier checking
const isDarkMode = computed(() => {
  if (currentTheme.value === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false; // Default for server-side rendering or unsupported environments
  }
  return currentTheme.value === 'dark';
});

// Function to apply the theme to the document
function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return; // Guard for SSR or non-browser environments

  const root = document.documentElement;
  let applyDark = false;

  if (theme === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      applyDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  } else {
    applyDark = theme === 'dark';
  }
  
  root.classList.toggle('dark', applyDark);
  console.log(`[useTheme] Applied theme. Dark class set to: ${applyDark}. (Selected: ${theme})`);
}

// Function to get the initial theme from localStorage or system preference
function getInitialTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'system'; // Default for SSR

  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    if (storedTheme && ['light', 'dark', 'system'].includes(storedTheme)) {
      console.log(`[useTheme] Initial theme from localStorage: ${storedTheme}`);
      return storedTheme;
    }
  } catch (e) {
    console.warn('[useTheme] Failed to read theme from localStorage:', e);
  }
  console.log('[useTheme] Initial theme: system (default)');
  return 'system'; // Default to system preference
}

// Function to set and store the theme
function setTheme(theme: Theme) {
  currentTheme.value = theme;
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      console.log(`[useTheme] Theme saved to localStorage: ${theme}`);
    } catch (e) {
      console.warn('[useTheme] Failed to save theme to localStorage:', e);
    }
  }
  // applyTheme is called by the watcher for currentTheme
}

// Watch for changes in currentTheme and apply them
watch(currentTheme, (newTheme) => {
  applyTheme(newTheme);
});

// System theme change listener
let mediaQueryListener: ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | null = null;

function setupSystemThemeListener() {
  if (typeof window === 'undefined' || !window.matchMedia) return;

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  if (mediaQueryListener) {
    mediaQuery.removeEventListener('change', mediaQueryListener);
  }
  mediaQueryListener = () => {
    if (currentTheme.value === 'system') {
      console.log('[useTheme] System theme changed, re-applying.');
      applyTheme('system');
    }
  };
  mediaQuery.addEventListener('change', mediaQueryListener);
}

function removeSystemThemeListener() {
  if (typeof window === 'undefined' || !window.matchMedia || !mediaQueryListener) return;
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.removeEventListener('change', mediaQueryListener);
  mediaQueryListener = null;
}

export function useTheme() {
  onMounted(() => {
    applyTheme(currentTheme.value); 
    if (currentTheme.value === 'system') {
      setupSystemThemeListener();
    }
  });

  watch(currentTheme, (newTheme, oldTheme) => {
    if (newTheme === 'system' && oldTheme !== 'system') {
      setupSystemThemeListener();
    } else if (newTheme !== 'system' && oldTheme === 'system') {
      removeSystemThemeListener();
    }
  }, { immediate: false }); // immediate: false because onMounted handles initial setup

  return {
    theme: currentTheme,
    isDarkMode,
    setTheme,
  };
} 