import { useMemo, useState } from 'react'
import { useStore } from '../store/Store'
import { Avatar, Badge, Button, DataTable, FormActions, Modal, PageHeader, RowActions, statusTone } from '../components/ui'
import { formatDate } from '../lib/format'
import { openDataUrl, readFileAsDataURL } from '../lib/files'
import type { LeaveType } from '../types'
import { fullName } from '../types'

const TYPES: LeaveType[] = ['Annual Leave', 'Sick Leave', 'Maternity Leave', 'Paternity Leave', 'Emergency Leave', 'Unpaid Leave']

const REVIEWABLE = new Set(['Pending', 'Requires Review', 'Documentation Required'])

export function LeavePage() {
  const { state, currentUser, applyLeave, reviewLeave, attachSickNote, toast, canViewSickNote, getSickNote } = useStore()
  const [open, setOpen] = useState(false)
  const [detail, setDetail] = useState<string | null>(null)
  const [type, setType] = useState<LeaveType>('Annual Leave')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [sickNoteName, setSickNoteName] = useState<string | null>(null)
  const [sickNoteData, setSickNoteData] = useState<string | null>(null)
  const [sickNoteMime, setSickNoteMime] = useState<string | null>(null)
  const [sickError, setSickError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [uploadingLater, setUploadingLater] = useState(false)

  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'super_admin'
  const teamIds = useMemo(() => {
    if (!currentUser) return []
    if (isStaff) return state.employees.map((e) => e.id)
    return [currentUser.id]
  }, [currentUser, isStaff, state.employees])

  const requests = state.leaveRequests
    .filter((r) => teamIds.includes(r.employeeId))
    .filter((r) => filter === 'all' || r.status === filter)
    .filter((r) => {
      if (!q.trim()) return true
      const e = state.employees.find((x) => x.id === r.employeeId)
      const name = e ? fullName(e) : ''
      return `${name} ${r.type} ${r.reason}`.toLowerCase().includes(q.toLowerCase())
    })
  const selected = state.leaveRequests.find((r) => r.id === detail)
  const isOwnRequest = Boolean(selected && currentUser && selected.employeeId === currentUser.id)
  const canUploadLater = Boolean(
    selected &&
      isOwnRequest &&
      selected.type === 'Sick Leave' &&
      !selected.sickNoteData &&
      selected.status !== 'Approved' &&
      selected.status !== 'Rejected',
  )

  function resetForm() {
    setType('Annual Leave')
    setStart('')
    setEnd('')
    setReason('')
    setSickNoteName(null)
    setSickNoteData(null)
    setSickNoteMime(null)
    setSickError('')
  }

  async function onSickFile(file: File | null) {
    setSickError('')
    if (!file) {
      setSickNoteName(null)
      setSickNoteData(null)
      setSickNoteMime(null)
      return
    }
    try {
      const read = await readFileAsDataURL(file)
      setSickNoteName(read.name)
      setSickNoteData(read.data)
      setSickNoteMime(read.mime)
    } catch (err) {
      setSickNoteName(null)
      setSickNoteData(null)
      setSickNoteMime(null)
      setSickError(err instanceof Error ? err.message : 'Could not upload file.')
    }
  }

  async function onLaterCertificate(file: File | null) {
    if (!file || !selected || !currentUser) return
    setUploadingLater(true)
    setSickError('')
    try {
      const read = await readFileAsDataURL(file)
      const err = attachSickNote(selected.id, read, currentUser.id)
      if (err) toast(err, 'error')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not upload file.', 'error')
    } finally {
      setUploadingLater(false)
    }
  }

  return (
    <>
      <PageHeader
        kicker="Time away"
        title={isStaff ? 'Leave Management' : 'My Leave'}
        lede={isStaff ? 'Review requests with care. Balances update on approval.' : 'Apply with dates and a reason. Your manager will review.'}
        actions={<Button variant="gold" onClick={() => { resetForm(); setOpen(true) }}>{isStaff ? 'Apply for leave' : 'Apply for Leave'}</Button>}
      />
      <div className="filters">
        {isStaff ? <input className="input" placeholder="Search employee or type" value={q} onChange={(e) => setQ(e.target.value)} /> : null}
        <select className="select" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option>Pending</option>
          <option>Approved</option>
          <option>Rejected</option>
          <option>Requires Review</option>
          <option>Documentation Required</option>
        </select>
      </div>
      <DataTable empty={requests.length === 0} emptyTitle="No leave requests" emptyBody="Apply for leave to see requests here.">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Type</th>
            <th>Dates</th>
            <th>Submitted</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((r) => {
            const e = state.employees.find((x) => x.id === r.employeeId)!
            const noteHint =
              r.type === 'Sick Leave'
                ? r.sickNoteData
                  ? ' · certificate'
                  : ' · no certificate'
                : ''
            return (
              <tr key={r.id}>
                <td>
                  <div className="person">
                    <Avatar employee={e} size="sm" />
                    <strong style={{ color: 'var(--ink)' }}>{fullName(e)}</strong>
                  </div>
                </td>
                <td>{r.type}{noteHint}</td>
                <td>{formatDate(r.startDate)} – {formatDate(r.endDate)}</td>
                <td>{formatDate(r.createdAt)}</td>
                <td><Badge tone={statusTone(r.status)}>{r.status}</Badge></td>
                <td>
                  <RowActions items={[
                    { label: 'View', onClick: () => { setDetail(r.id); setNote(r.reviewNote); setSickError('') } },
                    {
                      label: 'Approve',
                      hidden: !isStaff || !REVIEWABLE.has(r.status),
                      onClick: () => currentUser && reviewLeave(r.id, 'Approved', currentUser.id, 'Approved'),
                    },
                    {
                      label: 'Reject',
                      danger: true,
                      hidden: !isStaff || !REVIEWABLE.has(r.status),
                      onClick: () => currentUser && reviewLeave(r.id, 'Rejected', currentUser.id, 'Rejected'),
                    },
                  ]} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </DataTable>
      <Modal open={open} title="Leave request" onClose={() => setOpen(false)}>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (!currentUser) return
          setSubmitting(true)
          const err = applyLeave({
            employeeId: currentUser.id,
            type,
            startDate: start,
            endDate: end,
            reason,
            sickNoteName: type === 'Sick Leave' ? sickNoteName : null,
            sickNoteData: type === 'Sick Leave' ? sickNoteData : null,
            sickNoteMime: type === 'Sick Leave' ? sickNoteMime : null,
          })
          setSubmitting(false)
          if (err) toast(err, 'error')
          else {
            setOpen(false)
            resetForm()
          }
        }}>
          <div className="field">
            <label>Leave type</label>
            <select className="select" value={type} onChange={(e) => { setType(e.target.value as LeaveType); setSickError('') }}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <div className="field"><label>Start date</label><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} required /></div>
            <div className="field"><label>End date</label><input className="input" type="date" value={end} onChange={(e) => setEnd(e.target.value)} required /></div>
          </div>
          <div className="field" style={{ marginTop: 10 }}><label>Reason</label><textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} required /></div>
          {type === 'Sick Leave' ? (
            <div className="field" style={{ marginTop: 10 }}>
              <label>Medical Certificate (Optional)</label>
              <input
                className="input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={(e) => void onSickFile(e.target.files?.[0] ?? null)}
              />
              <p className="lede" style={{ marginTop: 6 }}>You may upload your medical certificate when it becomes available.</p>
              {sickNoteName ? <p className="lede" style={{ marginTop: 4 }}>Attached: {sickNoteName}</p> : null}
              {sickError ? <p style={{ color: 'var(--danger, #b54a3a)', marginTop: 6, fontSize: 13 }}>{sickError}</p> : null}
            </div>
          ) : null}
          <FormActions onCancel={() => setOpen(false)} submitLabel={submitting ? 'Submitting…' : 'Submit Leave Request'} />
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
              <dt>Submitted</dt><dd>{formatDate(selected.createdAt)}</dd>
              <dt>Status</dt><dd>{selected.status}</dd>
              {selected.type === 'Sick Leave' ? (
                <>
                  <dt>Medical Certificate</dt>
                  <dd>
                    {selected.sickNoteData && selected.sickNoteName ? (
                      canViewSickNote(selected.id) ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const noteFile = getSickNote(selected.id)
                            if (noteFile) openDataUrl(noteFile.data, noteFile.name)
                            else toast('Medical certificate is not available to view.', 'error')
                          }}
                        >
                          View Medical Certificate
                        </Button>
                      ) : (
                        'Submitted'
                      )
                    ) : (
                      'Not yet uploaded'
                    )}
                  </dd>
                </>
              ) : null}
            </dl>

            {canUploadLater ? (
              <div className="field" style={{ marginTop: 12 }}>
                <label>Upload Medical Certificate</label>
                <input
                  className="input"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  disabled={uploadingLater}
                  onChange={(e) => void onLaterCertificate(e.target.files?.[0] ?? null)}
                />
                <p className="lede" style={{ marginTop: 6 }}>
                  {uploadingLater ? 'Uploading…' : 'Add your certificate once you have it.'}
                </p>
              </div>
            ) : null}

            {REVIEWABLE.has(selected.status) && isStaff ? (
              <form onSubmit={(e) => {
                e.preventDefault()
                if (!currentUser) return
                reviewLeave(selected.id, 'Approved', currentUser.id, note)
                setDetail(null)
              }}>
                <div className="field" style={{ marginTop: 12 }}><label>Note</label><textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} /></div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
                  {selected.type === 'Sick Leave' && !selected.sickNoteData ? (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        if (currentUser) {
                          reviewLeave(
                            selected.id,
                            'Documentation Required',
                            currentUser.id,
                            note || 'Please upload a medical certificate for this sick leave request.',
                          )
                        }
                        setDetail(null)
                      }}
                    >
                      Documentation Required
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      if (currentUser) reviewLeave(selected.id, 'Requires Review', currentUser.id, note || 'Please provide clarification.')
                      setDetail(null)
                    }}
                  >
                    Request clarification
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => {
                      if (currentUser) reviewLeave(selected.id, 'Rejected', currentUser.id, note)
                      setDetail(null)
                    }}
                  >
                    Reject
                  </Button>
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
