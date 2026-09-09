import { useMemo, useState } from 'react'
import { useStore } from '../store/Store'
import { Badge, Button, FormActions, Modal, PageHeader, statusTone } from '../components/ui'
import type { EmploymentType, PipelineStage, VacancyStatus } from '../types'
import { deptName, formatDate } from '../lib/format'

const STAGES: PipelineStage[] = ['Applied', 'Screening', 'Shortlisted', 'Interview', 'Selected', 'Hired', 'Rejected']

export function RecruitmentPage() {
  const { state, addVacancy, saveVacancy, deleteVacancy, addApplication, moveApplication, scheduleInterview } = useStore()
  const [openJob, setOpenJob] = useState(false)
  const [openApp, setOpenApp] = useState<string | null>(null)
  const [openInt, setOpenInt] = useState<string | null>(null)
  const [job, setJob] = useState({
    title: '',
    departmentId: state.departments[0]?.id ?? '',
    location: 'Lusaka · Hybrid',
    employmentType: 'Full-time' as EmploymentType,
    description: '',
    closingDate: '2026-10-01',
    status: 'Open' as VacancyStatus,
  })
  const [cand, setCand] = useState({ candidateName: '', email: '', phone: '', notes: '', stage: 'Applied' as PipelineStage })
  const [intv, setIntv] = useState({ scheduledAt: '2026-09-12T10:00', interviewer: '', location: 'ZamTech Lusaka', notes: '' })
  const [q, setQ] = useState('')
  const [jobStatus, setJobStatus] = useState('all')

  const visibleJobs = state.vacancies.filter((v) => {
    if (jobStatus !== 'all' && v.status !== jobStatus) return false
    if (!q.trim()) return true
    return `${v.title} ${v.location} ${deptName(state.departments, v.departmentId)}`.toLowerCase().includes(q.toLowerCase())
  })

  const counts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of state.applications) map[a.vacancyId] = (map[a.vacancyId] ?? 0) + 1
    return map
  }, [state.applications])

  return (
    <>
      <PageHeader
        kicker="Talent"
        title="Recruitment"
        lede="Vacancies, a living pipeline, and interviews without the scramble."
        actions={<Button variant="gold" onClick={() => setOpenJob(true)}>Create vacancy</Button>}
      />
      <div className="filters">
        <input className="input" placeholder="Search position or location" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="select" value={jobStatus} onChange={(e) => setJobStatus(e.target.value)}>
          <option value="all">All statuses</option>
          <option>Open</option>
          <option>Closed</option>
          <option>On Hold</option>
        </select>
      </div>
      <div className="grid g-3">
        {visibleJobs.map((v) => (
          <article key={v.id} className="card">
            <div className="kicker">{deptName(state.departments, v.departmentId)}</div>
            <h3>{v.title}</h3>
            <p className="lede">{v.location} · {v.employmentType}</p>
            <p className="lede">{v.description}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
              <Badge tone="gold">{counts[v.id] ?? 0} applicants</Badge>
              <Badge>Closes {formatDate(v.closingDate)}</Badge>
              <Badge tone={statusTone(v.status)}>{v.status}</Badge>
            </div>
            <div className="actions">
              <Button size="sm" variant="ghost" onClick={() => setOpenApp(v.id)}>Add applicant</Button>
              <Button size="sm" variant="ghost" onClick={() => saveVacancy(v.id, { status: v.status === 'Open' ? 'Closed' : 'Open' })}>
                {v.status === 'Open' ? 'Close' : 'Reopen'}
              </Button>
              <Button size="sm" variant="danger" onClick={() => deleteVacancy(v.id)}>Delete</Button>
            </div>
          </article>
        ))}
      </div>
      <div className="card">
        <div className="card-head"><h3>Pipeline</h3></div>
        <div className="pipeline">
          {STAGES.map((stage) => (
            <div key={stage} className="pipe-col">
              <h4>{stage}</h4>
              {state.applications.filter((a) => {
                if (a.stage !== stage) return false
                if (!q.trim()) return true
                const v = state.vacancies.find((x) => x.id === a.vacancyId)
                return `${a.candidateName} ${v?.title ?? ''}`.toLowerCase().includes(q.toLowerCase())
              }).map((a) => {
                const v = state.vacancies.find((x) => x.id === a.vacancyId)
                return (
                  <div key={a.id} className="cand">
                    <strong>{a.candidateName}</strong>
                    <div className="lede">{v?.title}</div>
                    <select
                      className="select"
                      style={{ marginTop: 8, padding: 6 }}
                      value={a.stage}
                      onChange={(e) => moveApplication(a.id, e.target.value as PipelineStage)}
                    >
                      {STAGES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <Button size="sm" variant="ghost" style={{ marginTop: 6 }} onClick={() => setOpenInt(a.id)}>Interview</Button>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
      <Modal open={openJob} title="New vacancy" onClose={() => setOpenJob(false)}>
        <form onSubmit={(e) => { e.preventDefault(); addVacancy(job); setOpenJob(false) }}>
          <div className="field"><label>Position</label><input className="input" value={job.title} onChange={(e) => setJob({ ...job, title: e.target.value })} required /></div>
          <div className="field" style={{ marginTop: 8 }}>
            <label>Department</label>
            <select className="select" value={job.departmentId} onChange={(e) => setJob({ ...job, departmentId: e.target.value })}>
              {state.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="row" style={{ marginTop: 8 }}>
            <div className="field"><label>Location</label><input className="input" value={job.location} onChange={(e) => setJob({ ...job, location: e.target.value })} /></div>
            <div className="field">
              <label>Type</label>
              <select className="select" value={job.employmentType} onChange={(e) => setJob({ ...job, employmentType: e.target.value as EmploymentType })}>
                <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Intern</option>
              </select>
            </div>
          </div>
          <div className="field" style={{ marginTop: 8 }}><label>Closing date</label><input className="input" type="date" value={job.closingDate} onChange={(e) => setJob({ ...job, closingDate: e.target.value })} /></div>
          <div className="field" style={{ marginTop: 8 }}><label>Description</label><textarea className="textarea" value={job.description} onChange={(e) => setJob({ ...job, description: e.target.value })} /></div>
          <FormActions onCancel={() => setOpenJob(false)} submitLabel="Publish" />
        </form>
      </Modal>
      <Modal open={Boolean(openApp)} title="New application" onClose={() => setOpenApp(null)}>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (!openApp) return
          addApplication({ ...cand, vacancyId: openApp })
          setOpenApp(null)
        }}>
          <div className="field"><label>Candidate</label><input className="input" value={cand.candidateName} onChange={(e) => setCand({ ...cand, candidateName: e.target.value })} required /></div>
          <div className="row" style={{ marginTop: 8 }}>
            <div className="field"><label>Email</label><input className="input" type="email" value={cand.email} onChange={(e) => setCand({ ...cand, email: e.target.value })} required /></div>
            <div className="field"><label>Phone</label><input className="input" value={cand.phone} onChange={(e) => setCand({ ...cand, phone: e.target.value })} /></div>
          </div>
          <div className="field" style={{ marginTop: 8 }}><label>Notes</label><textarea className="textarea" value={cand.notes} onChange={(e) => setCand({ ...cand, notes: e.target.value })} /></div>
          <FormActions onCancel={() => setOpenApp(null)} submitLabel="Add to pipeline" />
        </form>
      </Modal>
      <Modal open={Boolean(openInt)} title="Schedule interview" onClose={() => setOpenInt(null)}>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (!openInt) return
          scheduleInterview({ applicationId: openInt, ...intv, scheduledAt: new Date(intv.scheduledAt).toISOString() })
          setOpenInt(null)
        }}>
          <div className="field"><label>When</label><input className="input" type="datetime-local" value={intv.scheduledAt} onChange={(e) => setIntv({ ...intv, scheduledAt: e.target.value })} /></div>
          <div className="field" style={{ marginTop: 8 }}><label>Interviewer</label><input className="input" value={intv.interviewer} onChange={(e) => setIntv({ ...intv, interviewer: e.target.value })} required /></div>
          <div className="field" style={{ marginTop: 8 }}><label>Location</label><input className="input" value={intv.location} onChange={(e) => setIntv({ ...intv, location: e.target.value })} /></div>
          <div className="field" style={{ marginTop: 8 }}><label>Notes</label><textarea className="textarea" value={intv.notes} onChange={(e) => setIntv({ ...intv, notes: e.target.value })} /></div>
          <FormActions onCancel={() => setOpenInt(null)} submitLabel="Schedule" />
        </form>
      </Modal>
    </>
  )
}
