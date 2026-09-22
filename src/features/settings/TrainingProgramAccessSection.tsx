import { useEffect, useMemo, useState } from 'react';
import { Button, SelectField } from '../../components/ui';
import {
  trainingProgramEquipmentOptions,
  type TrainingProgramAccessMode,
  type TrainingProgramEquipmentKey,
} from '../../domain/trainingProgramEquipment';
import { useTrainingProgramProfile } from './hooks/useTrainingProgramProfile';
import type { TrainingProgramProfileService } from './trainingProgramProfileService';
import styles from './SettingsScreen.module.css';

interface TrainingProgramAccessSectionProps {
  userId: string;
  service?: TrainingProgramProfileService;
}

type EditableAccessMode = TrainingProgramAccessMode | '';

export function TrainingProgramAccessSection({
  userId,
  service,
}: TrainingProgramAccessSectionProps) {
  const state = useTrainingProgramProfile(userId, service);
  const [accessMode, setAccessMode] = useState<EditableAccessMode>('');
  const [equipmentKeys, setEquipmentKeys] = useState<TrainingProgramEquipmentKey[]>([]);

  useEffect(() => {
    if (!state.profile) return;
    setAccessMode(state.profile.accessMode);
    setEquipmentKeys(state.profile.equipmentKeys);
  }, [state.profile]);

  const selected = useMemo(() => new Set(equipmentKeys), [equipmentKeys]);

  const changeMode = (next: EditableAccessMode) => {
    setAccessMode(next);
    if (next !== 'CUSTOM') setEquipmentKeys([]);
  };

  const toggleEquipment = (key: TrainingProgramEquipmentKey) => {
    setEquipmentKeys((current) => current.includes(key)
      ? current.filter((candidate) => candidate !== key)
      : [...current, key]);
  };

  const save = () => {
    if (!accessMode) return;
    void state.save({
      accessMode,
      equipmentKeys: accessMode === 'CUSTOM' ? equipmentKeys : [],
    });
  };

  return (
    <section
      className={styles.section}
      aria-labelledby="settings-program-equipment-heading"
      data-app-surface="category"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>PERSONALIZED PROGRAMS</p>
          <h2 id="settings-program-equipment-heading">Equipment access</h2>
        </div>
        {state.profile ? <span className={styles.statusBadge}>Saved</span> : null}
      </div>

      <p className={styles.supportCopy}>
        Top Set will use this as a hard availability constraint when personalized programs are generated.
        It never assumes equipment you did not select for a custom setup.
      </p>

      {state.loading ? <p className={styles.supportCopy} role="status">Loading equipment access…</p> : null}
      {state.error ? <p className={styles.error} role="status">{state.error}</p> : null}
      {state.notice ? <p className={styles.success} role="status">{state.notice}</p> : null}

      {!state.loading ? (
        <div className={styles.equipmentForm}>
          <SelectField
            hint="Choose Commercial gym for standard full-gym access, or Custom / home to select equipment explicitly."
            label="Training setup"
            onChange={(event) => changeMode(event.target.value as EditableAccessMode)}
            value={accessMode}
          >
            <option value="">Choose a setup</option>
            <option value="COMMERCIAL_GYM">Commercial gym</option>
            <option value="CUSTOM">Custom / home setup</option>
          </SelectField>

          {accessMode === 'COMMERCIAL_GYM' ? (
            <div className={styles.accessSummary}>
              <strong>Standard commercial-gym access</strong>
              <p>
                The generator may use ordinary free weights, racks, benches, cable stations, resistance
                machines, pull-up/dip stations, kettlebells, landmine, and common functional equipment.
                Specialty/strongman equipment is not silently assumed.
              </p>
            </div>
          ) : null}

          {accessMode === 'CUSTOM' ? (
            <fieldset className={styles.equipmentFieldset}>
              <legend>Equipment available to you</legend>
              <p className={styles.supportCopy}>
                Leave every item unchecked for a bodyweight-only setup. Bodyweight movements are evaluated
                separately from equipment access.
              </p>
              <div className={styles.equipmentRows}>
                {trainingProgramEquipmentOptions.map((option) => (
                  <label className={styles.equipmentRow} key={option.key}>
                    <input
                      checked={selected.has(option.key)}
                      onChange={() => toggleEquipment(option.key)}
                      type="checkbox"
                    />
                    <span className={styles.equipmentCopy}>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                      {option.supportNote ? <em>{option.supportNote}</em> : null}
                    </span>
                    {option.support !== 'AVAILABLE' ? (
                      <span className={styles.equipmentSupport}>
                        {option.support === 'PROFILE_ONLY' ? 'Profile only' : 'Partial v1'}
                      </span>
                    ) : null}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}

          <div className={styles.actions}>
            <Button disabled={!accessMode || state.busy} onClick={save}>
              {state.busy ? 'Saving…' : 'Save equipment access'}
            </Button>
            {state.error ? (
              <Button disabled={state.busy} onClick={() => void state.reload()} variant="secondary">
                Reload
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
