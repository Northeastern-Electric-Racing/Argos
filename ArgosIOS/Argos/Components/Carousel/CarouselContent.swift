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
                ChipView(systemImage: "person.badge.key", titleKey: self.run.driverName)
                ChipView(systemImage: "location.circle", titleKey: self.run.locationName)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
            HStack {
                ChipView(systemImage: "wrench.and.screwdriver.fill", titleKey: run.systemName)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            ArgosButton(title: "Select Run", action: selectRun)
                .frame(maxWidth: .infinity)
            
        }
        .padding()
    }
    
    private func formatDate() -> String {
        return Date(timeIntervalSince1970: TimeInterval(self.run.timestamp)).formatted(date: .abbreviated, time: .shortened)
        
    }
}

#Preview {
    CarouselContent(run: Run(id: 1, locationName: "Gainsborough", driverName: "Fergus", systemName: "Drive Train", time: "100000000"), selectRun: {
        print("selected run")
    })
}
