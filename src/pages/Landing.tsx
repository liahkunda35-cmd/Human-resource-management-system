import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useInView, useReducedMotion } from 'framer-motion'
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

const footerQuickLinks = [
  { label: 'Home', href: '#top' },
  { label: 'About', href: '#about' },
  { label: 'Features', href: '#features' },
  { label: 'Services', href: '#solutions' },
  { label: 'Contact', href: '#contact' },
]

const footerHrLinks = [
  { label: 'Employee Management', href: '#solutions' },
  { label: 'Attendance', href: '#features' },
  { label: 'Leave Management', href: '#features' },
  { label: 'Payroll', href: '#solutions' },
  { label: 'Reports', href: '/login' },
]

const footerSupportLinks = [
  { label: 'Help Center', href: '#contact' },
  { label: 'Contact Support', href: '#contact' },
  { label: 'Privacy Policy', href: '#contact' },
  { label: 'Terms & Conditions', href: '#contact' },
]

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

const solAssemble = [
  { x: -120, y: 40, rotate: -8 },
  { x: 120, y: -30, rotate: 7 },
  { x: -70, y: 80, rotate: 5 },
  { x: 100, y: 50, rotate: -6 },
]

const solDelays = [0.18, 0.42, 0.66, 0.9]

function SolutionsGrid({
  reduceMotion,
  narrow,
}: {
  reduceMotion: boolean | null
  narrow: boolean
}) {
  const gridRef = useRef<HTMLDivElement>(null)
  const inView = useInView(gridRef, { amount: 0.2, once: false })

  return (
    <div className="lp-sol-grid" ref={gridRef}>
      {solutions.map((item, index) => {
        const Icon = item.icon
        const scatter = solAssemble[index] ?? solAssemble[0]
        const delay = solDelays[index] ?? 0.1
        const factor = narrow ? 0.35 : 1
        const hidden = {
          opacity: 0,
          scale: 0.85,
          x: scatter.x * factor,
          y: scatter.y * factor,
          rotate: scatter.rotate * (narrow ? 0.5 : 1),
        }
        const visible = {
          opacity: 1,
          scale: 1,
          x: 0,
          y: 0,
          rotate: 0,
        }
        return (
          <motion.article
            key={item.title}
            className="lp-sol-card"
            initial={reduceMotion ? false : hidden}
            animate={reduceMotion ? visible : inView ? visible : hidden}
            transition={
              reduceMotion
                ? { duration: 0 }
                : {
                    type: 'spring',
                    stiffness: 55,
                    damping: 18,
                    delay: inView ? delay : 0,
                  }
            }
            whileHover={
              reduceMotion
                ? undefined
                : {
                    y: -8,
                    transition: { type: 'spring', stiffness: 300, damping: 20 },
                  }
            }
          >
            <div className="lp-sol-media">
              <img src={item.image} alt="" style={{ objectPosition: item.pos }} />
              <span className="lp-sol-ico"><Icon size={16} /></span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            <Link to="/login" className="lp-link">
              Learn More <ArrowRight size={14} aria-hidden />
            </Link>
          </motion.article>
        )
      })}
    </div>
  )
}

export function LandingPage() {
  const [narrow, setNarrow] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const bgRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const sync = () => setNarrow(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

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
          <Link to="/login" className="lp-btn lp-btn-brown lp-btn-sm">Sign In</Link>
        </div>
      </header>

      <section className="lp-hero" id="top" ref={heroRef}>
        <div className="lp-hero-bg" aria-hidden ref={bgRef}>
          <img
            src="/landing-hero-bg.jpg?v=sharp"
            alt=""
            width={1280}
            height={720}
            sizes="100vw"
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
              <span className="lp-hero-title-main">Empowering People.</span>
              <span className="lp-hero-title-sub">
                Simplifying <span className="lp-gold-word">HR</span>.
              </span>
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
                Sign In
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
          <SolutionsGrid reduceMotion={reduceMotion} narrow={narrow} />
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

      <footer className="lp-footer" id="contact">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <Link to="/" className="lp-logo lp-footer-logo">
              <span className="lp-logo-mark" aria-hidden><Users size={15} /></span>
              <span>Aurelia HR</span>
            </Link>
            <p className="lp-footer-tagline">
              Modern HR management made simple.
              Manage people, payroll, attendance and workforce operations from one platform.
            </p>
          </div>

          <div className="lp-footer-cols">
            <div className="lp-footer-col">
              <h3>Quick Links</h3>
              <ul>
                {footerQuickLinks.map((item) => (
                  <li key={item.label}>
                    <a href={item.href}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="lp-footer-col">
              <h3>HR Management</h3>
              <ul>
                {footerHrLinks.map((item) => (
                  <li key={item.label}>
                    {item.href.startsWith('/') ? (
                      <Link to={item.href}>{item.label}</Link>
                    ) : (
                      <a href={item.href}>{item.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lp-footer-col">
              <h3>Support</h3>
              <ul>
                {footerSupportLinks.map((item) => (
                  <li key={item.label}>
                    <a href={item.href}>{item.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <p>© {new Date().getFullYear()} HR Management System. All rights reserved.</p>
          <Link to="/login" className="lp-footer-signin">Sign in to your workspace</Link>
        </div>
      </footer>
    </div>
  )
}
