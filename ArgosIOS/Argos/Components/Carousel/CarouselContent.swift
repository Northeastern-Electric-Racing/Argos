//
//  CarouselContent.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

struct CarouselContent: View {
    var run: Run
    var selectRun: () -> Void
    
    var body: some View {
        VStack {
            HStack(alignment: .lastTextBaseline) {
                ArgosHeader("Run #\(self.run.id)")
                    .frame(alignment: .leading)
                
                ArgosLabel(self.formatDate())
                    .frame(maxWidth: .infinity, alignment: .trailing)
                    .multilineTextAlignment(.trailing)
            }
            HStack {
                ChipView(systemImage: "person.badge.key", titleKey: self.run.driverName ?? "")
                ChipView(systemImage: "location.circle", titleKey: self.run.locationName ?? "")
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
            HStack {
                ChipView(systemImage: "wrench.and.screwdriver.fill", titleKey: self.run.systemName ?? "")
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            ArgosButton(title: "Select Run", action: self.selectRun)
                .frame(maxWidth: .infinity)
        }
    }
    
    private func formatDate() -> String {
        return self.run.dateTime.formatted(date: .abbreviated, time: .shortened)
    }
}

#Preview {
    CarouselContent(run: Run(id: 1, locationName: "Gainsborough", driverName: "Fergus", systemName: "Drive Train", time: Date.now.formatted()), selectRun: {
        print("selected run")
    })
}
