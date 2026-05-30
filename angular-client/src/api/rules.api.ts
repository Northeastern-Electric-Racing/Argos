import { urls } from './urls';

export interface RulePayload {
  id: string;
  topic: string;
  expr: string;
  debounce_time: number;
}

export interface ClientRule {
  id: string;
  topic: string;
  expr: string;
  debounce_time: number;
  subscribers: string[];
  is_subscribed: boolean;
}

export interface RulesResponse {
  requesting_client_id: string;
  client_rules: ClientRule[];
}

const clientIdHeader = (clientId: string): Record<string, string> => ({ 'X-Client-Id': clientId });

export const getRulesByClientId = (clientId: string): Promise<Response> => {
  return fetch(urls.getRulesWithSubscriptionStatus(), { headers: clientIdHeader(clientId) });
};

export const addRule = (clientId: string, rule: RulePayload): Promise<Response> => {
  return fetch(urls.addRule(), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...clientIdHeader(clientId) },
    body: JSON.stringify(rule)
  });
};

export const deleteRule = (clientId: string, ruleId: string): Promise<Response> => {
  return fetch(urls.deleteRule(ruleId), {
    method: 'POST',
    headers: clientIdHeader(clientId)
  });
};

export const editRule = (ruleId: string, rule: object): Promise<Response> => {
  return fetch(urls.editRule(ruleId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule)
  });
};

export const subscribeToRules = (clientId: string, ruleIds: string[]): Promise<Response> => {
  return fetch(urls.subscribeToRule(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...clientIdHeader(clientId) },
    body: JSON.stringify(ruleIds)
  });
};

export const unsubscribeFromRules = (clientId: string, ruleIds: string[]): Promise<Response> => {
  return fetch(urls.unsubscribeFromRule(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...clientIdHeader(clientId) },
    body: JSON.stringify(ruleIds)
  });
};
