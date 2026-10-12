import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../store/Store'
import { Avatar, Badge, Button, DataTable, FormActions, Modal, PageHeader, RowActions, statusTone } from '../components/ui'
import type { EmploymentType, Gender } from '../types'
import { accountLifecycleLabel, fullName, roleLabel } from '../types'
import { todayISO } from '../lib/format'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/** Administrators create employee accounts. Temporary passwords are generated on the server. */
export function UsersPage() {
  const { state, currentUser, createEmployeeAccount, resendEmployeeCredentials, listSignupRequests, toast } = useStore()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [q, setQ] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [gender, setGender] = useState<Gender>('Female')
  const [departmentId, setDepartmentId] = useState('')
  const [position, setPosition] = useState('Team Member')
  const [employmentType, setEmploymentType] = useState<EmploymentType>('Full-time')
  const [dateJoined, setDateJoined] = useState(todayISO())
  const [basicSalary, setBasicSalary] = useState(8500)
  const [housingAllowance, setHousingAllowance] = useState(1500)
  const [transportAllowance, setTransportAllowance] = useState(1000)
  const [otherAllowance, setOtherAllowance] = useState(0)
  const [taxRate, setTaxRate] = useState(0.18)
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [signupRequests, setSignupRequests] = useState<{ id: string; firstName: string; lastName: string; name: string; email: string; createdAt: string }[]>([])
  const departments = state.departments.filter((d) => isUuid(d.id))
  const rows = useMemo(() => {
    const s = q.toLowerCase()
    return state.employees.filter((e) => {
      if (e.role !== 'employee') return false
      if (!isUuid(e.id)) return false
      if (!s) return true
      return `${fullName(e)} ${e.email} ${e.employeeId}`.toLowerCase().includes(s)
    })
  }, [q, state.employees])

  useEffect(() => {
    void listSignupRequests().then(setSignupRequests)
  }, [listSignupRequests, state.employees])

  if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
    return (
      <div className="card empty">
        <h3>Access Denied</h3>
        <p>Only Administrators can create employee accounts.</p>
      </div>
    )
  }

  function reset() {
    setFirstName('')
    setLastName('')
    setEmail('')
    setGender('Female')
    setDepartmentId(departments[0]?.id ?? '')
    setPosition('Team Member')
    setEmploymentType('Full-time')
    setDateJoined(todayISO())
    setBasicSalary(8500)
    setHousingAllowance(1500)
    setTransportAllowance(1000)
    setOtherAllowance(0)
    setTaxRate(0.18)
    setBankName('')
    setAccountNumber('')
  }

  return (
    <>
      <PageHeader
        kicker="People"
        title="Employee Accounts"
        lede="Create an employee record to generate an ID, invite login, and leave balances in one save."
        actions={<Button variant="gold" onClick={() => { reset(); setOpen(true) }}>Create Employee</Button>}
      />
      {signupRequests.length ? (
        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 10px' }}>Sign-up requests</h3>
          <p className="lede" style={{ marginBottom: 12 }}>These people submitted name and email. Create their account to send an activation email.</p>
          {signupRequests.map((request) => (
            <div key={request.id} className="person" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <strong style={{ color: 'var(--ink)' }}>{request.name || `${request.firstName} ${request.lastName}`}</strong>
                <div className="muted" style={{ fontSize: 12 }}>{request.email}</div>
              </div>
              <Button
                variant="gold"
                size="sm"
                onClick={() => {
                  reset()
                  setFirstName(request.firstName)
                  setLastName(request.lastName)
                  setEmail(request.email)
                  setOpen(true)
                }}
              >
                Create account
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="filters">
        <input className="input" placeholder="Search employees" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <DataTable empty={rows.length === 0} emptyTitle="No employee accounts" emptyBody="Create an employee account to get started.">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => {
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
              <td>{e.email}</td>
              <td><Badge tone="gold">{roleLabel(e.role)}</Badge></td>
              <td><Badge tone={statusTone(label)}>{label}</Badge></td>
              <td>
                <RowActions
                  items={[
                    {
                      label: 'Resend activation email',
                      hidden: e.accountStatus === 'inactive' || e.status === 'Inactive',
                      onClick: async () => {
                        const result = await resendEmployeeCredentials(e.id)
                        if (result.error) toast(result.error, 'error')
                      },
                    },
                  ]}
                />
              </td>
            </tr>
            )
          })}
        </tbody>
      </DataTable>

      <Modal open={open} title="Create Employee" onClose={() => !busy && setOpen(false)} wide>
        <form
          onSubmit={async (ev) => {
            ev.preventDefault()
            if (!departmentId) {
              toast('Choose a department.', 'error')
              return
            }
            if (!dateJoined) {
              toast('Start date is required.', 'error')
              return
            }
            setBusy(true)
            const result = await createEmployeeAccount({
              firstName,
              lastName,
              email,
              phone: '',
              position,
              departmentId,
              employmentType,
              gender,
              dateJoined,
              basicSalary,
              housingAllowance,
              transportAllowance,
              otherAllowance,
              taxRate,
              bankName,
              accountNumber,
            })
            setBusy(false)
            if (result.error) {
              toast(result.error, 'error')
              return
            }
            setOpen(false)
            reset()
          }}
        >
          <div className="row">
            <div className="field"><label>First name</label><input className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required /></div>
            <div className="field"><label>Last name</label><input className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required /></div>
            <div className="field"><label>Work email</label><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div className="field">
              <label>Gender</label>
              <select className="select" value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                <option>Female</option>
                <option>Male</option>
                <option>Non-binary</option>
              </select>
            </div>
            <div className="field">
              <label>Department</label>
              <select className="select" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} required>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="field"><label>Position</label><input className="input" value={position} onChange={(e) => setPosition(e.target.value)} required /></div>
            <div className="field">
              <label>Employment type</label>
              <select className="select" value={employmentType} onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Contract</option>
                <option>Intern</option>
              </select>
            </div>
            <div className="field"><label>Start date</label><input className="input" type="date" value={dateJoined} onChange={(e) => setDateJoined(e.target.value)} required /></div>
            <div className="field"><label>Basic salary</label><input className="input" type="number" min={0} value={basicSalary} onChange={(e) => setBasicSalary(Number(e.target.value))} /></div>
            <div className="field"><label>Housing allowance</label><input className="input" type="number" min={0} value={housingAllowance} onChange={(e) => setHousingAllowance(Number(e.target.value))} /></div>
            <div className="field"><label>Transport allowance</label><input className="input" type="number" min={0} value={transportAllowance} onChange={(e) => setTransportAllowance(Number(e.target.value))} /></div>
            <div className="field"><label>Other allowance</label><input className="input" type="number" min={0} value={otherAllowance} onChange={(e) => setOtherAllowance(Number(e.target.value))} /></div>
            <div className="field"><label>Tax rate</label><input className="input" type="number" min={0} step="0.01" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} /></div>
            <div className="field"><label>Bank name</label><input className="input" value={bankName} onChange={(e) => setBankName(e.target.value)} /></div>
            <div className="field"><label>Account number</label><input className="input" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} /></div>
          </div>
          <p className="muted" style={{ marginTop: 12, fontSize: 13 }}>
            Saving generates employee ID ZTS-YYNNN, stores a hashed password, and emails that ID with a 72-hour single-use activation link. The link token is stored only as a hash.
          </p>
          <FormActions onCancel={() => setOpen(false)} submitLabel={busy ? 'Creating…' : 'Create Employee'} />
        </form>
      </Modal>
    </>
  )
}
