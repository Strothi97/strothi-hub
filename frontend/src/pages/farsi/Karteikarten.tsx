import { useEffect, useState } from 'react'
import { farsiService } from '@services/farsi.service'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { StudyCard } from './StudyCard'
import { LetterStudyCard } from './LetterStudyCard'
import { MODE_LABELS, DIRECTION_LABELS, DIRECTION_ORDER, buildStudyQueue, formatDays } from './studySession'
import { buildLetterQueue, getDueLetterCount, LETTER_SESSION_SIZE } from './letterStudy'
import type { QueueItem } from './studySession'
import type { LetterQueueItem } from './letterStudy'
import type {
  FarsiKarteikartenMode,
  FarsiLetterProgress,
  FarsiStreak,
  FarsiStudyDirection,
  FarsiStudyMode,
  FarsiStudySession,
} from '@app-types/farsi'

const MODE_ORDER: FarsiKarteikartenMode[] = ['VOCAB', 'SCRIPT', 'LETTERS']

const INELIGIBLE_HINTS: Record<FarsiStudyMode, (count: number) => string> = {
  VOCAB: (count) => `${count} Begriffe fehlt noch Deutsch oder Farsi (Lautschrift/Schrift) — im Wörterbuch ergänzen.`,
  SCRIPT: (count) => `${count} Begriffen fehlt noch die Originalschrift — im Wörterbuch ergänzen, um sie hier zu üben.`,
}

type Phase = 'setup' | 'session' | 'summary'

export function Karteikarten() {
  const [phase, setPhase] = useState<Phase>('setup')
  const [mode, setMode] = useState<FarsiKarteikartenMode>('VOCAB')
  const [direction, setDirection] = useState<FarsiStudyDirection>('MIXED')
  const [sessionData, setSessionData] = useState<FarsiStudySession | null>(null)
  const [letterProgress, setLetterProgress] = useState<FarsiLetterProgress[] | null>(null)
  const [streak, setStreak] = useState<FarsiStreak | null>(null)
  const [loading, setLoading] = useState(true)

  const [queue, setQueue] = useState<QueueItem[]>([])
  const [letterQueue, setLetterQueue] = useState<LetterQueueItem[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState<boolean[]>([])

  const loadSession = (forMode: FarsiKarteikartenMode) => {
    setLoading(true)
    if (forMode === 'LETTERS') {
      farsiService
        .getLetterProgress()
        .then(({ data }) => setLetterProgress(data.progress))
        .finally(() => setLoading(false))
    } else {
      farsiService
        .getStudySession(forMode)
        .then(({ data }) => setSessionData(data))
        .finally(() => setLoading(false))
    }
  }

  useEffect(() => {
    loadSession(mode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    farsiService.getStreak().then(({ data }) => setStreak(data))
  }, [])

  const handleStart = () => {
    if (mode === 'LETTERS') {
      const built = buildLetterQueue(letterProgress ?? [])
      if (built.length === 0) return
      setLetterQueue(built)
      setQueue([])
    } else {
      if (!sessionData || sessionData.cards.length === 0) return
      setQueue(buildStudyQueue(mode, direction, sessionData.cards))
      setLetterQueue([])
    }
    setCurrentIndex(0)
    setFlipped(false)
    setResults([])
    setPhase('session')
  }

  const handleJudge = async (correct: boolean) => {
    if (mode === 'LETTERS') {
      const current = letterQueue[currentIndex]
      await farsiService.reviewLetter(current.letter.char, current.position, correct)
    } else {
      const current = queue[currentIndex]
      await farsiService.reviewCard(current.entry.id, mode, correct)
    }
    const nextResults = [...results, correct]
    setResults(nextResults)
    setFlipped(false)
    const total = mode === 'LETTERS' ? letterQueue.length : queue.length
    if (currentIndex + 1 >= total) {
      setPhase('summary')
      farsiService.getStreak().then(({ data }) => setStreak(data))
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

  const handleSwitchMode = (newMode: FarsiKarteikartenMode) => {
    setPhase('setup')
    setMode(newMode)
  }

  if (phase === 'session' && mode === 'LETTERS' && letterQueue[currentIndex]) {
    const current = letterQueue[currentIndex]
    return (
      <div>
        <div className="farsi-study-session-header">
          <p className="farsi-study-progress">
            Karte {currentIndex + 1} / {letterQueue.length}
          </p>
          <button type="button" className="farsi-study-cancel" onClick={handleCancel}>
            Abbrechen
          </button>
        </div>
        <LetterStudyCard
          key={`${current.letter.char}-${current.position}`}
          letter={current.letter}
          position={current.position}
          flipped={flipped}
          onFlip={() => setFlipped(true)}
          onKnown={() => handleJudge(true)}
          onUnknown={() => handleJudge(false)}
        />
      </div>
    )
  }

  if (phase === 'session' && mode !== 'LETTERS' && queue[currentIndex]) {
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
        {!!streak && streak.currentStreak > 0 && <p>🔥 {formatDays(streak.currentStreak)} in Folge</p>}
        <Button onClick={handleRestart}>Neue Runde</Button>

        <div className="farsi-study-mode-picker farsi-study-mode-picker--summary">
          {MODE_ORDER.map((option) => (
            <button
              key={option}
              type="button"
              className={`tool-chip ${mode === option ? 'is-active' : ''}`.trim()}
              onClick={() => handleSwitchMode(option)}
            >
              {MODE_LABELS[option]}
            </button>
          ))}
        </div>
      </Card>
    )
  }

  const dueCount = mode === 'LETTERS' ? getDueLetterCount(letterProgress ?? []) : sessionData?.dueCount ?? 0
  const sessionSize =
    mode === 'LETTERS'
      ? Math.min(dueCount, LETTER_SESSION_SIZE)
      : sessionData?.cards.length ?? 0
  const canStart = mode === 'LETTERS' ? dueCount > 0 : !!sessionData && sessionData.cards.length > 0

  return (
    <div className="farsi-study-setup">
      {!!streak && streak.currentStreak > 0 && (
        <p className="farsi-study-streak">🔥 {formatDays(streak.currentStreak)} in Folge</p>
      )}

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
          <p className="farsi-study-due-line">
            Fällig heute: {dueCount} · Diese Runde: {sessionSize}
          </p>
          {mode !== 'LETTERS' && !!sessionData?.ineligibleCount && (
            <p className="farsi-study-ineligible-hint">{INELIGIBLE_HINTS[mode](sessionData.ineligibleCount)}</p>
          )}

          {mode !== 'LETTERS' && (
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
          )}

          <Button onClick={handleStart} disabled={!canStart}>
            {!canStart ? 'Keine Karten fällig 🎉' : "Los geht's"}
          </Button>
        </>
      )}
    </div>
  )
}
