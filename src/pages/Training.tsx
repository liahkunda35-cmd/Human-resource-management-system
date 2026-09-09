import { useState } from 'react'
import { useStore } from '../store/Store'
import { Badge, Button, ConfirmDialog, EmptyState, FormActions, Modal, PageHeader, ProgressBar, statusTone } from '../components/ui'
import { formatDate } from '../lib/format'
import { fullName } from '../types'
import type { DocumentCategory, TrainingStatus } from '../types'

export function TrainingPage() {
  const { state, currentUser, addTraining, assignTraining, updateTrainingProgress } = useStore()
  const [open, setOpen] = useState(false)
  const [assign, setAssign] = useState<string | null>(null)
  const [emp, setEmp] = useState(state.employees[0]?.id ?? '')
  const [form, setForm] = useState({
    title: '',
    description: '',
    trainer: '',
    date: '2026-10-15',
    duration: '4 hours',
    location: 'ZamTech boardroom, Lusaka',
    status: 'Upcoming' as TrainingStatus,
  })
  const isHr = currentUser?.role === 'admin'
  const my = state.trainingAssignments.filter((a) => a.employeeId === currentUser?.id)

  return (
    <>
      <PageHeader
        kicker="Learning"
        title="Training"
        lede="Programmes, progress, and certificates — development as a practice."
        actions={isHr ? <Button variant="gold" onClick={() => setOpen(true)}>Create programme</Button> : undefined}
      />
      {!isHr ? (
        <div className="grid g-3">
          <div className="card stat"><div className="label">Upcoming</div><div className="value">{my.filter((a) => !a.completed).length}</div></div>
          <div className="card stat"><div className="label">Completed</div><div className="value">{my.filter((a) => a.completed).length}</div></div>
          <div className="card stat"><div className="label">Certificates</div><div className="value">{my.filter((a) => a.certificate).length}</div></div>
        </div>
      ) : null}
      <div className="grid g-2">
        {state.trainings.map((t) => {
          const assigned = state.trainingAssignments.filter((a) => a.trainingId === t.id)
          const mine = assigned.find((a) => a.employeeId === currentUser?.id)
          return (
            <article key={t.id} className="card">
              <div className="kicker">{t.trainer} · {t.duration}</div>
              <h3>{t.title}</h3>
              <p className="lede">{t.description}</p>
              <p>{formatDate(t.date)} · {t.location}</p>
              <Badge tone={statusTone(t.status)}>{t.status}</Badge>
              {mine ? (
                <div style={{ marginTop: 12 }}>
                  <div className="card-head"><span>Your progress</span><span>{mine.progress}%</span></div>
                  <ProgressBar value={mine.progress} />
                  <input type="range" min={0} max={100} value={mine.progress} onChange={(e) => updateTrainingProgress(mine.id, Number(e.target.value))} style={{ width: '100%', marginTop: 8 }} />
                  {mine.certificate ? <Badge tone="gold">Certificate earned</Badge> : null}
                </div>
              ) : null}
              {isHr ? (
                <>
                  <p className="lede" style={{ marginTop: 10 }}>{assigned.length} people assigned</p>
                  <Button size="sm" variant="ghost" onClick={() => setAssign(t.id)}>Assign employee</Button>
                </>
              ) : null}
            </article>
          )
        })}
      </div>
      <Modal open={open} title="Training programme" onClose={() => setOpen(false)}>
        <form onSubmit={(e) => { e.preventDefault(); addTraining(form); setOpen(false) }}>
          <div className="field"><label>Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="field" style={{ marginTop: 8 }}><label>Description</label><textarea className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="row" style={{ marginTop: 8 }}>
            <div className="field"><label>Trainer</label><input className="input" value={form.trainer} onChange={(e) => setForm({ ...form, trainer: e.target.value })} /></div>
            <div className="field"><label>Date</label><input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <div className="field"><label>Duration</label><input className="input" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} /></div>
            <div className="field"><label>Location</label><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          </div>
          <FormActions onCancel={() => setOpen(false)} />
        </form>
      </Modal>
      <Modal open={Boolean(assign)} title="Assign employee" onClose={() => setAssign(null)}>
        <form onSubmit={(e) => { e.preventDefault(); if (assign) assignTraining(assign, emp); setAssign(null) }}>
          <select className="select" value={emp} onChange={(e) => setEmp(e.target.value)}>
            {state.employees.filter((e) => e.status !== 'Inactive').map((e) => <option key={e.id} value={e.id}>{fullName(e)}</option>)}
          </select>
          <FormActions onCancel={() => setAssign(null)} submitLabel="Assign" />
        </form>
      </Modal>
    </>
  )
}

