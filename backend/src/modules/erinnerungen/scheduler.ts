import { prisma } from '../../db'
import { isDueOn, isLeapYear, parseLeadReminders, subtractOffset, describeLeadOffset } from './erinnerungen.service'
import { sendPush, PushPayload } from '../../services/push.service'

// Server läuft unter Passenger in Server-/UTC-Zeit, Uhrzeiten sind aber
// vom Nutzer in Europe/Berlin gedacht — Intl.DateTimeFormat übernimmt
// die korrekte Umrechnung inkl. Sommerzeit, ohne neue Abhängigkeit.
function getBerlinNow() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value])) as Record<string, string>

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hhmm: `${map.hour}:${map.minute}`,
    dateKey: `${map.year}-${map.month}-${map.day}`,
  }
}

// Legt eine Dedupe-Log-Zeile an (schlägt bei Doppel-Versand wegen des
// Unique-Constraints fehl) und verschickt nur bei Erfolg tatsächlich den Push.
async function fireOnce(
  kind: string,
  refId: string,
  scheduledFor: string,
  userId: string,
  payload: PushPayload,
): Promise<void> {
  try {
    await prisma.notificationLog.create({ data: { userId, kind, refId, scheduledFor } })
  } catch {
    return
  }
  await sendPush(userId, payload)
}

function isBirthdayOn(birthdayMonth: number, birthdayDay: number, target: { year: number; month: number; day: number }): boolean {
  if (birthdayMonth === 1 && birthdayDay === 29 && !isLeapYear(target.year)) {
    return target.month === 2 && target.day === 28
  }
  return target.month === birthdayMonth + 1 && target.day === birthdayDay
}

function addDays(
  target: { year: number; month: number; day: number },
  days: number,
): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(target.year, target.month - 1, target.day))
  d.setUTCDate(d.getUTCDate() + days)
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() }
}

export async function runErinnerungenCheck(): Promise<void> {
  try {
    const berlin = getBerlinNow()
    const todayUtcMidnight = new Date(Date.UTC(berlin.year, berlin.month - 1, berlin.day))
    const scheduledFor = `${berlin.dateKey} ${berlin.hhmm}`

    const reminders = await prisma.reminder.findMany({ where: { active: true, completedAt: null } })
    for (const reminder of reminders) {
      const times = Array.isArray(reminder.times) ? (reminder.times as string[]) : []
      if (!times.includes(berlin.hhmm)) continue
      if (!isDueOn(reminder, todayUtcMidnight)) continue
      await fireOnce('reminder', reminder.id, scheduledFor, reminder.userId, {
        title: `🔔 ${reminder.title}`,
        body: reminder.note || 'Erinnerung',
        url: '/erinnerungen',
      })
    }

    // Vorab-Erinnerungen (nur ONCE, z.B. "6 Monate vorher: Hotel buchen")
    // — unabhängig vom obigen Termin-Check, eigener refId pro Listenindex,
    // damit mehrere Vorab-Erinnerungen derselben Erinnerung nicht kollidieren.
    for (const reminder of reminders) {
      if (reminder.recurrence !== 'ONCE') continue
      const leads = parseLeadReminders(reminder.leadReminders)
      for (let index = 0; index < leads.length; index++) {
        const lead = leads[index]
        if (lead.time !== berlin.hhmm) continue
        const leadDate = subtractOffset(reminder.startDate, lead.offsetN, lead.offsetUnit)
        if (leadDate.getTime() !== todayUtcMidnight.getTime()) continue
        await fireOnce('reminder_lead', `${reminder.id}:${index}`, scheduledFor, reminder.userId, {
          title: `📅 ${reminder.title}`,
          body: `${describeLeadOffset(lead)} fällig${reminder.note ? ' — ' + reminder.note : ''}`,
          url: '/erinnerungen',
        })
      }
    }

    if (berlin.hhmm === '10:00' || berlin.hhmm === '20:00') {
      const in3Days = addDays(berlin, 3)
      const people = await prisma.person.findMany()
      for (const person of people) {
        const birthdayMonth = person.birthday.getUTCMonth()
        const birthdayDay = person.birthday.getUTCDate()
        const isToday = isBirthdayOn(birthdayMonth, birthdayDay, berlin)

        if (berlin.hhmm === '10:00' && isBirthdayOn(birthdayMonth, birthdayDay, in3Days)) {
          await fireOnce('birthday_upcoming', person.id, scheduledFor, person.userId, {
            title: '🎂 Geburtstag in 3 Tagen',
            body: `${person.firstName}${person.lastName ? ' ' + person.lastName : ''} hat in 3 Tagen Geburtstag.`,
            url: '/erinnerungen/geburtstage',
          })
        }

        if (!isToday) continue

        if (berlin.hhmm === '10:00') {
          await fireOnce('birthday_morning', person.id, scheduledFor, person.userId, {
            title: '🎂 Geburtstag heute',
            body: `${person.firstName}${person.lastName ? ' ' + person.lastName : ''} hat heute Geburtstag!`,
            url: '/erinnerungen/geburtstage',
          })
        }

        if (berlin.hhmm === '20:00' && person.congratsCheckEnabled) {
          const status = await prisma.personCongratsLog.findUnique({
            where: { personId_year: { personId: person.id, year: berlin.year } },
          })
          if (status?.congratulated) continue
          await fireOnce('birthday_checkin', person.id, scheduledFor, person.userId, {
            title: '🎉 Schon gratuliert?',
            body: `Hast du ${person.firstName} zum Geburtstag gratuliert?`,
            url: '/erinnerungen/geburtstage',
          })
        }
      }
    }
  } catch (error) {
    console.error('[Erinnerungen] Scheduler-Fehler:', error)
  }
}

export function startErinnerungenScheduler(): void {
  setInterval(runErinnerungenCheck, 60_000)
  console.log('🔔 Erinnerungen-Scheduler gestartet (Prüfung jede Minute)')
}
