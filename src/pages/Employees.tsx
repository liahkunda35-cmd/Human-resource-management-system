import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Download, Plus, Search } from 'lucide-react'
import { useStore } from '../store/Store'
import { Avatar, Badge, Button, ConfirmDialog, DataTable, EmptyState, Field, FormActions, Modal, PageHeader, RowActions, Tabs, statusTone } from '../components/ui'
import { deptName, downloadText, formatDate, toCSV, todayISO } from '../lib/format'
import type { Employee, EmploymentStatus, EmploymentType, Gender } from '../types'
import { accountLifecycleLabel, fullName } from '../types'
import { AttendanceCalendar } from '../components/ClockWidget'

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  gender: 'Female' as Gender,
  dateOfBirth: '',
  departmentId: '',
  position: '',
  employmentType: 'Full-time' as EmploymentType,
  dateJoined: '',
  managerId: '',
  status: 'Active' as EmploymentStatus,
  role: 'employee' as Employee['role'],
  basicSalary: 8500,
  housingAllowance: 1500,
  transportAllowance: 1000,
  otherAllowance: 0,
  taxRate: 0.18,
  bankName: '',
  accountNumber: '',
  emergencyContact: '',
  emergencyPhone: '',
}

export function EmployeesPage() {
  const { state, currentUser, createEmployeeAccount, saveEmployee, deactivateEmployee } = useStore()
  const [q, setQ] = useState('')
  const [dept, setDept] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState<'name' | 'joined'>('name')
  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [kill, setKill] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()
  const location = useLocation() as { state?: { openAdd?: boolean } }

  const scoped = useMemo(() => {
    let list = state.employees
    if (currentUser?.role === 'manager') {
      list = list.filter((e) => e.departmentId === currentUser.departmentId)
    }
    if (q) {
      const s = q.toLowerCase()
      list = list.filter((e) => `${fullName(e)} ${e.email} ${e.employeeId} ${e.position}`.toLowerCase().includes(s))
    }
    if (dept !== 'all') list = list.filter((e) => e.departmentId === dept)
    if (status !== 'all') {
      list = list.filter((e) => accountLifecycleLabel(e) === status)
    }
    return [...list].sort((a, b) =>
      sort === 'name' ? fullName(a).localeCompare(fullName(b)) : b.dateJoined.localeCompare(a.dateJoined),
    )
  }, [state.employees, currentUser, q, dept, status, sort])

  function openAdd() {
    setEditId(null)
    setForm({ ...emptyForm, departmentId: state.departments[0]?.id ?? '', dateJoined: todayISO() })
    setErrors({})
    setOpen(true)
  }

  useEffect(() => {
    if (!location.state?.openAdd) return
    setEditId(null)
    setForm({ ...emptyForm, departmentId: state.departments[0]?.id ?? '', dateJoined: todayISO() })
    setErrors({})
    setOpen(true)
    navigate('/app/employees', { replace: true, state: {} })
  }, [location.state, navigate, state.departments])

  function openEdit(e: Employee) {
    setEditId(e.id)
    setForm({
      firstName: e.firstName,
      lastName: e.lastName,
      email: e.email,
      phone: e.phone,
      address: e.address,
      gender: e.gender,
      dateOfBirth: e.dateOfBirth,
      departmentId: e.departmentId,
      position: e.position,
      employmentType: e.employmentType,
      dateJoined: e.dateJoined,
      managerId: e.managerId ?? '',
      status: e.status,
      role: e.role,
      basicSalary: e.basicSalary,
      housingAllowance: e.housingAllowance,
      transportAllowance: e.transportAllowance,
      otherAllowance: e.otherAllowance,
      taxRate: e.taxRate,
      bankName: e.bankName,
      accountNumber: e.accountNumber,
      emergencyContact: e.emergencyContact,
      emergencyPhone: e.emergencyPhone,
    })
    setErrors({})
    setOpen(true)
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!form.firstName.trim()) e.firstName = 'Required'
    if (!form.lastName.trim()) e.lastName = 'Required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.phone.trim()) e.phone = 'Required'
    if (!form.departmentId) e.departmentId = 'Required'
    if (!form.dateJoined) e.dateJoined = 'Required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function save() {
    if (!validate()) return
    setSaving(true)
    if (editId) {
      const err = await saveEmployee(editId, { ...form, managerId: form.managerId || null })
      setSaving(false)
      if (!err) setOpen(false)
      return
    }
    const result = await createEmployeeAccount({
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      address: form.address,
      gender: form.gender,
      dateOfBirth: form.dateOfBirth,
      departmentId: form.departmentId,
      position: form.position,
      employmentType: form.employmentType,
      dateJoined: form.dateJoined,
      basicSalary: form.basicSalary,
      housingAllowance: form.housingAllowance,
      transportAllowance: form.transportAllowance,
      otherAllowance: form.otherAllowance,
      taxRate: form.taxRate,
      bankName: form.bankName,
      accountNumber: form.accountNumber,
    })
    setSaving(false)
    if (result.error) return
    setOpen(false)
  }

  function exportCsv() {
    const csv = toCSV(
      ['ID', 'Name', 'Department', 'Position', 'Phone', 'Email', 'Status', 'Joined'],
      scoped.map((e) => [
        e.employeeId,
        fullName(e),
        deptName(state.departments, e.departmentId),
        e.position,
        e.phone,
        e.email,
        e.status,
        e.dateJoined,
      ]),
    )
    downloadText('aurelia-employees.csv', csv)
  }

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.role === 'manager'

  return (
    <>
      <PageHeader
        kicker="Directory"
        title="Employees"
        lede="Search, filter, and keep every people record current."
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" onClick={exportCsv}><Download size={16} /> Export</Button>
            {canEdit ? <Button variant="gold" onClick={openAdd}><Plus size={16} /> Add employee</Button> : null}
          </div>
        }
      />
      <div className="filters">
        <div className="search" style={{ maxWidth: 280 }}>
          <Search size={16} />
          <input placeholder="Search people" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" value={dept} onChange={(e) => setDept(e.target.value)}>
          <option value="all">All departments</option>
          {state.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {['Active', 'Invited', 'Expired', 'On Leave', 'Probation', 'Inactive'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select className="select" value={sort} onChange={(e) => setSort(e.target.value as 'name' | 'joined')}>
          <option value="name">Sort by name</option>
          <option value="joined">Sort by joined</option>
        </select>
      </div>
      <DataTable empty={scoped.length === 0} emptyTitle="No people match" emptyBody="Adjust filters or add a new employee record.">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Department</th>
            <th>Position</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {scoped.map((e) => {
            const label = accountLifecycleLabel(e)
            return (
            <tr key={e.id}>
              <td>
                <div className="person">
                  <Avatar employee={e} size="sm" />
                  <div>
                    <strong style={{ color: 'var(--ink)' }}>{fullName(e)}</strong>
                    <div className="muted" style={{ fontSize: 12 }}>{e.employeeId}</div>
                  </div>
                </div>
              </td>
              <td>{deptName(state.departments, e.departmentId)}</td>
              <td>{e.position}</td>
              <td><Badge tone={statusTone(label)}>{label}</Badge></td>
              <td>
                <RowActions items={[
                  { label: 'View', onClick: () => navigate(`/app/employees/${e.id}`) },
                  { label: 'Edit', hidden: !canEdit, onClick: () => openEdit(e) },
                  { label: 'Deactivate', danger: true, hidden: !canEdit, onClick: () => setKill(e.id) },
                ]} />
              </td>
            </tr>
            )
          })}
        </tbody>
      </DataTable>
      <Modal open={open} title={editId ? 'Edit employee' : 'Add employee'} onClose={() => setOpen(false)} wide>
        <form onSubmit={(e) => { e.preventDefault(); void save() }}>
        <div className="row">
          <Field label="First name" error={errors.firstName}><input className="input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></Field>
          <Field label="Last name" error={errors.lastName}><input className="input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></Field>
          <Field label="Email" error={errors.email}><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone" error={errors.phone}><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Gender">
            <select className="select" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as Gender })}>
              <option>Female</option><option>Male</option><option>Non-binary</option>
            </select>
          </Field>
          <Field label="Date of birth"><input className="input" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></Field>
          <Field label="Department" error={errors.departmentId}>
            <select className="select" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              {state.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Position" error={errors.position}>
            <input className="input" list="pos" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            <datalist id="pos">{state.positions.map((p) => <option key={p.id} value={p.title} />)}</datalist>
          </Field>
          <Field label="Employment type">
            <select className="select" value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value as EmploymentType })}>
              <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Intern</option>
            </select>
          </Field>
          <Field label="Start date" error={errors.dateJoined}><input className="input" type="date" value={form.dateJoined} onChange={(e) => setForm({ ...form, dateJoined: e.target.value })} /></Field>
          <Field label="Manager">
            <select className="select" value={form.managerId} onChange={(e) => setForm({ ...form, managerId: e.target.value })}>
              <option value="">None</option>
              {state.employees.filter((e) => e.role !== 'employee').map((e) => <option key={e.id} value={e.id}>{fullName(e)}</option>)}
            </select>
          </Field>
          {editId ? (
          <Field label="Status">
            <select className="select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as EmploymentStatus })}>
              <option>Active</option><option>On Leave</option><option>Probation</option><option>Inactive</option>
            </select>
          </Field>
          ) : null}
          <Field label="Basic salary"><input className="input" type="number" value={form.basicSalary} onChange={(e) => setForm({ ...form, basicSalary: Number(e.target.value) })} /></Field>
          <Field label="Housing allowance"><input className="input" type="number" value={form.housingAllowance} onChange={(e) => setForm({ ...form, housingAllowance: Number(e.target.value) })} /></Field>
          <Field label="Transport allowance"><input className="input" type="number" value={form.transportAllowance} onChange={(e) => setForm({ ...form, transportAllowance: Number(e.target.value) })} /></Field>
          <Field label="Other allowance"><input className="input" type="number" value={form.otherAllowance} onChange={(e) => setForm({ ...form, otherAllowance: Number(e.target.value) })} /></Field>
          <Field label="Tax rate"><input className="input" type="number" step="0.01" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} /></Field>
          <Field label="Bank name"><input className="input" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} /></Field>
          <Field label="Account number"><input className="input" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} /></Field>
        </div>
        <Field label="Address"><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
          <FormActions onCancel={() => setOpen(false)} submitLabel={saving ? 'Saving…' : editId ? 'Save changes' : 'Create employee'} />
        </form>
      </Modal>
      <ConfirmDialog
        open={Boolean(kill)}
        title="Deactivate this employee?"
        body="They will no longer be able to sign in, and open sessions stop immediately. Historical records are kept."
        confirmLabel="Deactivate"
        danger
        onClose={() => setKill(null)}
        onConfirm={() => {
          if (kill) deactivateEmployee(kill)
          setKill(null)
        }}
      />
    </>
  )
}

