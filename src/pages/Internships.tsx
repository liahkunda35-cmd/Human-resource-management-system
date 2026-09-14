import { useMemo, useState } from 'react'
import { useStore } from '../store/Store'
import { Badge, Button, DataTable, FormActions, Modal, PageHeader, RowActions, statusTone } from '../components/ui'
import { formatDate } from '../lib/format'
import { openDataUrl, readFileAsDataURL } from '../lib/files'
import type { Internship, InternshipApplicationStatus, InternshipStatus } from '../types'

const APP_STATUSES: InternshipApplicationStatus[] = [
  'Pending',
  'Under Review',
  'Shortlisted',
  'Accepted',
  'Rejected',
]

export function InternshipsPage() {
  const {
    state,
    currentUser,
    saveInternship,
    setInternshipStatus,
    deleteInternship,
    applyInternship,
    reviewInternshipApplication,
    toast,
  } = useStore()
  const isStaff = currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'super_admin'
  const [tab, setTab] = useState<'announcements' | 'applications' | 'opportunities'>(
    isStaff ? 'announcements' : 'opportunities',
  )
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Internship | null>(null)
  const [applyId, setApplyId] = useState<string | null>(null)
  const [appDetail, setAppDetail] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [departmentId, setDepartmentId] = useState(state.departments[0]?.id ?? '')
  const [description, setDescription] = useState('')
  const [requirements, setRequirements] = useState('')
  const [location, setLocation] = useState('Lusaka')
  const [duration, setDuration] = useState('3 Months')
  const [deadline, setDeadline] = useState('')
  const [status, setStatus] = useState<InternshipStatus>('Open')

  const [message, setMessage] = useState('')
  const [phone, setPhone] = useState(currentUser?.phone ?? '')
  const [cvName, setCvName] = useState<string | null>(null)
  const [cvData, setCvData] = useState<string | null>(null)
  const [cvMime, setCvMime] = useState<string | null>(null)

  const pendingApps = state.internshipApplications.filter((a) => a.status === 'Pending').length
  const openPosts = state.internships.filter((i) => i.status === 'Open')
  const selectedApp = state.internshipApplications.find((a) => a.id === appDetail)
  const applyPost = state.internships.find((i) => i.id === applyId)

  const myApps = useMemo(
    () => state.internshipApplications.filter((a) => a.applicantId === currentUser?.id),
    [currentUser?.id, state.internshipApplications],
  )

  function openCreate() {
    setEditing(null)
    setTitle('')
    setDepartmentId(state.departments[0]?.id ?? '')
    setDescription('')
    setRequirements('')
    setLocation('Lusaka')
    setDuration('3 Months')
    setDeadline('')
    setStatus('Open')
    setFormOpen(true)
  }

  function openEdit(item: Internship) {
    setEditing(item)
    setTitle(item.title)
    setDepartmentId(item.departmentId)
    setDescription(item.description)
    setRequirements(item.requirements)
    setLocation(item.location)
    setDuration(item.duration)
    setDeadline(item.deadline)
    setStatus(item.status)
    setFormOpen(true)
  }

  if (!currentUser) return null

  return (
    <>
      <PageHeader
        kicker="Talent pipeline"
        title="Internship Management"
        lede={isStaff ? 'Publish opportunities and review applications.' : 'Browse open internships and submit an application.'}
        actions={isStaff ? <Button variant="gold" onClick={openCreate}>New announcement</Button> : null}
      />

      <div className="filters">
        {isStaff ? (
          <>
            <Button variant={tab === 'announcements' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('announcements')}>Announcements</Button>
            <Button variant={tab === 'applications' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('applications')}>
              Applications{pendingApps ? ` · ${pendingApps} new` : ''}
            </Button>
          </>
        ) : null}
        <Button variant={tab === 'opportunities' ? 'primary' : 'ghost'} size="sm" onClick={() => setTab('opportunities')}>
          Opportunities
        </Button>
      </div>

      {isStaff && tab === 'announcements' ? (
        <DataTable empty={state.internships.length === 0} emptyTitle="No internships yet" emptyBody="Create an announcement to get started.">
          <thead>
            <tr>
              <th>Title</th>
              <th>Department</th>
              <th>Deadline</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.internships.map((i) => {
              const dept = state.departments.find((d) => d.id === i.departmentId)
              return (
                <tr key={i.id}>
                  <td><strong style={{ color: 'var(--ink)' }}>{i.title}</strong></td>
                  <td>{dept?.name ?? '—'}</td>
                  <td>{formatDate(i.deadline)}</td>
                  <td><Badge tone={statusTone(i.status)}>{i.status}</Badge></td>
                  <td>
                    <RowActions items={[
                      { label: 'Edit', onClick: () => openEdit(i) },
                      { label: i.status === 'Open' ? 'Close' : 'Publish', onClick: () => setInternshipStatus(i.id, i.status === 'Open' ? 'Closed' : 'Open') },
                      { label: 'Delete', danger: true, onClick: () => deleteInternship(i.id) },
                    ]} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </DataTable>
      ) : null}

      {isStaff && tab === 'applications' ? (
        <DataTable empty={state.internshipApplications.length === 0} emptyTitle="No applications" emptyBody="Applications will appear here when candidates apply.">
          <thead>
            <tr>
              <th>Applicant</th>
              <th>Internship</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Applied</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.internshipApplications.map((a) => {
              const post = state.internships.find((i) => i.id === a.internshipId)
              return (
                <tr key={a.id}>
                  <td><strong style={{ color: 'var(--ink)' }}>{a.name}</strong></td>
                  <td>{post?.title ?? '—'}</td>
                  <td>{a.email}</td>
                  <td>{a.phone || '—'}</td>
                  <td>{formatDate(a.submittedAt)}</td>
                  <td><Badge tone={statusTone(a.status)}>{a.status}</Badge></td>
                  <td>
                    <RowActions items={[
                      { label: 'Review', onClick: () => setAppDetail(a.id) },
                    ]} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </DataTable>
      ) : null}

      {tab === 'opportunities' || (!isStaff && tab !== 'announcements') ? (
        <>
          <DataTable empty={openPosts.length === 0} emptyTitle="No open internships" emptyBody="Check back when HR publishes new opportunities.">
            <thead>
              <tr>
                <th>Title</th>
                <th>Department</th>
                <th>Location</th>
                <th>Duration</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {openPosts.map((i) => {
                const dept = state.departments.find((d) => d.id === i.departmentId)
                const mine = myApps.find((a) => a.internshipId === i.id)
                return (
                  <tr key={i.id}>
                    <td>
                      <strong style={{ color: 'var(--ink)' }}>{i.title}</strong>
                      <div className="lede" style={{ marginTop: 4, maxWidth: 320 }}>{i.description.slice(0, 120)}{i.description.length > 120 ? '…' : ''}</div>
                    </td>
                    <td>{dept?.name ?? '—'}</td>
                    <td>{i.location}</td>
                    <td>{i.duration}</td>
                    <td>{formatDate(i.deadline)}</td>
                    <td><Badge tone={statusTone(i.status)}>{mine ? mine.status : i.status}</Badge></td>
                    <td>
                      <RowActions items={[
                        {
                          label: mine ? 'Applied' : 'Apply for Internship',
                          hidden: Boolean(mine),
                          onClick: () => {
                            setApplyId(i.id)
                            setMessage('')
                            setPhone(currentUser.phone)
                            setCvName(null)
                            setCvData(null)
                            setCvMime(null)
                          },
                        },
                      ]} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
          {!isStaff && myApps.length > 0 ? (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ marginBottom: 12 }}>My applications</h3>
              <DataTable empty={false} emptyTitle="" emptyBody="">
                <thead>
                  <tr>
                    <th>Internship</th>
                    <th>Submitted</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myApps.map((a) => (
                    <tr key={a.id}>
                      <td>{state.internships.find((i) => i.id === a.internshipId)?.title ?? '—'}</td>
                      <td>{formatDate(a.submittedAt)}</td>
                      <td><Badge tone={statusTone(a.status)}>{a.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          ) : null}
        </>
      ) : null}

      <Modal open={formOpen} title={editing ? 'Edit internship' : 'New internship announcement'} onClose={() => setFormOpen(false)}>
        <form onSubmit={(e) => {
          e.preventDefault()
          if (!currentUser) return
          const err = saveInternship({
            id: editing?.id,
            title,
            departmentId,
            description,
            requirements,
            location,
            duration,
            deadline,
            status,
          }, currentUser.id)
          if (err) toast(err, 'error')
          else setFormOpen(false)
        }}>
          <div className="field"><label>Internship title</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
          <div className="field" style={{ marginTop: 10 }}>
            <label>Department</label>
            <select className="select" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              {state.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="field" style={{ marginTop: 10 }}><label>Description</label><textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} required /></div>
          <div className="field" style={{ marginTop: 10 }}><label>Requirements</label><textarea className="textarea" value={requirements} onChange={(e) => setRequirements(e.target.value)} required /></div>
          <div className="row" style={{ marginTop: 10 }}>
            <div className="field"><label>Location</label><input className="input" value={location} onChange={(e) => setLocation(e.target.value)} required /></div>
            <div className="field"><label>Duration</label><input className="input" value={duration} onChange={(e) => setDuration(e.target.value)} required /></div>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <div className="field"><label>Application deadline</label><input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required /></div>
            <div className="field">
              <label>Status</label>
              <select className="select" value={status} onChange={(e) => setStatus(e.target.value as InternshipStatus)}>
                <option>Open</option>
                <option>Closed</option>
              </select>
            </div>
          </div>
          <FormActions onCancel={() => setFormOpen(false)} submitLabel={editing ? 'Save changes' : 'Publish announcement'} />
        </form>
      </Modal>

      <Modal open={Boolean(applyPost)} title="Apply for Internship" onClose={() => setApplyId(null)}>
        {applyPost ? (
          <form onSubmit={(e) => {
            e.preventDefault()
            const err = applyInternship({
              internshipId: applyPost.id,
              applicantId: currentUser.id,
              name: `${currentUser.firstName} ${currentUser.lastName}`,
              email: currentUser.email,
              phone,
              message,
              cvName,
              cvData,
              cvMime,
            })
            if (err) toast(err, 'error')
            else setApplyId(null)
          }}>
            <dl className="dl">
              <dt>Position</dt><dd>{applyPost.title}</dd>
              <dt>Requirements</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{applyPost.requirements}</dd>
            </dl>
            <div className="field" style={{ marginTop: 10 }}><label>Phone</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="field" style={{ marginTop: 10 }}><label>Cover letter / message</label><textarea className="textarea" value={message} onChange={(e) => setMessage(e.target.value)} required /></div>
            <div className="field" style={{ marginTop: 10 }}>
              <label>CV upload (optional)</label>
              <input
                className="input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    const read = await readFileAsDataURL(file)
                    setCvName(read.name)
                    setCvData(read.data)
                    setCvMime(read.mime)
                  } catch (err) {
                    toast(err instanceof Error ? err.message : 'Could not upload CV.', 'error')
                  }
                }}
              />
              {cvName ? <p className="lede" style={{ marginTop: 6 }}>{cvName}</p> : null}
            </div>
            <FormActions onCancel={() => setApplyId(null)} submitLabel="Submit application" />
          </form>
        ) : null}
      </Modal>

      <Modal open={Boolean(selectedApp)} title="Application review" onClose={() => setAppDetail(null)}>
        {selectedApp ? (
          <>
            <dl className="dl">
              <dt>Applicant</dt><dd>{selectedApp.name}</dd>
              <dt>Email</dt><dd>{selectedApp.email}</dd>
              <dt>Phone</dt><dd>{selectedApp.phone || '—'}</dd>
              <dt>Internship</dt><dd>{state.internships.find((i) => i.id === selectedApp.internshipId)?.title}</dd>
              <dt>Message</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{selectedApp.message}</dd>
              <dt>Status</dt><dd>{selectedApp.status}</dd>
              {selectedApp.cvData && selectedApp.cvName ? (
                <>
                  <dt>CV</dt>
                  <dd>
                    <Button type="button" variant="ghost" size="sm" onClick={() => openDataUrl(selectedApp.cvData!, selectedApp.cvName!)}>
                      View / download CV
                    </Button>
                  </dd>
                </>
              ) : null}
            </dl>
            <div className="field" style={{ marginTop: 12 }}>
              <label>Update status</label>
              <select
                className="select"
                value={selectedApp.status}
                onChange={(e) => {
                  reviewInternshipApplication(selectedApp.id, e.target.value as InternshipApplicationStatus, currentUser.id)
                }}
              >
                {APP_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </>
        ) : null}
      </Modal>
    </>
  )
}
