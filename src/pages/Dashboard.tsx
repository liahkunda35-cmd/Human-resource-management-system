import type { ReactElement, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from 'recharts'
import {
  CalendarCheck,
  Leaf,
  UserPlus,
  Users,
  Wallet,
  ClipboardList,
} from 'lucide-react'
import { useStore } from '../store/Store'
import { Avatar, Badge, Button, statusTone } from '../components/ui'
import { formatDate, greeting, money, relativeTime, todayISO } from '../lib/format'
import { fullName } from '../types'
import { AttendanceCalendar, ClockWidget } from '../components/ClockWidget'

const COLORS = ['#c4a574', '#2a2622', '#7d8b76', '#b57a6b', '#8a8278']

export function DashboardPage() {
  const { currentUser } = useStore()
  if (!currentUser) return null
  if (currentUser.role === 'employee') return <EmployeeHome />
  if (currentUser.role === 'manager') return <ManagerHome />
  return <HrHome />
}

function HrHome() {
  const { state } = useStore()
  const today = todayISO()
  const active = state.employees.filter((e) => e.status !== 'Inactive')
  const attToday = state.attendance.filter((a) => a.date === today)
  const present = attToday.filter((a) => ['Present', 'Late', 'Remote'].includes(a.status)).length
  const onLeave = active.filter((e) => e.status === 'On Leave').length
  const joinedThisYear = active.filter((e) => e.dateJoined.startsWith('2026') || e.dateJoined.startsWith('2025-11') || e.dateJoined.startsWith('2025-12') || e.dateJoined.startsWith('2024')).length
  const newHires = active.filter((e) => e.dateJoined >= '2025-11-01').length
  const pendingLeave = state.leaveRequests.filter((l) => l.status === 'Pending').length
  const latestPeriod = [...new Set(state.payrolls.map((p) => p.period))].sort().reverse()[0]
  const latestPayroll = state.payrolls.filter((p) => p.period === latestPeriod)
  const payrollTotal = latestPayroll.reduce((s, p) => s + p.net, 0)

  const growth = ['2021', '2022', '2023', '2024', '2025', '2026'].map((y) => ({
    year: y,
    people: state.employees.filter((e) => e.dateJoined.slice(0, 4) <= y && e.status !== 'Inactive').length,
  }))

  const deptData = state.departments.map((d) => ({
    name: d.name.split(' ')[0] ?? d.name,
    value: state.employees.filter((e) => e.departmentId === d.id && e.status !== 'Inactive').length,
  }))

  const leaveStats = ['Annual Leave', 'Sick Leave', 'Emergency Leave', 'Unpaid Leave'].map((t) => ({
    name: t.replace(' Leave', ''),
    count: state.leaveRequests.filter((l) => l.type === t).length,
  }))

  const trend = lastWeekdays(10).map((date) => {
    const rows = state.attendance.filter((a) => a.date === date)
    return {
      date: date.slice(5),
      present: rows.filter((a) => ['Present', 'Remote'].includes(a.status)).length,
      late: rows.filter((a) => a.status === 'Late').length,
    }
  })

  const pending = [
    ...state.leaveRequests.filter((l) => l.status === 'Pending').map((l) => ({
      id: l.id,
      text: `${fullName(state.employees.find((e) => e.id === l.employeeId)!)} · ${l.type}`,
      to: '/app/leave',
    })),
    ...state.applications.filter((a) => a.stage === 'Applied' || a.stage === 'Screening').slice(0, 3).map((a) => ({
      id: a.id,
      text: `${a.candidateName} awaiting screening`,
      to: '/app/recruitment',
    })),
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">{state.settings.companyName} · People operations</div>
          <h1 className="welcome">{greeting()}, HR Manager 👋</h1>
          <p className="lede">A composed view of the organisation this {formatDate(new Date(), true)}.</p>
        </div>
        <Link to="/app/employees" state={{ openAdd: true }}><Button variant="gold">Add employee</Button></Link>
      </div>
      <div className="grid g-6">
        <Stat icon={<Users size={16} />} label="Total employees" value={active.length} hint="Active records" />
        <Stat icon={<CalendarCheck size={16} />} label="Present today" value={present} hint={`${attToday.length} marked`} />
        <Stat icon={<Leaf size={16} />} label="On leave" value={onLeave} hint="Approved absence" />
        <Stat icon={<UserPlus size={16} />} label="New employees" value={newHires} hint="Recent joiners" />
        <Stat icon={<ClipboardList size={16} />} label="Pending leave" value={pendingLeave} hint="Needs a decision" />
        <Stat icon={<Wallet size={16} />} label="Payroll summary" value={money(payrollTotal, state.settings.currency)} hint={latestPeriod ? `${latestPeriod} net` : 'No run yet'} />
      </div>
      <div className="grid g-2">
        <div className="card">
          <div className="card-head"><h3>Employee growth</h3></div>
          <ChartBox>
            <AreaChart data={growth}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c4a574" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#c4a574" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#eee6d8" vertical={false} />
              <XAxis dataKey="year" stroke="#8a8278" fontSize={12} />
              <YAxis stroke="#8a8278" fontSize={12} allowDecimals={false} />
              <Tooltip {...tip} />
              <Area type="monotone" dataKey="people" stroke="#a8844e" fill="url(#g)" />
            </AreaChart>
          </ChartBox>
        </div>
        <div className="card">
          <div className="card-head"><h3>Attendance trends</h3></div>
          <ChartBox>
            <BarChart data={trend}>
              <CartesianGrid stroke="#eee6d8" vertical={false} />
              <XAxis dataKey="date" stroke="#8a8278" fontSize={11} />
              <YAxis stroke="#8a8278" fontSize={12} allowDecimals={false} />
              <Tooltip {...tip} />
              <Bar dataKey="present" fill="#7d8b76" radius={[6, 6, 0, 0]} />
              <Bar dataKey="late" fill="#c4a574" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartBox>
        </div>
        <div className="card">
          <div className="card-head"><h3>Department distribution</h3></div>
          <ChartBox>
            <PieChart>
              <Pie data={deptData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={90} paddingAngle={3}>
                {deptData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip {...tip} />
            </PieChart>
          </ChartBox>
        </div>
        <div className="card">
          <div className="card-head"><h3>Leave statistics</h3></div>
          <ChartBox>
            <BarChart data={leaveStats} layout="vertical">
              <CartesianGrid stroke="#eee6d8" horizontal={false} />
              <XAxis type="number" stroke="#8a8278" fontSize={12} allowDecimals={false} />
              <YAxis type="category" dataKey="name" stroke="#8a8278" fontSize={12} width={80} />
              <Tooltip {...tip} />
              <Bar dataKey="count" fill="#c4a574" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ChartBox>
        </div>
      </div>
      <div className="grid g-2">
        <div className="card">
          <div className="card-head"><h3>Recent activities</h3></div>
          {state.activities.slice(0, 6).map((a) => (
            <div key={a.id} className="person" style={{ padding: '10px 0', borderBottom: '1px solid #f0e8dc' }}>
              <div className="stat-icon" style={{ margin: 0 }} />
              <div>
                <strong>{a.text}</strong>
                <span>{relativeTime(a.time)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-head"><h3>Pending actions</h3></div>
          {pending.length === 0 ? <p className="lede">Nothing waiting. Enjoy the calm.</p> : pending.map((p) => (
            <Link key={p.id} to={p.to} className="person" style={{ padding: '10px 0', borderBottom: '1px solid #f0e8dc', textDecoration: 'none' }}>
              <Badge tone="warn">Open</Badge>
              <strong>{p.text}</strong>
            </Link>
          ))}
          <div style={{ marginTop: 12, color: 'var(--muted)', fontSize: 13 }}>{joinedThisYear} people have joined since 2024.</div>
        </div>
      </div>
    </>
  )
}

function ManagerHome() {
  const { currentUser, state } = useStore()
  if (!currentUser) return null
  const team = state.employees.filter((e) => e.managerId === currentUser.id || (e.departmentId === currentUser.departmentId && e.id !== currentUser.id))
  const today = todayISO()
  const present = team.filter((e) => state.attendance.some((a) => a.employeeId === e.id && a.date === today && ['Present', 'Late', 'Remote'].includes(a.status))).length
  const pending = state.leaveRequests.filter((l) => l.status === 'Pending' && team.some((t) => t.id === l.employeeId))
  const avg = averageRating(state.reviews.filter((r) => team.some((t) => t.id === r.employeeId)))

  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">Team workspace</div>
          <h1 className="welcome">{greeting()}, {currentUser.firstName} 👋</h1>
          <p className="lede">Your department at a glance — presence, leave, and performance.</p>
        </div>
        <Link to="/app/tasks"><Button variant="gold">Assign task</Button></Link>
      </div>
      <div className="grid g-4">
        <Stat label="Team members" value={team.length} />
        <Stat label="Present today" value={present} />
        <Stat label="Leave to review" value={pending.length} />
        <Stat label="Avg. rating" value={avg.toFixed(1)} />
      </div>
      <div className="grid g-2">
        <div className="card">
          <div className="card-head"><h3>Team</h3><Link to="/app/employees">View all</Link></div>
          {team.map((e) => (
            <Link key={e.id} to={`/app/employees/${e.id}`} className="person" style={{ padding: '8px 0', textDecoration: 'none' }}>
              <Avatar employee={e} />
              <div>
                <strong>{fullName(e)}</strong>
                <span>{e.position}</span>
              </div>
              <Badge tone={statusTone(e.status)}>{e.status}</Badge>
            </Link>
          ))}
        </div>
        <div className="card">
          <div className="card-head"><h3>Pending leave</h3></div>
          {pending.length === 0 ? <p className="lede">No requests waiting.</p> : pending.map((l) => {
            const e = state.employees.find((x) => x.id === l.employeeId)!
            return (
              <div key={l.id} className="person" style={{ padding: '8px 0' }}>
                <Avatar employee={e} />
                <div>
                  <strong>{fullName(e)}</strong>
                  <span>{l.type} · {formatDate(l.startDate)}</span>
                </div>
                <Link to="/app/leave"><Button size="sm" variant="ghost">Review</Button></Link>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function EmployeeHome() {
  const { currentUser, state } = useStore()
  if (!currentUser) return null
  const today = todayISO()
  const att = state.attendance.find((a) => a.employeeId === currentUser.id && a.date === today)
  const bal = state.leaveBalances.find((b) => b.employeeId === currentUser.id)
  const upcoming = state.leaveRequests.find((l) => l.employeeId === currentUser.id && l.status === 'Approved' && l.endDate >= today)
  const tasks = state.tasks.filter((t) => t.assigneeId === currentUser.id && t.status !== 'Done')
  const pay = state.payrolls.filter((p) => p.employeeId === currentUser.id).sort((a, b) => b.period.localeCompare(a.period))[0]
  const review = state.reviews.filter((r) => r.employeeId === currentUser.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

  return (
    <>
      <div className="page-head">
        <div>
          <div className="kicker">Your day</div>
          <h1 className="welcome">{greeting()}, {currentUser.firstName} 👋</h1>
          <p className="lede">Clock, leave, pay, and the work on your plate — in one place.</p>
        </div>
      </div>
      <ClockWidget />
      <div className="grid g-4">
        <Stat label="Today" value={att?.status ?? 'Not marked'} hint={att?.clockIn ? `In ${att.clockIn}` : 'Clock in when you begin'} />
        <Stat label="Annual leave" value={bal?.annual ?? 0} hint="Days remaining" />
        <Stat label="Performance" value={review ? review.overall.toFixed(1) : '—'} hint={review?.period ?? 'No review yet'} />
        <Stat label="Latest payslip" value={pay ? money(pay.net, state.settings.currency) : '—'} hint={pay?.period ?? ''} />
      </div>
      <div className="grid g-2">
        <div className="card">
          <div className="card-head"><h3>Personal information</h3><Link to="/app/settings">Edit</Link></div>
          <dl className="dl">
            <dt>Name</dt><dd>{fullName(currentUser)}</dd>
            <dt>Role</dt><dd>{currentUser.position}</dd>
            <dt>Email</dt><dd>{currentUser.email}</dd>
            <dt>Phone</dt><dd>{currentUser.phone}</dd>
            <dt>Department</dt><dd>{state.departments.find((d) => d.id === currentUser.departmentId)?.name}</dd>
          </dl>
        </div>
        <div className="card">
          <div className="card-head"><h3>Attendance calendar</h3></div>
          <AttendanceCalendar employeeId={currentUser.id} />
        </div>
      </div>
      <div className="grid g-2">
        <div className="card">
          <div className="card-head"><h3>Current tasks</h3><Link to="/app/tasks">All</Link></div>
          {tasks.length === 0 ? <p className="lede">No open tasks.</p> : tasks.map((t) => (
            <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid #f0e8dc' }}>
              <strong>{t.title}</strong>
              <div className="lede">Due {formatDate(t.dueDate)} · {t.priority}</div>
            </div>
          ))}
          <div className="card-head" style={{ marginTop: 16 }}><h3>Next leave</h3></div>
          {upcoming ? <p>{upcoming.type} · {formatDate(upcoming.startDate)} – {formatDate(upcoming.endDate)}</p> : <p className="lede">Nothing upcoming.</p>}
        </div>
        <div className="card">
          <div className="card-head"><h3>Latest payslip</h3><Link to="/app/payroll">Open</Link></div>
          {pay ? (
            <dl className="dl">
              <dt>Period</dt><dd>{pay.period}</dd>
              <dt>Net</dt><dd>{money(pay.net, state.settings.currency)}</dd>
              <dt>Status</dt><dd>{pay.status}</dd>
            </dl>
          ) : <p className="lede">No payslip yet.</p>}
        </div>
      </div>
      <div className="card">
        <div className="card-head"><h3>Announcements</h3><Link to="/app/announcements">View all</Link></div>
        <div className="grid g-3">
          {state.announcements.slice(0, 3).map((a) => (
            <article key={a.id}>
              <div className="kicker">{a.category}</div>
              <h3>{a.title}</h3>
              <p className="lede">{a.body}</p>
            </article>
          ))}
        </div>
      </div>
    </>
  )
}

function Stat({ label, value, hint, icon }: { label: string; value: string | number; hint?: string; icon?: ReactNode }) {
  return (
    <div className="card stat">
      {icon ? <div className="stat-icon">{icon}</div> : null}
      <div className="label">{label}</div>
      <div className="value">{typeof value === 'number' && String(value).length > 6 ? value : value}</div>
      {hint ? <div className="hint">{hint}</div> : null}
    </div>
  )
}

function ChartBox({ children }: { children: ReactElement }) {
  return (
    <div style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
    </div>
  )
}

const tip = {
  contentStyle: { background: '#fffcf7', border: '1px solid #e4d9c8', borderRadius: 12, fontSize: 13 },
}

function lastWeekdays(n: number): string[] {
  const out: string[] = []
  const d = new Date()
  while (out.length < n) {
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      out.unshift(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)
    }
    d.setDate(d.getDate() - 1)
  }
  return out
}

function averageRating(reviews: { overall: number }[]): number {
  if (!reviews.length) return 0
  return reviews.reduce((s, r) => s + r.overall, 0) / reviews.length
}
