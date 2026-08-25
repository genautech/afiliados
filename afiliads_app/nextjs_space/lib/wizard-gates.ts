import { GOOGLE_ADS_CHECKLIST, TRACKING_CHECKLIST_CB, TRACKING_CHECKLIST_MAXWEB } from './wizard-data';

export type WizardGateStep = 7 | 8;

export interface WizardGateChecklistRow {
  itemKey: string;
  itemLabel?: string | null;
  isCritical: boolean;
  isChecked: boolean;
  verificationType?: string | null;
  checkedAt?: Date | null;
}
export interface WizardGateResult {
  allowed: boolean;
  step: WizardGateStep;
  pending: string[];
}

export function evaluateWizardGate(
  step: WizardGateStep,
  platform: string,
  rows: WizardGateChecklistRow[],
): WizardGateResult {
  const definitions = step === 7
    ? GOOGLE_ADS_CHECKLIST
    : platform === 'MaxWeb' ? TRACKING_CHECKLIST_MAXWEB : TRACKING_CHECKLIST_CB;
  const byKey = new Map(rows.map((row) => [row.itemKey, row]));
  const pending = definitions
    .filter((definition) => definition.critical)
    .filter((definition) => {
      const row = byKey.get(definition.key);
      return !row || !row.isChecked || (definition.verificationType === 'auto' && !row.checkedAt);
    })
    .map((definition) => {
      const row = byKey.get(definition.key);
      return row?.itemLabel || definition.label;
    });

  return { allowed: pending.length === 0, step, pending };
}
