// __tests__/components/ui/SliderInput.test.tsx
//
// Notes on testing PanResponder: react-native-testing-library has no clean
// way to simulate the gesture flow on a non-native PanResponder. We focus on
// the things that actually have logic: rendering the right label, value,
// formatter, and min/max axis. The interactive math (snap to step, clamp)
// is exercised at the component-author level via the formatter prop.

import React from 'react';
import { render } from '@testing-library/react-native';

import SliderInput from '../../../components/ui/SliderInput';

describe('SliderInput — rendering', () => {
  it('renders the label', () => {
    const { getByText } = render(
      <SliderInput label="Tempo" min={0} max={10} value={5} onChange={() => {}} />
    );

    expect(getByText('Tempo')).toBeTruthy();
  });

  it('renders the unit label when provided', () => {
    const { getByText } = render(
      <SliderInput label="Dystans" unitLabel="km" min={0} max={10} value={5} onChange={() => {}} />
    );

    expect(getByText('km')).toBeTruthy();
  });

  it('uses formatValue for both the header value and the axis labels', () => {
    const { getAllByText } = render(
      <SliderInput
        label="Tempo"
        min={240}
        max={420}
        step={15}
        value={330}
        onChange={() => {}}
        formatValue={(secs) => {
          const m = Math.floor(secs / 60);
          const s = secs % 60;
          return `${m}:${s.toString().padStart(2, '0')}`;
        }}
      />
    );

    // 330 seconds → "5:30" (header value, plus tooltip text)
    expect(getAllByText('5:30').length).toBeGreaterThanOrEqual(1);
    // min axis label = 240 → "4:00"
    expect(getAllByText('4:00').length).toBeGreaterThanOrEqual(1);
    // max axis label = 420 → "7:00"
    expect(getAllByText('7:00').length).toBeGreaterThanOrEqual(1);
  });

  it('clamps an out-of-range value before display', () => {
    const { getAllByText, queryByText } = render(
      <SliderInput
        label="Dystans"
        min={2}
        max={30}
        value={500}
        onChange={() => {}}
        formatValue={(v) => `${v} km`}
      />
    );

    // Clamped to max=30 — appears at least once (header value, possibly
    // also tooltip and max axis label).
    expect(getAllByText('30 km').length).toBeGreaterThan(0);
    // The bogus 500 must never make it into the rendered output.
    expect(queryByText('500 km')).toBeNull();
  });
});
