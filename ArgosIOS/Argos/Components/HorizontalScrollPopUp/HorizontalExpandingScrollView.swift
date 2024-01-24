//
//  HorizontalExpandingScrollView.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

struct HorizontalExpandingScrollView : View {
    @State var items: [ScrollViewItem]
    
    var body: some View {
        ScrollView(.horizontal) {
            HStack {
                ForEach(self.items) {
                    ExpandableView(scrollViewItem: $0)
                }
            }
        }
        .background(Color(.systemBackground))
    }
}

#Preview {
    HorizontalExpandingScrollView(items: [ScrollViewItem(name: "BMS", subItems: [ScrollViewSubItem(name: "Pack Temp", onSelect: {}), ScrollViewSubItem(name: "Motor Temp", onSelect: {})])])
}
