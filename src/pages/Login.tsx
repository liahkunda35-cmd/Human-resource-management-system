import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from 'lucide-react'
import { useStore } from '../store/Store'
import { isValidEmailFormat } from '../lib/passwordReset'

export function LoginPage() {
  const { currentUser, login, toast, authLoading } = useStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [unlockFields, setUnlockFields] = useState(false)

  // Never keep credentials or revealed password across refreshes / navigation.
  useEffect(() => {
    setEmail('')
    setPassword('')
    setShow(false)
    setRemember(false)
    setUnlockFields(false)
  }, [])

  if (authLoading) {
    return (
      <div className="auth-shell">
        <div className="card empty" style={{ margin: 'auto' }}><h3>Loading session…</h3></div>
      </div>
    )
  }

  if (currentUser?.mustChangePassword) return <Navigate to="/change-password" replace />
  if (currentUser) return <Navigate to="/app" replace />

  async function submit() {
    setError('')
    setBusy(true)
    const result = await login(email, password, remember)
    setBusy(false)
    setPassword('')
    setShow(false)
    if (typeof result === 'string') {
      setError(result)
      return
    }
    toast('Welcome back.')
    if (result && typeof result === 'object' && result.mustChangePassword) {
      navigate('/change-password')
      return
    }
    navigate('/app')
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <aside className="auth-welcome">
          <div className="auth-orb auth-orb-1" aria-hidden />
          <div className="auth-orb auth-orb-2" aria-hidden />
          <div className="auth-orb auth-orb-3" aria-hidden />
          <div className="auth-welcome-copy">
            <p className="auth-kicker">Aurelia People</p>
            <h1>WELCOME</h1>
            <h2>ZamTech Solutions Ltd</h2>
            <p>
              Sign in to manage employees, attendance, leave, and reports —
              all in one calm workspace.
            </p>
          </div>
        </aside>

        <form
          className="auth-side"
          autoComplete="off"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="auth-side-badge" aria-hidden>
            <span>A</span>
          </div>
          <p className="auth-side-kicker">Secure access</p>
          <h3>Sign in</h3>
          <p className="auth-lede">Use the work credentials emailed to you by your administrator.</p>

          <div className="auth-fields">
            <label className="auth-label" htmlFor="login-email">Email</label>
            <div className="auth-field">
              <span className="auth-field-icon"><User size={16} aria-hidden /></span>
              <input
                id="login-email"
                name="aurelia-email"
                type="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                readOnly={!unlockFields}
                onFocus={() => setUnlockFields(true)}
                placeholder="name@zamtech.co.zm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <label className="auth-label" htmlFor="login-password">Password</label>
            <div className="auth-field">
              <span className="auth-field-icon"><Lock size={16} aria-hidden /></span>
              <input
                id="login-password"
                name="aurelia-password"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                readOnly={!unlockFields}
                onFocus={() => setUnlockFields(true)}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="auth-show"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'Hide password' : 'Show password'}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="auth-meta">
            <label className="check">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="auth-link">Forgot password?</Link>
          </div>

          {error ? <div className="field-error">{error}</div> : null}

          <button type="submit" className="auth-primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
            <ArrowRight size={18} aria-hidden />
          </button>

          <p className="auth-side-note">Protected workspace for ZamTech staff only.</p>
        </form>
      </div>
    </div>
  )
}

