import { GripVertical } from 'lucide-react-native'
import { type ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { Animated, Easing, PanResponder, type PanResponderInstance, View } from 'react-native'

import { ScrollLockContext } from '@/components/screen'
import { Icon } from '@/components/ui/icon'
import { useReduceMotion } from '@/lib/use-reduce-motion'
import { cn } from '@/lib/utils'

interface SortableRowsProps<T extends { id: string }> {
  items: T[]
  /** What a row is called on its grip, for screen readers. */
  nameOf: (item: T) => string
  /** Saves the new order. The list shows it straight away, then whatever `items` holds once this settles. */
  onReorder: (ids: string[]) => Promise<void>
  /** One row. Put `grip` where the drag handle goes; the rest of the row keeps its own taps. */
  children: (item: T, grip: ReactNode, index: number) => ReactNode
  /** Between rows, as the group draws its dividers. */
  gap?: number
}

/** How long a row takes to glide to its slot; 0 when the system asks for less motion. */
const SLIDE_MS = 160
const glide = (v: Animated.Value, to: number, ms: number) =>
  Animated.timing(v, { toValue: to, duration: ms, easing: Easing.out(Easing.quad), useNativeDriver: true })

/** Where each row's top sits when the rows stand in `order`, and the height of the lot. */
function layoutOf(order: string[], heights: Record<string, number>, gap: number) {
  const tops = new Map<string, number>()
  let y = 0
  for (const id of order) {
    tops.set(id, y)
    y += (heights[id] ?? 0) + gap
  }
  return { tops, total: Math.max(0, y - gap) }
}

/** `order` with `id` taken out and put back at `slot`. */
function placed(order: string[], id: string, slot: number): string[] {
  const rest = order.filter((x) => x !== id)
  rest.splice(slot, 0, id)
  return rest
}

/** The slot a row whose middle is at `centre` takes among the other rows: past each one it has crossed the middle of. */
function slotAt(others: string[], heights: Record<string, number>, gap: number, centre: number): number {
  let slot = 0
  let y = 0
  for (const id of others) {
    const h = heights[id] ?? 0
    if (centre > y + h / 2) slot++
    y += h + gap
  }
  return slot
}

const joined = (ids: string[]): string => ids.join('|')

/** Each row's offset node and the slot it was last sent to. */
interface Nodes {
  pos: Map<string, Animated.Value>
  placedAt: Map<string, number>
}

/** The row's offset node, made at its first absolute layout with the row already in place. */
function nodeFor(nodes: Nodes, id: string, top: number): Animated.Value {
  const made = nodes.pos.get(id)
  if (made) return made
  const v = new Animated.Value(top)
  nodes.pos.set(id, v)
  nodes.placedAt.set(id, top)
  return v
}

/**
 * A list reordered by holding a row's grip and dragging it. Only the grip starts a drag, so a swipe
 * on the rest of the row still scrolls the page; the page's scroll is held while a row is in the hand.
 *
 * The rows are laid out by hand (the pattern of react-native-sortable-list): each measures its own
 * height, then sits at an absolute offset held by one Animated value that stays attached to it for
 * good. A drag moves the held row with the finger and glides the others to the slots of the live
 * order; a drop glides the held row into its slot, and the new order changes nothing on screen, as
 * every row is already where that order puts it. Nothing is reset or re-based, so the native-driven
 * transforms and React's renders never fall out of step (which left rows stuck off their place on
 * the new architecture whenever a transform was switched between an animated value and a plain number).
 */
export function SortableRows<T extends { id: string }>({
  items,
  nameOf,
  onReorder,
  children,
  gap = 1,
}: SortableRowsProps<T>) {
  const lockScroll = useContext(ScrollLockContext)
  const slideMs = useReduceMotion() ? 0 : SLIDE_MS
  const [heights, setHeights] = useState<Record<string, number>>({})
  // The order after a drop, until `items` comes back in it.
  const [shown, setShown] = useState<string[] | null>(null)
  const [drag, setDrag] = useState<{ id: string; slot: number } | null>(null)
  const nodes = useRef<Nodes>({ pos: new Map(), placedAt: new Map() })

  const ids = items.map((i) => i.id)
  const idsKey = joined(ids)
  const base = shown && shown.length === ids.length && shown.every((id) => ids.includes(id)) ? shown : ids
  const measured = base.every((id) => heights[id] !== undefined)
  const order = drag ? placed(base, drag.id, drag.slot) : base
  const { tops, total } = layoutOf(order, heights, gap)
  const dragId = drag?.id

  // Once `items` arrives in the dropped order, it is the order.
  useEffect(() => {
    if (shown && joined(shown) === idsKey) setShown(null)
  }, [shown, idsKey])

  const posOf = (id: string): Animated.Value => nodeFor(nodes.current, id, tops.get(id) ?? 0)

  const live = useRef({ base, heights, gap, drag, total, lockScroll, onReorder })
  live.current = { base, heights, gap, drag, total, lockScroll, onReorder }

  // Every row not in the hand glides to its slot whenever the order or a height changes.
  useEffect(() => {
    if (!measured) return
    const n = nodes.current
    for (const [id, top] of tops) {
      if (id === dragId || n.placedAt.get(id) === top) continue
      n.placedAt.set(id, top)
      glide(nodeFor(n, id, top), top, slideMs).start()
    }
  }, [measured, tops, dragId, slideMs])

  // One responder per row, made the first time the row renders; the handlers read everything else through `live`.
  const responders = useRef(new Map<string, PanResponderInstance>()).current
  const responderFor = (id: string): PanResponderInstance => {
    const made = responders.get(id)
    if (made) return made
    let startTop = 0
    const r = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        const { base: b, heights: h, gap: g, lockScroll: lock } = live.current
        lock(true)
        startTop = layoutOf(b, h, g).tops.get(id) ?? 0
        setDrag({ id, slot: b.indexOf(id) })
      },
      onPanResponderMove: (_e, g) => {
        const { base: b, heights: h, gap: gp, drag: d, total: t } = live.current
        const height = h[id] ?? 0
        const y = Math.max(0, Math.min(t - height, startTop + g.dy))
        posOf(id).setValue(y)
        const others = b.filter((x) => x !== id)
        const slot = slotAt(others, h, gp, y + height / 2)
        if (d && slot !== d.slot) setDrag({ id, slot })
      },
      onPanResponderRelease: () => finish(id),
      onPanResponderTerminate: () => finish(id),
    })
    responders.set(id, r)
    return r
  }

  /** The held row glides into its slot; the order then takes it, and the save follows. */
  function finish(id: string) {
    const { base: b, heights: h, gap: g, drag: d, lockScroll: unlock, onReorder: save } = live.current
    unlock(false)
    if (!d) return
    const next = placed(b, id, d.slot)
    const top = layoutOf(next, h, g).tops.get(id) ?? 0
    nodes.current.placedAt.set(id, top)
    glide(posOf(id), top, slideMs).start(() => {
      setDrag(null)
      if (joined(next) === joined(b)) return
      setShown(next)
      void save(next)
    })
  }

  return (
    <View style={measured ? { height: total } : undefined}>
      {base.map((id, index) => {
        const item = items.find((i) => i.id === id)
        if (!item) return null
        const held = drag?.id === id
        const grip = (
          <View
            {...responderFor(id).panHandlers}
            accessibilityRole="button"
            accessibilityLabel={`Move ${nameOf(item)}`}
            accessibilityHint="Hold and drag to reorder"
            hitSlop={8}
            className="-ml-2 h-11 w-8 items-center justify-center"
          >
            <Icon as={GripVertical} className="size-4.5 text-muted-foreground" />
          </View>
        )
        return (
          <Animated.View
            key={id}
            onLayout={(e) => {
              const height = e.nativeEvent.layout.height
              setHeights((h) => (h[id] === height ? h : { ...h, [id]: height }))
            }}
            style={
              measured
                ? [
                    { position: 'absolute', left: 0, right: 0, top: 0, transform: [{ translateY: posOf(id) }] },
                    held ? { zIndex: 1, elevation: 1 } : null,
                  ]
                : undefined
            }
            className={cn(!measured && index > 0 && gap === 1 && 'mt-px', held && 'opacity-90')}
          >
            {children(item, grip, index)}
          </Animated.View>
        )
      })}
    </View>
  )
}
