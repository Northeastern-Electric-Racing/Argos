//
//  GraphView.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI
import Charts

struct GraphView: View {
    var data: Binding<[ArgosData]>
    
    var body: some View {
        Chart(Array(self.data.wrappedValue.enumerated()), id: \.0) {
            index, data in
            AreaMark (
                x: .value("Frequency", String(index)),
                y: .value("Magnitude", data.value)
            )
            .interpolationMethod(.catmullRom)
            .lineStyle(StrokeStyle(lineWidth: 1, dash: [2]))
            .foregroundStyle(Color(uiColor: UIColor(red: 0.8, green: 0, blue: 0, alpha: 0.6)))
        }
        .padding()
    }
}

#Preview {
    GraphView(data: .constant([ArgosData(id: 1, value: 20, dataTypeName: "Pack Temp", time: "1701102906905", runId: 1), ArgosData(id: 2, value: 21, dataTypeName: "Pack Temp", time: "1701102907907", runId: 1), ArgosData(id: 3, value: 18, dataTypeName: "Pack Temp", time: "1701102908909", runId: 1), ArgosData(id: 4, value: 17, dataTypeName: "Pack Temp", time: "1701102909911", runId: 1), ArgosData(id: 5, value: 25, dataTypeName: "Pack Temp", time: "1701102910912", runId: 1), ArgosData(id: 6, value: 30, dataTypeName: "Pack Temp", time: "1701102911914", runId: 1), ArgosData(id: 7, value: 38, dataTypeName: "Pack Temp", time: "1701102912916", runId: 1), ArgosData(id: 8, value: 32, dataTypeName: "Pack Temp", time: "1701102913918", runId: 1), ArgosData(id: 9, value: 26, dataTypeName: "Pack Temp", time: "1701102914919", runId: 1)]))
}
