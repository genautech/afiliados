import { describe, it, expect } from 'vitest';
import { validateAffiliateLink, detectAffiliatePlatform, validateFinalUrlVsHopLink } from './affiliate-link-validator';

describe('affiliate-link-validator', () => {
  describe('detectAffiliatePlatform', () => {
    it('detecta ClickBank hoplink', () => {
      expect(detectAffiliatePlatform('https://abcd123.hop.clickbank.net/?tid=foo')).toBe('ClickBank');
    });
    it('detecta Digistore24', () => {
      expect(detectAffiliatePlatform('https://www.digistore24.com/product/123?aff_id=456')).toBe('Digistore24');
    });
    it('detecta MaxWeb', () => {
      expect(detectAffiliatePlatform('https://clkmg.com/path?affid=abc&subid=1')).toBe('MaxWeb');
    });
    it('detecta BuyGoods', () => {
      expect(detectAffiliatePlatform('https://buygoods.com/salespage?affid=abc')).toBe('BuyGoods');
    });
    it('retorna Outro para URL limpa', () => {
      expect(detectAffiliatePlatform('https://meusite.com/produto')).toBe('Outro');
    });
  });

  describe('validateAffiliateLink', () => {
    it('valida HopLink ClickBank', () => {
      const r = validateAffiliateLink('https://abcd123.hop.clickbank.net/?tid=foo', 'ClickBank');
      expect(r.status).toBe('valid');
      expect(r.isHopLink).toBe(true);
      expect(r.isFinalPage).toBe(false);
    });

    it('avisa quando URL parece ser página final do produtor', () => {
      const r = validateAffiliateLink('https://produtooficial.com/checkout?add-to-cart=1', 'ClickBank');
      expect(r.status).toBe('warning');
      expect(r.isHopLink).toBe(false);
      expect(r.isFinalPage).toBe(true);
    });

    it('avisa quando plataforma não bate', () => {
      const r = validateAffiliateLink('https://abcd123.hop.clickbank.net/', 'MaxWeb');
      expect(r.status).toBe('warning');
      expect(r.message).toContain('MaxWeb');
    });

    it('aceita URL limpa de domínio próprio', () => {
      const r = validateAffiliateLink('https://meusite.com/review-produto', 'ClickBank');
      expect(r.status).toBe('valid');
      expect(r.isHopLink).toBe(false);
      expect(r.isFinalPage).toBe(false);
    });

    it('rejeita URL inválida', () => {
      const r = validateAffiliateLink('não é url');
      expect(r.status).toBe('invalid');
    });
  });

  describe('validateFinalUrlVsHopLink', () => {
    it('rejeita URL final igual ao HopLink', () => {
      const r = validateFinalUrlVsHopLink(
        'https://abcd123.hop.clickbank.net/',
        'https://abcd123.hop.clickbank.net/',
      );
      expect(r.ok).toBe(false);
    });
    it('aceita URL final limpa', () => {
      const r = validateFinalUrlVsHopLink('https://meusite.com/review', 'https://abcd123.hop.clickbank.net/');
      expect(r.ok).toBe(true);
    });
  });
});
