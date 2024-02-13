//
//  MapView.swift
//  Argos
//
//  Created by Dylan McCann on 2/4/24.
//

import SwiftUI
@_spi(Experimental) import MapboxMaps


struct MapView: View {
    
    @ObservedObject private var viewModel = MapViewModel()
    
    @State private var selected = false
    
    
    var body: some View {
                let pos = CLLocationCoordinate2D(latitude: self.viewModel.latitude, longitude: self.viewModel.longitude)
                // test coodinate for plotting (the car is getting a wollys sandwich)
                let center = CLLocationCoordinate2D(latitude: 42.34037221430655, longitude: -71.09065805832445)
                Map(initialViewport: .camera(center: center, zoom: 15, bearing: 0, pitch: 0)) {
                    MapViewAnnotation(coordinate: pos) {
                        Text("🏎️")
                            .frame(width: 22, height: 22)
                            .scaleEffect(selected ? 5 : 3)
                            .padding(selected ? 20 : 5)
                            .animation(.spring(), value: selected)
                            .onTapGesture {
                                selected.toggle()
                            }
                    }
                }.ignoresSafeArea()
    }
}

#Preview {
    MapView()
}
