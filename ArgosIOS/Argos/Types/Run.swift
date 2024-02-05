//
//  Run.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import Foundation

/**
 * Format of a run 
 */
struct Run: Codable {
    var id: Int
    var locationName: String?
    var driverName: String?
    var systemName: String?
    var time: String
    var timestamp: Int {
        return Int(self.time)! / 1000
    }
}
