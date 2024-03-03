//
//  DialogContent.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

enum DialogContent: View {
    case carousel(runs: [Run], selectRun: (_ run: Run?) -> Void, isPresented: Binding<Bool>)
    
    var body: some View {
        switch self {
        case .carousel(let runs, let selectRun, let isPresented):
            return AnyView(
                CarouselView(runs: runs, selectRun: selectRun, isPresented: isPresented)
            )
        }
    }
}
