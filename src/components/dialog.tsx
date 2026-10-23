import type { ReactNode } from 'react'
import { Modal, Pressable, View } from 'react-native'

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
 */
export function Dialog({ open, onClose, children, className }: DialogProps) {
  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 justify-center bg-scrim px-8">
        <Pressable
          className="absolute inset-0"
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={onClose}
        />
        <View className={cn('gap-4 rounded-2xl bg-card px-5 pt-6 pb-5', className)}>{children}</View>
      </View>
    </Modal>
  )
}
