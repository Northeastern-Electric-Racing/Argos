//
//  GraphCaption.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

struct GraphCaption : View {
    var dataType: Binding<DataType?>
    var mostRecentvalue: Binding<Float>?
    var driver: Binding<String>
    var location: Binding<String>
    var system: Binding<String>

    var body: some View {
        VStack {
            HStack{
                ArgosHeader(self.dataType.wrappedValue?.name ?? "No Data Selected")
                    .frame(maxWidth: .infinity, alignment: .leading)
                ArgosLabel(self.driver.wrappedValue)
            }
            .frame(maxHeight: .infinity)
            
            HStack {
                HStack {
                    ArgosLabel(self.mostRecentvalue?.wrappedValue.description ?? "")
                    ArgosLabel(self.dataType.wrappedValue?.unit ?? "")
                }
                .frame(alignment: .leading)

                ArgosLabel(self.system.wrappedValue)
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
            .frame(maxHeight: .infinity)
            
            HStack {
                Color(.clear)
                    .gridCellUnsizedAxes(.horizontal).gridCellUnsizedAxes(.vertical)
                ArgosLabel(self.location.wrappedValue)
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
    GraphCaption(dataType: .constant(DataType(name: "Pack Temp", unit: "C")), mostRecentvalue: .constant(25), driver: .constant("Fergus"), location: .constant("Gainsborough"), system: .constant("Drive Train"))
}
