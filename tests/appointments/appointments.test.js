import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dueReminders, durationLabel, relativeDay, splitAppointments } from '../../src/lib/appointments.js'

const rdv = (id, date, time, extra = {}) => ({ id, title: id, date, time, duration: 3600, ...extra })
const now = new Date('2026-11-12T10:00:00')

test('à venir triés du plus proche, passés du plus récent ; un RDV en cours reste à venir', () => {
  const list = [rdv('demain', '2026-11-13', '09:00'), rdv('en-cours', '2026-11-12', '09:30'), rdv('hier', '2026-11-11', '15:00'), rdv('vieux', '2026-10-01', '15:00')]
  const { upcoming, past } = splitAppointments(list, now)
  assert.deepEqual(upcoming.map(a => a.id), ['en-cours', 'demain'])
  assert.deepEqual(past.map(a => a.id), ['hier', 'vieux'])
})

test('rappel : dans la fenêtre seulement, 15 min par défaut, jamais si désactivé', () => {
  const list = [
    rdv('defaut', '2026-11-12', '10:10'),
    rdv('trop-tot', '2026-11-12', '10:30'),
    rdv('une-heure', '2026-11-12', '10:45', { reminderMin: 60 }),
    rdv('sans', '2026-11-12', '10:05', { reminderMin: null }),
    rdv('passe', '2026-11-12', '09:00'),
  ]
  assert.deepEqual(dueReminders(list, now).map(a => a.id), ['defaut', 'une-heure'])
})

test('libellés de durée et de jour', () => {
  assert.equal(durationLabel(1800), '30 min')
  assert.equal(durationLabel(5400), '1 h 30')
  assert.equal(durationLabel(7200), '2 h')
  assert.equal(relativeDay('2026-11-12', now), "Aujourd'hui")
  assert.equal(relativeDay('2026-11-13', now), 'Demain')
})
