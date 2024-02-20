//
//  TransformerError.swift
//  Argos
//
//  Created by Peyton McKee on 2/19/24.
//

import Foundation

enum TransformerError: Error {
    case failedToConvertDataValueToGraphData
}

extension TransformerError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .failedToConvertDataValueToGraphData:
            return "Failed to convert data value to graph data"
        }
    }
}
