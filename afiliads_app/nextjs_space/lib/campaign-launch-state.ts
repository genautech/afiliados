export const CAMPAIGN_LAUNCH_STATES = [
  'CONFIGURING',
  'READY_FOR_REMOTE_CREATE',
  'REMOTE_PAUSED',
  'PAUSED',
  'ACTIVE',
] as const;

export type CampaignLaunchState = (typeof CAMPAIGN_LAUNCH_STATES)[number];

export interface CampaignLaunchStateInput {
  wizardCompleted: boolean;
  googleCampaignId?: string | null;
  status?: string | null;
}

/** Having a remote ID proves creation, never activation. */
export function deriveCampaignLaunchState(input: CampaignLaunchStateInput): CampaignLaunchState {
  if (!input.wizardCompleted) return 'CONFIGURING';
  if (!input.googleCampaignId) return 'READY_FOR_REMOTE_CREATE';
  if (input.status === 'ATIVA') return 'ACTIVE';
  if (input.status === 'PAUSADA' || input.status === 'PAUSADO') return 'PAUSED';
  return 'REMOTE_PAUSED';
}
