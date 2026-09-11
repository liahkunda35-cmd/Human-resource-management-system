import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, Lock, User } from 'lucide-react'
import { useStore } from '../store/Store'

export function LoginPage() {
  const { currentUser, login, toast } = useStore()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')

  if (currentUser) return <Navigate to="/app" replace />

  function submit() {
    const err = login(email, password, remember)
    if (err) {
      setError(err)
      return
    }
    toast('Welcome back.')
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
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <div className="auth-side-badge" aria-hidden>
            <span>A</span>
          </div>
          <p className="auth-side-kicker">Secure access</p>
          <h3>Sign in</h3>
          <p className="auth-lede">Enter your work credentials to open Aurelia People.</p>

          <div className="auth-fields">
            <label className="auth-label" htmlFor="login-email">Email</label>
            <div className="auth-field">
              <span className="auth-field-icon"><User size={16} aria-hidden /></span>
              <input
                id="login-email"
                type="email"
                autoComplete="username"
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
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
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

          <button type="submit" className="auth-primary">
            Sign in
            <ArrowRight size={18} aria-hidden />
          </button>

          <p className="auth-side-note">Protected workspace for ZamTech staff only.</p>
        </form>
      </div>
    </div>
  )
}

export function ForgotPasswordPage() {
  const { state, toast } = useStore()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

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
            <p>We will send a reset link to your work email on file.</p>
          </div>
        </aside>
        <form
          className="auth-side"
          onSubmit={(e) => {
            e.preventDefault()
            const exists = state.employees.some(
              (x) => x.email.toLowerCase() === email.trim().toLowerCase(),
            )
            if (!exists) {
              setError('We could not find that email.')
              return
            }
            setSent(true)
            toast('Reset instructions sent (demo).')
          }}
        >
          <h3>Forgot password</h3>
          {sent ? (
            <p className="auth-lede">
              If this were production, a reset email would be on its way. For the demo,
              sign in with the published sample password.
            </p>
          ) : (
            <>
              <p className="auth-lede">Enter the email on your ZamTech profile.</p>
              <label className="auth-field">
                <User size={16} aria-hidden />
                <input
                  type="email"
                  placeholder="User Name"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              {error ? <div className="field-error">{error}</div> : null}
              <button type="submit" className="auth-primary">Send reset link</button>
            </>
          )}
          <p className="auth-footer">
            <Link to="/login" className="auth-link">Back to sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
