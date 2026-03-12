import { urls } from './urls';

export const getRulesByClientId = (clientId: string): Promise<Response> => {
  return fetch(urls.getRulesByClientId(clientId));
};

export const addRule = (rule: object): Promise<Response> => {
  return fetch(urls.addRule(), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule)
  });
};

export const deleteRule = (ruleId: string): Promise<Response> => {
  return fetch(urls.deleteRule(ruleId), { method: 'POST' });
};

export const editRule = (ruleId: string, rule: object): Promise<Response> => {
  return fetch(urls.editRule(ruleId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule)
  });
};

export const subscribeToRule = (subscription: object): Promise<Response> => {
  return fetch(urls.subscribeToRule(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscription)
  });
};
