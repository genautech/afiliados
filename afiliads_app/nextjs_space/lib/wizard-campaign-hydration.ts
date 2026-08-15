type CampaignWithPresells = {
  presells?: Array<{ id?: unknown }> | null;
} | null | undefined;

export function getCampaignPresellId(campaign: CampaignWithPresells): string | null {
  const id = campaign?.presells?.[0]?.id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}
