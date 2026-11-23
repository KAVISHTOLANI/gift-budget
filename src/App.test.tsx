import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

const KEY = 'presently:store';

describe('Presently', () => {
  it('lists occasions with countdowns and budget meters', () => {
    window.location.hash = '/occasions';
    render(<App />);
    expect(screen.getByRole('link', { name: /Dad’s birthday/ })).toHaveTextContent('12days');
    expect(screen.getAllByRole('img', { name: /spent and .* committed of a/ }).length).toBe(3);
  });

  it('moves a gift along the board', async () => {
    window.location.hash = '/occasion/demo-winter';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Move Signed sci-fi paperback to Planned' }));
    expect(screen.getByText('“Signed sci-fi paperback” → Planned.')).toBeInTheDocument();
    const planned = screen.getByRole('heading', { name: /Planned/ }).closest('section')!;
    expect(within(planned).getByText('Signed sci-fi paperback')).toBeInTheDocument();
  });

  it('warns about a gift similar to one given before', async () => {
    window.location.hash = '/person/demo-dad';
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText('Gift'), 'Vinyl record cleaner');
    expect(screen.getByText(/Already given something similar: “Jazz vinyl box set”/)).toBeInTheDocument();
  });

  it('validates and adds an occasion', async () => {
    localStorage.setItem(KEY, JSON.stringify({ people: [], occasions: [], gifts: [] }));
    window.location.hash = '/occasions';
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText('No occasions yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Add occasion' }));
    expect(screen.getByText('Name the occasion.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Name'), 'Anniversary');
    await user.type(screen.getByLabelText('Date'), '2027-04-02');
    await user.type(screen.getByLabelText('Budget (USD)'), '100');
    await user.click(screen.getByRole('button', { name: 'Add occasion' }));
    expect(await screen.findByRole('heading', { name: 'Anniversary' })).toBeInTheDocument();
  });

  it('adds a quick idea and filters all gifts', async () => {
    window.location.hash = '/gifts';
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Add gift' }));
    expect(screen.getByText('Choose who it’s for.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('For'), 'Sana');
    await user.type(screen.getByLabelText('Gift'), 'Hiking map');
    await user.click(screen.getByRole('button', { name: 'Add gift' }));
    expect(screen.getByText('Added “Hiking map”.')).toBeInTheDocument();
    await user.selectOptions(screen.getAllByLabelText('Status').at(-1)!, 'given');
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);
  });
});
