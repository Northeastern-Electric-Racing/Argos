//
//  ArgosLabel.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

struct ArgosLabel: View {
    var text: String
    var size: CGFloat = 24
    
    init(_ text: String, _ size: CGFloat = 24) {
        self.text = text
        self.size = size
    }

    var body: some View {
        Text(self.text)
            .font(.custom("Roboto", size: self.size))
    }
}
