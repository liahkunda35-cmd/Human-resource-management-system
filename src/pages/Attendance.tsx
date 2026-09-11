import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useStore } from '../store/Store'
import { Avatar, Badge, Button, DataTable, PageHeader, statusTone } from '../components/ui'
import { ClockWidget } from '../components/ClockWidget'
import { downloadText, toCSV, todayISO } from '../lib/format'
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
      <DataTable empty={rows.length === 0} emptyTitle="No attendance" emptyBody="No records for this date and filter.">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Clock in</th>
            <th>Clock out</th>
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
                    <Avatar employee={e} size="sm" />
                    <strong style={{ color: 'var(--ink)' }}>{fullName(e)}</strong>
                  </div>
                </td>
                <td>{a.clockIn ?? '—'}</td>
                <td>{a.clockOut ?? '—'}</td>
                <td><Badge tone={statusTone(a.status)}>{a.status}</Badge></td>
              </tr>
            )
          })}
        </tbody>
      </DataTable>
    </>
  )
}
