import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Download } from 'lucide-react'
import { useStore } from '../store/Store'
import { Avatar, Badge, Button, PageHeader, statusTone } from '../components/ui'
import { ClockWidget } from '../components/ClockWidget'
import { deptName, downloadText, formatDate, toCSV, todayISO } from '../lib/format'
import { fullName } from '../types'

export function AttendancePage() {
  const { state, currentUser } = useStore()
  const [date, setDate] = useState(todayISO())
  const [emp, setEmp] = useState('all')
  const [dept, setDept] = useState('all')

  const scopedEmployees = useMemo(() => {
    if (currentUser?.role === 'employee') return state.employees.filter((e) => e.id === currentUser.id)
    if (currentUser?.role === 'manager') return state.employees.filter((e) => e.departmentId === currentUser.departmentId)
    return state.employees
  }, [state.employees, currentUser])

  const rows = useMemo(() => {
    return state.attendance
      .filter((a) => scopedEmployees.some((e) => e.id === a.employeeId))
      .filter((a) => a.date === date)
      .filter((a) => emp === 'all' || a.employeeId === emp)
      .filter((a) => {
        if (dept === 'all') return true
        const e = state.employees.find((x) => x.id === a.employeeId)
        return e?.departmentId === dept
      })
  }, [state.attendance, state.employees, scopedEmployees, date, emp, dept])

  const todayRows = state.attendance.filter((a) => a.date === todayISO() && scopedEmployees.some((e) => e.id === a.employeeId))
  const counts = {
    present: todayRows.filter((a) => a.status === 'Present' || a.status === 'Remote').length,
    absent: scopedEmployees.filter((e) => e.status !== 'Inactive' && e.status !== 'On Leave' && !todayRows.some((a) => a.employeeId === e.id && a.status !== 'Absent')).length
      + todayRows.filter((a) => a.status === 'Absent').length,
    late: todayRows.filter((a) => a.status === 'Late').length,
    leave: scopedEmployees.filter((e) => e.status === 'On Leave').length,
  }

  const trend = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(2026, 8, 7)
    d.setDate(d.getDate() - (7 - i))
    if (d.getDay() === 0 || d.getDay() === 6) return null
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const recs = state.attendance.filter((a) => a.date === iso)
    return {
      date: iso.slice(5),
      present: recs.filter((a) => ['Present', 'Remote'].includes(a.status)).length,
      late: recs.filter((a) => a.status === 'Late').length,
    }
  }).filter(Boolean) as { date: string; present: number; late: number }[]

  function exportCsv() {
    downloadText(
      'attendance.csv',
      toCSV(
        ['Employee', 'Date', 'Clock in', 'Clock out', 'Hours', 'Status'],
        rows.map((a) => {
          const e = state.employees.find((x) => x.id === a.employeeId)!
          return [fullName(e), a.date, a.clockIn ?? '', a.clockOut ?? '', a.hours, a.status]
        }),
      ),
    )
  }

  return (
    <>
      <PageHeader
        kicker="Time"
        title="Attendance"
        lede="Presence, lateness, and the shape of the working week."
        actions={<Button variant="ghost" onClick={exportCsv}><Download size={16} /> Export</Button>}
      />
      {currentUser?.role === 'employee' ? <ClockWidget /> : null}
      {currentUser?.role !== 'employee' ? (
        <div className="grid g-4">
          <div className="card stat"><div className="label">Present</div><div className="value">{counts.present}</div></div>
          <div className="card stat"><div className="label">Absent</div><div className="value">{counts.absent}</div></div>
          <div className="card stat"><div className="label">Late</div><div className="value">{counts.late}</div></div>
          <div className="card stat"><div className="label">On leave</div><div className="value">{counts.leave}</div></div>
        </div>
      ) : null}
      <div className="card">
        <div className="card-head"><h3>Trend</h3></div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend}>
              <CartesianGrid stroke="#eee6d8" vertical={false} />
              <XAxis dataKey="date" stroke="#8a8278" fontSize={12} />
              <YAxis stroke="#8a8278" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#fffcf7', border: '1px solid #e4d9c8', borderRadius: 12 }} />
              <Bar dataKey="present" fill="#7d8b76" radius={[6, 6, 0, 0]} />
              <Bar dataKey="late" fill="#c4a574" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="filters">
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        {currentUser?.role !== 'employee' ? (
          <select className="select" value={emp} onChange={(e) => setEmp(e.target.value)}>
            <option value="all">All employees</option>
            {scopedEmployees.map((e) => <option key={e.id} value={e.id}>{fullName(e)}</option>)}
          </select>
        ) : null}
        {currentUser?.role === 'admin' ? (
          <select className="select" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="all">All departments</option>
            {state.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        ) : null}
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="data responsive">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Clock in</th>
                <th>Clock out</th>
                <th>Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const e = state.employees.find((x) => x.id === a.employeeId)!
                return (
                  <tr key={a.id}>
                    <td>
                      <div className="person">
                        <Avatar employee={e} />
                        <div>
                          <strong>{fullName(e)}</strong>
                          <span>{deptName(state.departments, e.departmentId)}</span>
                        </div>
                      </div>
                    </td>
                    <td>{formatDate(a.date)}</td>
                    <td>{a.clockIn ?? '—'}</td>
                    <td>{a.clockOut ?? '—'}</td>
                    <td>{a.hours || '—'}</td>
                    <td><Badge tone={statusTone(a.status)}>{a.status}</Badge></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mobile-cards" style={{ padding: 12 }}>
          {rows.map((a) => {
            const e = state.employees.find((x) => x.id === a.employeeId)!
            return (
              <div key={a.id} className="m-card">
                <strong>{fullName(e)}</strong>
                <p className="lede">{formatDate(a.date)} · {a.clockIn ?? '—'} – {a.clockOut ?? '—'}</p>
                <Badge tone={statusTone(a.status)}>{a.status}</Badge>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
