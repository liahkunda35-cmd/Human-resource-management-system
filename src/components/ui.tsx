import {
  useEffect,
  useId,
  useState,
  type ButtonHTMLAttributes,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { X } from 'lucide-react'
import type { Employee } from '../types'
import { initials } from '../lib/format'
import { useStore } from '../store/Store'

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="brand" style={{ color: light ? '#efe7db' : 'var(--ink)', padding: 0 }}>
      <div className="brand-mark">A</div>
      <div>
        <div className="brand-name">Aurelia</div>
        <div className="brand-sub">People</div>
      </div>
    </div>
  )
}

export function Avatar({ employee, size = 'md' }: { employee: Pick<Employee, 'firstName' | 'lastName' | 'avatarHue'>; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div
      className={`avatar ${size}`}
      style={{ background: `hsl(${employee.avatarHue} 28% 42%)` }}
      aria-hidden
    >
      {initials(employee)}
    </div>
  )
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'success' | 'warn' | 'danger' | 'info' | 'gold' }) {
  const cls = tone === 'neutral' ? '' : tone
  return <span className={`badge ${cls}`}>{children}</span>
}

export function statusTone(status: string): 'success' | 'warn' | 'danger' | 'info' | 'gold' | 'neutral' {
  const s = status.toLowerCase()
  if (['active', 'approved', 'paid', 'present', 'done', 'hired', 'completed', 'open'].includes(s)) return 'success'
  if (['pending', 'late', 'probation', 'draft', 'interview', 'in progress', 'on hold'].includes(s)) return 'warn'
  if (['rejected', 'inactive', 'absent', 'closed'].includes(s)) return 'danger'
  if (['on leave', 'remote', 'selected', 'shortlisted'].includes(s)) return 'info'
  return 'gold'
}

export function Button({
  children,
  variant = 'primary',
  size,
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'gold' | 'ghost' | 'danger'; size?: 'sm' }) {
  return (
    <button className={`btn btn-${variant} ${size ? 'btn-sm' : ''} ${className}`} {...props}>
      {children}
    </button>
  )
}

export function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: ReactNode
}) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div id={id}>{children}</div>
      {error ? <div className="field-error">{error}</div> : null}
    </div>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />
}

export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className="select" {...props}>
      {children}
    </select>
  )
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="textarea" {...props} />
}

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="modal-back" onClick={onClose} role="presentation">
      <div className={`modal ${wide ? 'wide' : ''}`} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="card-head">
          <h2>{title}</h2>
          <button className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  danger,
  onClose,
  onConfirm,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel?: string
  danger?: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <p className="lede" style={{ marginBottom: 18 }}>{body}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
        <Button variant={danger ? 'danger' : 'primary'} type="button" onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  )
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string
  value: string | number
  hint?: string
  icon?: ReactNode
}) {
  return (
    <div className="card stat">
      {icon ? <div className="stat-icon">{icon}</div> : null}
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  )
}

export function PageHeader({
  kicker,
  title,
  lede,
  actions,
}: {
  kicker?: string
  title: string
  lede?: string
  actions?: ReactNode
}) {
  return (
    <div className="page-head">
      <div>
        {kicker ? <div className="kicker">{kicker}</div> : null}
        <h1>{title}</h1>
        {lede ? <p className="lede">{lede}</p> : null}
      </div>
      {actions}
    </div>
  )
}

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t} className={`tab ${value === t ? 'on' : ''}`} onClick={() => onChange(t)} type="button">
          {t}
        </button>
      ))}
    </div>
  )
}

export function Toasts() {
  const { toasts, dismissToast } = useStore()
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          <span>{t.message}</span>
          <button type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

export function FormActions({ onCancel, submitLabel = 'Save' }: { onCancel: () => void; submitLabel?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
      <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      <Button type="submit" variant="gold">{submitLabel}</Button>
    </div>
  )
}

export function onSubmit(handler: () => void) {
  return (e: FormEvent) => {
    e.preventDefault()
    handler()
  }
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} role="progressbar">
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  )
}

export function useDisclosure() {
  const [open, setOpen] = useState(false)
  return { open, onOpen: () => setOpen(true), onClose: () => setOpen(false), toggle: () => setOpen((v) => !v) }
}
