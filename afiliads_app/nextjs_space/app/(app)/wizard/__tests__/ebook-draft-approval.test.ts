import { describe, it, expect } from 'vitest';
import { draftApprovalState } from '../_components/ebook-draft-panel';

const draft = (ebookHtml: string | null, generatedAt?: string) => ({ ebookHtml, generatedAt });

describe('draftApprovalState', () => {
  it('não deixa aprovar sem rascunho', () => {
    expect(draftApprovalState(null, null).approvable).toBe(false);
    expect(draftApprovalState(draft('   ', '2026-08-29T10:00:00Z'), null).approvable).toBe(false);
  });

  it('libera a aprovação quando há rascunho e nada ativo', () => {
    const state = draftApprovalState(draft('<h1>Cap 1</h1>', '2026-08-29T10:00:00Z'), null);
    expect(state).toMatchObject({ hasDraft: true, hasActive: false, activeIsStale: false, approvable: true });
  });

  it('trava a reaprovação do mesmo rascunho já ativo', () => {
    const same = '2026-08-29T10:00:00Z';
    const state = draftApprovalState(draft('<h1>Cap 1</h1>', same), draft('<h1>Cap 1</h1>', same));
    expect(state.hasActive).toBe(true);
    expect(state.activeIsStale).toBe(false);
    expect(state.approvable).toBe(false);
  });

  it('reabre a aprovação quando o rascunho é mais novo que o ativo', () => {
    const state = draftApprovalState(
      draft('<h1>Cap 1 v2</h1>', '2026-08-29T12:00:00Z'),
      draft('<h1>Cap 1</h1>', '2026-08-29T10:00:00Z'),
    );
    expect(state.activeIsStale).toBe(true);
    expect(state.approvable).toBe(true);
  });

  it('não considera ativo um activeData sem html de e-book', () => {
    const state = draftApprovalState(draft('<h1>Cap 1</h1>', '2026-08-29T10:00:00Z'), draft(null, '2026-08-29T10:00:00Z'));
    expect(state.hasActive).toBe(false);
    expect(state.approvable).toBe(true);
  });
});
