import { render, screen } from '@testing-library/react';
import { App } from './App.tsx';

vi.mock('./game/react/PhaserGame.tsx', () => ({
  PhaserGame: () => <div data-testid="phaser-game" />,
}));

test('renders the Vite starter screen', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: 'TAKT Frontend' })).toBeInTheDocument();
  expect(screen.getByText('React + Vite')).toBeInTheDocument();
  expect(screen.getByTestId('phaser-game')).toBeInTheDocument();
});
