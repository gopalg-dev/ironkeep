import { useRouter } from 'expo-router'
import { ArrowLeft, Play, RotateCcw, SkipForward } from 'lucide-react-native'
import { type ReactNode, useEffect, useState } from 'react'
import { BackHandler, View } from 'react-native'

import { AppMark } from '@/components/app-mark'
import { BTN, BTN_TEXT } from '@/components/button-styles'
import { IconButton } from '@/components/icon-button'
import { Option } from '@/components/option'
import { useBigTitle } from '@/components/page-bar'
import { ProgressBar } from '@/components/progress-bar'
import { RulerPicker } from '@/components/ruler-picker'
import { Screen } from '@/components/screen'
import { Segmented } from '@/components/segmented'
import { DEFAULT_OWN_DAYS, OWN_SPLIT, SplitPicker } from '@/components/split-picker'
import { BODY, CAPTION, DISPLAY, NUMBER, TITLE } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { DEFAULT_SPLIT, templateOf } from '@/lib/content'
import { GOAL_OPTIONS } from '@/lib/logic/goal'
import { dayKey } from '@/lib/logic/stats'
import { BUNDLED_SPLITS } from '@/lib/splits'
import type { DayType, Goal, Settings, SplitId, TrainingAge, Units } from '@/lib/types'

// Units, split, bodyweight, training age. One question per screen, after the welcome.
const STEPS = 4
const SPLIT_STEP = 1

const ageOptions: { value: TrainingAge; title: string; detail: string }[] = [
  { value: 'under1', title: 'Under a year', detail: 'Lifts start at 3 sets.' },
  { value: 'over1', title: 'A year or more', detail: "Lifts start at the plan's sets." },
]

/** The shared frame of a question: back, "n of 5", the progress bar and the title. */
function StepFrame({
  step,
  title,
  onBack,
  footer,
  children,
}: {
  step: number
  title: string
  onBack: () => void
  footer: ReactNode
  children: ReactNode
}) {
  return (
    <Screen
      footer={footer}
      bar={{
        title,
        left: <IconButton as={ArrowLeft} tone="surface" accessibilityLabel="Back" onPress={onBack} />,
        right: <Text className={`${CAPTION} ${NUMBER}`}>{`${step + 1} of ${STEPS}`}</Text>,
      }}
    >
      <StepBody step={step} title={title}>
        {children}
      </StepBody>
    </Screen>
  )
}

/** The step's content: room for the bar's buttons, the progress, the question, then the choices. */
function StepBody({ step, title, children }: { step: number; title: string; children: ReactNode }) {
  const measure = useBigTitle()
  return (
    <View>
      <View className="min-h-11" />
      <ProgressBar value={((step + 1) / STEPS) * 100} className="mt-4" />
      <Text className={`${TITLE} mt-8`} onLayout={(e) => measure(e.nativeEvent.layout)}>
        {title}
      </Text>
      {children}
    </View>
  )
}

