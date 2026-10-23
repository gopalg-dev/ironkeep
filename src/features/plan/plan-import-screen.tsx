import { useRouter } from 'expo-router'
import { AlertCircle, ArrowLeft, Check, ChevronDown, Download, Upload } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import * as XLSX from 'xlsx'

import { BTN, BTN_TEXT } from '@/components/button-styles'
import { DayIcon, dayBorderClass } from '@/components/day-icon'
import { IconButton } from '@/components/icon-button'
import { useBigTitle } from '@/components/page-bar'
import { Group, Row, RowBody, RowSub, RowTitle, RowValue } from '@/components/row'
import { Screen } from '@/components/screen'
import { BODY, H2, NUMBER, SECONDARY, TITLE } from '@/components/typography'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Text } from '@/components/ui/text'
import * as repo from '@/db/repo'
import { pickFile, shareBytes } from '@/features/data/files'
import { setPick } from '@/features/stats/pick-sheet'
import { buildSplitFrom, planSourceInfo, splitInfoOf, splitInfos } from '@/lib/content'
import { errorMessage, LOAD_LABEL, targetOf } from '@/lib/format'
import { type ParsedPlan, parseRows, type SheetRow, splitFromMarker } from '@/lib/logic/plan-sheet'
import { planWorkbook } from '@/lib/plan-workbook'
import { BUNDLED_SPLITS } from '@/lib/splits'
import { MAX_EXERCISES_PER_DAY, type Plan, type Settings, type SplitId } from '@/lib/types'
import { cn } from '@/lib/utils'

const CURRENT = 'current'
const TEMPLATE = 'Template'
const XLSX_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** The reason the parsed plan cannot be used yet, or null. Same rules as the web app. */
function problemOf(parsed: ParsedPlan): string | null {
  if (parsed.days.length === 0) return 'Nothing to use yet.'
  for (const d of parsed.days) {
    if (!d.name.trim()) return 'Every day needs a name.'
    if (d.exercises.length === 0) return `${d.name} has no exercises. Remove the day or add rows in the sheet.`
    if (d.exercises.length > MAX_EXERCISES_PER_DAY) {
      return `${d.name} has ${d.exercises.length} exercises. A day holds up to ${MAX_EXERCISES_PER_DAY}, so remove some.`
    }
    for (const e of d.exercises) {
      if (!e.name.trim()) return `An exercise in ${d.name} has no name.`
      if (e.sets < 1) return `${e.name} needs at least 1 set.`
      if (e.repMin < 1 || e.repMax < e.repMin) return `${e.name} has a bad rep range.`
    }
  }
  return null
}

/**
 * Bring your own plan (canvas: PlanImport): share a template out, read a filled one in, see the days
 * it holds and what was skipped, and make it the plan. The `/plan-import` page, from Plan.
 */
