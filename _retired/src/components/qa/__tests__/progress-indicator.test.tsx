/**
 * Progress Indicator Tests
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'bun:test';
import { ProgressIndicator } from '../progress-indicator';

describe('ProgressIndicator', () => {
  it('renders with current and total', () => {
    render(<ProgressIndicator current={5} total={10} />);

    expect(screen.getByText('5 of 10')).toBeDefined();
    expect(screen.getByText('50%')).toBeDefined();
  });

  it('calculates percentage correctly', () => {
    render(<ProgressIndicator current={7} total={10} />);

    expect(screen.getByText('70%')).toBeDefined();
  });

  it('displays label when provided', () => {
    render(<ProgressIndicator current={3} total={6} label="Questions answered" />);

    expect(screen.getByText('Questions answered')).toBeDefined();
  });

  it('hides percentage when showPercentage is false', () => {
    const { container } = render(
      <ProgressIndicator current={5} total={10} showPercentage={false} />
    );

    expect(container.textContent).not.toContain('50%');
  });

  it('applies correct size classes', () => {
    const { container } = render(
      <ProgressIndicator current={5} total={10} size="lg" />
    );

    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar?.classList.contains('h-3')).toBe(true);
  });

  it('applies success variant when complete', () => {
    const { container } = render(
      <ProgressIndicator current={10} total={10} variant="success" />
    );

    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar?.classList.contains('bg-green-600')).toBe(true);
  });

  it('handles zero total gracefully', () => {
    render(<ProgressIndicator current={0} total={0} />);

    expect(screen.getByText('0%')).toBeDefined();
  });
});
