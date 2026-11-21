/**
 * cn - Joins multiple className strings together,
 * removing any falsy values and merging Tailwind classes.
 * Useful for conditionally joining Tailwind classes.
 *
 * Usage: cn('class1', 'class2', 'class3')
 */
export function cn(...classes: string[]): string {
  return classes.filter(Boolean).join(' ')
}