import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CalendarCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Search,
  Settings,
  Target,
  Users,
  Wallet,
  BarChart3,
  X,
} from 'lucide-react'
import { useStore } from '../store/Store'
import { Avatar, Button } from './ui'
import { fullName } from '../types'
import { relativeTime } from '../lib/format'
import type { Role } from '../types'

const NAV: { to: string; label: string; icon: typeof Users; roles: Role[] }[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'manager', 'employee'] },
  { to: '/app/employees', label: 'Employees', icon: Users, roles: ['admin', 'manager'] },
  { to: '/app/departments', label: 'Departments', icon: Building2, roles: ['admin'] },
  { to: '/app/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['admin', 'manager', 'employee'] },
  { to: '/app/leave', label: 'Leave', icon: ClipboardList, roles: ['admin', 'manager', 'employee'] },
  { to: '/app/payroll', label: 'Payroll', icon: Wallet, roles: ['admin', 'employee'] },
  { to: '/app/recruitment', label: 'Recruitment', icon: Briefcase, roles: ['admin'] },
  { to: '/app/performance', label: 'Performance', icon: Target, roles: ['admin', 'manager', 'employee'] },
  { to: '/app/training', label: 'Training', icon: BookOpen, roles: ['admin', 'manager', 'employee'] },
  { to: '/app/documents', label: 'Documents', icon: FileText, roles: ['admin', 'manager', 'employee'] },
  { to: '/app/announcements', label: 'Announcements', icon: Megaphone, roles: ['admin', 'manager', 'employee'] },
  { to: '/app/tasks', label: 'Tasks', icon: ClipboardList, roles: ['admin', 'manager', 'employee'] },
  { to: '/app/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'manager'] },
  { to: '/app/settings', label: 'Settings', icon: Settings, roles: ['admin', 'manager', 'employee'] },
]

function notificationPath(type: string): string {
  switch (type) {
    case 'leave':
      return '/app/leave'
    case 'payroll':
      return '/app/payroll'
    case 'recruitment':
      return '/app/recruitment'
    case 'announcement':
      return '/app/announcements'
    case 'training':
      return '/app/training'
    case 'performance':
      return '/app/performance'
    case 'task':
      return '/app/tasks'
    case 'employee':
      return '/app/employees'
    default:
      return '/app'
  }
}

export function AppLayout() {
  const { currentUser, state, logout, markNotificationRead, markAllRead } = useStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState(false)
  const [q, setQ] = useState('')

  const items = NAV.filter((n) => currentUser && n.roles.includes(currentUser.role))
  const myNotes = state.notifications.filter((n) => n.userId === currentUser?.id).slice(0, 8)
  const unread = myNotes.filter((n) => !n.read).length

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
          {items.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/app'}
                onClick={() => setOpen(false)}
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
        <div className="sidebar-foot">
          <Link to="/app/settings" className="user-chip" onClick={() => setOpen(false)}>
            <Avatar employee={currentUser} />
            <div className="truncate">
              <strong>{fullName(currentUser)}</strong>
              <small>{currentUser.position}</small>
            </div>
          </Link>
          <Button
            variant="ghost"
            onClick={() => {
              logout()
              navigate('/')
            }}
          >
            <LogOut size={16} /> Sign out
          </Button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <button className="btn-icon menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={18} />
          </button>
          <div className="search">
            <Search size={16} />
            <input
              placeholder="Search people, records…"
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
              <button className="btn-icon" aria-label="Notifications" onClick={() => setNotes((v) => !v)}>
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
            <Avatar employee={currentUser} />
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
  const { currentUser } = useStore()
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }
  if (roles && !roles.includes(currentUser.role)) {
    return (
      <div className="card empty">
        <h3>This area is reserved</h3>
        <p>Your role does not include access to this module.</p>
      </div>
    )
  }
  return <>{children ?? <Outlet />}</>
}
