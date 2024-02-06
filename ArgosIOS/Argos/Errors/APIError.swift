//
//  APIError.swift
//  Argos
//
//  Created by Peyton McKee on 1/16/24.
//

import Foundation

struct HttpError: Codable {
    var status: Int
    var message: String
    
    enum CodingKeys: CodingKey {
        case message
        case status
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(self.message, forKey: .message)
        try container.encode(self.status, forKey: .status)
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.message = try container.decode(String.self, forKey: .message)
        self.status = try container.decode(Int.self, forKey: .status)
    }
    
    init(_ status: Int, _ message: String) {
        self.status = status
        self.message = message
    }
}

extension HttpError: Error, LocalizedError {
    var errorDescription: String? {
        return "Error: \(self.status), \(self.message)"
    }
}
