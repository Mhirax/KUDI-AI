import { KycProfile } from './kyc-profile.entity';
import { KycTier } from '../enums/kyc-tier.enum';
import { VerificationAlreadyPassedException } from '../exceptions/verification-already-passed.exception';
import { SanctionsFlagNotOpenException } from '../exceptions/sanctions-flag-not-open.exception';

describe('KycProfile aggregate', () => {
  it('starts at TIER_1 and emits KycProfileCreatedEvent', () => {
    const profile = KycProfile.createDefault('user-1');
    expect(profile.tier).toBe(KycTier.TIER_1);
    const events = profile.pullDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventName).toBe('compliance.kyc_profile.created');
  });

  it('upgrades to TIER_2 on BVN verification and emits KycTierUpgradedEvent', () => {
    const profile = KycProfile.createDefault('user-1');
    profile.pullDomainEvents();

    profile.recordBvnVerified('hash-abc', '*******1234');

    expect(profile.tier).toBe(KycTier.TIER_2);
    expect(profile.bvnVerifiedAt).not.toBeNull();
    const events = profile.pullDomainEvents();
    expect(events.map((e) => e.eventName)).toEqual([
      'compliance.verification.passed',
      'compliance.kyc_profile.tier_upgraded',
    ]);
  });

  it('does not upgrade tier on NIN verification alone (BVN still missing)', () => {
    const profile = KycProfile.createDefault('user-1');
    profile.pullDomainEvents();

    profile.recordNinVerified('hash-def', '*******5678');

    expect(profile.tier).toBe(KycTier.TIER_1);
    expect(profile.ninVerifiedAt).not.toBeNull();
  });

  it('upgrades to TIER_3 only once both BVN and NIN are verified', () => {
    const profile = KycProfile.createDefault('user-1');
    profile.pullDomainEvents();

    profile.recordBvnVerified('hash-abc', '*******1234');
    profile.pullDomainEvents();
    profile.recordNinVerified('hash-def', '*******5678');

    expect(profile.tier).toBe(KycTier.TIER_3);
    const events = profile.pullDomainEvents();
    expect(events.some((e) => e.eventName === 'compliance.kyc_profile.tier_upgraded')).toBe(true);
  });

  it('rejects a second BVN verification once already verified', () => {
    const profile = KycProfile.createDefault('user-1');
    profile.recordBvnVerified('hash-abc', '*******1234');
    expect(() => profile.recordBvnVerified('hash-xyz', '*******9999')).toThrow(
      VerificationAlreadyPassedException,
    );
  });

  describe('sanctions flag (Phase 4)', () => {
    it('opens a flag and emits KycProfileFlaggedForSanctionsReviewEvent', () => {
      const profile = KycProfile.createDefault('user-1');
      profile.pullDomainEvents();

      profile.flagForSanctionsReview('AL ZAWAHIRI, Dr. Ayman (SDGT)');

      expect(profile.isCurrentlyFlaggedForSanctions).toBe(true);
      expect(profile.sanctionsFlaggedAt).not.toBeNull();
      expect(profile.sanctionsClearedAt).toBeNull();
      const events = profile.pullDomainEvents();
      expect(events.map((e) => e.eventName)).toEqual(['compliance.kyc_profile.sanctions_flagged']);
    });

    it('does not re-flag or emit a second event if already flagged', () => {
      const profile = KycProfile.createDefault('user-1');
      profile.flagForSanctionsReview('first match');
      const firstFlaggedAt = profile.sanctionsFlaggedAt;
      profile.pullDomainEvents();

      profile.flagForSanctionsReview('second match, same open case');

      expect(profile.sanctionsFlaggedAt).toBe(firstFlaggedAt);
      expect(profile.pullDomainEvents()).toHaveLength(0);
    });

    it('clears an open flag and emits KycProfileSanctionsFlagClearedEvent', () => {
      const profile = KycProfile.createDefault('user-1');
      profile.flagForSanctionsReview('candidate match');
      profile.pullDomainEvents();

      profile.clearSanctionsFlag('staff-1', 'Confirmed different person after manual review.');

      expect(profile.isCurrentlyFlaggedForSanctions).toBe(false);
      expect(profile.sanctionsClearedAt).not.toBeNull();
      const events = profile.pullDomainEvents();
      expect(events.map((e) => e.eventName)).toEqual(['compliance.kyc_profile.sanctions_flag_cleared']);
    });

    it('throws SanctionsFlagNotOpenException when clearing with no open flag', () => {
      const profile = KycProfile.createDefault('user-1');
      expect(() => profile.clearSanctionsFlag('staff-1', 'nothing to clear')).toThrow(
        SanctionsFlagNotOpenException,
      );
    });

    it('re-opening after a clear creates a new flag', () => {
      const profile = KycProfile.createDefault('user-1');
      profile.flagForSanctionsReview('first match');
      profile.clearSanctionsFlag('staff-1', 'cleared, false positive');
      profile.pullDomainEvents();

      profile.flagForSanctionsReview('second, unrelated match');

      expect(profile.isCurrentlyFlaggedForSanctions).toBe(true);
      expect(profile.sanctionsClearedAt).toBeNull();
    });
  });
});
