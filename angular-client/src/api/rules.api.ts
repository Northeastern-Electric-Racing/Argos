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

const basicAuthHeader = (clientId: string): string => 'Basic ' + btoa(`${clientId}:`);

export const getRulesByClientId = (clientId: string): Promise<Response> => {
  return fetch(urls.getRulesByClientId(clientId));
};

export const addRule = (clientId: string, rule: RulePayload): Promise<Response> => {
  return fetch(urls.addRule(), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: basicAuthHeader(clientId)
    },
    body: JSON.stringify(rule)
  });
};

export const deleteRule = (clientId: string, ruleId: string): Promise<Response> => {
  return fetch(urls.deleteRule(ruleId), {
    method: 'POST',
    headers: { Authorization: basicAuthHeader(clientId) }
  });
};

export const editRule = (ruleId: string, rule: object): Promise<Response> => {
  return fetch(urls.editRule(ruleId), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rule)
  });
};

export interface RuleSubscriptionRequest {
  rule_ids: string[];
  client_id: string;
}

export const subscribeToRules = (request: RuleSubscriptionRequest): Promise<Response> => {
  return fetch(urls.subscribeToRule(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
};

export const unsubscribeFromRules = (request: RuleSubscriptionRequest): Promise<Response> => {
  return fetch(urls.unsubscribeFromRule(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
};
