import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import { useStore } from '../store/Store'

export function ChangePasswordPage() {
  const { currentUser, changePassword, toast } = useStore()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (!currentUser) return <Navigate to="/login" replace />
  if (!currentUser.mustChangePassword) return <Navigate to="/app" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (next.length < 8) {
      setError('Use at least 8 characters for your new password.')
      return
    }
    if (next !== confirm) {
      setError('New password and confirmation do not match.')
      return
    }
    setBusy(true)
    const err = await changePassword(currentUser!.id, current, next)
    setBusy(false)
    if (err) {
      setError(err)
      return
    }
    toast('Password updated. Welcome to Aurelia People.')
    navigate('/app', { replace: true })
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel" style={{ maxWidth: 520 }}>
        <form className="auth-side" onSubmit={onSubmit} style={{ width: '100%' }}>
          <p className="auth-side-kicker">Security</p>
          <h3>Change temporary password</h3>
          <p className="auth-lede">
            You signed in with a temporary password emailed to you. Choose a new password before continuing.
          </p>
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          <div className="auth-fields">
            <label className="auth-label" htmlFor="cp-current">Temporary password</label>
            <div className="auth-field">
              <span className="auth-field-icon"><Lock size={16} /></span>
              <input id="cp-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
            </div>
            <label className="auth-label" htmlFor="cp-next">New password</label>
            <div className="auth-field">
              <span className="auth-field-icon"><Lock size={16} /></span>
              <input id="cp-next" type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
            <label className="auth-label" htmlFor="cp-confirm">Confirm new password</label>
            <div className="auth-field">
              <span className="auth-field-icon"><Lock size={16} /></span>
              <input id="cp-confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} autoComplete="new-password" />
            </div>
          </div>
          <button className="btn gold" type="submit" disabled={busy} style={{ marginTop: 16, width: '100%' }}>
            {busy ? 'Saving…' : 'Save new password'}
          </button>
        </form>
      </div>
    </div>
  )
}
