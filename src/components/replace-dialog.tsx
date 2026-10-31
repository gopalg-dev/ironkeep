import { useEffect, useState } from 'react'
import { TextInput } from 'react-native'
import { useResolveClassNames } from 'uniwind'
import { BTN, BTN_TEXT } from './button-styles'
import { Dialog } from './dialog'
import { BODY, H2 } from './typography'
import { Button } from './ui/button'
import { Text } from './ui/text'

/** A deliberate replacement, with an export available before the typed confirmation. */
export function ReplaceDialog({
  open,
  title,
  consequence,
  onClose,
  onConfirm,
  onExport,
  phraseRequired = 'replace my data',
  actionLabel = 'Replace',
}: {
  open: boolean
  title: string
  consequence: string
  onClose: () => void
  onConfirm: () => Promise<void>
  onExport?: () => Promise<void>
  phraseRequired?: string
  actionLabel?: string
}) {
  const [phrase, setPhrase] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const placeholder = useResolveClassNames('text-muted-foreground')
  useEffect(() => {
    if (open) {
      setPhrase('')
      setError(null)
    }
  }, [open])
  const run = async (action: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete the change.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <Text accessibilityRole="header" className={H2}>
        {title}
      </Text>
      <Text className={BODY}>{consequence}</Text>
      {onExport ? (
        <Button variant="secondary" className={BTN} disabled={busy} onPress={() => void run(onExport)}>
          <Text className={`${BTN_TEXT} text-foreground`}>Export current data first</Text>
        </Button>
      ) : null}
      <TextInput
        accessibilityLabel={`Type ${phraseRequired}`}
        placeholder={`Type ${phraseRequired}`}
        value={phrase}
        onChangeText={setPhrase}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!busy}
        placeholderTextColor={typeof placeholder.color === 'string' ? placeholder.color : undefined}
        className="min-h-14 rounded-xl bg-background px-4 text-lg font-normal text-foreground"
      />
      {error ? <Text className="text-base text-destructive">{error}</Text> : null}
      <Button
        className={BTN}
        disabled={busy || phrase.trim().toLowerCase() !== phraseRequired}
        onPress={() => void run(onConfirm)}
      >
        <Text className={BTN_TEXT}>{actionLabel}</Text>
      </Button>
      <Button variant="ghost" disabled={busy} onPress={onClose}>
        <Text>Cancel</Text>
      </Button>
    </Dialog>
  )
}
