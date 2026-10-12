import test from 'node:test'
import assert from 'node:assert/strict'
import { countLeaveDays, leaveEligibilityError } from './leavePolicy.js'

test('maternity leave is limited to female employees', () => {
  assert.equal(leaveEligibilityError('Female', 'Maternity Leave', 'female'), null)
  assert.match(leaveEligibilityError('Male', 'Maternity Leave', 'female'), /female employees/i)
  assert.match(leaveEligibilityError('Non-binary', 'Maternity Leave', 'female'), /female employees/i)
})

test('paternity leave is limited to male employees', () => {
  assert.equal(leaveEligibilityError('Male', 'Paternity Leave', 'male'), null)
  assert.match(leaveEligibilityError('Female', 'Paternity Leave', 'male'), /male employees/i)
})

  test('gender-neutral leave stays open', () => {
  for (const type of ['Annual Leave', 'Sick Leave', 'Compassionate Leave', 'Study Leave']) {
    assert.equal(leaveEligibilityError('Female', type, null), null)
    assert.equal(leaveEligibilityError('Male', type, null), null)
  }
})

test('gender matching is case-insensitive', () => {
  assert.equal(leaveEligibilityError('female', 'Maternity Leave', 'female'), null)
  assert.equal(leaveEligibilityError('MALE', 'Paternity Leave', 'male'), null)
})

test('leave days skip weekends', () => {
  assert.equal(countLeaveDays('2026-09-07', '2026-09-11'), 5)
  assert.equal(countLeaveDays('2026-09-12', '2026-09-13'), 1)
})
