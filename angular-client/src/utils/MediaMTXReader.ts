import { sendWhepOffer } from 'src/api/mediamtx.api';

export interface Conf {
  url: URL;
  onError: (message: string) => void;
  onTrack: (event: RTCTrackEvent) => void;
}
export default class MediaMTXWebRTCReader {
  private conf: Conf;
  private state = 'initializing';
  private pc: RTCPeerConnection | null = null;

  constructor(conf: Conf) {
    this.conf = conf;
    this.start();
  }

  private start = () => {
    this.state = 'running';

    this.setupPeerConnection()
      .then((offer) => this.sendOffer(offer))
      .then((answer) => this.setAnswer(answer))
      .catch((err) => {
        console.log(err);
      });
  };

  private setupPeerConnection = () => {
    this.pc = new RTCPeerConnection();

    const direction = 'recvonly';
    this.pc.addTransceiver('video', { direction });
    this.pc.ontrack = (evt) => this.onTrack(evt);

    return this.pc.createOffer().then((offer: RTCSessionDescriptionInit) => {
      if (!offer.sdp) return undefined;

      return this.pc?.setLocalDescription(offer).then(() => offer.sdp);
    });
  };

  private sendOffer = (offer: string | undefined) => sendWhepOffer(this.conf.url, offer);

  private setAnswer = (answer: string) => {
    if (this.state !== 'running') {
      return;
    }

    return this.pc?.setRemoteDescription(
      new RTCSessionDescription({
        type: 'answer',
        sdp: answer
      })
    );
  };

  private onTrack = (evt: RTCTrackEvent) => {
    if (this.conf.onTrack !== undefined) {
      this.conf.onTrack(evt);
    }
  };
}
