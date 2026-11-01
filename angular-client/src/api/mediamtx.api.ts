/**
 * Checks whether the MediaMTX stream server answers at the given url
 * @param url The stream's base url
 * @returns A promise resolving to true if the server responded
 */
export const checkStreamAvailable = (url: string): Promise<boolean> =>
  fetch(url, { method: 'HEAD' })
    .then(() => true)
    .catch(() => false);

/**
 * Sends a WebRTC offer to a MediaMTX WHEP endpoint
 * @param url The stream's WHEP endpoint
 * @param offer The SDP offer
 * @returns A promise containing the SDP answer
 */
export const sendWhepOffer = (url: URL, offer: string | undefined): Promise<string> => {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp' },
    body: offer
  }).then((res) => {
    switch (res.status) {
      case 201:
        break;
      case 404:
        throw new Error('stream not found');
      case 400:
        return res.json().then((e) => {
          throw new Error(e.error);
        });
      default:
        throw new Error(`bad status code ${res.status}`);
    }

    return res.text();
  });
};
