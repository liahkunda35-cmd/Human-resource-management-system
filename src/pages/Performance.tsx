import { useMemo, useState } from 'react'
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../store/Store'
import { Avatar, Button, FormActions, Modal, PageHeader, ProgressBar } from '../components/ui'
import { fullName } from '../types'
import { formatDate } from '../lib/format'

export function PerformancePage() {
  const { state, currentUser, addReview, addGoal, updateGoal } = useStore()
  const isSelf = currentUser?.role === 'employee'
  const people = useMemo(() => {
    if (!currentUser) return []
    if (currentUser.role === 'admin') return state.employees.filter((e) => e.status !== 'Inactive')
    if (currentUser.role === 'manager') return state.employees.filter((e) => e.departmentId === currentUser.departmentId)
    return state.employees.filter((e) => e.id === currentUser.id)
  }, [currentUser, state.employees])
  const [person, setPerson] = useState(people[0]?.id ?? '')
  const [openR, setOpenR] = useState(false)
  const [openG, setOpenG] = useState(false)
  const [rev, setRev] = useState({
    period: 'H2 2026',
    overall: 4,
    goalsAchieved: 3,
    strengths: '',
    improvements: '',
    managerComments: '',
    employeeComments: '',
  })
  const [goal, setGoal] = useState({ title: '', kpi: '', progress: 0, dueDate: '2026-12-01' })

  const reviews = state.reviews.filter((r) => r.employeeId === (isSelf ? currentUser?.id : person))
  const goals = state.goals.filter((g) => g.employeeId === (isSelf ? currentUser?.id : person))
  const trend = reviews.map((r) => ({ period: r.period, rating: r.overall })).reverse()

  return (
    <>
      <PageHeader
        kicker="Growth"
        title="Performance"
        lede="Ratings, goals, and a record of how people are becoming more themselves at work."
        actions={!isSelf ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={() => setOpenG(true)}>Set goal</Button>
            <Button variant="gold" onClick={() => setOpenR(true)}>Write review</Button>
          </div>
        ) : undefined}
      />
      {!isSelf ? (
        <div className="filters">
          <select className="select" value={person} onChange={(e) => setPerson(e.target.value)}>
            {people.map((e) => <option key={e.id} value={e.id}>{fullName(e)}</option>)}
          </select>
        </div>
      ) : null}
      <div className="grid g-3">
        <div className="card stat">
          <div className="label">Overall rating</div>
          <div className="value">{reviews[0]?.overall.toFixed(1) ?? '—'}</div>
          <div className="hint">{reviews[0]?.period ?? 'No review yet'}</div>
        </div>
        <div className="card stat">
          <div className="label">Goals achieved</div>
          <div className="value">{reviews[0]?.goalsAchieved ?? 0}</div>
        </div>
        <div className="card stat">
          <div className="label">Open goals</div>
          <div className="value">{goals.filter((g) => g.progress < 100).length}</div>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><h3>Trend</h3></div>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend.length ? trend : [{ period: '—', rating: 0 }]}>
              <CartesianGrid stroke="#eee6d8" vertical={false} />
              <XAxis dataKey="period" stroke="#8a8278" fontSize={12} />
              <YAxis domain={[0, 5]} stroke="#8a8278" fontSize={12} />
              <Tooltip />
              <Line type="monotone" dataKey="rating" stroke="#a8844e" strokeWidth={2} dot={{ r: 4, fill: '#c4a574' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="grid g-2">
        <div className="card">
          <div className="card-head"><h3>Reviews</h3></div>
          {reviews.map((r) => (
            <article key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid #f0e8dc' }}>
              <strong>{r.period}</strong> · {r.overall}/5
              <p><em>Strengths.</em> {r.strengths}</p>
              <p><em>Improve.</em> {r.improvements}</p>
              <p className="lede">Manager: {r.managerComments}</p>
              <p className="lede">Employee: {r.employeeComments}</p>
            </article>
          ))}
        </div>
        <div className="card">
          <div className="card-head"><h3>Goals & KPIs</h3></div>
          {goals.map((g) => (
            <div key={g.id} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>{g.title}</strong>
                <span>{g.progress}%</span>
              </div>
              <div className="lede">{g.kpi} · due {formatDate(g.dueDate)}</div>
              <ProgressBar value={g.progress} />
              {!isSelf ? (
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={g.progress}
                  onChange={(e) => updateGoal(g.id, { progress: Number(e.target.value) })}
                  style={{ width: '100%', marginTop: 6 }}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <Modal open={openR} title="Performance review" onClose={() => setOpenR(false)}>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (!currentUser) return
          addReview({ ...rev, employeeId: person, reviewerId: currentUser.id })
          setOpenR(false)
        }}>
          <div className="row">
            <div className="field"><label>Period</label><input className="input" value={rev.period} onChange={(e) => setRev({ ...rev, period: e.target.value })} /></div>
            <div className="field"><label>Rating 1–5</label><input className="input" type="number" min={1} max={5} step={0.1} value={rev.overall} onChange={(e) => setRev({ ...rev, overall: Number(e.target.value) })} /></div>
          </div>
          <div className="field" style={{ marginTop: 8 }}><label>Goals achieved</label><input className="input" type="number" value={rev.goalsAchieved} onChange={(e) => setRev({ ...rev, goalsAchieved: Number(e.target.value) })} /></div>
          <div className="field" style={{ marginTop: 8 }}><label>Strengths</label><textarea className="textarea" value={rev.strengths} onChange={(e) => setRev({ ...rev, strengths: e.target.value })} /></div>
          <div className="field" style={{ marginTop: 8 }}><label>Areas for improvement</label><textarea className="textarea" value={rev.improvements} onChange={(e) => setRev({ ...rev, improvements: e.target.value })} /></div>
          <div className="field" style={{ marginTop: 8 }}><label>Manager comments</label><textarea className="textarea" value={rev.managerComments} onChange={(e) => setRev({ ...rev, managerComments: e.target.value })} /></div>
          <div className="field" style={{ marginTop: 8 }}><label>Employee comments</label><textarea className="textarea" value={rev.employeeComments} onChange={(e) => setRev({ ...rev, employeeComments: e.target.value })} /></div>
          <FormActions onCancel={() => setOpenR(false)} submitLabel="Save review" />
        </form>
      </Modal>
      <Modal open={openG} title="New goal" onClose={() => setOpenG(false)}>
        <form onSubmit={(e) => {
          e.preventDefault()
          addGoal({ ...goal, employeeId: person })
          setOpenG(false)
        }}>
          <div className="field"><label>Title</label><input className="input" value={goal.title} onChange={(e) => setGoal({ ...goal, title: e.target.value })} required /></div>
          <div className="field" style={{ marginTop: 8 }}><label>KPI</label><input className="input" value={goal.kpi} onChange={(e) => setGoal({ ...goal, kpi: e.target.value })} /></div>
          <div className="field" style={{ marginTop: 8 }}><label>Due</label><input className="input" type="date" value={goal.dueDate} onChange={(e) => setGoal({ ...goal, dueDate: e.target.value })} /></div>
          <FormActions onCancel={() => setOpenG(false)} />
        </form>
      </Modal>
    </>
  )
}

export function TasksPage() {
  const { state, currentUser, addTask, updateTask, deleteTask } = useStore()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', assigneeId: '', dueDate: '2026-09-20', priority: 'Medium' as const, status: 'To Do' as const })
  const canAssign = currentUser?.role !== 'employee'
  const list = state.tasks.filter((t) => {
    if (currentUser?.role === 'admin') return true
    if (currentUser?.role === 'manager') {
      const team = state.employees.filter((e) => e.departmentId === currentUser.departmentId).map((e) => e.id)
      return team.includes(t.assigneeId) || t.assignerId === currentUser.id
    }
    return t.assigneeId === currentUser?.id
  })
  const assignees = currentUser?.role === 'manager'
    ? state.employees.filter((e) => e.departmentId === currentUser.departmentId)
    : state.employees.filter((e) => e.status !== 'Inactive')

  return (
    <>
      <PageHeader
        kicker="Work"
        title="Tasks"
        lede="Assigned work with owners, dates, and a clear status."
        actions={canAssign ? <Button variant="gold" onClick={() => setOpen(true)}>Assign task</Button> : undefined}
      />
      <div className="grid g-3">
        {list.map((t) => {
          const a = state.employees.find((e) => e.id === t.assigneeId)
          return (
            <article key={t.id} className="card">
              <div className="kicker">{t.priority} · {t.status}</div>
              <h3>{t.title}</h3>
              <p className="lede">{t.description}</p>
              {a ? <div className="person" style={{ margin: '8px 0' }}><Avatar employee={a} /><span>{fullName(a)} · due {formatDate(t.dueDate)}</span></div> : null}
              <select className="select" value={t.status} onChange={(e) => updateTask(t.id, { status: e.target.value as typeof t.status })}>
                <option>To Do</option><option>In Progress</option><option>Done</option>
              </select>
              {canAssign ? <Button size="sm" variant="ghost" style={{ marginTop: 8 }} onClick={() => deleteTask(t.id)}>Remove</Button> : null}
            </article>
          )
        })}
      </div>
      <Modal open={open} title="Assign task" onClose={() => setOpen(false)}>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (!currentUser) return
          addTask({ ...form, assignerId: currentUser.id, assigneeId: form.assigneeId || assignees[0]?.id || currentUser.id })
          setOpen(false)
        }}>
          <div className="field"><label>Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="field" style={{ marginTop: 8 }}><label>Description</label><textarea className="textarea" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="field" style={{ marginTop: 8 }}>
            <label>Assignee</label>
            <select className="select" value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })}>
              {assignees.map((e) => <option key={e.id} value={e.id}>{fullName(e)}</option>)}
            </select>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <div className="field"><label>Due</label><input className="input" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            <div className="field">
              <label>Priority</label>
              <select className="select" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as typeof form.priority })}>
                <option>Low</option><option>Medium</option><option>High</option>
              </select>
            </div>
          </div>
          <FormActions onCancel={() => setOpen(false)} submitLabel="Assign" />
        </form>
      </Modal>
    </>
  )
}
