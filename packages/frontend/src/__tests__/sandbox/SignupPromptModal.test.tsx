/**
 * Tests for SignupPromptModal — focus on the dual tracking wired to the
 * primary CTA. When the visitor clicks "Créer mon compte", both
 * trackers must fire:
 *
 *   1. trackSandbox('sandbox_signup_intent', { from: 'modal', trigger })
 *      → Plausible receives the generic sandbox funnel event
 *   2. tagConversion('hero', 'sandbox_signup_intent_ab')
 *      → Plausible receives the AB-sliced variant of the same intent
 *
 * The two events are intentionally distinct (`_ab` suffix) so we don't
 * double-count the totals in Plausible's dashboard.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { SignupPromptModal } from '../../components/sandbox/SignupPromptModal';

const renderModal = (props?: Partial<React.ComponentProps<typeof SignupPromptModal>>) => {
  const onClose = vi.fn();
  return {
    onClose,
    ...render(
      <BrowserRouter>
        <SignupPromptModal open trigger="pdf_export" onClose={onClose} {...props} />
      </BrowserRouter>
    ),
  };
};

describe('SignupPromptModal — dual tracking on primary CTA', () => {
  let plausibleSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    plausibleSpy = vi.fn();
    window.plausible = plausibleSpy;
    vi.mocked(localStorage.getItem).mockImplementation((key: string) => {
      if (key === 'kx-ab-hero') {
        return 'C';
      }
      return null;
    });
  });

  afterEach(() => {
    delete window.plausible;
  });

  it('renders the modal copy for the given trigger', () => {
    renderModal();
    expect(screen.getByTestId('signup-prompt-title')).toHaveTextContent(
      /téléchargez votre devis sans filigrane/i
    );
  });

  it('returns null when no trigger is set', () => {
    const { container } = render(
      <BrowserRouter>
        <SignupPromptModal open trigger={null} onClose={() => {}} />
      </BrowserRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('fires BOTH sandbox_signup_intent (trackSandbox) AND sandbox_signup_intent_ab (tagConversion) on CTA click', () => {
    renderModal();

    const cta = screen.getByTestId('signup-prompt-cta-primary');
    fireEvent.click(cta);

    // Both events go through window.plausible — assert each one
    // independently because property order in the props object can
    // vary.
    expect(plausibleSpy).toHaveBeenCalledWith('sandbox_signup_intent', {
      props: { from: 'modal', trigger: 'pdf_export' },
    });
    expect(plausibleSpy).toHaveBeenCalledWith('sandbox_signup_intent_ab', {
      props: { experiment: 'hero', variant: 'C' },
    });
    expect(plausibleSpy).toHaveBeenCalledTimes(2);
  });
});
