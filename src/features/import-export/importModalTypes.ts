export interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
  restoreFocus?: boolean
}
