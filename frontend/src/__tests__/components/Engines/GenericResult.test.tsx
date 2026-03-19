import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GenericResult } from '../../../components/Engines/GenericResult';
import { mockNumerologyOutput } from '../../../__mocks__/selemene';

describe('GenericResult', () => {
  it('renders witness prompt', () => {
    render(<GenericResult result={mockNumerologyOutput} />);
    expect(screen.getByText(/What pattern repeats/)).toBeInTheDocument();
  });

  it('renders engine id badge', () => {
    render(<GenericResult result={mockNumerologyOutput} />);
    expect(screen.getByText('numerology')).toBeInTheDocument();
  });

  it('renders consciousness level', () => {
    render(<GenericResult result={mockNumerologyOutput} />);
    expect(screen.getByText(/Level 0/)).toBeInTheDocument();
  });

  it('renders metadata calculation time', () => {
    render(<GenericResult result={mockNumerologyOutput} />);
    expect(screen.getByText(/12\.5ms/)).toBeInTheDocument();
  });

  it('renders result data keys', () => {
    render(<GenericResult result={mockNumerologyOutput} />);
    expect(screen.getByText('life_path')).toBeInTheDocument();
  });

  it('handles missing witness prompt', () => {
    const noPrompt = { ...mockNumerologyOutput, witness_prompt: '' };
    render(<GenericResult result={noPrompt} />);
    // When witness_prompt is empty, the quoted prompt block should not render
    // The "\u201c" and "\u201d" characters are the curly quotes wrapping the prompt
    expect(screen.queryByText(/What pattern repeats/)).not.toBeInTheDocument();
  });
});
