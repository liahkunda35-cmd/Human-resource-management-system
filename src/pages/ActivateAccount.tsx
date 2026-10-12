import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock } from 'lucide-react'
import { useStore } from '../store/Store'

function passwordStrongEnough(value: string) {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(value)
  )
}

export function ActivateAccountPage() {
  const { currentUser, getActivationStatus, activateAccount } = useStore()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const rawToken = useMemo(() => params.get('token')?.trim() ?? '', [params])

  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'expired' | 'used'>('loading')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!rawToken) {
        if (!cancelled) setStatus('invalid')
        return
      }
      try {
        const next = await getActivationStatus(rawToken)
        if (!cancelled) setStatus(next)
      } catch {
        if (!cancelled) setStatus('invalid')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getActivationStatus, rawToken])

  if (currentUser && !done) return <Navigate to="/app" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!password) {
      setError('Enter a password.')
      return
    }
    if (!passwordStrongEnough(password)) {
      setError('Use at least 8 characters with upper, lower, number, and special character.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const err = await activateAccount(rawToken, password)
    setLoading(false)
    if (err) {
      setError(err)
      setStatus('invalid')
      return
    }
    setDone(true)
  }

  const invalidCopy = status === 'used'
    ? 'This activation link has already been used. Sign in with the password you chose.'
    : status === 'expired'
      ? 'This activation link has expired. Ask Human Resources to resend it.'
      : 'This activation link is no longer valid. Ask Human Resources to resend it.'

  return (
    <div className="auth-shell">
      <div className="auth-panel auth-panel--narrow">
        <aside className="auth-welcome">
          <div className="auth-orb auth-orb-1" aria-hidden />
          <div className="auth-orb auth-orb-2" aria-hidden />
          <div className="auth-welcome-copy">
            <p className="auth-kicker">Aurelia People</p>
            <h1>NEW</h1>
            <h2>Activate your account</h2>
            <p>Choose a password to open your employee workspace.</p>
          </div>
        </aside>

        <div className="auth-side">
          {status === 'loading' ? (
            <>
              <h3>Verifying link…</h3>
              <p className="auth-lede">Please wait while we check this activation link.</p>
            </>
          ) : null}

          {status !== 'loading' && status !== 'valid' && !done ? (
            <>
              <div className="auth-side-badge" aria-hidden><span>A</span></div>
              <h3>This activation link cannot be used.</h3>
              <p className="auth-lede">{invalidCopy}</p>
              <button type="button" className="auth-primary" onClick={() => navigate('/login')}>
                Back to Login
                <ArrowRight size={18} aria-hidden />
              </button>
            </>
          ) : null}

          {done ? (
            <>
              <div className="auth-side-badge" aria-hidden><span>A</span></div>
              <p className="auth-side-kicker">All set</p>
              <h3>Account activated</h3>
              <p className="auth-lede">
                Your password is saved. Sign in with your email and the password you just chose.
              </p>
              <Link to="/login" className="auth-primary" style={{ textDecoration: 'none' }}>
                Back to Login
                <ArrowRight size={18} aria-hidden />
              </Link>
            </>
          ) : null}

          {status === 'valid' && !done ? (
            <form onSubmit={onSubmit}>
              <div className="auth-side-badge" aria-hidden><span>A</span></div>
              <p className="auth-side-kicker">Employee activation</p>
              <h3>Choose a password</h3>
              <p className="auth-lede">This link works once. After you continue, it cannot be used again.</p>

              <div className="auth-fields">
                <label className="auth-label" htmlFor="activate-password">New Password</label>
                <div className="auth-field">
                  <span className="auth-field-icon"><Lock size={16} aria-hidden /></span>
                  <input
                    id="activate-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (error) setError('')
                    }}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="auth-show"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <label className="auth-label" htmlFor="activate-confirm">Confirm Password</label>
                <div className="auth-field">
                  <span className="auth-field-icon"><Lock size={16} aria-hidden /></span>
                  <input
                    id="activate-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    value={confirm}
                    onChange={(e) => {
                      setConfirm(e.target.value)
                      if (error) setError('')
                    }}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="auth-show"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {error ? <p className="auth-field-error">{error}</p> : null}
              </div>

              <button type="submit" className="auth-primary" disabled={loading}>
                {loading ? 'Saving…' : 'Activate Account'}
                {!loading ? <ArrowRight size={18} aria-hidden /> : null}
              </button>

              <p className="auth-footer">
                <Link to="/login" className="auth-link">Back to Login</Link>
              </p>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  )
}
