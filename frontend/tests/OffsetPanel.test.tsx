import React from 'react';
import { render, screen } from '@testing-library/react';
import { OffsetPanel } from '../src/components/OffsetPanel';
import '@testing-library/jest-dom';

describe('OffsetPanel Marketplace Component', () => {
  test('Renders marketplace options and calculations', () => {
    // 2000 kg = 2.00 tonnes
    // Wind energy price per tonne = $5. Total cost = $10.
    // Amazon conservation price = $8. Total cost = $16.
    render(<OffsetPanel annualKg={2000} />);
    
    expect(screen.getByText('Offset Marketplace')).toBeInTheDocument();
    expect(screen.getByText(/2.00 tonnes CO₂ \/ year/i)).toBeInTheDocument();

    // Check cheapest project cost display: $5 * 2 = $10
    expect(screen.getByText('$10')).toBeInTheDocument();

    // Check project names
    expect(screen.getByText('Amazon Rainforest Conservation')).toBeInTheDocument();
    expect(screen.getByText('Indian Wind Energy Project')).toBeInTheDocument();
    expect(screen.getByText('Kenyan Cookstoves Initiative')).toBeInTheDocument();
    expect(screen.getByText('Seagrass Restoration — UK Blue Carbon')).toBeInTheDocument();

    // Check direct project links
    const link = screen.getByRole('link', { name: /offset with Indian Wind Energy Project/i });
    expect(link).toHaveAttribute('href', 'https://registry.verra.org/');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
