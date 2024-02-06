//
//  LoadingState.swift
//  Snowport
//
//  Created by Peyton McKee on 1/4/24.
//

import Foundation

enum LoadingState<Value> {
    case loading
    case failed(Error, Value)
    case loaded(Value)
}
