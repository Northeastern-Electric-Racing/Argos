//
//  LandingView.swift
//  Argos
//
//  Created by Northeastern Electric Racing on 12/17/23.
//

import SwiftUI

struct LandingView: View {
    @EnvironmentObject private var errorHandling: ErrorHandling
    @ObservedObject private var socketClient = SocketClient.shared
    
    @State private var showMain = false
    @State private var stateOfCharge: Double = 0
    @State private var packTemp: Float = 0
    @State private var motorTemp: Float = 0
    
    @State private var realTimeGraphViewIsActive = false
    @State private var historicalGraphViewIsActive = false

    @State private var dialogPresentation = DialogPresentation()
    @State private var runs = [Run]()
    @State private var selectedRun: Run?
    
    var body: some View {
        NavigationStack {
            if self.showMain {
                VStack {
                    if self.socketClient.isConnected {
                        ArgosHeader("Connected To Router")
                            .multilineTextAlignment(.center)
                    } else {
                        ArgosHeader("Not Connected To Router")
                            .multilineTextAlignment(.center)
                    }
                    BatteryView(progress: .constant(self.stateOfCharge), fill: .green, outline: .secondary, direction: .horizontal)
                    HStack {
                        ThermometerView(current: self.packTemp, minimum: -15, maximum: 60, label: "Pack").frame(maxWidth: .infinity)
                        ThermometerView(current: self.motorTemp, minimum: -15, maximum: 60, label: "Motor").frame(maxWidth: .infinity)
                    }
                    HStack {
                        ArgosButton(title: "Historical", action: {
                            dialogPresentation.show(content: .carousel(runs: self.runs, selectRun: self.selectRun, isPresented: $dialogPresentation.isPresented))
                        })
                        .navigationDestination(isPresented: self.$historicalGraphViewIsActive) {
                            GraphContainer(runId: selectedRun?.id ?? -1)
                        }

                        ArgosButton(title: "More Details", action: {
                            guard SocketClient.shared.runId != nil else {
                                self.errorHandling.handle(error: ConfigureError.runIdNotSet)
                                return
                            }
                            self.realTimeGraphViewIsActive = true
                        })
                        .navigationDestination(isPresented: self.$realTimeGraphViewIsActive) {
                            GraphContainer(runId: SocketClient.shared.runId ?? -1, realTime: true)
                        }
                    }
                }
                .padding()
                .navigationTitle("Argos")
                
            } else {
                Rectangle()
                    .background(Color(.systemBackground))
                    .ignoresSafeArea()
            }
            
        }
        .onAppear {
            APIHandler.shared.getAllRuns(completion: {
                result in
                do {
                    let runs = try result.get()
                    DispatchQueue.main.async {
                        self.runs = runs
                    }
                } catch {
                    DispatchQueue.main.async {
                        self.errorHandling.handle(error: error)
                    }
                }
            })
            
            self.socketClient.connect()
            
            DispatchQueue.main.asyncAfter(deadline: DispatchTime.now().advanced(by: .seconds(2)), execute: {
                withAnimation {
                    self.showMain = true
                }
            })
        }
        .customDialog(presentationManger: dialogPresentation)
    }
    
    func selectRun(_ run: Run) {
        self.selectedRun = run
        self.historicalGraphViewIsActive = true
        self.dialogPresentation.show(content: nil)
    }
}

#Preview {
    LandingView()
}
