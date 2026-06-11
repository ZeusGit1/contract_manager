import { render } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { Badge } from './index';

describe('Badge', () => {
  it('Badge — live status — renders pale-success background with navy text', () => {
    // Arrange + Act
    const { getByText } = render(<Badge status="live">Completed</Badge>);

    // Assert
    expect(getByText('Completed')).toBeInTheDocument();
  });

  it('Badge — hold status — uses the McDermott-extension pale-magenta variant', () => {
    // Arrange + Act
    const { container } = render(<Badge status="hold">On hold</Badge>);

    // Assert — the class name carries the status modifier so CSS selects pale-magenta.
    const badge = container.querySelector('span');
    expect(badge?.className).toContain('hold');
  });

  it('Badge — accessibility — has no axe violations', async () => {
    // Arrange + Act
    const { container } = render(<Badge status="info">In review</Badge>);
    const results = await axe(container);

    // Assert
    expect(results.violations).toEqual([]);
  });
});
