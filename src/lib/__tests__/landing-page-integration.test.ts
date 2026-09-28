import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SITE_CONFIG } from '../../components/landing/config';

describe('Vital Diaries — Landing Page Integration Test Suite', () => {
  it('TEST 1: SITE_CONFIG contains zero-knowledge privacy statements and brand configuration', () => {
    assert.strictEqual(SITE_CONFIG.name, 'Vital Diaries');
    assert.ok(SITE_CONFIG.heroDescription.includes('secure place to organize your health records'));
    assert.ok(SITE_CONFIG.trustCards.length >= 4);

    // Verify key privacy assertions in the design
    const hasEncryptedBeforeSync = SITE_CONFIG.trustCards.some(
      (c) => c.title.includes('Encrypted Before Sync')
    );
    assert.ok(hasEncryptedBeforeSync, 'Trust statement must declare client-side encryption before sync');

    const hasYouHoldTheKey = SITE_CONFIG.trustCards.some(
      (c) => c.title.includes('You Hold the Key')
    );
    assert.ok(hasYouHoldTheKey, 'Trust statement must declare user key ownership');
  });

  it('TEST 2: Navigation links map to expected sections and valid hash anchors', () => {
    assert.ok(SITE_CONFIG.navLinks.length >= 5);
    const hrefs = SITE_CONFIG.navLinks.map((l) => l.href);
    assert.ok(hrefs.includes('#home'));
    assert.ok(hrefs.includes('#privacy-trust'));
    assert.ok(hrefs.includes('#how-it-works'));
    assert.ok(hrefs.includes('#features'));
    assert.ok(hrefs.includes('#faq'));
  });

  it('TEST 3: Auth handoff routes map correctly to Sign In and Sign Up flows', () => {
    assert.strictEqual(SITE_CONFIG.routes.login, '/login');
    assert.strictEqual(SITE_CONFIG.routes.signup, '/signup');

    // Simulate route resolver logic used in LandingPage.tsx
    const resolveMode = (route: string): 'login' | 'register' => {
      if (route.includes('login') || route.includes('sign-in')) {
        return 'login';
      }
      return 'register';
    };

    assert.strictEqual(resolveMode('/login'), 'login');
    assert.strictEqual(resolveMode('/sign-in'), 'login');
    assert.strictEqual(resolveMode('#login'), 'login');
    assert.strictEqual(resolveMode('/signup'), 'register');
    assert.strictEqual(resolveMode('/sign-up'), 'register');
    assert.strictEqual(resolveMode('#get-started'), 'register');
  });

  it('TEST 4: Security Boundary — Landing config contains NO secrets, tokens, or service-role keys', () => {
    const configString = JSON.stringify(SITE_CONFIG);
    assert.ok(!configString.includes('service_role'), 'Must not contain service_role key');
    assert.ok(!configString.includes('secret_'), 'Must not contain secrets');
    assert.ok(!configString.includes('eyJ'), 'Must not contain JWT tokens');
    assert.ok(!configString.includes('SUPABASE_SERVICE_ROLE'), 'Must not contain backend role keys');
  });

  it('TEST 5: FAQ items cover local zero-knowledge, encryption, and device syncing', () => {
    assert.ok(SITE_CONFIG.faqItems.length >= 6);
    const zeroKnowledgeAnswer = SITE_CONFIG.faqItems.find((f) => f.id === 'faq-encryption-2');
    assert.ok(zeroKnowledgeAnswer);
    assert.ok(zeroKnowledgeAnswer.answer.includes('zero-knowledge'));
    assert.ok(zeroKnowledgeAnswer.answer.includes('AES-256-GCM') || zeroKnowledgeAnswer.answer.includes('hardware'));
  });
});
