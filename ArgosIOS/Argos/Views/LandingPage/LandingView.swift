//
//  LandingView.swift
//  Argos
//
//  Created by Northeastern Electric Racing on 12/17/23.
//

import SwiftUI
@_spi(Experimental) import MapboxMaps

struct LandingView: View {
    @EnvironmentObject private var errorHandling: ErrorHandling

    @ObservedObject private var socketClient = SocketClient.shared
    @ObservedObject private var viewModel = LandingViewModel()

    var body: some View {
        AsyncContentView(source: self.viewModel) { _ in
            NavigationStack(path: self.$viewModel.path) {
                VStack {
                    if self.socketClient.isConnected {
                        ArgosHeader("Connected To Router")
                            .multilineTextAlignment(.center)
                    } else {
                        ArgosHeader("Not Connected To Router")
                            .multilineTextAlignment(.center)
                    }
                    BatteryView(progress: .constant(self.viewModel.stateOfCharge), fill: .green, outline: .secondary, direction: .horizontal)
                    HStack {
                        ThermometerView(current: self.viewModel.packTemp, minimum: -15, maximum: 60, label: "Pack").frame(maxWidth: .infinity)
                        ThermometerView(current: self.viewModel.motorTemp, minimum: -15, maximum: 60, label: "Motor").frame(maxWidth: .infinity)
                    }
                    HStack {
                        ArgosButton(title: "Historical", action: {
                            self.viewModel.onHistoricalButtonClicked()
                        })

                        ArgosButton(title: "More Details", action: {
                            self.viewModel.onMoreDetailsClicked()
                        })
                    }
                    ArgosButton(title: "Map View", action: {
                        self.viewModel.onMapSelected()
                    })
                }
                .padding()
                .navigationTitle("Argos")
                .customDialog(presentationManger: self.viewModel.dialogPresentation)
                .navigationDestination(for: HomeNavigation.self) { destination in
                    switch destination {
                    case .map:
                        if let selectedRunId = viewModel.selectedRunId {
                            MapView(viewModel: .init(realTime: self.viewModel.realTimeSelected, runId: selectedRunId))
                                .equatable()
                        }
                    case .graph:
                        if let selectedRunId = self.viewModel.selectedRunId {
                            GraphContainer(viewModel: .init(runId: selectedRunId, realTime: self.viewModel.realTimeSelected))
                        }
                    }
                }
            }
        }
    }
}

#Preview {
    LandingView()
}
