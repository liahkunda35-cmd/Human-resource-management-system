import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button, Logo } from '../components/ui'
import { DEMO_ACCOUNTS } from '../data/seed'
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
    <div className="auth-page">
      <div className="auth-visual">
        <Logo light />
        <div>
          <div className="kicker" style={{ color: '#c4a574' }}>Aurelia People</div>
          <h2>Sign in to the workspace that holds your organisation together.</h2>
          <p style={{ color: '#cbbba4', maxWidth: 420 }}>
            Attendance, leave, payroll, and talent — composed with the same care you give your people.
          </p>
        </div>
        <div style={{ color: '#8a8278', fontSize: 13 }}>Trusted by teams who prefer calm over clutter.</div>
      </div>
      <div className="auth-form">
        <form
          className="auth-card"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <Logo />
          <h1>Welcome back</h1>
          <p className="lede">Use your work email to continue.</p>
          <div className="field" style={{ marginTop: 22 }}>
            <label htmlFor="email">Email</label>
            <input id="email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field" style={{ marginTop: 12 }}>
            <label htmlFor="password">Password</label>
            <div className="input-wrap">
              <input
                id="password"
                className="input"
                type={show ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="eye" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', margin: '12px 0 18px' }}>
            <label className="check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Remember me
            </label>
            <Link to="/forgot-password" style={{ fontSize: 14, color: 'var(--gold-deep)' }}>Forgot password</Link>
          </div>
          {error ? <div className="field-error" style={{ marginBottom: 10 }}>{error}</div> : null}
          <Button type="submit" variant="gold" style={{ width: '100%' }}>Sign in</Button>
          <div className="demo-accounts">
            <div className="kicker">Demo access</div>
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                className="demo-btn"
                onClick={() => {
                  setEmail(a.email)
                  setPassword(a.password)
                  setError('')
                }}
              >
                <strong>{a.label}</strong>
                <div>{a.email}</div>
              </button>
            ))}
          </div>
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
    <div className="auth-page">
      <div className="auth-visual">
        <Logo light />
        <h2>We will send a reset link to your work email.</h2>
        <div />
      </div>
      <div className="auth-form">
        <form
          className="auth-card"
          onSubmit={(e) => {
            e.preventDefault()
            const exists = state.employees.some((x) => x.email.toLowerCase() === email.trim().toLowerCase())
            if (!exists) {
              setError('We could not find that email.')
              return
            }
            setSent(true)
            toast('Reset instructions sent (demo).')
          }}
        >
          <h1>Forgot password</h1>
          {sent ? (
              <p className="lede">If this were production, a reset email would be on its way. For the demo, sign in with the published sample password.</p>
          ) : (
            <>
              <p className="lede">Enter the email on your ZamTech profile.</p>
              <div className="field" style={{ marginTop: 18 }}>
                <label htmlFor="fe">Email</label>
                <input id="fe" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              {error ? <div className="field-error">{error}</div> : null}
              <Button type="submit" variant="gold" style={{ width: '100%', marginTop: 16 }}>Send reset link</Button>
            </>
          )}
          <p style={{ marginTop: 16 }}><Link to="/login">Back to sign in</Link></p>
        </form>
      </div>
    </div>
  )
}
