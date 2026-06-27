/**
 * Progress Indicator Component
 *
 * Shows questionnaire completion progress with section navigation.
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * Calculate section completion percentage
 */
function calculateSectionProgress(responses, totalQuestions) {
  if (!responses || totalQuestions === 0) return 0;
  const answered = Object.keys(responses).filter((key) => {
    const value = responses[key];
    return (
      value !== null &&
      value !== undefined &&
      value !== '' &&
      !(Array.isArray(value) && value.length === 0)
    );
  }).length;
  return Math.round((answered / totalQuestions) * 100);
}

/**
 * ProgressIndicator Component
 */
function ProgressIndicator({
  sections,
  currentSectionIndex,
  sectionResponses,
  sectionQuestionCounts,
  onSectionClick,
  language,
  allowNavigation,
}) {
  const totalSections = sections.length;
  const completedSections = sections.filter((section) => {
    const progress = calculateSectionProgress(
      sectionResponses[section.id],
      sectionQuestionCounts[section.id] || 0
    );
    return progress === 100;
  }).length;

  const overallProgress = Math.round((completedSections / totalSections) * 100);

  return (
    <div className="progress-indicator" role="navigation" aria-label="Questionnaire progress">
      {/* Overall Progress Bar */}
      <div className="overall-progress">
        <div className="progress-label">
          <span className="progress-text">
            {language === 'fr' ? 'Progression globale' : 'Overall Progress'}
          </span>
          <span className="progress-percentage">{overallProgress}%</span>
        </div>
        <div className="progress-bar-container">
          <div
            className="progress-bar"
            style={{ width: `${overallProgress}%` }}
            role="progressbar"
            aria-valuenow={overallProgress}
            aria-valuemin="0"
            aria-valuemax="100"
          />
        </div>
      </div>

      {/* Section Steps */}
      <div className="section-steps">
        {sections.map((section, index) => {
          const sectionProgress = calculateSectionProgress(
            sectionResponses[section.id],
            sectionQuestionCounts[section.id] || 0
          );
          const isComplete = sectionProgress === 100;
          const isCurrent = index === currentSectionIndex;
          const isPast = index < currentSectionIndex;
          const isClickable = allowNavigation && (isPast || isCurrent);

          return (
            <button
              key={section.id}
              className={`section-step ${isCurrent ? 'current' : ''} ${isComplete ? 'complete' : ''} ${isPast ? 'past' : ''}`}
              onClick={() => isClickable && onSectionClick(index)}
              disabled={!isClickable}
              aria-current={isCurrent ? 'step' : undefined}
              title={section.title[language] || section.title.en}
            >
              <span className="step-number">
                {isComplete ? (
                  <svg className="check-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>
              <span className="step-label">{section.title[language] || section.title.en}</span>
              {!isComplete && sectionProgress > 0 && (
                <span className="step-progress">{sectionProgress}%</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Section Count Summary */}
      <div className="progress-summary">
        <span>
          {language === 'fr'
            ? `Section ${currentSectionIndex + 1} sur ${totalSections}`
            : `Section ${currentSectionIndex + 1} of ${totalSections}`}
        </span>
      </div>
    </div>
  );
}

ProgressIndicator.propTypes = {
  sections: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.shape({
        en: PropTypes.string.isRequired,
        fr: PropTypes.string,
      }).isRequired,
    })
  ).isRequired,
  currentSectionIndex: PropTypes.number.isRequired,
  sectionResponses: PropTypes.object,
  sectionQuestionCounts: PropTypes.object,
  onSectionClick: PropTypes.func,
  language: PropTypes.oneOf(['en', 'fr']),
  allowNavigation: PropTypes.bool,
};

ProgressIndicator.defaultProps = {
  sectionResponses: {},
  sectionQuestionCounts: {},
  onSectionClick: () => {},
  language: 'en',
  allowNavigation: true,
};

export default ProgressIndicator;
