//
//  LandingViewModel.swift
//  Argos
//
//  Created by Peyton McKee on 1/16/24.
//

import SwiftUI
import Combine

struct LandingViewProps {
    var runs: [Run]
}

class LandingViewModel: LoadableObject {
    @ObservedObject var socketClient = SocketClient.shared
    
    @Published var state: LoadingState<LandingViewProps> = .loading
    
    @Published var stateOfCharge: Double = 0
    @Published var packTemp: Double = 0
    @Published var motorTemp: Double = 0
    
    @Published var showGraph = false
    @Published var showMap = false
    
    @Published var dialogPresentation = DialogPresentation()
    @Published var selectedRunId: Int?
    
    private var cancellables: Set<AnyCancellable> = []
    
    private var runs = [Run]()
    
    private var cachedProps: LandingViewProps {
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
                        if let stateOfCharge = values[DataTypeName.stateOfCharge.rawValue] {
                            self.stateOfCharge = Double(stateOfCharge.value / 100)
                        }
                        if let packTemp = values[DataTypeName.packTemp.rawValue] {
                            self.packTemp = Double(packTemp.value)
                        }
                        if let motorTemp = values[DataTypeName.motorTemp.rawValue] {
                            self.motorTemp = Double(motorTemp.value)
                        }
                    }
                    .store(in: &self.cancellables)
                self.load(self.cachedProps)
            }
        } catch {
            self.fail(error, self.cachedProps)
        }
    }
    
    func selectRun(_ run: Run) {
        self.selectedRunId = run.id
        self.dialogPresentation.show(content: nil)
        self.showGraph = true
    }
    
    func onMoreDetailsClicked() {
        guard let runId = self.socketClient.runId else {
            self.fail(ConfigureError.runIdNotSet, self.cachedProps)
            return
        }
        self.selectedRunId = runId
        self.showGraph = true
    }
    
    func onMapViewClicked() {
        self.showMap = true
    }
}
