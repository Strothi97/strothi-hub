import { useEffect, useState } from 'react'
import { farsiService } from '@services/farsi.service'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { StudyCard } from './StudyCard'
import { MODE_LABELS, DIRECTION_LABELS, DIRECTION_ORDER, buildStudyQueue } from './studySession'
import type { QueueItem } from './studySession'
import type { FarsiStudyDirection, FarsiStudyMode, FarsiStudySession } from '@app-types/farsi'

const MODE_ORDER: FarsiStudyMode[] = ['VOCAB', 'SCRIPT']

const INELIGIBLE_HINTS: Record<FarsiStudyMode, (count: number) => string> = {
  VOCAB: (count) => `${count} Begriffe fehlt noch Deutsch oder Farsi (Lautschrift/Schrift) — im Wörterbuch ergänzen.`,
  SCRIPT: (count) => `${count} Begriffen fehlt noch die Originalschrift — im Wörterbuch ergänzen, um sie hier zu üben.`,
}

type Phase = 'setup' | 'session' | 'summary'

export function Karteikarten() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [mode, setMode] = useState<FarsiStudyMode>('VOCAB')
  const [direction, setDirection] = useState<FarsiStudyDirection>('MIXED')
  const [sessionData, setSessionData] = useState<FarsiStudySession | null>(null)
  const [loading, setLoading] = useState(true)

  const [queue, setQueue] = useState<QueueItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState<boolean[]>([])

  const loadSession = (forMode: FarsiStudyMode) => {
    setLoading(true)
    farsiService
      .getStudySession(forMode)
      .then(({ data }) => setSessionData(data))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadSession(mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  const handleStart = () => {
    if (!sessionData || sessionData.cards.length === 0) return
    setQueue(buildStudyQueue(mode, direction, sessionData.cards))
    setCurrentIndex(0)
    setFlipped(false)
    setResults([])
    setPhase('session')
  }

  const handleJudge = async (correct: boolean) => {
    const current = queue[currentIndex]
    await farsiService.reviewCard(current.entry.id, mode, correct)
    const nextResults = [...results, correct]
    setResults(nextResults)
    setFlipped(false)
    if (currentIndex + 1 >= queue.length) {
      setPhase('summary')
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  const handleRestart = () => {
    setPhase('setup')
    loadSession(mode)
  }

  const handleCancel = () => {
    setPhase('setup')
    loadSession(mode)
  }

  if (phase === 'session' && queue[currentIndex]) {
    const current = queue[currentIndex]
    return (
      <div>
        <div className="farsi-study-session-header">
          <p className="farsi-study-progress">
            Karte {currentIndex + 1} / {queue.length}
          </p>
          <button type="button" className="farsi-study-cancel" onClick={handleCancel}>
            Abbrechen
          </button>
        </div>
        <StudyCard
          key={current.entry.id}
          entry={current.entry}
          front={current.front}
          back={current.back}
          flipped={flipped}
          onFlip={() => setFlipped(true)}
          onKnown={() => handleJudge(true)}
          onUnknown={() => handleJudge(false)}
        />
      </div>
    )
  }

  if (phase === 'summary') {
    const known = results.filter(Boolean).length
    return (
      <Card className="farsi-study-result-summary">
        <h2>Runde beendet</h2>
        <p>
          {results.length} Karten geübt · {known} gewusst · {results.length - known} nicht gewusst
        </p>
        <Button onClick={handleRestart}>Neue Runde</Button>
      </Card>
    )
  }

  return (
    <div className="farsi-study-setup">
      <div className="farsi-study-mode-picker">
        {MODE_ORDER.map((option) => (
          <button
            key={option}
            type="button"
            className={`tool-chip ${mode === option ? 'is-active' : ''}`.trim()}
            onClick={() => setMode(option)}
          >
            {MODE_LABELS[option]}
          </button>
        ))}
      </div>

      {loading ? (
        <p>Lädt…</p>
      ) : (
        <>
          <p>
            Fällig heute: {sessionData?.dueCount ?? 0} · Diese Runde: {sessionData?.cards.length ?? 0}
          </p>
          {!!sessionData?.ineligibleCount && (
            <p className="farsi-study-ineligible-hint">{INELIGIBLE_HINTS[mode](sessionData.ineligibleCount)}</p>
          )}

          <div className="farsi-filters">
            {DIRECTION_ORDER.map((option) => (
              <button
                key={option}
                type="button"
                className={`tool-chip ${direction === option ? 'is-active' : ''}`.trim()}
                onClick={() => setDirection(option)}
              >
                {DIRECTION_LABELS[mode][option]}
              </button>
            ))}
          </div>

          <Button onClick={handleStart} disabled={!sessionData || sessionData.cards.length === 0}>
            {sessionData && sessionData.cards.length === 0 ? 'Keine Karten fällig 🎉' : "Los geht's"}
          </Button>
        </>
      )}
    </div>
  )
}
