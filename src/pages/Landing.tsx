import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  CalendarCheck,
  CheckCircle2,
  ClipboardList,
  Search,
  Target,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react'

const featureCards = [
  {
    icon: Users,
    title: 'Employee Management',
    body: 'Organise profiles, departments, and everyday people records.',
  },
  {
    icon: CalendarCheck,
    title: 'Leave & Attendance',
    body: 'Track time, absences, and approvals in one place.',
  },
  {
    icon: Target,
    title: 'Performance Tracking',
    body: 'Follow goals and workforce progress with clarity.',
  },
  {
    icon: Wallet,
    title: 'Payroll & Benefits',
    body: 'Keep pay and benefits aligned with accurate HR data.',
  },
  {
    icon: Briefcase,
    title: 'Recruitment',
    body: 'Support hiring workflows with organised people processes.',
  },
  {
    icon: BarChart3,
    title: 'HR Analytics',
    body: 'Turn attendance, leave, and workforce data into insight.',
  },
]

const checklist = [
  'Employee records',
  'Attendance tracking',
  'Leave management',
  'Payroll readiness',
  'Performance insights',
  'HR analytics',
]

const solutions = [
  {
    title: 'Employee Management',
    body: 'Maintain complete workforce records from onboarding through daily updates.',
    icon: Users,
    image: '/sol-employee.jpg',
    pos: 'center top',
  },
  {
    title: 'Leave & Attendance',
    body: 'Record presence and time off with a shared, reliable calendar of work.',
    icon: CalendarCheck,
    image: '/sol-attendance.jpg',
    pos: 'center',
  },
  {
    title: 'Performance Management',
    body: 'Connect everyday work with clear goals and thoughtful people reviews.',
    icon: BarChart3,
    image: '/sol-performance.jpg',
    pos: 'center',
  },
  {
    title: 'Payroll & Benefits',
    body: 'Support fair pay cycles with organised employee and leave information.',
    icon: Wallet,
    image: '/sol-payroll.jpg',
    pos: 'center',
  },
]

const steps = [
  { n: '1', title: 'Add Employees', body: 'Create profiles and assign people to the right teams.', icon: UserPlus },
  { n: '2', title: 'Manage Attendance', body: 'Clock time and review daily workforce presence.', icon: CalendarCheck },
  { n: '3', title: 'Track Performance', body: 'Monitor progress with simple shared visibility.', icon: Target },
  { n: '4', title: 'Manage Payroll', body: 'Keep people data ready for pay and benefits.', icon: ClipboardList },
]

function FeatureCard({ icon: Icon, title, body }: (typeof featureCards)[number]) {
  return (
    <article className="lp-feature-card">
      <span className="lp-feature-ico"><Icon size={18} /></span>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  )
}

