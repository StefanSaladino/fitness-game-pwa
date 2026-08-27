import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SelectField } from './SelectField';

describe('SelectField', () => {
  it('presents an app-owned listbox and preserves the native change contract', async () => {
    const user = userEvent.setup();
    const changed = vi.fn();

    function Harness() {
      const [unit, setUnit] = useState('KG');
      return (
        <SelectField
          label="Weight unit"
          onChange={(event) => {
            setUnit(event.target.value);
            changed(event.target.value);
          }}
          value={unit}
        >
          <option value="KG">Kilograms (kg)</option>
          <option value="LB">Pounds (lb)</option>
        </SelectField>
      );
    }

    render(<Harness />);
    const trigger = screen.getByRole('combobox', { name: 'Weight unit' });
    await user.click(trigger);
    expect(screen.getByRole('listbox').parentElement?.parentElement).toBe(document.body);
    await user.click(screen.getByRole('option', { name: 'Pounds (lb)' }));

    expect(changed).toHaveBeenLastCalledWith('LB');
    expect(trigger).toHaveTextContent('Pounds (lb)');
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('closes on Escape and restores trigger focus', async () => {
    const user = userEvent.setup();
    render(
      <SelectField label="Timezone" defaultValue="UTC">
        <option value="UTC">UTC</option>
        <option value="America/Toronto">America/Toronto</option>
      </SelectField>,
    );

    const trigger = screen.getByRole('combobox', { name: 'Timezone' });
    await user.click(trigger);
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
