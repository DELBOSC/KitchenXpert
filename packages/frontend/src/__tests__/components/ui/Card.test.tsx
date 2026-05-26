import { render } from '@testing-library/react';

import { Card } from '../../../components/ui/Card';

describe('Card', () => {
  describe('Polymorphic `as` prop', () => {
    it('renders a div by default', () => {
      const { container } = render(<Card>x</Card>);

      const div = container.querySelector('div.rounded-2xl');
      expect(div).toBeInTheDocument();
      expect(container.querySelector('article')).not.toBeInTheDocument();
    });

    it('renders the element passed via `as`', () => {
      const { container } = render(<Card as="article">x</Card>);

      const article = container.querySelector('article.rounded-2xl');
      expect(article).toBeInTheDocument();
      expect(container.querySelector('div.rounded-2xl')).not.toBeInTheDocument();
    });
  });
});
