import { RewardAccount } from './reward-account.entity';
import { InsufficientRewardPointsException } from '../exceptions/insufficient-reward-points.exception';
import { RedemptionType } from '../enums/redemption-type.enum';

describe('RewardAccount aggregate', () => {
  it('opens with zero balance and a generated KUDI- referral code', () => {
    const account = RewardAccount.open('user-1');

    expect(account.pointsBalance).toBe(0);
    expect(account.referralCode).toMatch(/^KUDI-[A-F0-9]{6}$/);
  });

  it('earns points and emits RewardPointsEarnedEvent', () => {
    const account = RewardAccount.open('user-1');

    account.earn(50, 'transfer-1');

    expect(account.pointsBalance).toBe(50);
    expect(account.totalEarned).toBe(50);
    expect(account.pullDomainEvents()[0].eventName).toBe('rewards.points.earned');
  });

  it('ignores a non-positive earn amount without mutating state', () => {
    const account = RewardAccount.open('user-1');

    account.earn(0, null);
    account.earn(-5, null);

    expect(account.pointsBalance).toBe(0);
    expect(account.pullDomainEvents()).toHaveLength(0);
  });

  it('redeems points when the balance is sufficient', () => {
    const account = RewardAccount.open('user-1');
    account.earn(100, null);
    account.pullDomainEvents();

    account.redeem(40, RedemptionType.CASHBACK);

    expect(account.pointsBalance).toBe(60);
    expect(account.totalRedeemed).toBe(40);
    expect(account.pullDomainEvents()[0].eventName).toBe('rewards.points.redeemed');
  });

  it('refuses to redeem more points than the balance holds', () => {
    const account = RewardAccount.open('user-1');
    account.earn(10, null);

    expect(() => account.redeem(20, RedemptionType.AIRTIME)).toThrow(
      InsufficientRewardPointsException,
    );
    expect(account.pointsBalance).toBe(10);
  });

  it('awards a referral bonus and emits ReferralBonusAwardedEvent', () => {
    const account = RewardAccount.open('user-1');

    account.awardReferralBonus(100, 'REFERRER');

    expect(account.pointsBalance).toBe(100);
    expect(account.pullDomainEvents()[0].eventName).toBe('rewards.referral.bonus-awarded');
  });
});