export function ForgotPasswordPage() {
  const { currentUser, requestPasswordReset } = useStore()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [resetPath, setResetPath] = useState<string | null>(null)

  if (currentUser) return <Navigate to="/app" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Email address is required.')
      return
    }
    if (!isValidEmailFormat(trimmed)) {
      setError('Enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      const result = await requestPasswordReset(trimmed)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setResetPath(result.resetPath ?? null)
      setSent(true)
    } catch {
      setError('Something went wrong while sending the reset link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const resetLinkTo = useMemo(() => {
    if (!resetPath) return null
    const qIndex = resetPath.indexOf('?')
    if (qIndex === -1) return { pathname: resetPath }
    return {
      pathname: resetPath.slice(0, qIndex),
      search: resetPath.slice(qIndex),
    }
  }, [resetPath])

  return (
    <div className="auth-shell">
      <div className="auth-panel auth-panel--narrow">
        <aside className="auth-welcome">
          <div className="auth-orb auth-orb-1" aria-hidden />
          <div className="auth-orb auth-orb-2" aria-hidden />
          <div className="auth-welcome-copy">
            <p className="auth-kicker">Aurelia People</p>
            <h1>RESET</h1>
            <h2>Password recovery</h2>
            <p>We will email a secure, time-limited link to reset your password.</p>
          </div>
        </aside>

        <div className="auth-side">
          {sent ? (
            <>
              <div className="auth-side-badge" aria-hidden><span>A</span></div>
              <p className="auth-side-kicker">Almost there</p>
              <h3>Check your email</h3>
              <p className="auth-lede">
                If an account exists with that email address, we&apos;ve sent instructions to reset your password.
              </p>
              {resetLinkTo ? (
                <div className="auth-reset-local">
                  <p>
                    Email delivery is not configured on this environment. Use this secure one-time link to continue:
                  </p>
                  <Link to={resetLinkTo} className="auth-link">
                    Open password reset link
                  </Link>
                </div>
              ) : null}
              <Link to="/login" className="auth-primary" style={{ textDecoration: 'none', marginTop: 8 }}>
                Back to Login
                <ArrowRight size={18} aria-hidden />
              </Link>
            </>
          ) : (
            <form onSubmit={onSubmit}>
              <div className="auth-side-badge" aria-hidden><span>A</span></div>
              <p className="auth-side-kicker">Account recovery</p>
              <h3>Forgot Password?</h3>
              <p className="auth-lede">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>

              <div className="auth-fields">
                <label className="auth-label" htmlFor="forgot-email">Email</label>
                <div className={`auth-field${error ? ' auth-field--error' : ''}`}>
                  <span className="auth-field-icon"><Mail size={16} aria-hidden /></span>
                  <input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError('')
                    }}
                    disabled={loading}
                    required
                  />
                </div>
                {error ? <p className="auth-field-error">{error}</p> : null}
              </div>

              <button type="submit" className="auth-primary" disabled={loading}>
                {loading ? 'Sending…' : 'Send Reset Link'}
                {!loading ? <ArrowRight size={18} aria-hidden /> : null}
              </button>

              <p className="auth-footer">
                <Link to="/login" className="auth-link">Back to Login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function passwordStrongEnough(value: string) {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /[0-9]/.test(value) &&
    /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(value)
  )
}

export function ResetPasswordPage() {
  const { currentUser, getResetTokenStatus, resetPasswordWithToken } = useStore()
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
        const next = await getResetTokenStatus(rawToken)
        if (!cancelled) setStatus(next)
      } catch {
        if (!cancelled) setStatus('invalid')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [getResetTokenStatus, rawToken])

  if (currentUser && !done) return <Navigate to="/app" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!password) {
      setError('Enter a new password.')
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
    const err = await resetPasswordWithToken(rawToken, password)
    setLoading(false)
    if (err) {
      setError(err)
      setStatus('invalid')
      return
    }
    setDone(true)
  }

  return (
    <div className="auth-shell">
      <div className="auth-panel auth-panel--narrow">
        <aside className="auth-welcome">
          <div className="auth-orb auth-orb-1" aria-hidden />
          <div className="auth-orb auth-orb-2" aria-hidden />
          <div className="auth-welcome-copy">
            <p className="auth-kicker">Aurelia People</p>
            <h1>NEW</h1>
            <h2>Choose a password</h2>
            <p>Create a strong password to secure your HR workspace.</p>
          </div>
        </aside>

        <div className="auth-side">
          {status === 'loading' ? (
            <>
              <h3>Verifying link…</h3>
              <p className="auth-lede">Please wait while we validate your reset request.</p>
            </>
          ) : null}

          {status !== 'loading' && status !== 'valid' && !done ? (
            <>
              <div className="auth-side-badge" aria-hidden><span>A</span></div>
              <h3>This reset link is no longer valid.</h3>
              <p className="auth-lede">
                It may have expired, already been used, or is otherwise invalid. Request a new link to continue.
              </p>
              <button type="button" className="auth-primary" onClick={() => navigate('/forgot-password')}>
                Request New Reset Link
                <ArrowRight size={18} aria-hidden />
              </button>
              <p className="auth-footer">
                <Link to="/login" className="auth-link">Back to Login</Link>
              </p>
            </>
          ) : null}

          {done ? (
            <>
              <div className="auth-side-badge" aria-hidden><span>A</span></div>
              <p className="auth-side-kicker">All set</p>
              <h3>Password Reset Successful</h3>
              <p className="auth-lede">
                Your password has been changed successfully. You can now log in with your new password.
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
              <p className="auth-side-kicker">Secure reset</p>
              <h3>Reset Password</h3>
              <p className="auth-lede">Enter and confirm your new password below.</p>

              <div className="auth-fields">
                <label className="auth-label" htmlFor="reset-password">New Password</label>
                <div className="auth-field">
                  <span className="auth-field-icon"><Lock size={16} aria-hidden /></span>
                  <input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Create a new password"
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

                <label className="auth-label" htmlFor="reset-confirm">Confirm Password</label>
                <div className="auth-field">
                  <span className="auth-field-icon"><Lock size={16} aria-hidden /></span>
                  <input
                    id="reset-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Confirm your new password"
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
                {loading ? 'Updating…' : 'Reset Password'}
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
