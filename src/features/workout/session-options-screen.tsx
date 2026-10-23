import { useRouter } from 'expo-router'
import { ArrowLeftRight, Trash2 } from 'lucide-react-native'
import { useEffect, useState } from 'react'

import { Group, Row, RowBody, RowSub, RowTitle } from '@/components/row'
import { SheetBody } from '@/components/sheet'
import { Icon } from '@/components/ui/icon'
import * as repo from '@/db/repo'
import type { Workout } from '@/lib/types'
import { DiscardDialog } from './discard-dialog'

const CHANGE = 'Change session'
const DISCARD = 'Discard workout'

/** The session's options: change which day it is, or throw it away. The `/session-options` sheet. */
export function SessionOptionsScreen() {
  const router = useRouter()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let live = true
    repo.getActiveWorkout().then((w) => {
      if (live) setWorkout(w)
    })
    return () => {
      live = false
    }
  }, [])
  const doneSets = workout?.entries.reduce((n, e) => n + e.sets.filter((s) => s.done).length, 0) ?? 0

  async function discard() {
    if (!workout) return
    setBusy(true)
    try {
      await repo.discardWorkout(workout.id)
      setDiscardOpen(false)
      router.back()
    } finally {
      setBusy(false)
    }
  }

  return (
    <SheetBody>
      <Group>
        <Row tone="page" tall accessibilityLabel={CHANGE} onPress={() => router.replace('/pick-day')}>
          <Icon as={ArrowLeftRight} strokeWidth={1.75} className="size-5.5 text-foreground" />
          <RowBody>
            <RowTitle>{CHANGE}</RowTitle>
            <RowSub>
              {doneSets > 0
                ? `Switching drops the ${doneSets} ${doneSets === 1 ? 'set' : 'sets'} logged so far`
                : 'Nothing is logged yet'}
            </RowSub>
          </RowBody>
        </Row>
        <Row tone="page" tall accessibilityLabel={DISCARD} onPress={() => setDiscardOpen(true)}>
          <Icon as={Trash2} strokeWidth={1.75} className="size-5.5 text-destructive" />
          <RowBody>
            <RowTitle className="text-destructive">{DISCARD}</RowTitle>
          </RowBody>
        </Row>
      </Group>
      <DiscardDialog
        open={discardOpen}
        onClose={() => setDiscardOpen(false)}
        doneSets={doneSets}
        busy={busy}
        onDiscard={discard}
      />
    </SheetBody>
  )
}
