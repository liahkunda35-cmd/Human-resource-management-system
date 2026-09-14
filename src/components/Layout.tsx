import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Briefcase,
  Building2,
  CalendarCheck,
  ChevronDown,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  Target,
  UserCircle,
  Users,
  Wallet,
  BarChart3,
  X,
} from 'lucide-react'
import { useStore } from '../store/Store'
import { Avatar } from './ui'
import { fullName, roleLabel } from '../types'
import { relativeTime } from '../lib/format'
import type { Role } from '../types'

const NAV: {
  to: string
  label: string
  icon: typeof Users
  roles: Role[]
  group: 'Overview' | 'People' | 'Time' | 'Talent' | 'Insight' | 'Admin'
  badgeKey?: 'internship'
}[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'manager', 'employee'], group: 'Overview' },
  { to: '/app/profile', label: 'My Profile', icon: UserCircle, roles: ['employee'], group: 'Overview' },
  { to: '/app/employees', label: 'Employee Management', icon: Users, roles: ['super_admin', 'admin', 'manager'], group: 'People' },
  { to: '/app/departments', label: 'Departments', icon: Building2, roles: ['super_admin', 'admin'], group: 'People' },
  { to: '/app/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['super_admin', 'admin', 'manager', 'employee'], group: 'Time' },
  { to: '/app/leave', label: 'Leave Management', icon: ClipboardList, roles: ['super_admin', 'admin', 'manager', 'employee'], group: 'Time' },
  { to: '/app/payslips', label: 'My Payslips', icon: FileText, roles: ['employee'], group: 'Time' },
  { to: '/app/payroll', label: 'Payroll', icon: Wallet, roles: ['super_admin', 'admin', 'manager'], group: 'Talent' },
  { to: '/app/recruitment', label: 'Recruitment', icon: Briefcase, roles: ['super_admin', 'admin', 'manager'], group: 'Talent' },
  { to: '/app/performance', label: 'Performance', icon: Target, roles: ['super_admin', 'admin', 'manager'], group: 'Talent' },
  { to: '/app/internships', label: 'Internship Management', icon: GraduationCap, roles: ['super_admin', 'admin', 'manager', 'employee'], group: 'Talent', badgeKey: 'internship' },
  { to: '/app/reports', label: 'Reports', icon: BarChart3, roles: ['super_admin', 'admin', 'manager'], group: 'Insight' },
  { to: '/app/notifications', label: 'Notifications', icon: Bell, roles: ['employee'], group: 'Insight' },
  { to: '/app/admins', label: 'Admin Management', icon: Shield, roles: ['super_admin'], group: 'Admin' },
  { to: '/app/users', label: 'Employee Accounts', icon: Shield, roles: ['admin'], group: 'Admin' },
  { to: '/app/settings', label: 'Settings', icon: Settings, roles: ['super_admin', 'admin', 'manager'], group: 'Admin' },
]

const NAV_GROUPS = ['Overview', 'People', 'Time', 'Talent', 'Insight', 'Admin'] as const

function notificationPath(type: string): string {
  switch (type) {
    case 'leave':
      return '/app/leave'
    case 'attendance':
      return '/app/attendance'
    case 'employee':
      return '/app/employees'
    case 'internship':
      return '/app/internships'
    default:
      return '/app'
  }
}

