//
//  CarouselView.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

struct CarouselView: View {
    var runs: [Run]
    var selectRun: (_ run: Run?) -> Void
    @State private var selectedIndex: Int = 0
    @Binding var isPresented: Bool

    var body: some View {
        VStack {
            if self.runs.count == 0 {
                ArgosHeader("No Runs Found")
            } else {
                ZStack {
                    TabView(selection: self.$selectedIndex) {
                        ForEach(0..<runs.count, id: \.self) { index in
                            ZStack(alignment: .topLeading) {
                                CarouselContent(run: self.runs[index], selectRun: {
                                    selectRun(self.runs[index])
                                })
                            }
                            .shadow(radius: 20)
                        }
                    }
                    .frame(height: 300)
                    .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
                    .ignoresSafeArea()

                    HStack {
                        ForEach(0..<runs.count, id: \.self) { index in
                            Capsule()
                                .fill(.foreground.opacity(self.selectedIndex == index ? 1 : 0.33))
                                .frame(width: 35, height: 8)
                                .onTapGesture {
                                    self.selectedIndex = index
                                }
                        }
                        .offset(y: 130)
                    }
                }
            }

            HStack {
                ArgosButton(title: "Close", action: {
                    withAnimation {
                        self.isPresented.toggle()
                    }
                })

                ArgosButton(title: "View Current Run", action: {
                    self.selectRun(nil)
                })
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(.rect(cornerRadius: 8))
    }
}

#Preview {
    CarouselView(runs: [Run(id: 1, locationName: "Gainsborough", driverName: "Fergus", systemName: "Drive Train", time: Date.now.formatted()), Run(id: 2, locationName: "Gainsborough", driverName: "Fergus", systemName: "Drive Train", time: Date.now.formatted()), Run(id: 3, locationName: "Gainsborough", driverName: "Fergus", systemName: "Drive Train", time: Date.now.formatted())], selectRun: {
        _ in
        print("selected run")
    }, isPresented: .constant(true))
}
