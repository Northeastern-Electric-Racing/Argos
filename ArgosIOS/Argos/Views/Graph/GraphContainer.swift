//
//  GraphContainer.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

struct GraphContainer: View {
    let realtime: Bool
    let runId: Int
    
    @EnvironmentObject var errorHandling: ErrorHandling
    @State private var selectedDataType: DataType? = nil
    @State private var driver: String = ""
    @State private var location: String = ""
    @State private var system: String = ""
    @State private var currentData = [Data]()
        
    init(runId: Int, realTime: Bool = false) {
        self.runId = runId
        self.realtime = realTime
    }
    
    var body: some View {
        VStack {
            GraphView(data: self.$currentData).frame(maxHeight: .infinity)
            GraphCaption(dataType: self.$selectedDataType, mostRecentvalue: self.$currentData.last?.value, driver: self.$driver, location: self.$location, system: self.$system)
            GraphSelectionPopUp(selectDataType: self.setSelectedDataType)
        }
        .onAppear {
            APIHandler.shared.getRunById(id: runId, completion: {
                result in
                do {
                    let run = try result.get()
                    DispatchQueue.main.async {
                        self.driver = run.driverName
                        self.location = run.locationName
                        self.system = run.systemName
                    }
                } catch {
                    DispatchQueue.main.async {
                        self.errorHandling.handle(error: error)
                    }
                }
            })
            
        }
        .onChange(of: selectedDataType, {
            guard let selectedDataType = self.selectedDataType else {
                return
            }
            APIHandler.shared.getDataByDataType(name: selectedDataType.name, completion: {
                result in
                do {
                    let data = try result.get()
                    DispatchQueue.main.async {
                        self.currentData = data
                    }
                } catch {
                    DispatchQueue.main.async {
                        self.errorHandling.handle(error: error)
                    }
                }
            })
        })
        .navigationTitle(self.realtime ? "Real Time" : "Historical")
    }
    
    func setSelectedDataType(_ dataType: DataType) {
        self.selectedDataType = dataType
    }
}

#Preview {
    GraphContainer(runId: 1)
}
