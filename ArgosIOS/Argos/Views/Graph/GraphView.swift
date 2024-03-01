//
//  GraphView.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI
import Charts

struct GraphData {
    var time: Int
    var value: Float
}

struct GraphView: View {
    var data: [GraphData]
    
    var body: some View {
        Chart(Array(self.data.enumerated()), id: \.0) {
            index, data in
            LineMark (
                x: .value("Frequency", Date(timeIntervalSince1970: Double(data.time))),
                y: .value("Magnitude", data.value)
            )
            .interpolationMethod(.catmullRom)
            .lineStyle(StrokeStyle(lineWidth: 1, dash: [2]))
            .foregroundStyle(Color(uiColor: UIColor(red: 0.8, green: 0, blue: 0, alpha: 0.6)))
        }
        .chartYAxis {
            AxisMarks(position: .leading) { _ in
                AxisValueLabel()
            }
        }
        .chartXAxis {
            AxisMarks(position: .bottom) { _ in
                 AxisGridLine().foregroundStyle(.clear)
                 AxisTick().foregroundStyle(.clear)
                AxisValueLabel(format: .dateTime)
            }
        }
        .padding()
    }
}

#Preview {
    GraphView(data: [])
}
