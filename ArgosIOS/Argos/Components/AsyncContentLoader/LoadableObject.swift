//
//  LoadableObject.swift
//  Snowport
//
//  Created by Peyton McKee on 1/4/24.
//

import SwiftUI

protocol LoadableObject: ObservableObject {
    associatedtype Output
    var state: LoadingState<Output> { get set }
    func load() async
}

extension LoadableObject {
    func fail(_ error: Error, _ output: Output) {
        DispatchQueue.main.async {
            withAnimation {
                self.state = .failed(error, output)
            }
        }
    }
    
    func load(_ output: Output) {
        DispatchQueue.main.async {
            withAnimation {
                self.state = .loaded(output)
            }
        }
    }
    
    func transitionState(_ newState: LoadingState<Output>) {
        DispatchQueue.main.async {
            withAnimation {
                self.state = newState
            }
        }
    }
}
