//
//  Routes.swift
//  Argos
//
//  Created by Peyton McKee on 12/18/23.
//

import Foundation

protocol API {
    static var baseUrl: URL { get }
}

enum Route: RawRepresentable, API {
    init?(rawValue: String) { nil }
    
    static let baseUrl: URL = .init(string: "http://localhost:8000")!
    
    case allNodes

    case allRuns
    case runById(id: Int)
    
    case dataByDataTypeAndRunId(name: String, runId: Int)
    
    var rawValue: String {
        switch self {
        case .allNodes: return "/nodes"
            
        case .allRuns: return "/runs"
        case .runById(let id): return "\(Route.allRuns.rawValue)/\(id)"
            
        case .dataByDataTypeAndRunId(let name, let runId): return "data/\(name)/\(runId)"
        }
    }
}

extension RawRepresentable where RawValue == String, Self: API {
    var url: URL { Self.baseUrl.appendingPathComponent(rawValue) }
}
