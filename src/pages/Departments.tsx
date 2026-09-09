import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/Store'
import { Avatar, Button, ConfirmDialog, EmptyState, FormActions, Modal, PageHeader } from '../components/ui'
import { fullName } from '../types'
import { employeeName } from '../lib/format'

export function DepartmentsPage() {
  const { state, addDepartment, saveDepartment, deleteDepartment, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [managerId, setManagerId] = useState('')
  const [description, setDescription] = useState('')
  const [kill, setKill] = useState<string | null>(null)
  const [view, setView] = useState<string | null>(null)

  function startAdd() {
    setEditId(null)
    setName('')
    setManagerId(state.employees.find((e) => e.role === 'manager')?.id ?? '')
    setDescription('')
    setOpen(true)
  }

  function startEdit(id: string) {
    const d = state.departments.find((x) => x.id === id)
    if (!d) return
    setEditId(id)
    setName(d.name)
    setManagerId(d.managerId ?? '')
    setDescription(d.description)
    setOpen(true)
  }

  return (
    <>
      <PageHeader
        kicker="Organisation"
        title="Departments"
        lede="How ZamTech Solutions Ltd is composed — leaders, people, and purpose."
        actions={<Button variant="gold" onClick={startAdd}>Add department</Button>}
      />
      <div className="grid g-3">
        {state.departments.map((d) => {
          const count = state.employees.filter((e) => e.departmentId === d.id && e.status !== 'Inactive').length
          const mgr = state.employees.find((e) => e.id === d.managerId)
          return (
            <article key={d.id} className="card dept-card">
              <div className="kicker">{count} people</div>
              <h3>{d.name}</h3>
              <p className="lede">{d.description}</p>
              {mgr ? (
                <div className="person" style={{ margin: '12px 0' }}>
                  <Avatar employee={mgr} />
                  <div>
                    <strong>{fullName(mgr)}</strong>
                    <span>Department manager</span>
                  </div>
                </div>
              ) : <p className="lede">No manager assigned.</p>}
              <div className="actions">
                <Button size="sm" variant="ghost" onClick={() => setView(d.id)}>People</Button>
                <Button size="sm" variant="ghost" onClick={() => startEdit(d.id)}>Edit</Button>
                <Button size="sm" variant="danger" onClick={() => setKill(d.id)}>Delete</Button>
              </div>
            </article>
          )
        })}
      </div>
      <Modal open={open} title={editId ? 'Edit department' : 'Add department'} onClose={() => setOpen(false)}>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          const payload = { name, managerId: managerId || null, description }
          if (editId) saveDepartment(editId, payload)
          else addDepartment(payload)
          setOpen(false)
        }}>
          <div className="field"><label>Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Manager</label>
            <select className="select" value={managerId} onChange={(e) => setManagerId(e.target.value)}>
              <option value="">Unassigned</option>
              {state.employees.filter((e) => e.role !== 'employee').map((e) => <option key={e.id} value={e.id}>{fullName(e)}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Description</label>
            <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <FormActions onCancel={() => setOpen(false)} />
        </form>
      </Modal>
      <Modal open={Boolean(view)} title="Department people" onClose={() => setView(null)}>
        {state.employees.filter((e) => e.departmentId === view).map((e) => (
          <Link key={e.id} to={`/app/employees/${e.id}`} className="person" style={{ padding: '8px 0', textDecoration: 'none' }}>
            <Avatar employee={e} />
            <div><strong>{fullName(e)}</strong><span>{e.position}</span></div>
          </Link>
        ))}
        {view && state.employees.filter((e) => e.departmentId === view).length === 0 ? (
          <EmptyState title="Empty department" body="Assign people from the employee directory." />
        ) : null}
      </Modal>
      <ConfirmDialog
        open={Boolean(kill)}
        title="Delete department?"
        body="This cannot be undone. Active employees must be moved first."
        danger
        confirmLabel="Delete"
        onClose={() => setKill(null)}
        onConfirm={() => {
          if (!kill) return
          const err = deleteDepartment(kill)
          if (err) toast(err, 'error')
          setKill(null)
        }}
      />
    </>
  )
}

export function AnnouncementsPage() {
  const { state, currentUser, addAnnouncement, deleteAnnouncement } = useStore()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<'Meetings' | 'Holidays' | 'Policy' | 'Notice' | 'Events'>('Notice')
  const [pinned, setPinned] = useState(false)
  const canPublish = currentUser?.role === 'admin'

  return (
    <>
      <PageHeader
        kicker="Culture"
        title="Announcements"
        lede="Meetings, holidays, policy, and the notices that keep everyone aligned."
        actions={canPublish ? <Button variant="gold" onClick={() => setOpen(true)}>Publish</Button> : undefined}
      />
      <div className="grid g-3">
        {[...state.announcements].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date)).map((a) => (
          <article key={a.id} className="card">
            <div className="kicker">{a.category}{a.pinned ? ' · Pinned' : ''}</div>
            <h3>{a.title}</h3>
            <p className="lede">{a.body}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13, color: 'var(--muted)' }}>
              <span>{employeeName(state.employees, a.authorId)} · {a.date}</span>
              {canPublish ? <button className="btn btn-ghost btn-sm" type="button" onClick={() => deleteAnnouncement(a.id)}>Remove</button> : null}
            </div>
          </article>
        ))}
      </div>
      <Modal open={open} title="New announcement" onClose={() => setOpen(false)}>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (!currentUser) return
          addAnnouncement({ title, body, category, pinned }, currentUser.id)
          setOpen(false)
          setTitle('')
          setBody('')
        }}>
          <div className="field"><label>Title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Category</label>
            <select className="select" value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              <option>Meetings</option><option>Holidays</option><option>Policy</option><option>Notice</option><option>Events</option>
            </select>
          </div>
          <div className="field" style={{ marginTop: 10 }}><label>Description</label><textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} required /></div>
          <label className="check" style={{ marginTop: 10 }}><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to top</label>
          <FormActions onCancel={() => setOpen(false)} submitLabel="Publish" />
        </form>
      </Modal>
    </>
  )
}
