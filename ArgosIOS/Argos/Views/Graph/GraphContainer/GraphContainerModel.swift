//
//  GraphContainerModel.swift
//  Argos
//
//  Created by Peyton McKee on 1/17/24.
//

import Combine
import SwiftUI

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
                        guard let self = self, self.realTime, let selectedDataType = self.selectedDataType, let nextValue = values[selectedDataType.name] else { return }
                        if self.currentData.count > 100 {
                            self.currentData.removeFirst()
                        }
                        self.currentData.append(nextValue)
                    }
                    .store(in: &self.cancellables)
                self.driver = run.driverName ?? ""
                self.location = run.locationName ?? ""
                self.system = run.systemName ?? ""
                self.cachedNodes = nodes
                self.load(self.cachedProps)
            }
        } catch {
            self.fail(error, self.cachedProps)
        }
    }
    
    func setSelectedDataType(_ dataType: DataType) {
        self.selectedDataType = dataType
        
        guard !self.realTime else {
            return
        }
        
        Task { [weak self] in
            guard let self = self else { return }
            self.transitionState(.loading)
            do {
                let currentData = try await APIHandler.getDataByDataTypeAndRunId(name: dataType.name, runId: self.runId)
                DispatchQueue.main.async {
                    self.currentData = currentData.map { .init(values: $0.values, time: $0.time) }
                    self.load(self.cachedProps)
                }
            } catch {
                self.fail(error, self.cachedProps)
            }
        }
    }
    
    func transformDataValueToGraphData(_ value: DataValue) throws -> GraphData {
        guard let first = value.values.first, let dataPoint = Float(first) else {
            throw TransformerError.failedToConvertDataValueToGraphData
        }
        print(value)
        return .init(time: value.time / 1000, value: dataPoint)
    }
}
