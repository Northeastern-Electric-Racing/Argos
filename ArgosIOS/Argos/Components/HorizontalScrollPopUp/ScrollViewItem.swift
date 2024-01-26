//
//  ScrollViewItem.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import Foundation

struct ScrollViewItem: Identifiable {
    var id = UUID()
    var name: String
    var subItems: [ScrollViewSubItem]
}

struct ScrollViewSubItem: Identifiable {
    var id = UUID()
    var name: String
    var onSelect: () -> Void
}
