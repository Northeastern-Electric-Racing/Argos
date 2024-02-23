//
//  MapView.swift
//  Argos
//
//  Created by Dylan McCann on 2/4/24.
//

import SwiftUI
@_spi(Experimental) import MapboxMaps


struct MapView: View, Equatable {
    static func == (lhs: MapView, rhs: MapView) -> Bool {
        return true
    }
    
    @ObservedObject private var viewModel = MapViewModel()
    
    @State private var selected = false
    
    init(viewModel: MapViewModel = MapViewModel(), selected: Bool = false) {
        self.viewModel = viewModel
        self.selected = selected
    }
    
    var body: some View {
        AsyncContentView(source: self.viewModel) { props in
            // test coodinate for plotting (the car is getting a wollys sandwich)
            Map(initialViewport: .camera(center: props.center, zoom: 15, bearing: 0, pitch: 0)) {
                MapViewAnnotation(coordinate: .init(latitude: self.viewModel.latitude, longitude: self.viewModel.longitude)) {
                    Text("🏎️")
                        .frame(width: 22, height: 22)
                        .scaleEffect(selected ? 5 : 3)
                        .padding(selected ? 20 : 5)
                        .animation(.spring(), value: selected)
                        .onTapGesture {
                            selected.toggle()
                        }
                }
            }
            .ignoresSafeArea()
            .onChange(of: self.viewModel.latitude) {
                print("test")
            }
        }
    }
}

#Preview {
    MapView()
}
