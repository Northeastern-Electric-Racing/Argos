//
//  APIError.swift
//  Argos
//
//  Created by Peyton McKee on 1/16/24.
//

import Foundation

struct HttpError: Codable {
    var statusCode: Int
    var message: String
    
    enum CodingKeys: CodingKey {
        case message
        case statusCode
    }
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(self.message, forKey: .message)
        try container.encode(self.statusCode, forKey: .statusCode)
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.message = try container.decode(String.self, forKey: .message)
        self.statusCode = try container.decode(Int.self, forKey: .statusCode)
    }
    
    init(statusCode: Int, message: String) {
        self.statusCode = statusCode
        self.message = message
    }
}

extension HttpError: Error, LocalizedError {
    var errorDescription: String? {
        return "Error: \(self.statusCode), \(self.message)"
    }
}
