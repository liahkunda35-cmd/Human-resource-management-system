import { useMemo, useState } from 'react'
import { useStore } from '../store/Store'
import { Badge, Button, DataTable, FormActions, Modal, PageHeader, RowActions, statusTone } from '../components/ui'
import { deptName, formatDate, todayISO } from '../lib/format'
import type { Workshop, WorkshopAudience, WorkshopStatus } from '../types'
import { fullName } from '../types'

const CATEGORIES = ['General', 'Compliance', 'Leadership', 'Wellbeing', 'Technical', 'Onboarding']

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

const empty = {
  title: '',
  description: '',
  date: '',
  startTime: '09:00',
  endTime: '11:00',
  location: '',
  facilitator: '',
  departmentId: '',
  category: 'General',
  status: 'Scheduled' as WorkshopStatus,
  notes: '',
  audience: 'all' as WorkshopAudience,
  participantIds: [] as string[],
}

export function WorkshopsPage() {
  const { state, currentUser, saveWorkshop, setWorkshopStatus, deleteWorkshop, toast } = useStore()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(empty)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [when, setWhen] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [busy, setBusy] = useState(false)

  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'super_admin'
  const departments = state.departments.filter((d) => isUuid(d.id))
  const people = state.employees.filter((e) => isUuid(e.id) && e.role === 'employee' && e.status !== 'Inactive')
  const today = todayISO()

  const rows = useMemo(() => {
    return state.workshops
      .filter((w) => {
        if (when === 'all') return true
        const past = w.status === 'Completed' || w.status === 'Cancelled' || w.date < today
        return when === 'past' ? past : !past && w.status === 'Scheduled'
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
  }, [state.workshops, today, when])

  const selected = state.workshops.find((w) => w.id === detailId) ?? null

  function openCreate() {
    setEditingId(null)
    setForm({ ...empty, departmentId: departments[0]?.id ?? '' })
    setFormOpen(true)
  }

  function openEdit(item: Workshop) {
    setEditingId(item.id)
    setForm({
      title: item.title,
      description: item.description,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      location: item.location,
      facilitator: item.facilitator,
      departmentId: item.departmentId ?? '',
      category: item.category,
      status: item.status,
      notes: item.notes,
      audience: item.audience,
      participantIds: item.participantIds,
    })
    setFormOpen(true)
  }

  const detailPeople = selected
    ? selected.participantIds
        .map((id) => state.employees.find((e) => e.id === id))
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
    : []

  return (
    <>
      <PageHeader
        kicker="Learning"
        title="Scheduled Workshops"
        lede={isStaff
          ? 'Plan workshops, assign departments or people, and keep upcoming sessions current.'
          : 'Workshops scheduled for you, your department, or the whole organisation.'}
        actions={isStaff ? <Button variant="gold" onClick={openCreate}>Schedule workshop</Button> : null}
      />
      <div className="filters">
        <select className="select" value={when} onChange={(e) => setWhen(e.target.value as 'upcoming' | 'past' | 'all')}>
          <option value="upcoming">Upcoming</option>
          <option value="past">Past and cancelled</option>
          <option value="all">All workshops</option>
        </select>
      </div>
      <DataTable
        empty={rows.length === 0}
        emptyTitle={when === 'upcoming' ? 'No upcoming workshops' : 'No workshops in this view'}
        emptyBody={isStaff ? 'Schedule a workshop to share it with employees.' : 'Workshops assigned to you will appear here.'}
      >
        <thead>
          <tr>
            <th>Workshop</th>
            <th>When</th>
            <th>Location</th>
            <th>Facilitator</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((w) => (
            <tr key={w.id}>
              <td>
                <strong style={{ color: 'var(--ink)' }}>{w.title}</strong>
                <div className="muted" style={{ fontSize: 12 }}>{w.category}</div>
              </td>
              <td>{formatDate(w.date)} · {w.startTime}–{w.endTime}</td>
              <td>{w.location}</td>
              <td>{w.facilitator}</td>
              <td><Badge tone={statusTone(w.status)}>{w.status}</Badge></td>
              <td>
                <RowActions items={[
                  { label: 'View', onClick: () => setDetailId(w.id) },
                  { label: 'Edit', hidden: !isStaff, onClick: () => openEdit(w) },
                  { label: 'Cancel', hidden: !isStaff || w.status === 'Cancelled', onClick: () => void setWorkshopStatus(w.id, 'Cancelled') },
                  { label: 'Delete', danger: true, hidden: !isStaff, onClick: () => void deleteWorkshop(w.id) },
                ]} />
              </td>
            </tr>
          ))}
        </tbody>
      </DataTable>

      <Modal open={formOpen} title={editingId ? 'Edit workshop' : 'Schedule workshop'} onClose={() => !busy && setFormOpen(false)} wide>
        <form onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          const err = await saveWorkshop({
            ...form,
            departmentId: form.departmentId || null,
            id: editingId ?? undefined,
          })
          setBusy(false)
          if (err) {
            toast(err, 'error')
            return
          }
          setFormOpen(false)
        }}>
          <div className="row">
            <div className="field"><label>Workshop title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="field">
              <label>Category</label>
              <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="field"><label>Date</label><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
            <div className="field"><label>Start time</label><input className="input" type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} required /></div>
            <div className="field"><label>End time</label><input className="input" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} required /></div>
            <div className="field"><label>Location / venue</label><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} required /></div>
            <div className="field"><label>Facilitator</label><input className="input" value={form.facilitator} onChange={(e) => setForm({ ...form, facilitator: e.target.value })} required /></div>
            <div className="field">
              <label>Status</label>
              <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as WorkshopStatus })}>
                <option>Scheduled</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
            </div>
            <div className="field">
              <label>Audience</label>
              <select className="select" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as WorkshopAudience })}>
                <option value="all">All employees</option>
                <option value="department">A department</option>
                <option value="employees">Selected employees</option>
              </select>
            </div>
            <div className="field">
              <label>Department</label>
              <select className="select" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
                <option value="">None</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>
          <div className="field" style={{ marginTop: 10 }}><label>Description</label><textarea className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          {form.audience === 'employees' ? (
            <div className="field" style={{ marginTop: 10 }}>
              <label>Target employees</label>
              <select
                className="select"
                multiple
                value={form.participantIds}
                onChange={(e) => setForm({ ...form, participantIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}
                style={{ minHeight: 120 }}
              >
                {people.map((p) => <option key={p.id} value={p.id}>{fullName(p)} · {p.employeeId}</option>)}
              </select>
            </div>
          ) : null}
          <div className="field" style={{ marginTop: 10 }}><label>Additional notes</label><textarea className="textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <FormActions onCancel={() => setFormOpen(false)} submitLabel={busy ? 'Saving…' : editingId ? 'Save workshop' : 'Schedule workshop'} />
        </form>
      </Modal>

      <Modal open={Boolean(selected)} title="Workshop details" onClose={() => setDetailId(null)}>
        {selected ? (
          <dl className="dl">
            <dt>Title</dt><dd>{selected.title}</dd>
            <dt>Category</dt><dd>{selected.category}</dd>
            <dt>Date</dt><dd>{formatDate(selected.date)}</dd>
            <dt>Time</dt><dd>{selected.startTime} – {selected.endTime}</dd>
            <dt>Location</dt><dd>{selected.location}</dd>
            <dt>Facilitator</dt><dd>{selected.facilitator}</dd>
            <dt>Department</dt><dd>{selected.departmentName || deptName(state.departments, selected.departmentId || '')}</dd>
            <dt>Audience</dt><dd>{selected.audience === 'all' ? 'All employees' : selected.audience === 'department' ? 'Department' : 'Selected employees'}</dd>
            <dt>Status</dt><dd>{selected.status}</dd>
            <dt>Description</dt><dd>{selected.description || '—'}</dd>
            <dt>Notes</dt><dd>{selected.notes || '—'}</dd>
            {detailPeople.length ? (
              <>
                <dt>Participants</dt>
                <dd>{detailPeople.map((p) => fullName(p)).join(', ')}</dd>
              </>
            ) : null}
          </dl>
        ) : null}
      </Modal>
    </>
  )
}
