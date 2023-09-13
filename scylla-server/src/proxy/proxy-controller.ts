import { Socket } from "socket.io";

export default class ProxyController {
  private handleClientMessage(data: any): void {
    try {
      data = JSON.parse(data);
    } catch (error) {
      console.log("error parsing message", error);
    }
  }

  private handleClientDisconnect(): void {
    console.log("disconnected from client");
  }

  public handleClientConnection(socket: Socket): void {
    socket.on("message", this.handleClientMessage);
    socket.on("disconnect", this.handleClientDisconnect);
  }
}
