//
//  SocketClient.swift
//  Argos
//
//  Created by Peyton McKee on 12/18/23.
//

import Foundation
import SocketIO

/**
 * Wrapper class for the socket connection to the server
 */
class SocketClient: ObservableObject {
    static let shared = SocketClient(manager: SocketManager(socketURL: Route.baseUrl, config: [.log(false), .compress]))
    private let socket: SocketIOClient
    private let manager: SocketManager
    
    @Published public private(set) var isConnected = false
    @Published public private(set) var runId: Int? = nil
    @Published public private(set) var values = [String: DataValue]()
    
    private init(manager: SocketManager) {
        self.manager = manager
        self.socket = manager.defaultSocket
        self.receiveMessage()
        self.handleConnection()
        self.handleDisconnection()
    }
    
    public func connect() {
        self.socket.connect(timeoutAfter: 10, withHandler: {
            self.isConnected = false
            print("Could Not connect to Server")
        })
    }
    
    private func receiveMessage() {
        self.socket.on("message", callback: {
            data, _ in
            do {
                guard let data = (data[0] as? String)?.data(using: .utf8) else {
                    return
                }
                let decoder = JSONDecoder()
                let serverData: ServerData = try decoder.decode(ServerData.self, from: data)
                self.runId = serverData.runId
                self.values.updateValue(DataValue(value: [serverData.value], time: serverData.timestamp), forKey: serverData.name)
            } catch {
                print("error", error)
            }
        })
    }
    
    private func handleConnection() {
        self.socket.on(clientEvent: .connect, callback: {
            _, _ in
            self.isConnected = true
        })
    }
    
    private func handleDisconnection() {
        self.socket.on(clientEvent: .disconnect, callback: {
            _, _ in
            self.isConnected = false
        })
    }
}
