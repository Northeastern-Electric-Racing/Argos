//
//  ArgosButton.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

struct ArgosButton: View {
    var title: String
    var action: () -> Void

    var body: some View {
        Button(action: self.action) {
            ArgosLabel(self.title)
        }
        .padding()
        .background(Color(.red))
        .foregroundStyle(Color(.white))
        .clipShape(.buttonBorder)
    }
}

#Preview {
    ArgosButton(title: "Button", action: {
        print("Clicked")
    })
}
