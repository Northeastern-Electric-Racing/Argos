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
    static let shared = SocketClient(manager: SocketManager(socketURL: URL(string: "http://localhost:8000")!, config: [.log(true), .compress]))
    private let socket: SocketIOClient
    private let manager: SocketManager

    @Published public private(set) var runId: Int? = nil
    @Published public private(set) var values = [String: DataValue]()

    private init(manager: SocketManager) {
        self.manager = manager
        self.socket = manager.defaultSocket
    }

    public func connect() {
        socket.connect(timeoutAfter: 10, withHandler: {
            print("Could Not connect to Server")
        })
    }

    public func receiveMessage() {
        socket.on("message", callback: {
            data, _ in
            do {
                let decoder = JSONDecoder()
//                let serverData: [ServerData] = try decoder.decode([ServerData].self, from: data[0] as! Data)
//                serverData.forEach({
//                    self.values.updateValue(DataValue(value: $0.value, time: $0.timestamp), forKey: $0.name)
//                })
            } catch {
                print(error)
            }
        })
    }
}
