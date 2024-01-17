//
//  GraphCaption.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

struct GraphCaption : View {
    var dataType: Binding<DataType?>
    var mostRecentvalue: Float?
    var driver: String
    var location: String
    var system: String

    var body: some View {
        VStack {
            HStack{
                ArgosHeader(self.dataType.wrappedValue?.name ?? "No Data Selected")
                    .frame(maxWidth: .infinity, alignment: .leading)
                ArgosLabel(self.driver)
            }
            .frame(maxHeight: .infinity)
            
            HStack {
                HStack {
                    ArgosLabel(self.mostRecentvalue?.description ?? "")
                    ArgosLabel(self.dataType.wrappedValue?.unit ?? "")
                }
                .frame(alignment: .leading)

                ArgosLabel(self.system)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
            .frame(maxHeight: .infinity)
            
            HStack {
                Color(.clear)
                    .gridCellUnsizedAxes(.horizontal).gridCellUnsizedAxes(.vertical)
                ArgosLabel(self.location)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
            .frame(maxHeight: .infinity)
        }
        .frame(height: 125)
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(.buttonBorder)
    }
}

#Preview {
    GraphCaption(dataType: .constant(DataType(name: "Pack Temp", unit: "C")), mostRecentvalue: (25), driver: ("Fergus"), location: ("Gainsborough"), system: ("Drive Train"))
}
