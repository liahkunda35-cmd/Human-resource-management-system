import { useMemo, useState } from 'react'
import { useStore } from '../store/Store'
import { Avatar, Badge, Button, FormActions, Modal, PageHeader, statusTone } from '../components/ui'
import { formatDate } from '../lib/format'
import type { LeaveType } from '../types'
import { fullName } from '../types'

const TYPES: LeaveType[] = ['Annual Leave', 'Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Emergency Leave', 'Unpaid Leave']

export function LeavePage() {
  const { state, currentUser, applyLeave, reviewLeave, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)
  const [type, setType] = useState<LeaveType>('Annual Leave')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')

  const isStaff = currentUser?.role !== 'employee'
  const teamIds = useMemo(() => {
    if (!currentUser) return []
    if (currentUser.role === 'admin') return state.employees.map((e) => e.id)
    if (currentUser.role === 'manager') return state.employees.filter((e) => e.departmentId === currentUser.departmentId).map((e) => e.id)
    return [currentUser.id]
  }, [currentUser, state.employees])

  const requests = state.leaveRequests
    .filter((r) => teamIds.includes(r.employeeId))
    .filter((r) => filter === 'all' || r.status === filter)
    .filter((r) => {
      if (!q.trim()) return true
      const e = state.employees.find((x) => x.id === r.employeeId)
      const name = e ? fullName(e) : ''
      return `${name} ${r.type} ${r.reason}`.toLowerCase().includes(q.toLowerCase())
    })
  const mine = currentUser ? state.leaveBalances.find((b) => b.employeeId === currentUser.id) : null
  const selected = state.leaveRequests.find((r) => r.id === detail)

  return (
    <>
      <PageHeader
        kicker="Time away"
        title="Leave"
        lede={isStaff ? 'Review requests with care. Balances update on approval.' : 'Apply with dates and a reason. Your manager will review.'}
        actions={<Button variant="gold" onClick={() => setOpen(true)}>Apply for leave</Button>}
      />
      {mine ? (
        <div className="grid g-4">
          <div className="card stat"><div className="label">Annual remaining</div><div className="value">{mine.annual}</div></div>
          <div className="card stat"><div className="label">Sick remaining</div><div className="value">{mine.sick}</div></div>
          <div className="card stat"><div className="label">Emergency</div><div className="value">{mine.emergency}</div></div>
          <div className="card stat"><div className="label">Unpaid allowance</div><div className="value">{mine.unpaid}</div></div>
        </div>
      ) : null}
      {isStaff ? (
        <div className="filters">
          <input className="input" placeholder="Search employee or type" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option>Pending</option>
            <option>Approved</option>
            <option>Rejected</option>
          </select>
        </div>
      ) : null}
      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="data responsive">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                {isStaff ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => {
                const e = state.employees.find((x) => x.id === r.employeeId)!
                return (
                  <tr key={r.id}>
                    <td>
                      <div className="person"><Avatar employee={e} /><strong>{fullName(e)}</strong></div>
                    </td>
                    <td>{r.type}</td>
                    <td>{formatDate(r.startDate)}</td>
                    <td>{formatDate(r.endDate)}</td>
                    <td>{r.days}</td>
                    <td className="truncate" style={{ maxWidth: 220 }}>{r.reason}</td>
                    <td><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                    {isStaff ? (
                      <td>
                        <div className="actions">
                          <Button size="sm" variant="ghost" onClick={() => { setDetail(r.id); setNote(r.reviewNote) }}>View</Button>
                          {r.status === 'Pending' ? (
                            <>
                              <Button size="sm" variant="gold" onClick={() => currentUser && reviewLeave(r.id, 'Approved', currentUser.id, 'Approved')}>Approve</Button>
                              <Button size="sm" variant="danger" onClick={() => currentUser && reviewLeave(r.id, 'Rejected', currentUser.id, 'Rejected')}>Reject</Button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="mobile-cards" style={{ padding: 12 }}>
          {requests.map((r) => {
            const e = state.employees.find((x) => x.id === r.employeeId)!
            return (
              <div key={r.id} className="m-card">
                <strong>{fullName(e)}</strong>
                <p className="lede">{r.type} · {formatDate(r.startDate)} – {formatDate(r.endDate)} · {r.days}d</p>
                <Badge tone={statusTone(r.status)}>{r.status}</Badge>
              </div>
            )
          })}
        </div>
      </div>
      <Modal open={open} title="Leave request" onClose={() => setOpen(false)}>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (!currentUser) return
          const err = applyLeave({ employeeId: currentUser.id, type, startDate: start, endDate: end, reason })
          if (err) toast(err, 'error')
          else {
            setOpen(false)
            setStart('')
            setEnd('')
            setReason('')
          }
        }}>
          <div className="field">
            <label>Leave type</label>
            <select className="select" value={type} onChange={(e) => setType(e.target.value as LeaveType)}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <div className="field"><label>Start date</label><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} required /></div>
            <div className="field"><label>End date</label><input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} required /></div>
          </div>
          <div className="field" style={{ marginTop: 10 }}><label>Reason</label><textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} required /></div>
          <FormActions onCancel={() => setOpen(false)} submitLabel="Submit request" />
        </form>
      </Modal>
      <Modal open={Boolean(selected)} title="Leave details" onClose={() => setDetail(null)}>
        {selected ? (
          <>
            <dl className="dl">
              <dt>Employee</dt><dd>{fullName(state.employees.find((e) => e.id === selected.employeeId)!)}</dd>
              <dt>Type</dt><dd>{selected.type}</dd>
              <dt>Dates</dt><dd>{formatDate(selected.startDate)} – {formatDate(selected.endDate)} ({selected.days} days)</dd>
              <dt>Reason</dt><dd>{selected.reason}</dd>
              <dt>Status</dt><dd>{selected.status}</dd>
            </dl>
            {selected.status === 'Pending' && isStaff ? (
              <form onSubmit={(e) => {
                e.preventDefault()
                if (!currentUser) return
                reviewLeave(selected.id, 'Approved', currentUser.id, note)
                setDetail(null)
              }}>
                <div className="field" style={{ marginTop: 12 }}><label>Note</label><textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} /></div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                  <Button type="button" variant="danger" onClick={() => { if (currentUser) reviewLeave(selected.id, 'Rejected', currentUser.id, note); setDetail(null) }}>Reject</Button>
                  <Button type="submit" variant="gold">Approve</Button>
                </div>
              </form>
            ) : selected.reviewNote ? <p className="lede">{selected.reviewNote}</p> : null}
          </>
        ) : null}
      </Modal>
    </>
  )
}
