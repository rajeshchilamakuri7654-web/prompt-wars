import React from 'react';
import { render, screen } from '@testing-library/react';
import { GlobalComparison } from '../src/components/GlobalComparison';
import '@testing-library/jest-dom';

describe('GlobalComparison Gauge Component', () => {
  test('Renders comparison gauge elements and titles', () => {
    render(<GlobalComparison score={3000} />);
    expect(screen.getByText('Global Comparison')).toBeInTheDocument();
    expect(screen.getByText(/Your footprint mapped against global milestones/i)).toBeInTheDocument();
    
    // Check milestones
    expect(screen.getByText('Paris Target')).toBeInTheDocument();
    expect(screen.getByText('World Average')).toBeInTheDocument();
    expect(screen.getByText('EU Average')).toBeInTheDocument();
  });

  test('Displays correct status verdict for low carbon profile (< 2300)', () => {
    render(<GlobalComparison score={1500} />);
    expect(screen.getByText(/Below Paris Agreement Target/i)).toBeInTheDocument();
  });

  test('Displays correct status verdict for mid-low carbon profile (2300 - 4800)', () => {
    render(<GlobalComparison score={3500} />);
    expect(screen.getByText(/Above Paris — Below World Average/i)).toBeInTheDocument();
  });

  test('Displays correct status verdict for mid-high carbon profile (4800 - 6800)', () => {
    render(<GlobalComparison score={5500} />);
    expect(screen.getByText(/Above World Average/i)).toBeInTheDocument();
  });

  test('Displays correct status verdict for high carbon profile (> 6800)', () => {
    render(<GlobalComparison score={8500} />);
    expect(screen.getByText(/Exceeds EU Average — High Impact Zone/i)).toBeInTheDocument();
  });
});
