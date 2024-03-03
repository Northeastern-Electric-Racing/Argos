//
//  AsyncContentView.swift
//  Snowport
//
//  Created by Peyton McKee on 1/4/24.
//

import SwiftUI

struct AsyncContentView<Source: LoadableObject, Content: View>: View {
    @ObservedObject var source: Source
    var content: (Source.Output) -> Content

    @EnvironmentObject private var errorHandling: ErrorHandling

    var body: some View {
        Group {
            switch self.source.state {
            case .loading:
                ProgressView()
            case .failed(let error, let output):
                self.content(output)
                    .onAppear {
                        self.errorHandling.handle(error: error)
                    }
            case .loaded(let output):
                self.content(output)
            }
        }
        .task {
            await self.source.load()
        }
    }
}
