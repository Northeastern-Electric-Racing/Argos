//
//  GraphContainerModel.swift
//  Argos
//
//  Created by Peyton McKee on 1/17/24.
//

import SwiftUI

struct GraphContainerProps {
    var driver: String
    var location: String
    var system: String
    var nodes: [Node]
}

class GraphContainerModel: LoadableObject {
    let runId: Int
    let realTime: Bool
    
    @Published var state: LoadingState<GraphContainerProps> = .idle
    @Published var currentData = [ArgosData]()
    @Published var selectedDataType: DataType?
    
    var cachedDriver: String = ""
    var cachedLocation: String = ""
    var cachedSystem: String = ""
    var cachedNodes: [Node] = []
    
    var cachedProps: GraphContainerProps {
        return .init(driver: self.cachedDriver, location: self.cachedLocation, system: self.cachedSystem, nodes: self.cachedNodes)
    }
    
    init(runId: Int, realTime: Bool = false) {
        self.runId = runId
        self.realTime = realTime
    }

    func load() {
        Task {
            do {
                let run = try await APIHandler.getRunById(id: runId)
                self.cachedDriver = run.driverName
                self.cachedLocation = run.locationName
                self.cachedSystem = run.systemName
                let nodes = try await APIHandler.getAllNodes()
                self.cachedNodes = nodes
                self.load(self.cachedProps)
            } catch {
                self.fail(error, self.cachedProps)
            }
        }
    }
    
    func onSelectedDataTypeChange() {
        guard let selectedDataType = self.selectedDataType else {
            return
        }
        Task {
            self.transitionState(.loading)
            do {
                self.currentData = try await APIHandler.getDataByDataType(name: selectedDataType.name)
                self.load(self.cachedProps)
            } catch {
                self.fail(error, self.cachedProps)
            }
        }
    }
    
    func setSelectedDataType(_ dataType: DataType) {
        self.selectedDataType = dataType
    }
}
