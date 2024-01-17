//
//  GraphContainerView.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

struct GraphContainer: View {
    @ObservedObject var viewModel: GraphContainerModel
    
    @EnvironmentObject var errorHandling: ErrorHandling
        
    var body: some View {
        AsyncContentView(source: self.viewModel) { props in
            VStack {
                GraphView(data: self.$viewModel.currentData).frame(maxHeight: .infinity)
                ZStack {
                    GraphCaption(dataType: self.$viewModel.selectedDataType, mostRecentvalue: self.viewModel.currentData.last?.value, driver: props.driver, location: props.location, system: props.system)
                }
                .overlay(GraphSelectionPopUp(nodes: props.nodes, selectDataType: self.viewModel.setSelectedDataType)
                    .frame(maxWidth: .infinity, alignment: .bottomLeading),
                         alignment: .bottom)
            }
            .onChange(of: self.viewModel.selectedDataType, {
                self.viewModel.onSelectedDataTypeChange()
            })
            .navigationTitle(self.viewModel.realTime ? "Real Time" : "Historical")
        }
    }
}

#Preview {
    GraphContainer(viewModel: .init(runId: 1))
}
