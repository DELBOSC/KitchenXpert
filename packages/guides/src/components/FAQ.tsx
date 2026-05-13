import { useState, useId } from 'react';

/**
 * FAQ — accordion accessible (ARIA disclosure pattern).
 *
 * React island because the open/close state needs JS. ~1.2 KB after
 * tree-shake. The QA payload comes from the article's frontmatter
 * (passed as props) so the JSON-LD `FAQPage` schema can be generated
 * from the SAME data — single source of truth, no risk of drift
 * between the rendered FAQ and the structured data.
 *
 * Usage in MDX:
 *
 *   <FAQ
 *     client:visible
 *     questions={[
 *       { q: "Combien coûte une cuisine en L ?", a: "Comptez entre…" },
 *       …
 *     ]}
 *   />
 *
 * `client:visible` defers hydration until the section scrolls into
 * view, keeping the initial JS bundle empty.
 */

export interface FaqItem {
  q: string;
  a: string;
}

export interface FAQProps {
  questions: FaqItem[];
  /** First N panels open by default. */
  defaultOpenCount?: number;
}

export default function FAQ({ questions, defaultOpenCount = 1 }: FAQProps) {
  const idPrefix = useId();
  const [openIdx, setOpenIdx] = useState<Set<number>>(
    new Set(Array.from({ length: defaultOpenCount }, (_, i) => i)),
  );

  const toggle = (idx: number): void => {
    setOpenIdx((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  return (
    <section className="faq" aria-labelledby={`${idPrefix}-heading`}>
      <h2 id={`${idPrefix}-heading`} style={{ marginBottom: '1.5rem' }}>
        Questions fréquentes
      </h2>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {questions.map((item, idx) => {
          const isOpen = openIdx.has(idx);
          const panelId = `${idPrefix}-panel-${idx}`;
          const buttonId = `${idPrefix}-button-${idx}`;
          return (
            <li
              key={idx}
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                paddingBottom: '0.5rem',
              }}
            >
              <button
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(idx)}
                style={{
                  width: '100%',
                  padding: '1rem 0',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <span>{item.q}</span>
                <span
                  aria-hidden
                  style={{
                    flexShrink: 0,
                    transition: 'transform 0.2s',
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                    fontSize: '1.25rem',
                    color: 'rgba(255,255,255,0.5)',
                  }}
                >
                  +
                </span>
              </button>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                hidden={!isOpen}
                style={{
                  paddingBottom: isOpen ? '1rem' : 0,
                  color: 'rgba(255,255,255,0.75)',
                  lineHeight: 1.6,
                }}
              >
                {item.a}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
