//
//  BatteryView.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//
import SwiftUI

struct BatteryView: View {
    @Binding var progress: Double
    let fill: Color
    let outline: Color
    let direction: Direction
    
    var rotation: Double {
        return self.direction == .vertical ? -90 : 0
    }
    
    var body: some View {
        ZStack {
            Image(systemName: "battery.0")
                .resizable()
                .scaledToFit()
                .font(.headline.weight(.ultraLight))
                .foregroundColor(self.outline)
                .background(
                    Rectangle()
                        .fill(self.fill)
                        .scaleEffect(x: self.progress,  y: 1, anchor: .leading)
                )
                .mask(
                    Image(systemName: "battery.100")
                        .resizable()
                        .font(.headline.weight(.ultraLight))
                        .scaledToFit()
                )
                .frame(width: 200)
                .padding()
        }
        .rotationEffect(.degrees(self.rotation))
    }
}

#Preview {
    BatteryView(progress: .constant(0.5), fill: .green, outline: .secondary, direction: .vertical)
    
}
