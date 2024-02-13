//
//  GraphView.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI
import Charts

struct GraphView: View {
    @Binding var data: [DataValue]
    
    var body: some View {
        Chart(Array(self.data.enumerated()), id: \.0) {
            index, data in
            AreaMark (
                x: .value("Frequency", String(index)),
                y: .value("Magnitude", data.value[0])
            )
            .interpolationMethod(.catmullRom)
            .lineStyle(StrokeStyle(lineWidth: 1, dash: [2]))
            .foregroundStyle(Color(uiColor: UIColor(red: 0.8, green: 0, blue: 0, alpha: 0.6)))
        }
        .padding()
    }
}

#Preview {
    GraphView(data: .constant([]))
}
