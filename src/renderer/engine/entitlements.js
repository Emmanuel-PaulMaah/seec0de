import { useEffect, useState } from 'react';

export const FREE_ENTITLEMENT = Object.freeze({
  plan: 'free',
  planName: 'Free',
  status: 'none',
  features: [],
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  source: null,
  email: null,
  cached: false,
});

let state = {
  loading: true,
  entitlement: FREE_ENTITLEMENT,
  error: null,
  installId: null,
  serviceUrl: null,
};

let started = false;
let inFlight = null;
const listeners = new Set();

function emit(patch) {
  state = { ...state, ...patch };
  for (const listener of listeners) {
    try { listener(state); } catch { /* ignore */ }
  }
}

export function getEntitlementState() {
  return state;
}

export function subscribeEntitlement(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hasFeature(feature) {
  return state.entitlement.plan === 'pro' && state.entitlement.features.includes(feature);
}

export function isPro() {
  return state.entitlement.plan === 'pro';
}

export async function refreshBilling() {
  if (!window.seecode?.billing) {
    emit({ loading: false, entitlement: FREE_ENTITLEMENT, error: null });
    return state;
  }
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const result = await window.seecode.billing.refreshEntitlement();
      emit({
        loading: false,
        entitlement: result?.entitlement || FREE_ENTITLEMENT,
        error: result?.ok === false ? result?.error || 'Could not refresh your plan.' : null,
        installId: result?.installId || state.installId,
      });
    } catch (err) {
      emit({ loading: false, error: err?.message || 'Could not refresh your plan.' });
    } finally {
      inFlight = null;
    }
    return state;
  })();
  return inFlight;
}

export function ensureBillingStarted() {
  if (started) return;
  started = true;
  if (!window.seecode?.billing) {
    emit({ loading: false });
    return;
  }
  (async () => {
    try {
      const initial = await window.seecode.billing.getEntitlement();
      emit({
        loading: true,
        entitlement: initial?.entitlement || FREE_ENTITLEMENT,
        installId: initial?.installId || null,
        serviceUrl: initial?.serviceUrl || null,
      });
    } catch { /* refresh below */ }
    await refreshBilling();
  })();

  window.addEventListener('focus', () => { refreshBilling(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshBilling();
  });
}

export async function startCheckout(planId) {
  if (!window.seecode?.billing) return { ok: false, error: 'Billing is only available in the desktop app.' };
  try {
    return await window.seecode.billing.startCheckout({ planId });
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not start checkout.' };
  }
}

export async function openBillingPortal() {
  if (!window.seecode?.billing) return { ok: false, error: 'Billing is only available in the desktop app.' };
  try {
    return await window.seecode.billing.openPortal();
  } catch (err) {
    return { ok: false, error: err?.message || 'Could not open the billing portal.' };
  }
}

export async function clearLicense() {
  if (!window.seecode?.billing) return;
  await window.seecode.billing.clearLicense();
  emit({ loading: false, entitlement: FREE_ENTITLEMENT, error: null });
}

export function useEntitlement() {
  const [snapshot, setSnapshot] = useState(state);
  useEffect(() => {
    ensureBillingStarted();
    setSnapshot(state);
    return subscribeEntitlement(setSnapshot);
  }, []);
  return {
    ...snapshot,
    refresh: refreshBilling,
    hasFeature,
    isPro: snapshot.entitlement.plan === 'pro',
  };
}
