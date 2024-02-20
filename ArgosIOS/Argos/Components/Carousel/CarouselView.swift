//
//  CarouselView.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

struct CarouselView: View {
    var runs: [Run]
    var selectRun: (_ run: Run) -> Void
    @State private var selectedIndex: Int = 0
    @Binding var isPresented: Bool
    
    var body: some View {
        ZStack {
            if self.runs.count == 0 {
                VStack {
                    ArgosHeader("No Runs Found")
                    ArgosButton(title: "Close", action: {
                        withAnimation {
                            self.isPresented.toggle()
                        }
                    })
                }
                .padding()

            } else {
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
        .background(Color(.systemBackground))
        .clipShape(.buttonBorder)
        
    }
}

#Preview {
    CarouselView(runs: [Run(id: 1, locationName: "Gainsborough", driverName: "Fergus", systemName: "Drive Train", time: "100000000"), Run(id: 2, locationName: "Gainsborough", driverName: "Fergus", systemName: "Drive Train", time: "100000000"), Run(id: 3, locationName: "Gainsborough", driverName: "Fergus", systemName: "Drive Train", time: "100000000")], selectRun: {
        run in
        print("selected run")
    }, isPresented: .constant(true))
}
