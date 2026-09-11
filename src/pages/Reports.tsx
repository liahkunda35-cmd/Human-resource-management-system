import { useMemo, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { useStore } from '../store/Store'
import { Button, DataTable, PageHeader, Tabs } from '../components/ui'
import { downloadText, toCSV } from '../lib/format'
import { fullName } from '../types'

export function ReportsPage() {
  const { state } = useStore()
  const [tab, setTab] = useState('Employees')
  const [dept, setDept] = useState('all')

  const employees = state.employees.filter((e) => e.status !== 'Inactive').filter((e) => dept === 'all' || e.departmentId === dept)
  const byDept = state.departments.map((d) => ({
    name: d.name,
    value: state.employees.filter((e) => e.departmentId === d.id && e.status !== 'Inactive').length,
  }))
  const byGender = ['Female', 'Male', 'Non-binary'].map((g) => ({
    name: g,
    value: employees.filter((e) => e.gender === g).length,
  }))
  const byType = ['Full-time', 'Part-time', 'Contract', 'Intern'].map((t) => ({
    name: t,
    value: employees.filter((e) => e.employmentType === t).length,
  }))

  const monthAtt = useMemo(() => {
    const map: Record<string, { present: number; late: number; absent: number }> = {}
    for (const a of state.attendance) {
      if (dept !== 'all') {
        const e = state.employees.find((x) => x.id === a.employeeId)
        if (e?.departmentId !== dept) continue
      }
      const k = a.date.slice(0, 7)
      map[k] ??= { present: 0, late: 0, absent: 0 }
      if (a.status === 'Late') map[k].late += 1
      else if (a.status === 'Absent') map[k].absent += 1
      else if (['Present', 'Remote'].includes(a.status)) map[k].present += 1
    }
    return Object.entries(map).map(([month, v]) => ({ month, ...v }))
  }, [state.attendance, state.employees, dept])

  const leaveByDept = state.departments.map((d) => ({
    name: d.name,
    days: state.leaveRequests
      .filter((l) => l.status === 'Approved')
      .filter((l) => state.employees.find((e) => e.id === l.employeeId)?.departmentId === d.id)
      .reduce((s, l) => s + l.days, 0),
  }))

  function exportCurrent() {
    if (tab === 'Employees') {
      downloadText('employees-report.csv', toCSV(['Employee', 'Department', 'Status'], employees.map((e) => [
        fullName(e),
        state.departments.find((d) => d.id === e.departmentId)?.name ?? '',
        e.status,
      ])))
    } else if (tab === 'Leave') {
      downloadText('leave-report.csv', toCSV(['Department', 'Approved days'], leaveByDept.map((d) => [d.name, d.days])))
    } else {
      downloadText('attendance-report.csv', toCSV(['Month', 'Present', 'Late', 'Absent'], monthAtt.map((m) => [m.month, m.present, m.late, m.absent])))
    }
  }

  return (
    <>
      <PageHeader
        kicker="Insight"
        title="Reports"
        lede="Employee, attendance, and leave reports you can export or print."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={exportCurrent}><Download size={16} /> Export</Button>
            <Button variant="gold" onClick={() => window.print()}><Printer size={16} /> Print</Button>
          </div>
        }
      />
      <div className="filters">
        <select className="select" value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="all">All departments</option>
          {state.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </div>
      <Tabs tabs={['Employees', 'Attendance', 'Leave']} value={tab} onChange={setTab} />

      {tab === 'Employees' && (
        <>
          <DataTable empty={employees.length === 0}>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => (
                <tr key={e.id}>
                  <td><strong style={{ color: 'var(--ink)' }}>{fullName(e)}</strong></td>
                  <td>{state.departments.find((d) => d.id === e.departmentId)?.name ?? '—'}</td>
                  <td>{e.status}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <DataTable>
            <thead>
              <tr><th>Breakdown</th><th>Count</th></tr>
            </thead>
            <tbody>
              {byDept.map((d) => (
                <tr key={d.name}><td>Dept · {d.name}</td><td>{d.value}</td></tr>
              ))}
              {byGender.map((d) => (
                <tr key={d.name}><td>Gender · {d.name}</td><td>{d.value}</td></tr>
              ))}
              {byType.map((d) => (
                <tr key={d.name}><td>Type · {d.name}</td><td>{d.value}</td></tr>
              ))}
            </tbody>
          </DataTable>
        </>
      )}

      {tab === 'Attendance' && (
        <DataTable empty={monthAtt.length === 0} emptyTitle="No attendance data" emptyBody="Attendance totals will appear by month.">
          <thead>
            <tr>
              <th>Month</th>
              <th>Present</th>
              <th>Late</th>
              <th>Absent</th>
            </tr>
          </thead>
          <tbody>
            {monthAtt.map((m) => (
              <tr key={m.month}>
                <td>{m.month}</td>
                <td>{m.present}</td>
                <td>{m.late}</td>
                <td>{m.absent}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      {tab === 'Leave' && (
        <DataTable empty={leaveByDept.length === 0}>
          <thead>
            <tr>
              <th>Department</th>
              <th>Approved days</th>
            </tr>
          </thead>
          <tbody>
            {leaveByDept.map((d) => (
              <tr key={d.name}>
                <td>{d.name}</td>
                <td>{d.days}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  )
}