export function AppLayout() {
  const { currentUser, state, logout, markNotificationRead, markAllRead } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [q, setQ] = useState('')

  const items = NAV.filter((n) => currentUser && n.roles.includes(currentUser.role))
  const grouped = NAV_GROUPS
    .map((group) => ({ group, items: items.filter((n) => n.group === group) }))
    .filter((g) => g.items.length > 0)
  const myNotes = state.notifications.filter((n) => n.userId === currentUser?.id).slice(0, 8)
  const unread = myNotes.filter((n) => !n.read).length
  const newInternshipApps =
    currentUser && (currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'super_admin')
      ? state.internshipApplications.filter((a) => a.status === 'Pending').length
      : 0

  const activeNav = useMemo(() => {
    const exact = items.find((n) => n.to === location.pathname)
    if (exact) return exact
    return [...items]
      .filter((n) => n.to !== '/app' && location.pathname.startsWith(n.to))
      .sort((a, b) => b.to.length - a.to.length)[0] ?? items.find((n) => n.to === '/app')
  }, [items, location.pathname])

  const TitleIcon = activeNav?.icon ?? LayoutDashboard
  const pageTitle = activeNav?.label ?? 'Dashboard'

  const searchHits = useMemo(() => {
    if (q.trim().length < 2) return []
    const s = q.toLowerCase()
    return state.employees
      .filter((e) => `${e.firstName} ${e.lastName} ${e.email} ${e.employeeId}`.toLowerCase().includes(s))
      .slice(0, 6)
  }, [q, state.employees])

  useEffect(() => {
    document.body.dataset.theme = state.settings.theme
  }, [state.settings.theme])

  if (!currentUser) return null

  return (
    <div className="shell">
      {open ? <div className="sidebar-backdrop" onClick={() => setOpen(false)} /> : null}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-glow" aria-hidden />
        <div className="sidebar-head">
          <Link to="/app" className="brand" onClick={() => setOpen(false)}>
            <div className="brand-mark">A</div>
            <div>
              <div className="brand-name">Aurelia</div>
              <div className="brand-sub">People</div>
            </div>
          </Link>
          <button className="btn-icon sidebar-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={16} />
          </button>
        </div>

        <nav className="nav">
          {grouped.map(({ group, items: links }) => (
            <div key={group} className="nav-group">
              <div className="nav-group-label">{group}</div>
              {links.map((item) => {
                const Icon = item.icon
                const badge =
                  item.badgeKey === 'internship' && newInternshipApps > 0 ? newInternshipApps : 0
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/app'}
                    onClick={() => setOpen(false)}
                  >
                    <span className="nav-ico"><Icon size={16} /></span>
                    <span className="nav-label">
                      {item.to === '/app/leave' && currentUser.role === 'employee'
                        ? 'My Leave'
                        : item.to === '/app/internships' && currentUser.role === 'employee'
                          ? 'Internships'
                          : item.to === '/app/attendance' && currentUser.role === 'employee'
                            ? 'My Attendance'
                            : item.label}
                    </span>
                    {badge ? <span className="nav-badge" aria-label={`${badge} new`}>{badge}</span> : null}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user">
            <Avatar employee={currentUser} size="sm" />
            <div className="sidebar-user-meta">
              <strong>{fullName(currentUser)}</strong>
              <small>{roleLabel(currentUser.role)}</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn-icon menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <div className="topbar-title">
            <span className="topbar-title-icon"><TitleIcon size={18} /></span>
            <div className="topbar-title-text">
              <span>{pageTitle}</span>
              <small>{state.settings.companyName}</small>
            </div>
          </div>
          <div className="search">
            <Search size={16} />
            <input
              placeholder="Search people…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {searchHits.length > 0 && (
              <div className="dropdown" style={{ left: 0, right: 'auto', width: '100%', top: 46 }}>
                {searchHits.map((e) => (
                  <Link
                    key={e.id}
                    className="n-item"
                    to={`/app/employees/${e.id}`}
                    onClick={() => setQ('')}
                  >
                    {fullName(e)}
                    <small> · {e.position}</small>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="top-actions">
            <div className="bell">
              <button
                className="btn-icon topbar-action"
                aria-label="Notifications"
                onClick={() => {
                  setNotes((v) => !v)
                  setProfileOpen(false)
                }}
              >
                <Bell size={18} />
                {unread > 0 ? <span className="dot" /> : null}
              </button>
              {notes ? (
                <div className="dropdown">
                  <div className="dropdown-h">
                    Notifications
                    <button className="btn btn-ghost btn-sm" type="button" onClick={() => markAllRead(currentUser.id)}>
                      Mark all read
                    </button>
                  </div>
                  {myNotes.length === 0 ? (
                    <div className="empty">You are all caught up.</div>
                  ) : (
                    myNotes.map((n) => (
                      <button
                        key={n.id}
                        className={`n-item ${n.read ? '' : 'unread'}`}
                        type="button"
                        onClick={() => {
                          markNotificationRead(n.id)
                          setNotes(false)
                          navigate(notificationPath(n.type))
                        }}
                        style={{ width: '100%', textAlign: 'left', background: 'none', border: 0, cursor: 'pointer' }}
                      >
                        <strong>{n.title}</strong>
                        <div>{n.body}</div>
                        <small>{relativeTime(n.createdAt)}</small>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
            <div className={`topbar-profile ${profileOpen ? 'open' : ''}`}>
              <button
                type="button"
                className="topbar-user"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                onClick={() => {
                  setProfileOpen((v) => !v)
                  setNotes(false)
                }}
              >
                <Avatar employee={currentUser} />
                <div className="topbar-user-meta">
                  <strong>{fullName(currentUser)}</strong>
                  <small>{currentUser.email}</small>
                </div>
                <ChevronDown size={16} className="topbar-user-caret" />
              </button>
              {profileOpen ? (
                <>
                  <button
                    type="button"
                    className="topbar-profile-scrim"
                    aria-label="Close profile menu"
                    onClick={() => setProfileOpen(false)}
                  />
                  <div className="topbar-profile-menu" role="menu">
                    <div className="topbar-profile-head">
                      <Avatar employee={currentUser} />
                      <div>
                        <strong>{fullName(currentUser)}</strong>
                        <small>{currentUser.position}</small>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      className="danger"
                      onClick={() => {
                        setProfileOpen(false)
                        logout()
                        navigate('/')
                      }}
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </header>
        <div className="page">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export function RequireAuth({ children, roles }: { children?: ReactNode; roles?: Role[] }) {
  const { currentUser, authLoading } = useStore()
  if (authLoading) {
    return (
      <div className="card empty" style={{ margin: 40 }}>
        <h3>Loading session…</h3>
      </div>
    )
  }
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }
  if (roles && !roles.includes(currentUser.role)) {
    return (
      <div className="card empty">
        <h3>Access Denied</h3>
        <p>Your role does not include access to this module. You have been kept on an authorised area.</p>
        <p style={{ marginTop: 12 }}>
          <Link to="/app">Return to your dashboard</Link>
        </p>
      </div>
    )
  }
  return <>{children ?? <Outlet />}</>
}