export function SetupScreen({ initial, startAt = 'welcome' }: { initial: Settings; startAt?: 'welcome' | 'split' }) {
  const router = useRouter()
  // -1 is the welcome screen; 0 to 4 are the questions.
  const [step, setStep] = useState(startAt === 'split' ? SPLIT_STEP : -1)
  const [units, setUnits] = useState<Units>(initial.units)
  const [split, setSplit] = useState<SplitId>(initial.split === OWN_SPLIT ? OWN_SPLIT : templateOf(initial.split))
  const [ownDays, setOwnDays] = useState<DayType[]>(DEFAULT_OWN_DAYS)
  /** Start the split as its days with no lifts, to fill in on Plan. */
  const [empty, setEmpty] = useState(false)
  const [bodyweight, setBodyweight] = useState<number | undefined>(initial.bodyweight)
  const [goal, setGoal] = useState<Goal>(initial.goal ?? 'gain')
  const [trainingAge, setTrainingAge] = useState<TrainingAge>(initial.trainingAge)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // The split the plan is on now. Before the first setup there is none. A custom plan matches no template.
  const currentSplit: SplitId | undefined =
    initial.split === OWN_SPLIT ? undefined : (initial.split ?? (initial.setupDone ? DEFAULT_SPLIT : undefined))

  const back = () => setStep((s) => Math.max(-1, s - 1))

  // The phone's back button goes to the question before, and leaves setup only from the welcome.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step <= -1 || saving) return false
      setStep((s) => Math.max(-1, s - 1))
      return true
    })
    return () => sub.remove()
  }, [step, saving])

  async function finish() {
    setSaving(true)
    setError(null)
    try {
      await repo.saveSettings({
        units,
        trainingAge,
        goal,
        setupDone: true,
        ...(bodyweight ? { bodyweight } : {}),
      })
      // Another split shows its own plan: as left earlier, or fresh from the template. The same split changes
      // nothing, unless empty days were asked for.
      if (split === OWN_SPLIT) await repo.createCustomPlan(ownDays, { empty })
      else if (split !== currentSplit || empty) await repo.applySplit(split, { empty })
      // The first setup records the answer to "What do you weigh today?" as today's weigh-in. A later run
      // only logs when the number was changed, so re-running setup does not invent a weigh-in.
      if (bodyweight && (!initial.setupDone || bodyweight !== initial.bodyweight)) {
        await repo.logBodyweight(bodyweight, dayKey(new Date()))
      }
      router.replace('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.')
      setSaving(false)
    }
  }

  const next = () => (step < STEPS - 1 ? setStep(step + 1) : void finish())

  const continueButton = (label = 'Continue') => (
    <Button className={BTN} disabled={saving} onPress={next}>
      <Text className={BTN_TEXT}>{label}</Text>
    </Button>
  )

  if (step === -1) {
    return (
      <Screen
        centered
        footer={
          <View className="gap-2.5">
            <Button className={BTN} onPress={next}>
              <Icon as={Play} className="size-4.5 text-primary-foreground" />
              <Text className={BTN_TEXT}>Start fresh</Text>
            </Button>
            <Button variant="secondary" className={`${BTN} bg-card`} onPress={() => router.push('/restore')}>
              <Icon as={RotateCcw} className="size-4.5 text-foreground" />
              <Text className={`${BTN_TEXT} text-foreground`}>Restore from a file</Text>
            </Button>
          </View>
        }
      >
        <AppMark />
        <Text className={`${DISPLAY} mt-6`}>Ironkeep</Text>
        <Text className={`${BODY} mt-3 max-w-75 text-lg leading-7`}>
          Your logbook stays on this phone. No account, no internet.
        </Text>
      </Screen>
    )
  }

  if (step === 0) {
    return (
      <StepFrame step={step} title="Units" onBack={back} footer={continueButton()}>
        <View accessibilityRole="radiogroup" className="mt-8 gap-2">
          <Option
            title="Kilograms"
            detail="Plates of 1.25, 2.5, 5"
            selected={units === 'kg'}
            onPress={() => setUnits('kg')}
          />
          <Option
            title="Pounds"
            detail="Plates of 2.5, 5, 10"
            selected={units === 'lb'}
            onPress={() => setUnits('lb')}
          />
        </View>
      </StepFrame>
    )
  }

  if (step === SPLIT_STEP) {
    return (
      <StepFrame step={step} title="Which split?" onBack={back} footer={continueButton()}>
        <SplitPicker
          splits={BUNDLED_SPLITS}
          value={split}
          onChange={setSplit}
          ownDays={ownDays}
          onOwnDaysChange={setOwnDays}
          empty={empty}
          onEmptyChange={setEmpty}
          className="mt-6"
        />
      </StepFrame>
    )
  }

  if (step === 2) {
    const shown = bodyweight ?? (units === 'kg' ? 70 : 155)
    return (
      <StepFrame
        step={step}
        title="What do you weigh today?"
        onBack={back}
        footer={
          // Skip sits above Continue, so Continue stays where it is on every step.
          <View className="gap-2">
            <Button
              variant="ghost"
              className="h-12"
              onPress={() => {
                setBodyweight(undefined)
                setStep(3)
              }}
            >
              <Icon as={SkipForward} className="size-4.5 text-foreground" />
              <Text className="text-lg font-semibold text-foreground">Skip</Text>
            </Button>
            {continueButton()}
          </View>
        }
      >
        <RulerPicker
          className="mt-8"
          value={shown}
          unit={units}
          step={units === 'kg' ? 0.5 : 1}
          perLabel={10}
          perMid={units === 'kg' ? 2 : 5}
          min={units === 'kg' ? 30 : 60}
          max={units === 'kg' ? 250 : 550}
          onChange={setBodyweight}
          label="bodyweight"
          muted={bodyweight === undefined}
        />
        <Segmented
          options={GOAL_OPTIONS}
          value={goal}
          onChange={setGoal}
          accessibilityLabel="Bodyweight goal"
          className="mt-6"
        />
      </StepFrame>
    )
  }

  return (
    <StepFrame
      step={step}
      title="How long have you been lifting?"
      onBack={back}
      footer={
        <View className="gap-2">
          {error ? <Text className="text-sm font-medium text-destructive">{error}</Text> : null}
          {continueButton('Start training')}
        </View>
      }
    >
      <View accessibilityRole="radiogroup" className="mt-8 gap-2">
        {ageOptions.map((o) => (
          <Option
            key={o.value}
            title={o.title}
            detail={o.detail}
            selected={trainingAge === o.value}
            onPress={() => setTrainingAge(o.value)}
          />
        ))}
      </View>
    </StepFrame>
  )
}
