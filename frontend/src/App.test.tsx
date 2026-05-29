import { render, screen } from '@testing-library/react';
import { App } from './App.tsx';

test('renders the Vite starter screen', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'TAKT Frontend' })).toBeInTheDocument();
  expect(screen.getByText('React + Vite')).toBeInTheDocument();
});
