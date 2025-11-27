/**
 * Option List Tests
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OptionList } from '../option-list';
import type { QuestionOption } from '@/types/ai';

describe('OptionList', () => {
  const mockOptions: QuestionOption[] = [
    {
      id: 'opt1',
      label: 'Option 1',
      description: 'First option',
    },
    {
      id: 'opt2',
      label: 'Option 2',
      description: 'Second option',
    },
    {
      id: 'opt3',
      label: 'Option 3',
    },
  ];

  it('renders all options', () => {
    const onSelect = vi.fn();

    render(
      <OptionList
        options={mockOptions}
        mode="single"
        onSelect={onSelect}
      />
    );

    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
  });

  it('displays option descriptions', () => {
    const onSelect = vi.fn();

    render(
      <OptionList
        options={mockOptions}
        mode="single"
        onSelect={onSelect}
      />
    );

    expect(screen.getByText('First option')).toBeInTheDocument();
    expect(screen.getByText('Second option')).toBeInTheDocument();
  });

  it('calls onSelect with single option when mode is single', () => {
    const onSelect = vi.fn();

    render(
      <OptionList
        options={mockOptions}
        mode="single"
        onSelect={onSelect}
      />
    );

    const option = screen.getByText('Option 1').closest('button');
    if (option) {
      fireEvent.click(option);
    }

    expect(onSelect).toHaveBeenCalledWith('opt1', false);
  });

  it('handles multiple selection mode', () => {
    const onSelect = vi.fn();

    render(
      <OptionList
        options={mockOptions}
        mode="multiple"
        selected={[]}
        onSelect={onSelect}
      />
    );

    const option1 = screen.getByText('Option 1').closest('button');
    const option2 = screen.getByText('Option 2').closest('button');

    if (option1) fireEvent.click(option1);
    expect(onSelect).toHaveBeenCalledWith(['opt1'], true);

    if (option2) fireEvent.click(option2);
    expect(onSelect).toHaveBeenCalledWith(['opt1', 'opt2'], true);
  });

  it('shows keyboard numbers when showNumbers is true', () => {
    const onSelect = vi.fn();

    const { container } = render(
      <OptionList
        options={mockOptions}
        mode="single"
        onSelect={onSelect}
        showNumbers={true}
      />
    );

    expect(container.textContent).toContain('[1]');
    expect(container.textContent).toContain('[2]');
    expect(container.textContent).toContain('[3]');
  });

  it('handles disabled state', () => {
    const onSelect = vi.fn();

    render(
      <OptionList
        options={mockOptions}
        mode="single"
        onSelect={onSelect}
        disabled={true}
      />
    );

    const option = screen.getByText('Option 1').closest('button');
    if (option) {
      fireEvent.click(option);
    }

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('calls onHoverOption when mouse enters', () => {
    const onSelect = vi.fn();
    const onHover = vi.fn();

    render(
      <OptionList
        options={mockOptions}
        mode="single"
        onSelect={onSelect}
        onHoverOption={onHover}
      />
    );

    const option = screen.getByText('Option 1').closest('button');
    if (option) {
      fireEvent.mouseEnter(option);
    }

    expect(onHover).toHaveBeenCalledWith('opt1');
  });

  it('calls onHoverOption with null when mouse leaves', () => {
    const onSelect = vi.fn();
    const onHover = vi.fn();

    render(
      <OptionList
        options={mockOptions}
        mode="single"
        onSelect={onSelect}
        onHoverOption={onHover}
      />
    );

    const option = screen.getByText('Option 1').closest('button');
    if (option) {
      fireEvent.mouseLeave(option);
    }

    expect(onHover).toHaveBeenCalledWith(null);
  });

  it('marks selected option as selected', () => {
    const onSelect = vi.fn();

    const { container } = render(
      <OptionList
        options={mockOptions}
        mode="single"
        selected="opt1"
        onSelect={onSelect}
      />
    );

    const selectedButton = container.querySelector('[aria-pressed="true"]');
    expect(selectedButton?.textContent).toContain('Option 1');
  });
});
