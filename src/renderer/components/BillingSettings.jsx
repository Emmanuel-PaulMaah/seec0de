import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { openBillingPortal, useEntitlement } from '../engine/entitlements';

const FEATURE_LABELS = {
  premiumCourses: 'Premium courses',
  aiTutor: 'AI tutor',
  managedAI: 'Managed AI',
  portfolio: 'Portfolio & certificates',
  interview: 'Interview practice',
  cloudSync: 'Cloud sync',
};

export default function BillingSettings({ onUpgrade }) {
  const billing = useEntitlement();
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalError, setPortalError] = useState(null);
  const entitlement = billing.entitlement || {};
  const active = entitlement.plan === 'pro';

  const manage = async () => {
    setPortalBusy(true);
    setPortalError(null);
    const result = await openBillingPortal();
    setPortalBusy(false);
    if (!result?.ok) setPortalError(result?.error || 'Could not open the billing portal.');
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '4px 7px',
          border: '1px solid var(--border-subtle)',
          borderRadius: 999,
          color: active ? 'var(--accent)' : 'var(--text-secondary)',
          fontSize: 9.5,
          fontWeight: 800,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
        }}>
          {active ? <Sparkles size={11} /> : null}
          {active ? entitlement.planName || 'Pro' : 'Free'}
        </span>
        {active && entitlement.currentPeriodEnd && (
          <span style={{ color: 'var(--text-muted)', fontSize: 10.5 }}>
            {entitlement.cancelAtPeriodEnd ? 'Ends' : 'Renews'} {new Date(entitlement.currentPeriodEnd).toLocaleDateString()}
          </span>
        )}
      </div>

      {billing.loading && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 11 }}>
          <Loader2 size={12} className="upgrade-spin" /> Checking your plan…
        </span>
      )}

      {!billing.loading && !active && (
        <>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 11.5, lineHeight: 1.5 }}>
            Unlock premium courses, managed AI, portfolio tools, and interview practice.
          </p>
          <button
            type="button"
            onClick={onUpgrade}
            style={{
              justifySelf: 'start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 10px',
              border: '1px solid var(--accent)',
              borderRadius: 7,
              background: 'var(--accent)',
              color: 'var(--on-accent, #07110a)',
              fontSize: 10.5,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            <Sparkles size={12} /> See Pro plans
          </button>
        </>
      )}

      {!billing.loading && active && (
        <>
          <div style={{ display: 'grid', gap: 5 }}>
            {(entitlement.features || []).map((feature) => (
              <span key={feature} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 11 }}>
                <CheckCircle2 size={12} style={{ color: 'var(--accent)' }} />
                {FEATURE_LABELS[feature] || feature}
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            <button type="button" className="upgrade-secondary-btn" onClick={manage} disabled={portalBusy}>
              {portalBusy ? <Loader2 size={12} className="upgrade-spin" /> : <ExternalLink size={12} />}
              Manage billing
            </button>
            <button type="button" className="upgrade-secondary-btn" onClick={() => billing.refresh()}>
              Refresh
            </button>
          </div>
        </>
      )}

      {(portalError || billing.error) && (
        <span role="alert" style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 5, color: 'var(--danger-text, #e5484d)', fontSize: 10.5, lineHeight: 1.45 }}>
          <AlertCircle size={12} style={{ marginTop: 1, flexShrink: 0 }} />
          {portalError || billing.error}
        </span>
      )}

      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 9.5, lineHeight: 1.5 }}>
        Licenses are tied to this installation. Card subscriptions renew automatically; NGN passes are one-time.
      </p>
    </div>
  );
}
