import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useStore } from '../store/Store'
import { Avatar, Badge, Button, Modal, PageHeader, statusTone } from '../components/ui'
import { money, monthLabel } from '../lib/format'
import { fullName } from '../types'
import type { PayrollRecord } from '../types'

export function PayrollPage() {
  const { state, currentUser, createPayrollRun, processPayroll, savePayroll } = useStore()
  const isHr = currentUser?.role === 'admin'
  const periods = useMemo(() => [...new Set(state.payrolls.map((p) => p.period))].sort().reverse(), [state.payrolls])
  const [period, setPeriod] = useState(periods[0] ?? '2026-09')
  const [newPeriod, setNewPeriod] = useState('2026-09')
  const [slip, setSlip] = useState<PayrollRecord | null>(null)
  const [edit, setEdit] = useState<PayrollRecord | null>(null)
  const [q, setQ] = useState('')

  const rows = state.payrolls.filter((p) => {
    if (p.period !== period) return false
    if (!isHr) return p.employeeId === currentUser?.id
    if (!q.trim()) return true
    const e = state.employees.find((x) => x.id === p.employeeId)
    return e ? fullName(e).toLowerCase().includes(q.toLowerCase()) : false
  })

  function downloadSlip(p: PayrollRecord) {
    const e = state.employees.find((x) => x.id === p.employeeId)
    if (!e) return
    const html = `<html><head><title>Payslip</title><style>
      body{font-family:Georgia,serif;padding:40px;color:#2c2824;background:#f4eee6}
      .card{background:#fffcf7;padding:32px;border-radius:16px;max-width:640px;margin:auto}
      h1{font-weight:500} table{width:100%;border-collapse:collapse;margin-top:16px}
      td{padding:8px 0;border-bottom:1px solid #e4d9c8}
    </style></head><body><div class="card">
      <h1>${state.settings.companyName}</h1>
      <p>${state.settings.address}<br/>${state.settings.email} · ${state.settings.phone}</p>
      <h2>Payslip · ${monthLabel(p.period)}</h2>
      <p>${fullName(e)} · ${e.employeeId}<br/>${e.position}</p>
      <table>
        <tr><td>Basic salary</td><td>${money(p.basicSalary, state.settings.currency)}</td></tr>
        <tr><td>Housing allowance</td><td>${money(p.housing, state.settings.currency)}</td></tr>
        <tr><td>Transport allowance</td><td>${money(p.transport, state.settings.currency)}</td></tr>
        <tr><td>Other allowances</td><td>${money(p.other, state.settings.currency)}</td></tr>
        <tr><td>Deductions</td><td>${money(p.deductions, state.settings.currency)}</td></tr>
        <tr><td>Tax</td><td>${money(p.tax, state.settings.currency)}</td></tr>
        <tr><td><strong>Net salary</strong></td><td><strong>${money(p.net, state.settings.currency)}</strong></td></tr>
      </table>
      <p>Payment status: ${p.status}</p>
    </div></body></html>`
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.print()
  }

  return (
    <>
      <PageHeader
        kicker="Compensation"
        title={isHr ? 'Payroll' : 'Payslips'}
        lede={isHr ? 'Create runs, adjust allowances, and release payslips.' : 'Your salary history and printable payslips.'}
        actions={isHr ? (
          <div className="filters">
            <input className="input" type="month" value={newPeriod} onChange={(e) => setNewPeriod(e.target.value)} />
            <Button variant="ghost" onClick={() => { createPayrollRun(newPeriod); setPeriod(newPeriod) }}>Create payroll</Button>
            <Button variant="gold" onClick={() => processPayroll(period)}>Process payroll</Button>
          </div>
        ) : undefined}
      />
      <div className="filters">
        <select className="select" value={period} onChange={(e) => setPeriod(e.target.value)}>
          {periods.map((p) => <option key={p} value={p}>{monthLabel(p)}</option>)}
        </select>
        {isHr ? <input className="input" placeholder="Search employee" value={q} onChange={(e) => setQ(e.target.value)} /> : null}
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="data responsive">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Basic</th>
                <th>Allowances</th>
                <th>Deductions</th>
                <th>Tax</th>
                <th>Net</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const e = state.employees.find((x) => x.id === p.employeeId)!
                return (
                  <tr key={p.id}>
                    <td><div className="person"><Avatar employee={e} /><strong>{fullName(e)}</strong></div></td>
                    <td>{money(p.basicSalary, state.settings.currency)}</td>
                    <td>{money(p.housing + p.transport + p.other, state.settings.currency)}</td>
                    <td>{money(p.deductions, state.settings.currency)}</td>
                    <td>{money(p.tax, state.settings.currency)}</td>
                    <td>{money(p.net, state.settings.currency)}</td>
                    <td><Badge tone={statusTone(p.status)}>{p.status}</Badge></td>
                    <td>
                      <div className="actions">
                        <Button size="sm" variant="ghost" onClick={() => setSlip(p)}>View</Button>
                        {isHr ? <Button size="sm" variant="ghost" onClick={() => setEdit({ ...p })}>Edit</Button> : null}
                        <Button size="sm" variant="gold" onClick={() => downloadSlip(p)}><Download size={14} /> Payslip</Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={Boolean(slip)} title="Payslip" onClose={() => setSlip(null)}>
        {slip ? (
          <>
            <PayslipBody record={slip} />
            <Button variant="gold" onClick={() => downloadSlip(slip)}>Download / print payslip</Button>
          </>
        ) : null}
      </Modal>
      <Modal open={Boolean(edit)} title="Adjust payslip" onClose={() => setEdit(null)}>
        {edit ? (
          <form onSubmit={(e) => {
            e.preventDefault()
            savePayroll(edit.id, edit)
            setEdit(null)
          }}>
            {(['basicSalary', 'housing', 'transport', 'other', 'deductions', 'tax'] as const).map((k) => (
              <div key={k} className="field" style={{ marginBottom: 8 }}>
                <label>{k}</label>
                <input className="input" type="number" value={edit[k]} onChange={(e) => setEdit({ ...edit, [k]: Number(e.target.value) })} />
              </div>
            ))}
            <Button type="submit" variant="gold">Save</Button>
          </form>
        ) : null}
      </Modal>
    </>
  )
}

function PayslipBody({ record }: { record: PayrollRecord }) {
  const { state } = useStore()
  const e = state.employees.find((x) => x.id === record.employeeId)
  if (!e) return null
  return (
    <div>
      <div className="kicker">{state.settings.companyName}</div>
      <p className="lede">{state.settings.address}</p>
      <h3>{fullName(e)} · {monthLabel(record.period)}</h3>
      <dl className="dl">
        <dt>Basic salary</dt><dd>{money(record.basicSalary, state.settings.currency)}</dd>
        <dt>Housing</dt><dd>{money(record.housing, state.settings.currency)}</dd>
        <dt>Transport</dt><dd>{money(record.transport, state.settings.currency)}</dd>
        <dt>Other</dt><dd>{money(record.other, state.settings.currency)}</dd>
        <dt>Deductions</dt><dd>{money(record.deductions, state.settings.currency)}</dd>
        <dt>Tax</dt><dd>{money(record.tax, state.settings.currency)}</dd>
        <dt>Net salary</dt><dd>{money(record.net, state.settings.currency)}</dd>
        <dt>Status</dt><dd>{record.status}</dd>
      </dl>
    </div>
  )
}
