//
//  ChipView.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

struct ChipView: View {
    let systemImage: String
    let titleKey: String

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: self.systemImage).font(.body)
            ArgosLabel(self.titleKey).lineLimit(1)
        }
        .padding(.vertical, 4)
        .padding(.leading, 4)
        .padding(.trailing, 10)
        .cornerRadius(20)
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.secondary, lineWidth: 1.5)
        )
    }
}

#Preview {
    ChipView(systemImage: "heart.circle", titleKey: "Title")
        .previewLayout(.sizeThatFits)
        .padding()
}
