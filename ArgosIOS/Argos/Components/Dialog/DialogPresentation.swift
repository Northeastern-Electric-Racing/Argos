//
//  DialogPresentation.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

final class DialogPresentation: ObservableObject {
    @Published var isPresented = false
    @Published private(set) var dialogContent: DialogContent?

    public func show(content: DialogContent?) {
        if let content = content {
            self.dialogContent = content
            withAnimation {
                self.isPresented = true
            }
        } else {
            withAnimation {
                self.isPresented = false
            }
        }
    }
}
