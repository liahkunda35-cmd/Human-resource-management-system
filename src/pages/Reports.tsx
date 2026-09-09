import { useMemo, useState, type ReactElement } from 'react'
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
  Line,
  LineChart,
} from 'recharts'
import { Download, Printer } from 'lucide-react'
import { useStore } from '../store/Store'
import { Button, PageHeader, Tabs } from '../components/ui'
import { downloadText, money, toCSV } from '../lib/format'

const COLORS = ['#c4a574', '#2a2622', '#7d8b76', '#b57a6b', '#8a8278']

export function ReportsPage() {
  const { state } = useStore()
  const [tab, setTab] = useState('Employees')
  const [dept, setDept] = useState('all')

  const employees = state.employees.filter((e) => e.status !== 'Inactive').filter((e) => dept === 'all' || e.departmentId === dept)
  const byDept = state.departments.map((d) => ({
    name: d.name.split(' ')[0] ?? d.name,
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
    name: d.name.split(' ')[0] ?? d.name,
    days: state.leaveRequests
      .filter((l) => l.status === 'Approved')
      .filter((l) => state.employees.find((e) => e.id === l.employeeId)?.departmentId === d.id)
      .reduce((s, l) => s + l.days, 0),
  }))

  const payrollCost = state.departments.map((d) => ({
    name: d.name.split(' ')[0] ?? d.name,
    cost: state.employees.filter((e) => e.departmentId === d.id && e.status !== 'Inactive').reduce((s, e) => s + e.basicSalary + e.housingAllowance + e.transportAllowance + e.otherAllowance, 0),
  }))

  const perfDept = state.departments.map((d) => {
    const ids = state.employees.filter((e) => e.departmentId === d.id).map((e) => e.id)
    const rs = state.reviews.filter((r) => ids.includes(r.employeeId))
    const avg = rs.length ? rs.reduce((s, r) => s + r.overall, 0) / rs.length : 0
    return { name: d.name.split(' ')[0] ?? d.name, avg: Number(avg.toFixed(2)) }
  })

  const totalAtt = monthAtt.reduce((s, m) => s + m.present + m.late + m.absent, 0) || 1
  const absenceRate = Math.round((monthAtt.reduce((s, m) => s + m.absent, 0) / totalAtt) * 100)
  const lateRate = monthAtt.reduce((s, m) => s + m.late, 0)

  function exportCurrent() {
    if (tab === 'Employees') {
      downloadText('employees-report.csv', toCSV(['Metric', 'Value'], [
        ['Total', employees.length],
        ...byDept.map((d) => [d.name, d.value]),
      ]))
    } else if (tab === 'Payroll') {
      downloadText('payroll-report.csv', toCSV(['Department', 'Monthly cost'], payrollCost.map((p) => [p.name, p.cost])))
    } else {
      downloadText(`${tab.toLowerCase()}-report.csv`, toCSV(['Month', 'Present', 'Late', 'Absent'], monthAtt.map((m) => [m.month, m.present, m.late, m.absent])))
    }
  }

  return (
    <>
      <PageHeader
        kicker="Insight"
        title="Reports & analytics"
        lede="Printable, exportable views of people, time, leave, pay, and performance."
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
      <Tabs tabs={['Employees', 'Attendance', 'Leave', 'Payroll', 'Performance']} value={tab} onChange={setTab} />
      {tab === 'Employees' && (
        <div className="grid g-2">
          <Metric label="Total employees" value={employees.length} />
          <Chart title="By department" pie={byDept} />
          <Chart title="By gender" bars={byGender} />
          <Chart title="By employment type" bars={byType} />
        </div>
      )}
      {tab === 'Attendance' && (
        <div className="grid g-2">
          <Metric label="Absence rate" value={`${absenceRate}%`} />
          <Metric label="Late arrivals (period)" value={lateRate} />
          <div className="card span-2">
            <div className="card-head"><h3>Monthly attendance</h3></div>
            <Box>
              <BarChart data={monthAtt}>
                <CartesianGrid stroke="#eee6d8" vertical={false} />
                <XAxis dataKey="month" stroke="#8a8278" fontSize={12} />
                <YAxis stroke="#8a8278" fontSize={12} />
                <Tooltip />
                <Bar dataKey="present" fill="#7d8b76" />
                <Bar dataKey="late" fill="#c4a574" />
                <Bar dataKey="absent" fill="#b57a6b" />
              </BarChart>
            </Box>
          </div>
        </div>
      )}
      {tab === 'Leave' && (
        <div className="grid g-2">
          <Metric label="Approved days" value={state.leaveRequests.filter((l) => l.status === 'Approved').reduce((s, l) => s + l.days, 0)} />
          <Chart title="Leave by department" bars={leaveByDept.map((d) => ({ name: d.name, value: d.days }))} />
        </div>
      )}
      {tab === 'Payroll' && (
        <div className="grid g-2">
          <Metric label="Monthly payroll expense" value={money(payrollCost.reduce((s, p) => s + p.cost, 0), state.settings.currency)} />
          <Chart title="Department payroll cost" bars={payrollCost.map((p) => ({ name: p.name, value: p.cost }))} />
        </div>
      )}
      {tab === 'Performance' && (
        <div className="grid g-2">
          <Metric label="Average rating" value={(state.reviews.reduce((s, r) => s + r.overall, 0) / (state.reviews.length || 1)).toFixed(2)} />
          <div className="card">
            <div className="card-head"><h3>By department</h3></div>
            <Box>
              <LineChart data={perfDept}>
                <CartesianGrid stroke="#eee6d8" />
                <XAxis dataKey="name" stroke="#8a8278" fontSize={12} />
                <YAxis domain={[0, 5]} stroke="#8a8278" fontSize={12} />
                <Tooltip />
                <Line dataKey="avg" stroke="#a8844e" />
              </LineChart>
            </Box>
          </div>
        </div>
      )}
    </>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  )
}

function Box({ children }: { children: ReactElement }) {
  return (
    <div style={{ height: 240 }}>
      <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
    </div>
  )
}

function Chart({ title, pie, bars }: { title: string; pie?: { name: string; value: number }[]; bars?: { name: string; value: number }[] }) {
  return (
    <div className="card">
      <div className="card-head"><h3>{title}</h3></div>
      <Box>
        {pie ? (
          <PieChart>
            <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
              {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        ) : (
          <BarChart data={bars}>
            <CartesianGrid stroke="#eee6d8" vertical={false} />
            <XAxis dataKey="name" stroke="#8a8278" fontSize={12} />
            <YAxis stroke="#8a8278" fontSize={12} />
            <Tooltip />
            <Bar dataKey="value" fill="#c4a574" radius={[6, 6, 0, 0]} />
          </BarChart>
        )}
      </Box>
    </div>
  )
}
