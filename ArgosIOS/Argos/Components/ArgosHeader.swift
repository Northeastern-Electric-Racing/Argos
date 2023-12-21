//
//  ArgosHeader.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

struct ArgosHeader: View {
    var text: String
    
    init(_ text: String) {
        self.text = text
    }
    
    var body: some View {
        ArgosLabel(self.text, 36).fontWeight(.bold)
    }
}