export function EmployeeProfilePage() {
  const { id } = useParams()
  const { state, currentUser } = useStore()
  const [tab, setTab] = useState('Personal')
  const emp = state.employees.find((e) => e.id === id)
  if (!emp) return <EmptyState title="Not found" body="This employee record does not exist." action={<Link to="/app/employees">Back to directory</Link>} />
  if (currentUser?.role === 'manager' && emp.departmentId !== currentUser.departmentId) {
    return <EmptyState title="Outside your team" body="Managers can only open people in their department." />
  }
  const manager = state.employees.find((e) => e.id === emp.managerId)
  const att = state.attendance.filter((a) => a.employeeId === emp.id).slice(0, 12)
  const leave = state.leaveRequests.filter((l) => l.employeeId === emp.id)

  const lifecycle = accountLifecycleLabel(emp)
  return (
    <>
      <PageHeader kicker={emp.employeeId} title={fullName(emp)} lede={`${emp.position} · ${deptName(state.departments, emp.departmentId)}`} actions={<Badge tone={statusTone(lifecycle)}>{lifecycle}</Badge>} />
      <div className="card" style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
        <Avatar employee={emp} size="lg" />
        <div>
          <div className="kicker">{emp.role}</div>
          <h3 style={{ margin: 0 }}>{emp.email}</h3>
          <p className="lede">{emp.phone} · Joined {formatDate(emp.dateJoined)}</p>
        </div>
      </div>
      <Tabs tabs={['Personal', 'Employment', 'Attendance', 'Leave']} value={tab} onChange={setTab} />
      {tab === 'Personal' && (
        <div className="card">
          <dl className="dl">
            <dt>Full name</dt><dd>{fullName(emp)}</dd>
            <dt>Gender</dt><dd>{emp.gender}</dd>
            <dt>Date of birth</dt><dd>{formatDate(emp.dateOfBirth)}</dd>
            <dt>Phone</dt><dd>{emp.phone}</dd>
            <dt>Email</dt><dd>{emp.email}</dd>
            <dt>Address</dt><dd>{emp.address}</dd>
            <dt>Emergency</dt><dd>{emp.emergencyContact} · {emp.emergencyPhone}</dd>
          </dl>
        </div>
      )}
      {tab === 'Employment' && (
        <div className="card">
          <dl className="dl">
            <dt>Employee ID</dt><dd>{emp.employeeId}</dd>
            <dt>Department</dt><dd>{deptName(state.departments, emp.departmentId)}</dd>
            <dt>Position</dt><dd>{emp.position}</dd>
            <dt>Type</dt><dd>{emp.employmentType}</dd>
            <dt>Date joined</dt><dd>{formatDate(emp.dateJoined)}</dd>
            <dt>Manager</dt><dd>{manager ? fullName(manager) : '—'}</dd>
            <dt>Status</dt><dd>{emp.status}</dd>
          </dl>
        </div>
      )}
      {tab === 'Attendance' && (
        <>
          <div className="card"><AttendanceCalendar employeeId={emp.id} /></div>
          <DataTable empty={att.length === 0} emptyTitle="No attendance" emptyBody="Clock records will show here.">
            <thead>
              <tr>
                <th>Date</th>
                <th>In</th>
                <th>Out</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {att.map((a) => (
                <tr key={a.id}>
                  <td>{formatDate(a.date)}</td>
                  <td>{a.clockIn ?? '—'}</td>
                  <td>{a.clockOut ?? '—'}</td>
                  <td><Badge tone={statusTone(a.status)}>{a.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </>
      )}
      {tab === 'Leave' && (
        <DataTable empty={leave.length === 0} emptyTitle="No leave" emptyBody="Leave requests for this person will appear here.">
          <thead>
            <tr>
              <th>Type</th>
              <th>Dates</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {leave.map((l) => (
              <tr key={l.id}>
                <td>{l.type}</td>
                <td>{formatDate(l.startDate)} – {formatDate(l.endDate)}</td>
                <td><Badge tone={statusTone(l.status)}>{l.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  )
}
