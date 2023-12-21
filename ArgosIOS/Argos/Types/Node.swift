//
//  Node.swift
//  Argos
//
//  Created by Peyton McKee on 12/18/23.
//

import Foundation

/**
 * Format of a Node 
 */
struct Node: Codable {
    var name: String
    var dataTypes: [DataType]
}
