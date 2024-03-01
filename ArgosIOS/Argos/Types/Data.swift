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
    var id: String
    var values: [String]
    var dataTypeName: String
    var time: Int
    var runId: Int
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decode(String.self, forKey: .id)
        self.values = try container.decode([String].self, forKey: .values)
        self.dataTypeName = try container.decode(String.self, forKey: .dataTypeName)
        self.time = try container.decode(Int.self, forKey: .time)
        self.runId = try container.decode(Int.self, forKey: .runId)
    }
}
