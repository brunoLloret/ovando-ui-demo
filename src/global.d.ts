// The Story Field viz is the tested Three.js module (public/story-field.js) loaded at runtime;
// it registers these functions on window. React renders the DOM it reads and calls them.
export {};

declare global {
  interface Window {
    sfAnalyze?: () => void;
    sfNarrative?: () => void;
    sfSetView?: (v: string) => void;
    sfSetScale?: (s: string) => void;
    sfSetOrder?: (o: string) => void;
  }
}
