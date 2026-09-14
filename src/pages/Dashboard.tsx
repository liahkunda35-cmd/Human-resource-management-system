import { useMemo, useState, type ReactElement, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  CalendarCheck,
  ClipboardList,
  DoorOpen,
  Leaf,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useStore } from '../store/Store'
import { Avatar, Badge, Button, DataTable, RowActions, statusTone } from '../components/ui'
import { formatDate, todayISO } from '../lib/format'
import { fullName } from '../types'
import { ClockWidget } from '../components/ClockWidget'

const DEPT_COLORS = ['#c4a574', '#2a2622', '#7d8b76', '#b57a6b', '#8a8278']

export function DashboardPage() {
  const { currentUser } = useStore()
  if (!currentUser) return null
  if (currentUser.role === 'employee') return <EmployeeHome />
  if (currentUser.role === 'manager') return <ManagerHome />
  return <HrHome />
}

function HrHome() {
  const { state } = useStore()
  const navigate = useNavigate()
  const [range, setRange] = useState<'Week' | 'Month' | 'Year'>('Week')
  const [tableQ, setTableQ] = useState('')
  const today = todayISO()

  const active = state.employees.filter((e) => e.status !== 'Inactive')
  const attToday = state.attendance.filter((a) => a.date === today)
  const present = attToday.filter((a) => ['Present', 'Late', 'Remote'].includes(a.status)).length
  const onLeave = active.filter((e) => e.status === 'On Leave').length
  const pendingLeave = state.leaveRequests.filter((l) => l.status === 'Pending').length

  const chartData = useMemo(() => buildAttendanceSeries(state.attendance, range), [state.attendance, range])

  const deptData = state.departments
    .map((d) => ({
      name: d.name.split(' ')[0] ?? d.name,
      value: state.employees.filter((e) => e.departmentId === d.id && e.status !== 'Inactive').length,
    }))
    .filter((d) => d.value > 0)

  const recent = active
    .slice()
    .sort((a, b) => b.dateJoined.localeCompare(a.dateJoined))
    .filter((e) => {
      if (!tableQ.trim()) return true
      const s = tableQ.toLowerCase()
      return `${e.firstName} ${e.lastName} ${e.email}`.toLowerCase().includes(s)
    })
    .slice(0, 6)

  const topDepts = [...deptData].sort((a, b) => b.value - a.value).slice(0, 5)

  return (
    <div className="vdash">
      <div className="vdash-toolbar">
        <div className="vdash-dates">
          <input className="input" type="date" defaultValue={today} aria-label="From date" />
          <span className="vdash-dates-sep">–</span>
          <input className="input" type="date" defaultValue={today} aria-label="To date" />
        </div>
        <Button variant="gold" size="sm">Filter</Button>
      </div>

      <div className="vdash-stats">
        <StatCard icon={<Users size={20} />} value={active.length} label="Total employees" />
        <StatCard icon={<CalendarCheck size={20} />} value={present} label="Present today" />
        <StatCard icon={<Leaf size={20} />} value={onLeave} label="On leave" />
        <StatCard icon={<TrendingUp size={20} />} value={pendingLeave} label="Pending leave" />
      </div>

      <div className="vdash-charts">
        <div className="card vdash-panel">
          <div className="vdash-panel-head">
            <h3>Attendance statistic</h3>
            <div className="vdash-seg">
              {(['Week', 'Month', 'Year'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={range === r ? 'on' : ''}
                  onClick={() => setRange(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <ChartBox height={220}>
            <BarChart data={chartData} barSize={28}>
              <defs>
                <linearGradient id="vdashBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#d4b88a" />
                  <stop offset="100%" stopColor="#a8844e" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#eee6d8" vertical={false} strokeDasharray="3 6" />
              <XAxis dataKey="label" stroke="#8a8278" fontSize={11} axisLine={false} tickLine={false} />
              <YAxis stroke="#8a8278" fontSize={11} allowDecimals={false} axisLine={false} tickLine={false} width={28} />
              <Tooltip {...tip} />
              <Bar dataKey="count" fill="url(#vdashBar)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ChartBox>
        </div>

        <div className="card vdash-panel vdash-donut">
          <div className="vdash-panel-head">
            <h3>Departments</h3>
          </div>
          <div className="vdash-donut-body">
            <div className="vdash-legend">
              {deptData.slice(0, 5).map((d, i) => (
                <div key={d.name} className="vdash-legend-item">
                  <span className="vdash-dot" style={{ background: DEPT_COLORS[i % DEPT_COLORS.length] }} />
                  <span>{d.name}</span>
                </div>
              ))}
            </div>
            <ChartBox height={160}>
              <PieChart>
                <Pie data={deptData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>
                  {deptData.map((_, i) => (
                    <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip {...tip} />
              </PieChart>
            </ChartBox>
          </div>
          <WaveDecor />
        </div>
      </div>

      <div className="filters">
        <div className="search" style={{ maxWidth: 280 }}>
          <Search size={14} />
          <input
            value={tableQ}
            onChange={(e) => setTableQ(e.target.value)}
            placeholder="Search people"
            aria-label="Search recent people"
          />
        </div>
      </div>
      <DataTable empty={recent.length === 0} emptyTitle="No people" emptyBody="Employees will appear here.">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Department</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((e) => (
            <tr key={e.id}>
              <td>
                <div className="person">
                  <Avatar employee={e} size="sm" />
                  <strong style={{ color: 'var(--ink)' }}>{fullName(e)}</strong>
                </div>
              </td>
              <td>{state.departments.find((d) => d.id === e.departmentId)?.name ?? '—'}</td>
              <td><Badge tone={statusTone(e.status)}>{e.status}</Badge></td>
              <td>
                <RowActions items={[
                  { label: 'View', onClick: () => navigate(`/app/employees/${e.id}`) },
                ]} />
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
      <DataTable empty={topDepts.length === 0}>
        <thead>
          <tr>
            <th>Department</th>
            <th>People</th>
          </tr>
        </thead>
        <tbody>
          {topDepts.map((d) => (
            <tr key={d.name}>
              <td>{d.name}</td>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  )
}

function ManagerHome() {
  const { currentUser, state } = useStore()
  const navigate = useNavigate()
  const team = currentUser
    ? state.employees.filter((e) => e.managerId === currentUser.id || (e.departmentId === currentUser.departmentId && e.id !== currentUser.id))
    : []
  const today = todayISO()
  const present = team.filter((e) => state.attendance.some((a) => a.employeeId === e.id && a.date === today && ['Present', 'Late', 'Remote'].includes(a.status))).length
  const pending = state.leaveRequests.filter(
    (l) => l.status === 'Pending' || l.status === 'Requires Review' || l.status === 'Documentation Required',
  )
  const newInternApps = state.internshipApplications.filter((a) => a.status === 'Pending').length

  if (!currentUser) return null

  return (
    <div className="vdash">
      <div className="vdash-stats vdash-stats-3">
        <StatCard icon={<Users size={20} />} value={team.length} label="Team members" />
        <StatCard icon={<CalendarCheck size={20} />} value={present} label="Present today" />
        <StatCard icon={<ClipboardList size={20} />} value={pending.length} label="Leave to review" />
      </div>
      {newInternApps > 0 ? (
        <div className="card" style={{ padding: 16, marginBottom: 16, cursor: 'pointer' }} onClick={() => navigate('/app/internships')}>
          <strong style={{ color: 'var(--ink)' }}>Internship Management</strong>
          <p className="lede" style={{ marginTop: 4 }}>{newInternApps} new application{newInternApps === 1 ? '' : 's'} awaiting review.</p>
        </div>
      ) : null}
      <DataTable empty={team.length === 0} emptyTitle="No team members" emptyBody="People in your department will appear here.">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {team.map((e) => (
            <tr key={e.id}>
              <td>
                <div className="person">
                  <Avatar employee={e} size="sm" />
                  <strong style={{ color: 'var(--ink)' }}>{fullName(e)}</strong>
                </div>
              </td>
              <td>{e.position}</td>
              <td><Badge tone={statusTone(e.status)}>{e.status}</Badge></td>
              <td>
                <RowActions items={[
                  { label: 'View', onClick: () => navigate(`/app/employees/${e.id}`) },
                ]} />
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  )
}

function EmployeeHome() {
  const { currentUser, state } = useStore()
  const navigate = useNavigate()
  const today = todayISO()
  const att = currentUser
    ? state.attendance.find((a) => a.employeeId === currentUser.id && a.date === today)
    : undefined
  const bal = currentUser
    ? state.leaveBalances.find((b) => b.employeeId === currentUser.id)
    : undefined
  const myLeave = currentUser
    ? state.leaveRequests.filter((l) => l.employeeId === currentUser.id).slice(0, 5)
    : []

  if (!currentUser) return null

  return (
    <div className="vdash">
      <ClockWidget />
      <div className="vdash-stats vdash-stats-3">
        <StatCard icon={<DoorOpen size={20} />} value={att?.status ?? '—'} label="Today" />
        <StatCard icon={<Leaf size={20} />} value={bal?.annual ?? 0} label="Leave left" />
        <StatCard icon={<ClipboardList size={20} />} value={myLeave.filter((l) => l.status === 'Pending').length} label="Pending leave" />
      </div>
      <DataTable empty={myLeave.length === 0} emptyTitle="No leave requests" emptyBody="Your leave history will appear here.">
        <thead>
          <tr>
            <th>Type</th>
            <th>Dates</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {myLeave.map((l) => (
            <tr key={l.id}>
              <td><strong style={{ color: 'var(--ink)' }}>{l.type}</strong></td>
              <td>{formatDate(l.startDate)} – {formatDate(l.endDate)}</td>
              <td><Badge tone={statusTone(l.status)}>{l.status}</Badge></td>
              <td>
                <RowActions items={[
                  { label: 'Open leave', onClick: () => navigate('/app/leave') },
                ]} />
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </div>
  )
}

function StatCard({ icon, value, label }: { icon: ReactNode; value: string | number; label: string }) {
  return (
    <div className="card vdash-stat">
      <div className="vdash-stat-icon">{icon}</div>
      <div className="vdash-stat-value">{value}</div>
      <div className="vdash-stat-label">{label}</div>
      <WaveDecor />
    </div>
  )
}

function WaveDecor() {
  return (
    <svg className="vdash-wave" viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden>
      <path d="M0 14 Q25 4 50 14 T100 14 T150 14 T200 14 V24 H0 Z" fill="currentColor" />
    </svg>
  )
}

function ChartBox({ children, height }: { children: ReactElement; height: number }) {
  return (
    <div style={{ height, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
    </div>
  )
}

const tip = {
  contentStyle: { background: '#fffcf7', border: '1px solid #e4d9c8', borderRadius: 12, fontSize: 13 },
}

function buildAttendanceSeries(
  attendance: { date: string; status: string }[],
  range: 'Week' | 'Month' | 'Year',
) {
  if (range === 'Year') {
    return ['2022', '2023', '2024', '2025', '2026'].map((y) => ({
      label: y,
      count: attendance.filter((a) => a.date.startsWith(y) && ['Present', 'Late', 'Remote'].includes(a.status)).length,
    }))
  }
  if (range === 'Month') {
    const out: { label: string; count: number }[] = []
    const d = new Date()
    for (let i = 5; i >= 0; i--) {
      const x = new Date(d.getFullYear(), d.getMonth() - i, 1)
      const key = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`
      out.push({
        label: x.toLocaleString('en', { month: 'short' }),
        count: attendance.filter((a) => a.date.startsWith(key) && ['Present', 'Late', 'Remote'].includes(a.status)).length,
      })
    }
    return out
  }
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const out: { label: string; count: number }[] = []
  const d = new Date()
  for (let i = 6; i >= 0; i--) {
    const x = new Date(d)
    x.setDate(d.getDate() - i)
    const iso = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
    out.push({
      label: days[x.getDay()],
      count: attendance.filter((a) => a.date === iso && ['Present', 'Late', 'Remote'].includes(a.status)).length,
    })
  }
  return out
}
