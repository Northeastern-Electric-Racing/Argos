//
//  ExpandableView.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

struct ExpandableView: View {
    var scrollViewItem: ScrollViewItem
    @State private var isExpanded: Bool = false
    @State private var inputAdornmentSystemName = "chevron.down"

    var body: some View {
        HStack {
            ScrollCard(title: self.scrollViewItem.name, inputAdornmentSystemName: self.$inputAdornmentSystemName, onSelect: {
                withAnimation {
                    self.isExpanded.toggle()
                    self.inputAdornmentSystemName = self.isExpanded ? "chevron.right" : "chevron.down"
                }
            })
            if self.isExpanded {
                ForEach(self.scrollViewItem.subItems) {
                    scrollViewItem in
                    ScrollCard(title: scrollViewItem.name) {
                        scrollViewItem.onSelect()
                    }
                }
            }
        }
    }
}

#Preview {
    ExpandableView(scrollViewItem: ScrollViewItem(name: "BMS", subItems: [ScrollViewSubItem(name: "Pack Temp", onSelect: {}), ScrollViewSubItem(name: "Motor Temp", onSelect: {})]))
}
