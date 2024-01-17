//
//  Data.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import Foundation

/**
 * Format of a piece of data
 */
struct ArgosData : Codable {
    var id: Int
    var value: Float
    var dataTypeName: String
    var time: String
    var timestamp: Int {
        return Int(self.time)! / 1000
    }
    var runId: Int
}