export function DocumentsPage() {
  const { state, currentUser, addDocument, deleteDocument } = useStore()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [kill, setKill] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: '',
    category: 'Policies' as DocumentCategory,
    ownerId: '' as string,
    visibility: 'all' as 'all' | 'employee' | 'hr',
    size: '120 KB',
    content: '',
  })
  const isHr = currentUser?.role === 'admin'
  const docs = state.documents.filter((d) => {
    if (currentUser?.role === 'employee') {
      if (d.visibility === 'hr') return false
      if (d.visibility === 'employee' && d.ownerId && d.ownerId !== currentUser.id) return false
    }
    if (q && !d.name.toLowerCase().includes(q.toLowerCase())) return false
    if (cat !== 'all' && d.category !== cat) return false
    return true
  })
  const doc = state.documents.find((d) => d.id === preview)

  return (
    <>
      <PageHeader
        kicker="Records"
        title="Documents"
        lede="Contracts, policies, and personal files — with permission, not clutter."
        actions={isHr ? <Button variant="gold" onClick={() => setOpen(true)}>Upload</Button> : undefined}
      />
      <div className="filters">
        <input className="input" placeholder="Search documents" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">All categories</option>
          {['Contracts', 'Offer letters', 'Certificates', 'Policies', 'Performance', 'Other'].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
        {docs.length === 0 ? <EmptyState title="Nothing here" body="Try another filter, or ask Human Resources to share a file." /> : (
        <div className="grid g-3">
          {docs.map((d) => (
            <article key={d.id} className="card">
              <div className="kicker">{d.category}</div>
              <h3>{d.name}</h3>
              <p className="lede">{d.size} · {formatDate(d.uploadedAt)}</p>
              <div className="actions">
                <Button size="sm" variant="ghost" onClick={() => setPreview(d.id)}>Preview</Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  const blob = new Blob([d.content], { type: 'text/plain' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `${d.name}.txt`
                  a.click()
                  URL.revokeObjectURL(url)
                }}>Download</Button>
                {isHr ? <Button size="sm" variant="danger" onClick={() => setKill(d.id)}>Delete</Button> : null}
              </div>
            </article>
          ))}
        </div>
      )}
      <Modal open={open} title="Upload document" onClose={() => setOpen(false)}>
        <form onSubmit={(e) => {
          e.preventDefault()
          addDocument({ ...form, ownerId: form.ownerId || null })
          setOpen(false)
        }}>
          <div className="field"><label>Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="field" style={{ marginTop: 8 }}>
            <label>Category</label>
            <select className="select" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as DocumentCategory })}>
              <option>Contracts</option><option>Offer letters</option><option>Certificates</option><option>Policies</option><option>Performance</option><option>Other</option>
            </select>
          </div>
          <div className="field" style={{ marginTop: 8 }}>
            <label>Visibility</label>
            <select className="select" value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value as typeof form.visibility })}>
              <option value="all">Everyone</option>
              <option value="employee">Specific employee</option>
              <option value="hr">HR only</option>
            </select>
          </div>
          {form.visibility === 'employee' ? (
            <div className="field" style={{ marginTop: 8 }}>
              <label>Employee</label>
              <select className="select" value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
                {state.employees.map((e) => <option key={e.id} value={e.id}>{fullName(e)}</option>)}
              </select>
            </div>
          ) : null}
          <div className="field" style={{ marginTop: 8 }}><label>Content</label><textarea className="textarea" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} /></div>
          <FormActions onCancel={() => setOpen(false)} submitLabel="Upload" />
        </form>
      </Modal>
      <Modal open={Boolean(doc)} title={doc?.name ?? 'Preview'} onClose={() => setPreview(null)}>
        <p className="lede">{doc?.content}</p>
      </Modal>
      <ConfirmDialog
        open={Boolean(kill)}
        title="Delete document?"
        body="This file will be removed from the library."
        danger
        confirmLabel="Delete"
        onClose={() => setKill(null)}
        onConfirm={() => { if (kill) deleteDocument(kill); setKill(null) }}
      />
    </>
  )
}
