//
//  ConfigureError.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import Foundation

enum ConfigureError: Error {
    case runIdNotSet
}

extension ConfigureError: LocalizedError {
    var errorDescription: String? {
        switch self {
        case .runIdNotSet:
            return "No run set, are you connected to the router? Is the car on?"
        }
    }
}
