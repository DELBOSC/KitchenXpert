/**
 * Questionnaire Section Component
 *
 * Renders a complete section of the questionnaire with all its questions.
 */

import React, { useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import QuestionRenderer from './question-renderer';

/**
 * QuestionnaireSection Component
 */
function QuestionnaireSection({
  section,
  questions,
  responses,
  onChange,
  language,
  errors,
  visibleQuestions,
  disabled,
}) {
  const sectionTitle = section.title[language] || section.title.en;
  const sectionDescription = section.description?.[language] || section.description?.en;

  // Filter questions based on visibility rules
  const displayedQuestions = useMemo(() => {
    if (!visibleQuestions || visibleQuestions.length === 0) {
      return questions;
    }
    return questions.filter((q) => visibleQuestions.includes(q.id));
  }, [questions, visibleQuestions]);

  // Handle individual question changes
  const handleQuestionChange = useCallback(
    (questionId, value) => {
      onChange(section.id, questionId, value);
    },
    [onChange, section.id]
  );

  return (
    <section className="questionnaire-section" aria-labelledby={`section-${section.id}`}>
      <header className="section-header">
        <h2 id={`section-${section.id}`} className="section-title">
          {section.icon && <span className="section-icon">{section.icon}</span>}
          {sectionTitle}
        </h2>
        {sectionDescription && <p className="section-description">{sectionDescription}</p>}
      </header>

      <div className="section-questions">
        {displayedQuestions.map((question, index) => (
          <div
            key={question.id}
            className="question-wrapper"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <QuestionRenderer
              question={question}
              value={responses[question.id]}
              onChange={(value) => handleQuestionChange(question.id, value)}
              language={language}
              errors={errors}
              disabled={disabled}
            />
          </div>
        ))}
      </div>

      {displayedQuestions.length === 0 && (
        <div className="section-empty">
          <p>
            {language === 'fr'
              ? 'Aucune question à afficher dans cette section.'
              : 'No questions to display in this section.'}
          </p>
        </div>
      )}
    </section>
  );
}

QuestionnaireSection.propTypes = {
  section: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.shape({
      en: PropTypes.string.isRequired,
      fr: PropTypes.string,
    }).isRequired,
    description: PropTypes.shape({
      en: PropTypes.string,
      fr: PropTypes.string,
    }),
    icon: PropTypes.string,
  }).isRequired,
  questions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      question: PropTypes.object.isRequired,
    })
  ).isRequired,
  responses: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  language: PropTypes.oneOf(['en', 'fr']),
  errors: PropTypes.object,
  visibleQuestions: PropTypes.arrayOf(PropTypes.string),
  disabled: PropTypes.bool,
};

QuestionnaireSection.defaultProps = {
  responses: {},
  language: 'en',
  errors: null,
  visibleQuestions: null,
  disabled: false,
};

export default QuestionnaireSection;
