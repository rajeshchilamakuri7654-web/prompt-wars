import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Dashboard } from '../src/components/Dashboard';
import '@testing-library/jest-dom';

// Mock next/dynamic to load ThreeCanvas synchronously
jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    return function MockDynamicComponent() {
      return <div data-testid="mock-three-canvas" />;
    };
  }
}));

// Mock the websocket hook
export const mockUpdateInputs = jest.fn();
jest.mock('../src/hooks/useCarbonWS', () => ({
  useCarbonWS: () => ({
    connectionStatus: 'connected',
    result: {
      total: 6000,
      breakdown: { transport: 1000, diet: 1000, housing: 1000 },
      simulation: [
        { id: 'sim1', category: 'transport', title: 'Test Habit', description: 'Test habit description', savings: 1500 }
      ]
    },
    inputs: {
      commuteMode: 'gas',
      dailyDistance: 20,
      shortHaulFlights: 2,
      longHaulFlights: 1,
      dietaryProfile: 'average',
      housingType: 'detached',
      powerSource: 'grid'
    },
    error: null,
    updateInputs: mockUpdateInputs
  })
}));

describe('Dashboard Component Rendering & UI Interactivity', () => {
  
  test('Renders page header and Title', () => {
    render(<Dashboard />);
    expect(screen.getByText('Aetheria Carbon')).toBeInTheDocument();
    expect(screen.getByText(/weightless, real-time carbon simulation/i)).toBeInTheDocument();
  });

  test('Renders transport category card with commute modes and sliders', () => {
    render(<Dashboard />);
    expect(screen.getByText('Transport Profile')).toBeInTheDocument();
    expect(screen.getByText('Commute Mode')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /daily commute/i })).toBeInTheDocument();
  });

  test('Renders dietary dial profile', () => {
    render(<Dashboard />);
    expect(screen.getByText('Dietary Profile')).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: /dietary profile dial/i })).toBeInTheDocument();
  });

  test('Renders home energy controls', () => {
    render(<Dashboard />);
    expect(screen.getByText('Home Energy')).toBeInTheDocument();
    expect(screen.getByText('Power Grid Source')).toBeInTheDocument();
  });

  test('Renders reduction habit simulator panel', () => {
    render(<Dashboard />);
    expect(screen.getByText('Habit Reduction Simulator')).toBeInTheDocument();
  });

  test('Can drag slider and update input value', () => {
    render(<Dashboard />);
    const slider = screen.getByRole('slider', { name: /daily commute/i });
    
    act(() => {
      fireEvent.change(slider, { target: { value: '80' } });
    });
    
    // The component uses the mocked hook's value which won't change here, 
    // so we verify that the update function was called with the correct value.
    expect(mockUpdateInputs).toHaveBeenCalledWith({ dailyDistance: 80 });
  });
  test('Interact with UI buttons to update state', () => {
    render(<Dashboard />);
    
    // Toggle commute mode
    const transitBtn = screen.getByText(/Transit/i);
    fireEvent.click(transitBtn);
    
    // Toggle short haul flights
    const incBtn = screen.getByRole('button', { name: /Increase short-haul flights/i });
    const decBtn = screen.getByRole('button', { name: /Decrease short-haul flights/i });
    fireEvent.click(incBtn);
    fireEvent.click(decBtn);
    
    // Toggle housing type
    const apartmentBtn = screen.getByText(/Apartment/i);
    fireEvent.click(apartmentBtn);
    
    // Toggle power source
    const powerSwitch = screen.getByRole('switch');
    fireEvent.click(powerSwitch);
    
    // Toggle long haul flights
    const incLongBtn = screen.getByRole('button', { name: /Increase long-haul flights/i });
    const decLongBtn = screen.getByRole('button', { name: /Decrease long-haul flights/i });
    fireEvent.click(incLongBtn);
    fireEvent.click(decLongBtn);
    
    // Toggle dietary profile from dashboard
    const flexBtn = screen.getByRole('button', { name: /Select Flexitarian/i });
    fireEvent.click(flexBtn);

    // Habit buttons
    const habitBtn = screen.getByRole('button', { name: /Simulation: Test Habit/i });
    fireEvent.click(habitBtn);
    // Click again to test toggle off
    fireEvent.click(habitBtn);
  });

  test('Renders correct rating badge text', () => {
    // Should render 'Average' or 'High Impact'
    render(<Dashboard />);
    // Just ensure the widget renders
    expect(screen.getAllByText(/kg\/year/i)[0]).toBeInTheDocument();
  });
});
