import React, { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, Loader2, Lock, Sparkles } from 'lucide-react';
import { Dialog } from './ui/dialog';
import { openBillingPortal, startCheckout } from '../engine/entitlements';

const FEATURE_COPY = [
  ['Premium courses', 'Full course packs, including Tailwind CSS and every future Pro course.'],
  ['AI tutor', 'Guided explanations, hints, and step-by-step help inside lessons.'],
  ['Managed AI', 'Use AI features without adding your own API key, within a fair-use limit.'],
  ['Portfolio & certificates', 'Publish finished work and collect completion certificates.'],
  ['Interview practice', 'Timed challenges with feedback on your approach and code.'],
  ['Cloud sync', 'Carry progress and projects between devices.'],
];

const planPrice = (plan) => {
  const amount = Number(plan.amount);
  const formatted = Number.isFinite(amount)
    ? amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    : plan.amount;
  return `${plan.currency} ${formatted}`;
};

const planPeriod = (plan) => {
  if (plan.interval === 'month') return 'per month';
  if (plan.interval === 'year') return 'per year';
  return `for ${plan.interval}`;
};

function PlanCard({ plan, busy, onChoose }) {
  const annual = plan.interval === 'year';
  return (
    <div className="upgrade-plan-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ color: 'var(--text-secondary)', fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
          {plan.interval === '30 days' ? '30-day pass' : annual ? 'Annual' : 'Monthly'}
        </span>
        {plan.autoRenew && (
          <span style={{ color: 'var(--text-muted)', fontSize: 9.5, fontWeight: 700 }}>Auto-renews</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 10 }}>
        <strong style={{ color: 'var(--text-primary)', fontSize: 22, letterSpacing: '-0.03em' }}>{planPrice(plan)}</strong>
        <span style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>{planPeriod(plan)}</span>
      </div>
      <button
        type="button"
        onClick={() => onChoose(plan.id)}
        disabled={!!busy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          width: '100%',
          marginTop: 14,
          padding: '9px 12px',
          border: '1px solid var(--accent)',
          borderRadius: 8,
          background: busy === plan.id ? 'var(--accent-muted)' : 'var(--accent)',
          color: 'var(--on-accent, #07110a)',
          fontSize: 11.5,
          fontWeight: 800,
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy && busy !== plan.id ? 0.55 : 1,
        }}
      >
        {busy === plan.id ? <Loader2 size={13} className="upgrade-spin" /> : null}
        {busy === plan.id ? 'Opening checkout…' : 'Choose plan'}
      </button>
    </div>
  );
}

