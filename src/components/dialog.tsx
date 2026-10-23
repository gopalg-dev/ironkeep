import { type ComponentRef, type ReactNode, useRef } from 'react'
import { AccessibilityInfo, findNodeHandle, Modal, Pressable, View } from 'react-native'

import { cn } from '@/lib/utils'

interface DialogProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  className?: string
}

/**
 * The centred dialog of the design (canvas `.dialog`): a scrim and a card with 32px side margins.
 * A native modal with the platform's fade; the hardware back and a tap on the scrim close it.
 *
 * For a screen reader: the modal is its own window, so the page behind is out of reach; on open the
 * reader's focus is moved into the card, and the full-screen scrim is hidden from it (it would read as
 * one giant "Close" button) since every dialog carries its own Cancel and the back key also closes it.
 */
export function Dialog({ open, onClose, children, className }: DialogProps) {
  const card = useRef<ComponentRef<typeof View>>(null)
  const focusCard = () => {
    const tag = card.current ? findNodeHandle(card.current) : null
    if (tag) AccessibilityInfo.setAccessibilityFocus(tag)
  }
  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      onShow={focusCard}
    >
      <View className="flex-1 justify-center bg-scrim px-8">
        <Pressable aria-hidden className="absolute inset-0" onPress={onClose} />
        <View ref={card} accessibilityViewIsModal className={cn('gap-4 rounded-2xl bg-card px-5 pt-6 pb-5', className)}>
          {children}
        </View>
      </View>
    </Modal>
  )
}
