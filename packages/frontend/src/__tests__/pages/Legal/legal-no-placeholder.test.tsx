/**
 * Compliance gate — fails the build if any legal page renders a residual
 * placeholder, TODO marker, or Lorem-ipsum string.
 *
 * The four public legal pages are rendered in jsdom, then their
 * `textContent` is scanned for forbidden patterns. The test also asserts
 * `isLegalConfigComplete()` returns `true`, so a pre-launch CI check
 * blocks deploys that haven't filled `src/config/legal.ts`.
 *
 * **What counts as a placeholder**
 *   - The literal string `[à compléter]` or `[a completer]`
 *   - Any `TODO_LAURENT_*` sentinel (set by `legal.ts` defaults)
 *   - Free-form `TODO`, `FIXME`, `XXX`, `HACK` markers
 *   - Lorem-ipsum text
 *   - Bracketed instructions like `[Nom du médiateur agréé]`
 *
 * False-positive prevention: the regex is intentionally conservative —
 * `[xxx]` patterns must contain spaces, dashes, or French accents to
 * trigger, so JSX expressions like `[children]` won't fail.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MentionsLegales from '../../../pages/Legal/MentionsLegales';
import CGV from '../../../pages/Legal/CGV';
import Privacy from '../../../pages/Legal/Privacy';
import Cookies from '../../../pages/Legal/Cookies';
import { isLegalConfigComplete, LEGAL } from '../../../config/legal';

const wrap = (Component: React.ComponentType): HTMLElement => {
  const { container } = render(
    <MemoryRouter>
      <Component />
    </MemoryRouter>
  );
  return container;
};

const FORBIDDEN: Array<{ name: string; pattern: RegExp }> = [
  { name: '[à compléter]', pattern: /\[à\s+compléter\]/i },
  { name: '[a completer]', pattern: /\[a\s+completer\]/i },
  { name: 'TODO_LAURENT_*', pattern: /TODO_LAURENT_[a-zA-Z._]+/ },
  { name: 'TODO marker', pattern: /\bTODO\b(?!_LAURENT)/ },
  { name: 'FIXME marker', pattern: /\bFIXME\b/ },
  { name: 'XXX marker', pattern: /\bXXX\b/ },
  { name: 'HACK marker', pattern: /\bHACK\b/ },
  { name: 'Lorem ipsum', pattern: /\blorem\s+ipsum\b/i },
  // Bracketed instructions like [Nom du médiateur agréé], [adresse],
  // [Ville – n° SIREN]. The bracket contents must include at least one
  // accented character or a hyphen-with-spaces to avoid matching JSX
  // / array literals like [item, idx].
  { name: 'bracketed instruction (accents)', pattern: /\[[^\]]*[éèàâêçœ][^\]]*\]/ },
  { name: 'bracketed instruction (em dash)', pattern: /\[[^\]]*\s—\s[^\]]*\]/ },
];

const PAGES = [
  { name: 'MentionsLegales', Component: MentionsLegales },
  { name: 'CGV', Component: CGV },
  { name: 'Privacy', Component: Privacy },
  { name: 'Cookies', Component: Cookies },
];

describe('Legal pages — placeholder gate', () => {
  for (const { name, Component } of PAGES) {
    describe(name, () => {
      const container = wrap(Component);
      const text = container.textContent || '';

      for (const { name: patternName, pattern } of FORBIDDEN) {
        it(`does not contain ${patternName}`, () => {
          const match = text.match(pattern);
          if (match) {
            // Surface a helpful preview so the failure points at the line.
            const idx = match.index ?? 0;
            const preview = text.slice(Math.max(0, idx - 40), idx + 80);
            throw new Error(`${name} still renders "${match[0]}" — context: …${preview}…`);
          }
          expect(match).toBeNull();
        });
      }
    });
  }

  it('LEGAL config has every TODO field filled', () => {
    const stillTodo: string[] = [];
    const walk = (obj: unknown, path: string): void => {
      if (typeof obj === 'string') {
        if (obj.startsWith('TODO_LAURENT_')) stillTodo.push(`${path} = ${obj}`);
        return;
      }
      if (obj && typeof obj === 'object') {
        for (const [k, v] of Object.entries(obj)) walk(v, path ? `${path}.${k}` : k);
      }
    };
    walk(LEGAL, '');
    if (stillTodo.length > 0) {
      throw new Error(
        `Legal config has unfilled fields:\n  - ${stillTodo.join('\n  - ')}\n` +
          `Edit packages/frontend/src/config/legal.ts to provide real values ` +
          `before deploying to production.`
      );
    }
    expect(isLegalConfigComplete()).toBe(true);
  });
});
