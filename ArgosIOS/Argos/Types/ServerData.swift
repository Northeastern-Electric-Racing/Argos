//
//  ServerData.swift
//  Argos
//
//  Created by Peyton McKee on 12/18/23.
//

import Foundation

/**
 * The format of a message sent from the server
 */
struct ServerData: Codable {
    var runId: Int
    var name: String
    var unit: String
    var value: Float
    var timestamp: Int
}

/**
 * Format of a data point
 */
struct DataValue: Codable {
    var value: Float
    var time: Int
}
