//
//  CustomDialog.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import SwiftUI

struct CustomDialog: ViewModifier {
    @ObservedObject var presentationManager: DialogPresentation

    func body(content: Content) -> some View {
        ZStack {
            content

            if self.presentationManager.isPresented {
                Rectangle().foregroundStyle(Color(.label).opacity(0.3))
                    .ignoresSafeArea()
                    .onTapGesture {
                        self.presentationManager.show(content: nil)
                    }

                self.presentationManager.dialogContent.padding(32)
            }
        }
    }
}

extension View {
    func customDialog(
        presentationManger: DialogPresentation
    ) -> some View {
        self.modifier(CustomDialog(presentationManager: presentationManger))
    }
}
