//
//  GraphContainerView.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

struct GraphContainer: View, Equatable {
    static func == (lhs: GraphContainer, rhs: GraphContainer) -> Bool {
        lhs.viewModel.runId == rhs.viewModel.runId
    }
    
    @ObservedObject var viewModel: GraphContainerModel
    
    @EnvironmentObject var errorHandling: ErrorHandling
        
    var body: some View {
        AsyncContentView(source: self.viewModel) { props in
            VStack {
                GraphView(data: self.$viewModel.currentData).frame(maxHeight: .infinity)
                ZStack {
                    GraphCaption(dataType: self.$viewModel.selectedDataType, mostRecentvalue: self.viewModel.currentData.last?.value, driver: self.viewModel.driver, location: self.viewModel.location, system: self.viewModel.system)
                }
                .overlay(GraphSelectionPopUp(nodes: props.nodes, selectDataType: {self.viewModel.setSelectedDataType($0)})
                    .frame(maxWidth: .infinity, alignment: .bottomLeading),
                         alignment: .bottom)
            }
            .navigationTitle(self.viewModel.realTime ? "Real Time" : "Historical")
        }
    }
}

#Preview {
    GraphContainer(viewModel: .init(runId: 1))
}
