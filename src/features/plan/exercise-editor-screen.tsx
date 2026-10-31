import { useLocalSearchParams, useRouter } from 'expo-router'
import { Check, ChevronDown, ChevronRight, Minus, Pencil, Plus, Trash2, X } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, TextInput, View } from 'react-native'
import { useResolveClassNames } from 'uniwind'

import { BTN, BTN_DANGER, BTN_TEXT } from '@/components/button-styles'
import { Chip, Chips } from '@/components/chip'
import { Dialog } from '@/components/dialog'
import { ExerciseThumb } from '@/components/exercise-thumb'
import { IconButton } from '@/components/icon-button'
import { LibraryPicker } from '@/components/library-picker'
import { Group, Row, RowBody, RowSub, RowTitle } from '@/components/row'
import { Segmented } from '@/components/segmented'
import { SheetBody } from '@/components/sheet'
import { BODY, CAPTION, H2, NUMBER } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { LOAD_LABEL } from '@/lib/format'
import { EQUIPMENT_LABEL, findLibraryByName, type LibraryRow, searchLibrary } from '@/lib/library'
import { LIBRARY } from '@/lib/library-data'
import { MUSCLE_BY_DAY } from '@/lib/logic/plan-sheet'
import { MUSCLE_LABEL, MUSCLES, plannedSetsFor } from '@/lib/logic/stats'
import {
  type Exercise,
  type LoadType,
  MAX_EXERCISES_PER_DAY,
  type Muscle,
  type PlanDay,
  type Settings,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { TodaySyncDialog, touchesToday } from './today-sync-dialog'

const LOAD_OPTIONS = (['weight', 'bodyweight', 'time'] as const).map((value) => ({ value, label: LOAD_LABEL[value] }))

/** How many library names show under the box while typing. */
const SUGGESTIONS = 5

const FIELD = 'min-h-14 flex-row items-center justify-between gap-3 rounded-xl bg-background px-4'
const LABEL = 'text-base font-medium text-muted-foreground'
const VALUE = 'text-lg font-semibold text-foreground'

/**
 * The exercise editor (canvas: Plan, exercise editor): the name with the library's suggestions,
 * sets, the rep range, the type, the muscle, a note and the alternates. Opened for a lift of a day,
 * or with no lift to add one at the end of the day. The `/edit-exercise` sheet.
 */
export function ExerciseEditorScreen() {
  const router = useRouter()
  const { day: dayId, id } = useLocalSearchParams<{ day: string; id?: string }>()
  const [loaded, setLoaded] = useState<{ day: PlanDay; exercise: Exercise | null; settings: Settings } | null>(null)
  useEffect(() => {
    let live = true
    Promise.all([repo.getPlan(), repo.getSettings()]).then(([plan, settings]) => {
      const day = plan.days.find((d) => d.id === dayId)
      if (live && day) setLoaded({ day, exercise: day.exercises.find((e) => e.id === id) ?? null, settings })
    })
    return () => {
      live = false
    }
  }, [dayId, id])
  if (!loaded) return <SheetBody>{null}</SheetBody>
  return (
    <EditorForm key={`${loaded.day.id}:${loaded.exercise?.id ?? 'new'}`} {...loaded} onDone={() => router.back()} />
  )
}

function EditorForm({
  day,
  exercise,
  settings,
  onDone,
}: {
  day: PlanDay
  exercise: Exercise | null
  settings: Settings
  onDone: () => void
}) {
  const [name, setName] = useState(exercise?.name ?? '')
  const [typing, setTyping] = useState(false)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [sets, setSets] = useState(exercise?.sets ?? 3)
  const [repMin, setRepMin] = useState(String(exercise?.repMin ?? 8))
  const [repMax, setRepMax] = useState(String(exercise?.repMax ?? 12))
  const [loadType, setLoadType] = useState<LoadType>(exercise?.loadType ?? 'weight')
  const [muscle, setMuscle] = useState<Muscle>(exercise?.muscle ?? MUSCLE_BY_DAY[day.type])
  const [muscleOpen, setMuscleOpen] = useState(false)
  const [note, setNote] = useState(exercise?.note ?? '')
  const [alternates, setAlternates] = useState<string[]>(exercise?.alternates ?? [])
  const [adding, setAdding] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [ask, setAsk] = useState<{ dayName: string; exerciseName?: string } | null>(null)
  const placeholder = useResolveClassNames('text-muted-foreground')

  const known = findLibraryByName(LIBRARY, name)
  const suggestions =
    typing && name.trim().length > 1 ? searchLibrary({ query: name.trim() }, LIBRARY).slice(0, SUGGESTIONS) : []
  const low = Number(repMin)
  const high = Number(repMax)
  const valid = name.trim().length > 0 && sets >= 1 && low >= 1 && high >= low
  const unit = loadType === 'time' ? 'seconds' : 'reps'
  const capped = settings.trainingAge === 'under1' && sets > plannedSetsFor(sets, 'under1')

  /** A lift taken from the library brings its muscle, its type, and the sets and range it is usually done for. */
  function take(lib: LibraryRow) {
    setName(lib.name)
    setTyping(false)
    setMuscle(lib.muscle)
    setLoadType(lib.loadType)
    setSets(lib.sets)
    setRepMin(String(lib.repMin))
    setRepMax(String(lib.repMax))
  }

  /** After a change to the day: when it is the day being trained, ask about today's session; else done. */
  async function after(exerciseName?: string) {
    if (await touchesToday(day.id)) setAsk({ dayName: day.name, exerciseName })
    else onDone()
  }

  async function save() {
    if (!valid || busy) return
    setBusy(true)
    try {
      const fields = {
        name: name.trim(),
        sets,
        repMin: low,
        repMax: high,
        loadType,
        muscle,
        note: note.trim() || undefined,
        alternates,
      }
      if (exercise) await repo.updateExercise(day.id, exercise.id, fields)
      else await repo.addExercise(day.id, fields)
      await after(fields.name)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!exercise || busy) return
    setBusy(true)
    try {
      await repo.removeExercise(day.id, exercise.id)
      setRemoveOpen(false)
      await after(exercise.name)
    } finally {
      setBusy(false)
    }
  }

  /** Swaps the lift for one of its alternates, on the plan; the old name becomes an alternate. */
  async function swapTo(alt: string) {
    if (!exercise || busy) return
    setBusy(true)
    try {
      await repo.swapExercise(day.id, exercise.id, alt)
      await after(alt)
    } finally {
      setBusy(false)
    }
  }

  const addAlternate = () => {
    const v = (adding ?? '').trim()
    if (v && !alternates.includes(v)) setAlternates([...alternates, v])
    setAdding(null)
  }
  const ph = typeof placeholder.color === 'string' ? placeholder.color : undefined
  const what = known
    ? `${MUSCLE_LABEL[known.muscle]}, ${EQUIPMENT_LABEL[known.equipment].toLowerCase()}`
    : 'Typed name, not in the library'

  return (
    <SheetBody>
      <View className="flex-row items-center justify-between gap-3">
        <Text accessibilityRole="header" className={cn(H2, 'shrink')} numberOfLines={1}>
          {exercise ? exercise.name : 'New exercise'}
        </Text>
        <IconButton as={X} accessibilityLabel="Close" onPress={onDone} />
      </View>
      <LibraryPicker open={libraryOpen} onClose={() => setLibraryOpen(false)} onPick={take} />
      <Button variant="secondary" onPress={() => setLibraryOpen(true)}>
        <Text>Pick from library</Text>
      </Button>
      <View className="gap-2">
        {/* The name: the library's picture and what it is when the library knows it, a pencil when it is the lifter's own. */}
        <View className="min-h-16 flex-row items-center gap-2.5 rounded-xl bg-background px-4">
          {known ? (
            <ExerciseThumb name={known.name} />
          ) : (
            <View className="size-10 items-center justify-center rounded-md bg-secondary">
              <Icon as={Pencil} className="size-5.5 text-muted-foreground" />
            </View>
          )}
          <View className="min-w-0 flex-1">
            <TextInput
              value={name}
              onChangeText={(v) => {
                setName(v)
                setTyping(true)
              }}
              onBlur={() => setTyping(false)}
              placeholder="Name"
              placeholderTextColor={ph}
              accessibilityLabel="Exercise name"
              maxLength={80}
              autoCorrect={false}
              className="p-0 text-lg font-medium text-foreground"
            />
            {name.trim() ? <Text className={CAPTION}>{what}</Text> : null}
          </View>
          {name.trim() ? (
            <Chip on={known !== undefined} className="h-7">
              {known ? 'Library' : 'Custom'}
            </Chip>
          ) : null}
        </View>
        {suggestions.length > 0 ? (
          <Group>
            {suggestions.map((s) => {
              const kind = `${MUSCLE_LABEL[s.muscle]}, ${EQUIPMENT_LABEL[s.equipment].toLowerCase()}`
              return (
                <Row key={s.id} tone="page" accessibilityLabel={`Use ${s.name}`} onPress={() => take(s)}>
                  <ExerciseThumb name={s.name} />
                  <RowBody>
                    <RowTitle>{s.name}</RowTitle>
                    <RowSub>{kind}</RowSub>
                  </RowBody>
                </Row>
              )
            })}
          </Group>
        ) : null}
        <View className={FIELD}>
          <Text className={LABEL}>Sets</Text>
          <View className="flex-row items-center gap-3">
            <IconButton
              as={Minus}
              size="sm"
              accessibilityLabel="Fewer sets"
              disabled={sets <= 1}
              onPress={() => setSets((n) => Math.max(1, n - 1))}
            />
            <Text className={cn(VALUE, NUMBER, 'w-6 text-center')}>{sets}</Text>
            <IconButton
              as={Plus}
              size="sm"
              accessibilityLabel="More sets"
              disabled={sets >= 10}
              onPress={() => setSets((n) => Math.min(10, n + 1))}
            />
          </View>
        </View>
        {capped ? (
          <Text
            className={cn(CAPTION, 'px-1')}
          >{`Capped at ${plannedSetsFor(sets, 'under1')} a session while under a year.`}</Text>
        ) : null}
        <View className="flex-row gap-2">
          <View className={cn(FIELD, 'flex-1')}>
            <Text className={LABEL}>{loadType === 'time' ? 'From, s' : 'Reps from'}</Text>
            <TextInput
              value={repMin}
              onChangeText={setRepMin}
              keyboardType="number-pad"
              accessibilityLabel={`Low ${unit}`}
              className={cn(VALUE, NUMBER, 'min-w-8 p-0 text-right')}
            />
          </View>
          <View className={cn(FIELD, 'flex-1')}>
            <Text className={LABEL}>to</Text>
            <TextInput
              value={repMax}
              onChangeText={setRepMax}
              keyboardType="number-pad"
              accessibilityLabel={`High ${unit}`}
              className={cn(VALUE, NUMBER, 'min-w-8 p-0 text-right')}
            />
          </View>
        </View>
        <Segmented inverted options={LOAD_OPTIONS} value={loadType} onChange={setLoadType} accessibilityLabel="Type" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Muscle, ${MUSCLE_LABEL[muscle]}`}
          accessibilityState={{ expanded: muscleOpen }}
          onPress={() => setMuscleOpen((v) => !v)}
          className={FIELD}
        >
          <Text className={LABEL}>Muscle</Text>
          <View className="flex-row items-center gap-1">
            <Text className={VALUE}>{MUSCLE_LABEL[muscle]}</Text>
            <Icon as={muscleOpen ? ChevronDown : ChevronRight} className="size-4.5 text-muted-foreground" />
          </View>
        </Pressable>
        {muscleOpen ? (
          <Chips>
            {MUSCLES.map((m) => (
              <Pressable
                key={m}
                accessibilityRole="radio"
                accessibilityState={{ checked: m === muscle }}
                onPress={() => {
                  setMuscle(m)
                  setMuscleOpen(false)
                }}
              >
                <Chip on={m === muscle}>{MUSCLE_LABEL[m]}</Chip>
              </Pressable>
            ))}
          </Chips>
        ) : null}
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Note"
          placeholderTextColor={ph}
          accessibilityLabel="Note"
          maxLength={200}
          className="h-14 rounded-xl bg-background px-4 text-lg font-normal text-foreground"
        />
      </View>
      <View className="gap-2">
        <Text className={CAPTION}>Alternates</Text>
        <Chips>
          {alternates.map((alt) => (
            <View key={alt} className="h-8.5 flex-row items-center gap-1.5 rounded-full bg-secondary pr-2 pl-3.5">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={exercise ? `Use ${alt} instead` : alt}
                disabled={!exercise || busy}
                onPress={() => swapTo(alt)}
              >
                <Text className="text-sm font-semibold text-foreground">{alt}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${alt}`}
                hitSlop={6}
                onPress={() => setAlternates(alternates.filter((a) => a !== alt))}
              >
                <Icon as={X} className="size-4.5 text-foreground" />
              </Pressable>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add an alternate"
            onPress={() => setAdding('')}
            className="h-8.5 flex-row items-center gap-1.5 rounded-full px-3.5"
          >
            <Icon as={Plus} className="size-4.5 text-muted-foreground" />
            <Text className="text-sm font-semibold text-muted-foreground">Add</Text>
          </Pressable>
        </Chips>
        {adding !== null ? (
          <View className="flex-row items-center gap-2">
            <TextInput
              value={adding}
              onChangeText={setAdding}
              placeholder="Alternate"
              placeholderTextColor={ph}
              accessibilityLabel="New alternate"
              maxLength={80}
              autoFocus
              onSubmitEditing={addAlternate}
              className="h-14 flex-1 rounded-xl bg-background px-4 text-lg font-medium text-foreground"
            />
            <IconButton as={Check} accessibilityLabel="Add it" onPress={addAlternate} />
          </View>
        ) : null}
      </View>
      <View className="gap-1">
        <Button
          className={BTN}
          disabled={!valid || busy || (!exercise && day.exercises.length >= MAX_EXERCISES_PER_DAY)}
          onPress={save}
        >
          <Icon as={Check} className="size-4.5 text-primary-foreground" />
          <Text className={BTN_TEXT}>{exercise ? 'Save changes' : 'Add to day'}</Text>
        </Button>
        {exercise ? (
          <Button variant="ghost" className="h-12" onPress={() => setRemoveOpen(true)}>
            <Icon as={Trash2} className="size-4.5 text-destructive" />
            <Text className="text-lg font-semibold text-destructive">Remove from day</Text>
          </Button>
        ) : null}
      </View>
      {exercise ? (
        <Dialog open={removeOpen} onClose={() => setRemoveOpen(false)}>
          <View className="gap-1">
            <Text accessibilityRole="header" className={H2}>{`Remove ${exercise.name} from ${day.name}?`}</Text>
            <Text className={cn(BODY, 'text-muted-foreground')}>
              {`It leaves the plan from the next workout on. Sessions already logged keep it.${day.exercises.length <= 1 ? ` ${day.name} then has no lifts until you add one.` : ''}`}
            </Text>
          </View>
          <View className="gap-2">
            <Button variant="destructive" className={cn(BTN, BTN_DANGER)} disabled={busy} onPress={remove}>
              <Icon as={Trash2} className="size-4.5 text-white" />
              <Text className={cn(BTN_TEXT, 'text-white')}>Remove</Text>
            </Button>
            <Button variant="ghost" className="h-12" onPress={() => setRemoveOpen(false)}>
              <Text className="text-lg font-semibold text-foreground">Keep it</Text>
            </Button>
          </View>
        </Dialog>
      ) : null}
      <TodaySyncDialog
        ask={ask}
        onClose={() => {
          setAsk(null)
          onDone()
        }}
      />
    </SheetBody>
  )
}
