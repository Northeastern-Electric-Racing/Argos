/**
 * Creates a map of server messages to functions that handle the messages
 * @returns A map of server messages to functions that handle the messages
 */
export const createServerMessageMap = (): Map<string, (data: JSON) => void> => {
  const serverMessageMap = new Map<string, (data: JSON) => void>();
  serverMessageMap.set('test', (data: JSON) => {
    console.log('test', data);
  });
  return serverMessageMap;
};

/**
 * Creates a map of client messages to functions that handle the messages
 * @returns A map of client messages to functions that handle the messages
 */
export const createClientMessageMap = (): Map<string, (data: JSON) => void> => {
  const clientMessageMap = new Map<string, (data: JSON) => void>();
  clientMessageMap.set('test', (data: JSON) => {
    console.log('test', data);
  });
  return clientMessageMap;
};
