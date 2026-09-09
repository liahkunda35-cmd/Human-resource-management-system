import { Link } from 'react-router-dom'
import { CalendarCheck, Shield, Sparkles, Users } from 'lucide-react'
import { Button, Logo } from '../components/ui'

export function LandingPage() {
  return (
    <div className="landing">
      <nav className="l-nav">
        <Logo />
        <div className="l-nav-actions">
          <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/login"><Button variant="gold">Get started</Button></Link>
        </div>
      </nav>
      <section className="hero">
        <div>
          <div className="kicker">Human resource management</div>
          <h1>The quiet confidence of a well-run people function.</h1>
          <p>
            Aurelia is a complete HRMS for organisations that care how work feels —
            attendance, leave, payroll, hiring, and performance in one calm, considered workspace.
          </p>
          <div className="hero-actions">
            <Link to="/login"><Button variant="gold">Get started</Button></Link>
            <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden>
          <div className="orb" style={{ width: 280, height: 280, background: '#c4a574', right: -40, top: -50, opacity: .35 }} />
          <div className="orb" style={{ width: 180, height: 180, background: '#8a9a84', left: -30, bottom: 40, opacity: .3 }} />
          <div className="float-card" style={{ left: 36, top: 48 }}>
            <div className="kicker">Today</div>
            <strong>14 present · 1 on leave</strong>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>Engineering on time</div>
          </div>
          <div className="float-card" style={{ right: 28, top: 150, animationDelay: '1s' }}>
            <div className="kicker">Leave</div>
            <strong>3 awaiting review</strong>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>Priya is covering</div>
          </div>
          <div className="float-card" style={{ left: 70, bottom: 48, animationDelay: '2s' }}>
            <div className="kicker">Payroll</div>
            <strong>August released</strong>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>Payslips in Documents</div>
          </div>
        </div>
      </section>
      <section className="features">
        <article className="card feature">
          <Users size={22} />
          <h3>People records</h3>
          <p className="lede">Profiles, departments, documents, and a living org — not a spreadsheet graveyard.</p>
        </article>
        <article className="card feature">
          <CalendarCheck size={22} />
          <h3>Time & leave</h3>
          <p className="lede">Clock in with grace, request leave clearly, and approve without chasing inboxes.</p>
        </article>
        <article className="card feature">
          <Shield size={22} />
          <h3>Role-aware access</h3>
          <p className="lede">HR, managers, and employees each see what they need — and nothing they should not.</p>
        </article>
        <article className="card feature">
          <Sparkles size={22} />
          <h3>Performance & growth</h3>
          <p className="lede">Reviews, goals, training, and hiring in the same rhythm as everyday work.</p>
        </article>
      </section>
      <footer className="l-foot">© {new Date().getFullYear()} Aurelia People. Crafted for organisations that take care seriously.</footer>
    </div>
  )
}
