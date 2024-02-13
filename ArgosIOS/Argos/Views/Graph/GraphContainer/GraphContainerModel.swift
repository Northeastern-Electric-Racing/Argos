//
//  GraphContainerModel.swift
//  Argos
//
//  Created by Peyton McKee on 1/17/24.
//

import SwiftUI
import Combine

struct GraphContainerProps {
    var nodes: [Node]
}

class GraphContainerModel: LoadableObject {
    let runId: Int
    let realTime: Bool
        
    @ObservedObject var socketClient = SocketClient.shared
    
    @Published var state: LoadingState<GraphContainerProps> = .loading
    @Published var currentData = [DataValue]()
    @Published var selectedDataType: DataType?
    
    @Published var driver: String = ""
    @Published var location: String = ""
    @Published var system: String = ""
    
    var cachedNodes: [Node] = []
    
    var cachedProps: GraphContainerProps {
        return .init(nodes: self.cachedNodes)
    }
    
    private var cancellables: Set<AnyCancellable> = []
    
    init(runId: Int, realTime: Bool = false) {
        self.runId = runId
        self.realTime = realTime
    }
    
    func load() async {
        do {
            let run = try await APIHandler.getRunById(id: self.runId)
            let nodes = try await APIHandler.getAllNodes()
            
            DispatchQueue.main.async {
                self.socketClient.$values
                    .sink { [weak self] values in
                        guard let self = self, let selectedDataType = self.selectedDataType, let nextValue = values[selectedDataType.name] else { return }
                        if (self.currentData.count > 100) {
                            self.currentData.removeFirst()
                        }
                        self.currentData.append(nextValue)
                    }
                    .store(in: &self.cancellables)
                self.driver = run.driverName ?? ""
                self.driver = run.locationName ?? ""
                self.driver = run.systemName ?? ""
                self.cachedNodes = nodes
                self.load(self.cachedProps)
            }
        } catch {
            self.fail(error, self.cachedProps)
        }
    }
    
    func setSelectedDataType(_ dataType: DataType) {
        self.selectedDataType = dataType
        
        guard (!self.realTime) else {
            return
        }
        
        Task {
            self.transitionState(.loading)
            do {
                let currentData = try await APIHandler.getDataByDataType(name: dataType.name)
                DispatchQueue.main.async {
                    self.currentData = currentData.map({.init(value: [$0.value], time: $0.timestamp)})
                    self.load(self.cachedProps)
                }
            } catch {
                self.fail(error, self.cachedProps)
            }
        }
    }
}
