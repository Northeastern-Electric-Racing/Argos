//
//  ArgosNavLink.swift
//  Argos
//
//  Created by Dylan McCann on 2/4/24.
//

import SwiftUI

struct ArgosNavLink<Content:View>: View {
    @ViewBuilder var destination: Content
    let title: String
    
    init(title: String, @ViewBuilder destination: () -> Content) {
        self.destination = destination()
        self.title = title
    }
    
    var body: some View {
        NavigationLink(title){destination}.padding()
            .background(Color(.red))
            .foregroundStyle(Color(.white))
            .clipShape(.buttonBorder).font(.system(size: 24))
    }
}

#Preview {
    ArgosButton(title: "Button", action: {
        print("Clicked")
    })
}
