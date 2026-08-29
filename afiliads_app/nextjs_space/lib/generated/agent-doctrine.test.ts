import { describe, expect, it } from 'vitest';
import { AGENT_DOCTRINE, doctrineFor, doctrinePrompt } from './agent-doctrine';
import {
  antiSlopEditor,
  contentArchitect,
  factSteward,
  launchStrategist,
  visualSystemDesigner,
} from '../product-agents';

describe('doutrina dos agentes de referência', () => {
  it('gera doutrina a partir dos .agent.md', () => {
    expect(AGENT_DOCTRINE.length).toBeGreaterThanOrEqual(6);
    for (const doc of AGENT_DOCTRINE) {
      expect(doc.source).toMatch(/^frameworks\/agentes-referencia\/.+\.agent\.md$/);
      for (const section of doc.doctrine) {
        expect(section.body.length).toBeGreaterThan(0);
      }
    }
  });

  it('liga cada agente de produto declarado em binds', () => {
    for (const spec of [factSteward, visualSystemDesigner, launchStrategist, contentArchitect, antiSlopEditor]) {
      expect(doctrineFor(spec.agent).length).toBeGreaterThan(0);
    }
  });

  it('injeta as proibições do Fact Steward no prompt', () => {
    const prompt = doctrinePrompt('fact-steward');
    expect(prompt).toContain('Doutrina herdada');
    expect(prompt).toContain('Autoaprovar como revisor humano');
    expect(prompt).toContain('frameworks/agentes-referencia/fact-steward.agent.md');
  });

  it('devolve string vazia para agente sem doutrina ligada', () => {
    expect(doctrinePrompt('agente-inexistente')).toBe('');
  });
});
