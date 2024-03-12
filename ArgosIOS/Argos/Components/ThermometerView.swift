//
//  ThermometerView.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

struct ThermometerView: View {
    var current: Double
    let minimum: Float
    let maximum: Float
    let label: String

    var body: some View {
        VStack(spacing: 20) {
            ArgosHeader(self.label)

            Gauge(value: Float(self.current), in: self.minimum ... self.maximum) {
                Image(systemName: "thermometer")
                    .font(.caption)
            } currentValueLabel: {
                ArgosLabel("\(Int(self.current))")
            } minimumValueLabel: {
                ArgosLabel("\(Int(self.minimum))", 12)
            } maximumValueLabel: {
                ArgosLabel("\(Int(self.maximum))", 12)
            }
            .gaugeStyle(.accessoryCircular)
            .tint(Gradient(colors: [.green, .yellow, .orange, .red, .pink]))
        }.padding()
    }
}

#Preview {
    ThermometerView(current: 69, minimum: 0, maximum: 100, label: "Pack Temp")
}
