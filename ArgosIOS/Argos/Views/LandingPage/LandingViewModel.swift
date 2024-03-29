//
//  LandingViewModel.swift
//  Argos
//
//  Created by Peyton McKee on 1/16/24.
//

import Combine
import SwiftUI

struct LandingViewProps {
    var runs: [Run]
}

class LandingViewModel: LoadableObject {
    @ObservedObject var socketClient = SocketClient.shared
    
    @Published var state: LoadingState<LandingViewProps> = .loading
    
    @Published var stateOfCharge: Double = 0
    @Published var packTemp: Double = 0
    @Published var motorTemp: Double = 0
    
    @ObservedObject var dialogPresentation = DialogPresentation()
    @Published var selectedRunId: Int?
    @Published var realTimeSelected = false
    
    @Published var path: [HomeNavigation] = []
    
    private var cancellables: Set<AnyCancellable> = []
    
    private var runs = [Run]()
    
    private var cachedProps: LandingViewProps {
        return .init(runs: self.runs)
    }
    
    func load() async {
        self.socketClient.connect()

        do {
            let runs = try await APIHandler.getAllRuns()

            DispatchQueue.main.async {
                self.runs = runs
                self.socketClient.$values
                    .sink { [weak self] values in
                        guard let self = self else { return }
                        if let first = values[DataTypeName.stateOfCharge.rawValue]?.values.first, let stateOfCharge = Float(first) {
                            self.stateOfCharge = Double(stateOfCharge / 100)
                        }
                        if let first = values[DataTypeName.packTemp.rawValue]?.values.first, let packTemp = Float(first) {
                            self.packTemp = Double(packTemp)
                        }
                        if let first = values[DataTypeName.motorTemp.rawValue]?.values.first, let motorTemp = Float(first) {
                            self.motorTemp = Double(motorTemp)
                        }
                    }
                    .store(in: &self.cancellables)
                self.load(self.cachedProps)
            }
        } catch {
            self.fail(error, self.cachedProps)
        }
    }
    
    func onHistoricalButtonClicked() {
        self.showRunSelector(self.selectRun(_:))
    }
    
    private func showRunSelector(_ onRunSelected: @escaping (_ run: Run?) -> Void) {
        if self.runs.isEmpty {
            self.transitionState(.loading)
            Task {
                let runs = try? await APIHandler.getAllRuns()
                DispatchQueue.main.async {
                    self.runs = runs ?? []
                    self.dialogPresentation.show(content: .carousel(runs: self.runs, selectRun: onRunSelected, isPresented: self.$dialogPresentation.isPresented))
                    self.load(.init(runs: self.runs))
                }
            }
        } else {
            self.dialogPresentation.show(content: .carousel(runs: self.runs, selectRun: onRunSelected, isPresented: self.$dialogPresentation.isPresented))
            self.load(.init(runs: self.runs))
        }
    }
    
    func onMapSelected() {
        self.showRunSelector(self.selectRunForMap(_:))
    }
    
    func selectRun(_ run: Run?) {
        self.dialogPresentation.show(content: nil)
        if let run = run {
            self.selectedRunId = run.id
            self.realTimeSelected = false
            self.path.append(.graph)
        } else {
            self.onMoreDetailsClicked()
        }
    }
    
    func onMoreDetailsClicked() {
        guard let runId = self.socketClient.runId else {
            self.fail(ConfigureError.runIdNotSet, self.cachedProps)
            return
        }
        self.selectedRunId = runId
        self.realTimeSelected = true
        self.path.append(.graph)
    }
    
    func selectRunForMap(_ run: Run?) {
        self.dialogPresentation.show(content: nil)
        if let run = run {
            self.selectedRunId = run.id
            self.realTimeSelected = false
            self.path.append(.map)
        } else if let runId = self.socketClient.runId {
            self.selectedRunId = runId
            self.realTimeSelected = true
            self.path.append(.map)
        } else {
            self.fail(ConfigureError.runIdNotSet, self.cachedProps)
        }
    }
}
