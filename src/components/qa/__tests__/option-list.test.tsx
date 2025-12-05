/**
 * Option List Tests
 */

import { render, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, mock, afterEach } from 'bun:test';
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

  afterEach(() => {
    cleanup();
  });

  it('renders all options', () => {
    const onSelect = mock(() => {});

    const { getByText } = render(
      <OptionList
        options={mockOptions}
        mode="single"
        onSelect={onSelect}
      />
    );

    expect(getByText('Option 1')).toBeDefined();
    expect(getByText('Option 2')).toBeDefined();
    expect(getByText('Option 3')).toBeDefined();
  });

  it('displays option descriptions', () => {
    const onSelect = mock(() => {});

    const { getByText } = render(
      <OptionList
        options={mockOptions}
        mode="single"
        onSelect={onSelect}
      />
    );

    expect(getByText('First option')).toBeDefined();
    expect(getByText('Second option')).toBeDefined();
  });

  it('calls onSelect with single option when mode is single', () => {
    const onSelect = mock(() => {});

    const { getByText } = render(
      <OptionList
        options={mockOptions}
        mode="single"
        onSelect={onSelect}
      />
    );

    const option = getByText('Option 1').closest('button');
    if (option) {
      fireEvent.click(option);
    }

    expect(onSelect).toHaveBeenCalledWith('opt1', false);
  });

  it('handles multiple selection mode', () => {
    const onSelect = mock(() => {});

    const { getByText, rerender } = render(
      <OptionList
        options={mockOptions}
        mode="multiple"
        selected={[]}
        onSelect={onSelect}
      />
    );

    const option1 = getByText('Option 1').closest('button');
    if (option1) fireEvent.click(option1);
    expect(onSelect).toHaveBeenCalledWith(['opt1'], true);

    // Re-render with updated selection to simulate parent component state update
    rerender(
      <OptionList
        options={mockOptions}
        mode="multiple"
        selected={['opt1']}
        onSelect={onSelect}
      />
    );

    const option2 = getByText('Option 2').closest('button');
    if (option2) fireEvent.click(option2);
    expect(onSelect).toHaveBeenCalledWith(['opt1', 'opt2'], true);
  });

  it('shows keyboard numbers when showNumbers is true', () => {
    const onSelect = mock(() => {});

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
    const onSelect = mock(() => {});

    const { getByText } = render(
      <OptionList
        options={mockOptions}
        mode="single"
        onSelect={onSelect}
        disabled={true}
      />
    );

    const option = getByText('Option 1').closest('button');
    if (option) {
      fireEvent.click(option);
    }

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('calls onHoverOption when mouse enters', () => {
    const onSelect = mock(() => {});
    const onHover = mock(() => {});

    const { getByText } = render(
      <OptionList
        options={mockOptions}
        mode="single"
        onSelect={onSelect}
        onHoverOption={onHover}
      />
    );

    const option = getByText('Option 1').closest('button');
    if (option) {
      fireEvent.mouseEnter(option);
    }

    expect(onHover).toHaveBeenCalledWith('opt1');
  });

  it('calls onHoverOption with null when mouse leaves', () => {
    const onSelect = mock(() => {});
    const onHover = mock(() => {});

    const { getByText } = render(
      <OptionList
        options={mockOptions}
        mode="single"
        onSelect={onSelect}
        onHoverOption={onHover}
      />
    );

    const option = getByText('Option 1').closest('button');
    if (option) {
      fireEvent.mouseLeave(option);
    }

    expect(onHover).toHaveBeenCalledWith(null);
  });

  it('marks selected option as selected', () => {
    const onSelect = mock(() => {});

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
