import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * The class merger knows the condensed utilities (`global.css`) are weights: `font-condensed-semibold`
 * on a title must drop the `font-normal` the root text context adds, as `font-extrabold` does. Left
 * unknown, both stay and the regular file wins.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-weight': ['font-condensed-medium', 'font-condensed-semibold', 'font-condensed-bold'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