export function LandingPage() {
  const [sent, setSent] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mobile = window.matchMedia('(max-width: 960px)').matches
    if (reduce || mobile) return

    const hero = heroRef.current
    const bg = bgRef.current
    if (!hero || !bg) return

    function onMove(e: globalThis.MouseEvent) {
      const rect = hero!.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * 5
      bg!.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.03)`
    }

    function onLeave() {
      bg!.style.transform = 'translate3d(0, 0, 0) scale(1)'
    }

    hero.addEventListener('mousemove', onMove)
    hero.addEventListener('mouseleave', onLeave)
    return () => {
      hero.removeEventListener('mousemove', onMove)
      hero.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  function onContact(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSent(true)
  }

  const marqueeCards = [...featureCards, ...featureCards]

  return (
    <div className="lp">
      <header className="lp-nav">
        <Link to="/" className="lp-logo">
          <span className="lp-logo-mark" aria-hidden><Users size={15} /></span>
          <span>Aurelia HR</span>
        </Link>
        <div className="lp-nav-actions">
          <span className="lp-nav-search" aria-hidden><Search size={17} /></span>
          <Link to="/login" className="lp-btn lp-btn-ghost lp-btn-sm">Login</Link>
          <Link to="/login" className="lp-btn lp-btn-brown lp-btn-sm">Sign Up</Link>
        </div>
      </header>

      <section className="lp-hero" id="top" ref={heroRef}>
        <div className="lp-hero-bg" aria-hidden ref={bgRef}>
          <img
            src="/landing-hero-bg.jpg?v=african-hd"
            alt=""
            width={1280}
            height={720}
            decoding="async"
            fetchPriority="high"
          />
        </div>
        <div className="lp-hero-overlay" aria-hidden />
        <div className="lp-hero-text-glow" aria-hidden />

        <div className="lp-hero-grid">
          <div className="lp-hero-copy">
            <p className="lp-eyebrow lp-anim lp-anim-1">
              <span className="lp-eyebrow-line" aria-hidden />
              Human Resource Management System
            </p>
            <h1 className="lp-anim lp-anim-2">
              Empowering People.<br />
              <span className="lp-hero-accent">Simplifying HR.</span>
            </h1>
            <p className="lp-lede lp-anim lp-anim-3">
              A smarter way to manage employees, attendance, performance and everyday
              human resource operations — calm, clear, and built for modern teams.
            </p>
            <div className="lp-hero-ctas lp-anim lp-anim-4">
              <Link to="/login" className="lp-btn lp-btn-brown">
                Get Started <ArrowRight size={16} aria-hidden />
              </Link>
              <Link to="/login" className="lp-btn lp-btn-ghost-light">
                Sign Up
              </Link>
            </div>
          </div>
        </div>

        <div className="lp-marquee" id="features" aria-label="HR features">
          <div className="lp-marquee-track">
            {marqueeCards.map((card, i) => (
              <FeatureCard key={`${card.title}-${i}`} {...card} />
            ))}
          </div>
        </div>
      </section>

      <section className="lp-about" id="about">
        <div className="lp-about-media">
          <div className="lp-about-accent" aria-hidden />
          <img src="/about-hr.jpg" alt="Managing HR work on a laptop" className="lp-about-photo" />
          <aside className="lp-float">
            <span className="lp-float-ico"><CheckCircle2 size={15} /></span>
            <div>
              <strong>Better HR</strong>
              <small>Better business</small>
            </div>
          </aside>
        </div>
        <div className="lp-about-copy">
          <p className="lp-eyebrow">Our solution</p>
          <h2>Efficient HR management for modern businesses</h2>
          <p className="lp-lede">
            Aurelia unifies employee records, attendance, leave, payroll readiness, and
            workforce insights so people operations feel organised every day.
          </p>
          <ul className="lp-check-grid">
            {checklist.map((item) => (
              <li key={item}>
                <CheckCircle2 size={16} aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <Link to="/login" className="lp-btn lp-btn-outline">
            Learn More <ArrowRight size={15} aria-hidden />
          </Link>
        </div>
      </section>

      <section className="lp-solutions" id="solutions">
        <div className="lp-solutions-inner">
          <div className="lp-solutions-head">
            <div>
              <p className="lp-eyebrow">Our solutions</p>
              <h2>Our HR Solutions</h2>
            </div>
            <p>
              Practical tools for workforce management — from employee records and leave
              to performance, payroll readiness, and clear HR analytics.
            </p>
          </div>
          <div className="lp-sol-grid">
            {solutions.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title} className="lp-sol-card">
                  <div className="lp-sol-media">
                    <img src={item.image} alt="" style={{ objectPosition: item.pos }} />
                    <span className="lp-sol-ico"><Icon size={16} /></span>
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                  <Link to="/login" className="lp-link">
                    Learn More <ArrowRight size={14} aria-hidden />
                  </Link>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="lp-process" id="process">
        <div className="lp-center-head">
          <p className="lp-eyebrow">Our process</p>
          <h2>How It Works</h2>
        </div>
        <div className="lp-steps">
          {steps.map((step, i) => {
            const Icon = step.icon
            return (
              <div key={step.title} className="lp-step">
                {i > 0 ? <span className="lp-step-dash" aria-hidden /> : null}
                <div className="lp-step-ico"><Icon size={22} /></div>
                <h3>{step.n}. {step.title}</h3>
                <p>{step.body}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="lp-contact" id="contact">
        <div className="lp-contact-grid">
          <div className="lp-contact-visual">
            <img src="/contact-team.jpg" alt="Professionals collaborating in the workplace" />
            <div className="lp-contact-intro">
              <h2>Schedule your free HR consultation</h2>
              <p>
                Tell us about your workforce needs and explore how Aurelia can simplify
                employee management, attendance, leave, and everyday HR work.
              </p>
            </div>
          </div>

          <form className="lp-form" onSubmit={onContact}>
            {sent ? (
              <div className="lp-form-done">
                <CheckCircle2 size={24} />
                <p>Thank you. Our team will be in touch shortly.</p>
              </div>
            ) : (
              <>
                <div className="lp-form-row">
                  <input name="name" className="lp-field" placeholder="Name" required />
                  <input name="email" type="email" className="lp-field" placeholder="Email" required />
                </div>
                <div className="lp-form-row">
                  <input name="phone" className="lp-field" placeholder="Phone" />
                  <input name="company" className="lp-field" placeholder="Company" />
                </div>
                <textarea name="message" className="lp-field lp-area" rows={4} placeholder="Message" required />
                <button type="submit" className="lp-btn lp-btn-bronze lp-btn-block">
                  Send Message <ArrowRight size={16} aria-hidden />
                </button>
              </>
            )}
          </form>
        </div>

        <footer className="lp-foot">
          <span>© {new Date().getFullYear()} Aurelia People · ZamTech Solutions Ltd</span>
          <Link to="/login">Sign in to your workspace</Link>
        </footer>
      </section>
    </div>
  )
}
