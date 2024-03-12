//
//  MapViewModel.swift
//  Argos
//
//  Created by Dylan McCann on 2/13/24.
//

import Combine
import CoreLocation
import SwiftUI

struct MapViewProps {
    var center: CLLocationCoordinate2D
    var points: [CLLocationCoordinate2D]
}

class MapViewModel: LoadableObject {
    @ObservedObject var socketClient = SocketClient.shared
    
    @Published var state: LoadingState<MapViewProps> = .loading
    
    @Published var latitude: Double = 42.34037221430655
    @Published var longitude: Double = -71.09065805832445
    
    private var cancellables: Set<AnyCancellable> = []
    
    var realTime: Bool
    var runId: Int
    
    init(realTime: Bool, runId: Int) {
        self.realTime = realTime
        self.runId = runId
    }
    
    func load() async {
        if realTime {
            DispatchQueue.main.async {
                self.socketClient.$values
                    .sink { [weak self] values in
                        guard let self = self else { return }
                        if let point = values[DataTypeName.point.rawValue], let lat = Double(point.values[1]), let long = Double(point.values[0]) {
                            self.latitude = lat
                            self.longitude = long
                        }
                    }
                    .store(in: &self.cancellables)
                self.load(.init(center: .init(latitude: self.latitude, longitude: self.longitude), points: []))
            }
        } else {
            do {
                let points = try await APIHandler.getDataByDataTypeAndRunId(name: DataTypeName.point.rawValue, runId: runId)
                DispatchQueue.main.async {
                    self.load(.init(center: .init(latitude: Double(points.last?.values[1] ?? "0") ?? 0, longitude: Double(points.last?.values[0] ?? "0") ?? 0), points: points.map(self.transformPointsToCoordinate(_:))))
                }
            } catch {
                fail(error, .init(center: .init(latitude: latitude, longitude: longitude), points: []))
            }
        }
    }
    
    private func transformPointsToCoordinate(_ point: ArgosData) -> CLLocationCoordinate2D {
        if let latitude = Double(point.values[1]), let longitude = Double(point.values[0]) {
            return .init(latitude: latitude, longitude: longitude)
        }
        
        return .init(latitude: 0, longitude: 0)
    }
}