export function PlanImportScreen() {
  const router = useRouter()
  const measure = useBigTitle()
  const [data, setData] = useState<{ settings: Settings; plan: Plan } | null>(null)
  const [template, setTemplate] = useState<string>(CURRENT)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedPlan | null>(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    Promise.all([repo.getSettings(), repo.getPlan()]).then(([settings, plan]) => {
      if (live) setData({ settings, plan })
    })
    return () => {
      live = false
    }
  }, [])

  const bar = {
    title: 'Your own plan',
    left: <IconButton as={ArrowLeft} tone="surface" accessibilityLabel="Back" onPress={() => router.back()} />,
  }
  if (!data) return <Screen bar={bar}>{null}</Screen>
  const { settings, plan } = data
  const infos = splitInfos(BUNDLED_SPLITS)
  const current = planSourceInfo(BUNDLED_SPLITS, settings.split, plan.days.length)
  const templateLabel = template === CURRENT ? 'Current plan' : (infos.find((s) => s.id === template)?.name ?? '')

  async function run(action: () => Promise<unknown>, fallback: string) {
    if (busy) return
    setBusy(true)
    setProblem(null)
    try {
      await action()
    } catch (err) {
      setProblem(errorMessage(err, fallback))
    } finally {
      setBusy(false)
    }
  }

  function pickTemplate() {
    setPick({
      title: 'Template',
      options: [
        { id: CURRENT, label: 'Current plan' },
        ...infos.map((s) => ({ id: s.id, label: `${s.name}, ${s.days} days` })),
      ],
      current: template,
      onPick: setTemplate,
    })
    router.push('/pick')
  }

  const shareTemplate = () =>
    run(async () => {
      const chosen = template === CURRENT ? null : splitInfoOf(BUNDLED_SPLITS, template as SplitId)
      const days = chosen ? buildSplitFrom(BUNDLED_SPLITS, chosen.id) : plan.days
      // The current plan carries its own template's marker, unless it is custom.
      const marker = chosen ?? (current.custom ? null : current)
      const bytes = XLSX.write(planWorkbook(days, marker), { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
      await shareBytes(
        marker ? `ironkeep-template-${marker.id}.xlsx` : 'ironkeep-template.xlsx',
        new Uint8Array(bytes),
        XLSX_TYPE,
      )
    }, 'Could not build the template.')

  const readFile = () =>
    run(async () => {
      const file = await pickFile()
      if (!file) return
      setFileName(file.name)
      // raw keeps "6-10" in a CSV as text; date cells in .xlsx still arrive as dates and are read back.
      const wb = XLSX.read(await file.bytes(), { type: 'array', cellDates: true, raw: true })
      const sheet = wb.Sheets.Plan ?? wb.Sheets[wb.SheetNames[0] ?? '']
      if (!sheet) throw new Error('The file has no sheets.')
      const rows = XLSX.utils.sheet_to_json<SheetRow>(sheet, { defval: '', raw: true })
      // The marker names the template the file was downloaded as. A file without one is a custom plan.
      const cells = ['Template', 'Guide'].flatMap((name) => {
        const s = wb.Sheets[name]
        return s ? XLSX.utils.sheet_to_json<unknown[]>(s, { header: 1, defval: '' }) : []
      })
      setParsed({
        ...parseRows(rows),
        split: splitFromMarker(
          cells,
          infos.map((s) => s.id),
        ),
      })
    }, 'Could not read that file. Use .xlsx or .csv.')

  const applyPlan = () =>
    run(async () => {
      if (!parsed) return
      await repo.replacePlan(parsed.days, parsed.split)
      router.back()
    }, 'Could not save the plan.')

  const blocker = parsed ? problemOf(parsed) : null
  const exerciseCount = parsed?.days.reduce((n, d) => n + d.exercises.length, 0) ?? 0
  const countLine = parsed
    ? `${parsed.days.length} ${parsed.days.length === 1 ? 'day' : 'days'}, ${exerciseCount} exercises`
    : ''

  return (
    <Screen
      bar={bar}
      footer={
        parsed ? (
          <Button className={BTN} disabled={busy || blocker !== null} onPress={applyPlan}>
            <Icon as={Check} className="size-4.5 text-primary-foreground" />
            <Text className={BTN_TEXT}>Use this plan</Text>
          </Button>
        ) : undefined
      }
    >
      <View className="min-h-11" />
      <View className="mt-4" onLayout={(e) => measure(e.nativeEvent.layout)}>
        <Text className={cn(TITLE, 'text-3xl leading-10')}>Bring your own plan</Text>
      </View>

      <Group className="mt-6">
        <Row accessibilityLabel={`${TEMPLATE}, ${templateLabel}`} onPress={pickTemplate}>
          <RowBody>
            <RowTitle>{TEMPLATE}</RowTitle>
          </RowBody>
          <RowValue>{templateLabel}</RowValue>
          <Icon as={ChevronDown} strokeWidth={1.75} className="size-5.5 text-muted-foreground" />
        </Row>
      </Group>
      <View className="mt-2 gap-2">
        <Button className={BTN} disabled={busy} onPress={readFile}>
          <Icon as={Upload} className="size-4.5 text-primary-foreground" />
          <Text className={BTN_TEXT}>Upload a file</Text>
        </Button>
        <Button variant="secondary" className={BTN} disabled={busy} onPress={shareTemplate}>
          <Icon as={Download} className="size-4.5 text-foreground" />
          <Text className={cn(BTN_TEXT, 'text-foreground')}>Download template</Text>
        </Button>
      </View>
      {problem ? <Text className={cn(BODY, 'mt-4 text-destructive')}>{problem}</Text> : null}

      {parsed ? (
        <>
          <View className="mt-8 flex-row items-center justify-between gap-3">
            <Text className={cn(H2, 'shrink')} numberOfLines={1}>
              {fileName}
            </Text>
            <Text className={cn(SECONDARY, NUMBER)}>{countLine}</Text>
          </View>
          {parsed.days.map((d, i) => (
            <Group key={d.id} className={cn('border-l-4', i === 0 ? 'mt-3' : 'mt-2', dayBorderClass(d.type))}>
              <Row accessibilityLabel={d.name}>
                <DayIcon type={d.type} size="sm" />
                <RowBody>
                  <RowTitle>{d.name}</RowTitle>
                </RowBody>
                <RowValue>{d.type}</RowValue>
              </Row>
              {d.exercises.map((e) => {
                const about = `${LOAD_LABEL[e.loadType]}, ${e.muscle}`
                const target = `${e.sets} × ${targetOf(e)}`
                return (
                  <Row key={e.id} accessibilityLabel={e.name}>
                    <RowBody>
                      <RowTitle>{e.name}</RowTitle>
                      <RowSub>{about}</RowSub>
                    </RowBody>
                    <RowValue className={NUMBER}>{target}</RowValue>
                  </Row>
                )
              })}
            </Group>
          ))}
          {parsed.warnings.length > 0 ? (
            <Group className="mt-4 bg-card">
              {parsed.warnings.slice(0, 20).map((w) => {
                const row = `Row ${w.row}`
                return (
                  <Row key={`${w.row}-${w.message}`} accessibilityLabel={row}>
                    <Icon as={AlertCircle} strokeWidth={1.75} className="size-5.5 text-destructive" />
                    <RowBody>
                      <RowTitle className={NUMBER}>{row}</RowTitle>
                      <RowSub>{w.message}</RowSub>
                    </RowBody>
                  </Row>
                )
              })}
            </Group>
          ) : null}
          {blocker ? <Text className={cn(BODY, 'mt-4 text-destructive')}>{blocker}</Text> : null}
        </>
      ) : null}
    </Screen>
  )
}
