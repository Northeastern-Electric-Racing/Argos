/**
 * Marks a string as a complete list of Tailwind classes. It returns its argument unchanged; it exists so
 * Prettier (prettier-plugin-tailwindcss, `tailwindFunctions`) sorts the classes inside, and so a reader sees
 * that the string is scanned by Tailwind and must never be built from fragments (`'bg-' + tone` emits no CSS).
 */
export const tw = (classes: string): string => classes;

/** Joins complete class lists (recipe parts) with single spaces, skipping empty ones. */
export const cx = (...lists: (string | false | null | undefined)[]): string => lists.filter(Boolean).join(' ');
