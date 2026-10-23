import { SafeAreaView as SafeAreaViewBase } from 'react-native-safe-area-context'
import { withUniwind } from 'uniwind'

/**
 * react-native-safe-area-context's SafeAreaView with `className` support.
 *
 * The raw component ignores `className` (Uniwind only wires its own React Native components), so a
 * screen root written as `<SafeAreaView className="flex-1">` silently gets no flex. Its `flex-1`
 * child then measures zero height, and Fabric lays out every Text inside as zero lines: the
 * "invisible text" fault of the first scaffold. Always import SafeAreaView from here.
 */
export const SafeAreaView = withUniwind(SafeAreaViewBase)
