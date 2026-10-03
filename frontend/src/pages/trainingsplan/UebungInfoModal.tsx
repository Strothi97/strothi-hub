import type { Exercise } from '@app-types/trainingsplan'

interface UebungInfoModalProps {
  exercise: Exercise
  onClose: () => void
}

// Die "So geht's"-Anleitung — bewusst aufwendiger gestaltet als Kochbuchs
// schlichte Zubereitungsschritte-Liste (Wunsch): großes Titelbild, jeder
// Abschnitt als eigene Karte mit nummeriertem Badge, Bild und Text
// alternierend links/rechts (mehr Abwechslung als eine reine Liste), auf
// dem Handy stapeln die Karten automatisch (siehe trainingsplan.css).
export function UebungInfoModal({ exercise, onClose }: UebungInfoModalProps) {
  return (
    <div className="farsi-modal-backdrop" onClick={onClose}>
      <div
        className="farsi-modal trainingsplan-info-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`So geht's: ${exercise.name}`}
      >
        <span className="farsi-modal__handle" aria-hidden="true" />
        <button type="button" className="trainingsplan-info-modal__close" onClick={onClose} aria-label="Schließen">
          ×
        </button>

        {exercise.imageUrl && (
          <div className="trainingsplan-info-modal__hero">
            <img src={exercise.imageUrl} alt={exercise.name} />
          </div>
        )}

        <h2 className="trainingsplan-info-modal__title">{exercise.name}</h2>

        {exercise.infoSections.length === 0 ? (
          <p className="admin-empty-state">Noch keine Anleitung hinterlegt.</p>
        ) : (
          <div className="trainingsplan-info-modal__sections">
            {exercise.infoSections.map((section, index) => (
              <div
                key={index}
                className={`trainingsplan-info-section ${
                  index % 2 === 1 ? 'trainingsplan-info-section--reverse' : ''
                }`.trim()}
              >
                {section.imageUrl && (
                  <div className="trainingsplan-info-section__photo">
                    <img src={section.imageUrl} alt="" />
                  </div>
                )}
                <div className="trainingsplan-info-section__body">
                  <span className="trainingsplan-info-section__number">{index + 1}</span>
                  {section.title && <h3>{section.title}</h3>}
                  {section.text && <p>{section.text}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