export default function UpgradeModal({ open, onClose, entitlement, onRefresh }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [checkoutStarted, setCheckoutStarted] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);

  const active = entitlement?.plan === 'pro';

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setError(null);
    setCheckoutStarted(false);
    if (!window.seecode?.billing) {
      setError('Billing is only available in the desktop app.');
      return undefined;
    }
    setLoading(true);
    window.seecode.billing.getPlans()
      .then((result) => {
        if (cancelled) return;
        if (result?.ok === false) {
          setError(result.error || 'Could not load plans.');
          setPlans([]);
        } else {
          setPlans(Array.isArray(result?.plans) ? result.plans : []);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'Could not load plans.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open || !checkoutStarted) return undefined;
    const timer = setInterval(() => { onRefresh?.(); }, 5000);
    return () => clearInterval(timer);
  }, [open, checkoutStarted, onRefresh]);

  const groups = useMemo(() => {
    const usd = plans.filter((plan) => plan.currency === 'USD');
    const ngn = plans.filter((plan) => plan.currency === 'NGN');
    return [
      { currency: 'USD', label: 'Card payment', plans: usd },
      { currency: 'NGN', label: 'Bank transfer or mobile money', plans: ngn },
    ].filter((group) => group.plans.length > 0);
  }, [plans]);

  const choose = async (planId) => {
    setBusy(planId);
    setError(null);
    const result = await startCheckout(planId);
    setBusy(null);
    if (!result?.ok) {
      setError(result?.error || 'Could not start checkout.');
      return;
    }
    setCheckoutStarted(true);
  };

  const openPortal = async () => {
    setPortalBusy(true);
    setError(null);
    const result = await openBillingPortal();
    setPortalBusy(false);
    if (!result?.ok) setError(result?.error || 'Could not open the billing portal.');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="upgrade-dialog"
      title={active ? 'Your Pro plan' : 'Do more with seec0de Pro'}
      description={active
        ? 'Premium courses, managed AI, portfolio tools, and interview practice are unlocked on this device.'
        : 'One plan. Every premium feature. Cancel anytime on card subscriptions.'}
    >
      <div style={{ display: 'grid', gap: 14 }}>
        {active ? (
          <div className="upgrade-active-card">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--accent)', fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase' }}>
              <Sparkles size={12} /> Active
            </span>
            <strong style={{ marginTop: 8, color: 'var(--text-primary)', fontSize: 16 }}>
              {entitlement?.planName || 'Pro'}
            </strong>
            {entitlement?.currentPeriodEnd && (
              <span style={{ marginTop: 3, color: 'var(--text-muted)', fontSize: 11 }}>
                {entitlement.cancelAtPeriodEnd ? 'Ends' : 'Renews'} {new Date(entitlement.currentPeriodEnd).toLocaleDateString()}
              </span>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
              <button type="button" onClick={openPortal} disabled={portalBusy} className="upgrade-secondary-btn">
                {portalBusy ? <Loader2 size={12} className="upgrade-spin" /> : <ExternalLink size={12} />}
                Manage billing
              </button>
              <button type="button" onClick={() => onRefresh?.()} className="upgrade-secondary-btn">
                Refresh status
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 7 }}>
              {FEATURE_COPY.map(([title, copy]) => (
                <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <Check size={13} style={{ color: 'var(--accent)', marginTop: 2, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)', fontSize: 11.5, lineHeight: 1.45 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{title}.</strong> {copy}
                  </span>
                </div>
              ))}
            </div>

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 11.5 }}>
                <Loader2 size={14} className="upgrade-spin" /> Loading plans…
              </div>
            )}

            {!loading && groups.map((group) => (
              <div key={group.currency}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, color: 'var(--text-muted)', fontSize: 9.5, fontWeight: 800, letterSpacing: 0.9, textTransform: 'uppercase' }}>
                  {group.currency === 'NGN' ? <Lock size={11} /> : null}
                  {group.label}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                  {group.plans.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} busy={busy} onChoose={choose} />
                  ))}
                </div>
                {group.currency === 'NGN' && (
                  <p style={{ margin: '7px 0 0', color: 'var(--text-muted)', fontSize: 10, lineHeight: 1.45 }}>
                    NGN passes are one-time payments. Renew when the pass ends.
                  </p>
                )}
              </div>
            ))}

            {checkoutStarted && (
              <div className="upgrade-checkout-note">
                Complete checkout in the window that just opened. Your plan activates automatically after payment.
                <button type="button" onClick={() => onRefresh?.()} className="upgrade-secondary-btn" style={{ marginTop: 8 }}>
                  I've paid — refresh
                </button>
              </div>
            )}

            {error && (
              <p role="alert" style={{ margin: 0, color: 'var(--danger-text, #e5484d)', fontSize: 11.5, lineHeight: 1.45 }}>
                {error}
              </p>
            )}

            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 10, lineHeight: 1.5 }}>
              Prices are shown in USD and NGN. Card subscriptions renew automatically until cancelled. NGN bank transfer and mobile money passes are one-time.
            </p>
          </>
        )}

        {error && active && (
          <p role="alert" style={{ margin: 0, color: 'var(--danger-text, #e5484d)', fontSize: 11.5, lineHeight: 1.45 }}>
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
