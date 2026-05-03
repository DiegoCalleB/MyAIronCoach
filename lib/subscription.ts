// lib/subscription.ts

const KEY = 'fitapp_sub_data';

export interface SubscriptionData {
  planCount: number;
  isPro: boolean;
}

export const getSubscriptionData = (): SubscriptionData => {
  try {
    const data = localStorage.getItem(KEY);
    if (!data) return { planCount: 0, isPro: false };
    return JSON.parse(atob(data));
  } catch {
    return { planCount: 0, isPro: false };
  }
};

export const saveSubscriptionData = (data: SubscriptionData) => {
  localStorage.setItem(KEY, btoa(JSON.stringify(data)));
};

export const incrementPlanCount = (): SubscriptionData => {
  const data = getSubscriptionData();
  data.planCount += 1;
  saveSubscriptionData(data);
  return data;
};

export const setProStatus = (isPro: boolean) => {
  const data = getSubscriptionData();
  data.isPro = isPro;
  saveSubscriptionData(data);
};
