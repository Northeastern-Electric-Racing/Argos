//
//  ScrollCard.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

struct ScrollCard : View {
    var title: String
    var inputAdornmentSystemName: Binding<String>? = nil
    var onSelect: () -> Void
    
    var body: some View {
        HStack {
            if let inputAdornmentSystemName = self.inputAdornmentSystemName {
                Image(systemName: inputAdornmentSystemName.wrappedValue)
            }
            
            ArgosHeader(self.title)
                .onTapGesture {
                    onSelect()
                }
        }
        .foregroundStyle(.foreground)
        .background(.background)
        .frame(width: 150, height: 100)
        .clipShape(.buttonBorder)
    }
}

#Preview {
    ScrollCard(title: "BMS", inputAdornmentSystemName: .constant("chevron.down"), onSelect: {
        print("Clicked me")
    })
}
