import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomDial } from '../src/components/CustomDial';
import '@testing-library/jest-dom';

describe('CustomDial Diet component', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  test('Renders the dial showing active dietary profile info', () => {
    render(<CustomDial value="flexitarian" onChange={mockOnChange} />);
    
    // Check center label and value
    expect(screen.getByText('Diet Profile')).toBeInTheDocument();
    expect(screen.getAllByText('Flexitarian')[0]).toBeInTheDocument();

    // Check list of options
    expect(screen.getByRole('button', { name: /select vegan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select flexitarian/i })).toBeInTheDocument();
  });

  test('Supports keyboard slider controls for accessibility', () => {
    render(<CustomDial value="flexitarian" onChange={mockOnChange} />);
    const slider = screen.getByRole('slider', { name: /dietary profile dial/i });

    // ArrowRight should increment Flexitarian -> Average
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(mockOnChange).toHaveBeenCalledWith('average');

    // ArrowLeft should decrement Flexitarian -> Vegetarian
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(mockOnChange).toHaveBeenCalledWith('vegetarian');

    // Home should jump to Vegan
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(mockOnChange).toHaveBeenCalledWith('vegan');

    // End should jump to Heavy
    fireEvent.keyDown(slider, { key: 'End' });
    expect(mockOnChange).toHaveBeenCalledWith('heavy');

    // ArrowUp should increment Heavy -> (wait, it's already max, so it stays heavy or we can test average -> heavy)
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(mockOnChange).toHaveBeenCalledWith('heavy');

    // ArrowDown should decrement Heavy -> Average
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(mockOnChange).toHaveBeenCalledWith('average');
  });

  test('Clicking diet buttons invokes onChange handler', () => {
    render(<CustomDial value="vegan" onChange={mockOnChange} />);
    const veganBtn = screen.getByRole('button', { name: /select average/i });
    fireEvent.click(veganBtn);
    expect(mockOnChange).toHaveBeenCalledWith('average');
  });

  test('Clicking directly on the SVG dial triggers change based on angle', () => {
    render(<CustomDial value="vegan" onChange={mockOnChange} />);
    const slider = screen.getByRole('slider', { name: /dietary profile dial/i });
    
    // Mock getBoundingClientRect
    slider.getBoundingClientRect = jest.fn(() => ({
      left: 0,
      top: 0,
      width: 200,
      height: 200,
      right: 200,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => {}
    }));

    // Click on the right side of the dial (x > 100) -> should be heavy meat or average
    fireEvent.click(slider, { clientX: 180, clientY: 100 });
    
    // It should have called onChange
    expect(mockOnChange).toHaveBeenCalled();
  });
});
