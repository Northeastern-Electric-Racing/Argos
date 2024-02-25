//
//  MapViewModel.swift
//  Argos
//
//  Created by Dylan McCann on 2/13/24.
//

import SwiftUI
import Combine
import CoreLocation

struct MapViewProps {
    var center: CLLocationCoordinate2D
}

class MapViewModel: LoadableObject {
    @ObservedObject var socketClient = SocketClient.shared
    
    @Published var state: LoadingState<MapViewProps> = .loading
    
    @Published var latitude: Double = 42.34037221430655
    @Published var longitude: Double = -71.09065805832445
    
    private var cancellables: Set<AnyCancellable> = []
    
    func load() async {
        DispatchQueue.main.async {
            self.socketClient.$values
                .sink { [weak self] values in
                    guard let self = self else {return}
                    print(values[DataTypeName.point.rawValue])
                    if let point = values[DataTypeName.point.rawValue], let lat = Double(point.values[0]), let long = Double(point.values[1]) {
                        self.latitude = lat
                        self.longitude = long
                        print(long, lat)
                    }
                }
                .store(in: &self.cancellables)
            self.load(.init(center: .init(latitude: self.latitude, longitude: self.longitude)))
        }
    }
}
