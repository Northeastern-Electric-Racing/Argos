//
//  MapViewModel.swift
//  Argos
//
//  Created by Dylan McCann on 2/13/24.
//

import SwiftUI
import Combine

struct MapViewProps {
    var runs: [Run]
}

class MapViewModel: LoadableObject {
    
    @ObservedObject var socketClient = SocketClient.shared
    
    @Published var state: LoadingState<MapViewProps> = .loading
    
    @Published var latitude: Double = 42.34037221430655
    @Published var longitude: Double = -71.09065805832445
    
    private var cancellables: Set<AnyCancellable> = []
    
    private var runs = [Run]()
    
    private var cachedProps: MapViewProps {
        return .init(runs: self.runs)
    }
    
    func load() async {
        do {
            let runs = try await APIHandler.getAllRuns()
            DispatchQueue.main.async {
                self.runs = runs
                self.socketClient.connect()
                self.socketClient.$values
                    .sink { [weak self] values in
                        guard let self = self else {return}
                        if let point = values[DataTypeName.point.rawValue] {
                            self.latitude = Double(point.value[0])
                            self.longitude = Double(point.value[1])
                        }
                    }
                    .store(in: &self.cancellables)
                self.load(self.cachedProps)
            }
        }
        catch {
            self.fail(error, self.cachedProps)
        }
    }
    
}
