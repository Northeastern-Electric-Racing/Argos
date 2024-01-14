//
//  ArgosApp.swift
//  Argos
//
//  Created by Northeastern Electric Racing on 12/17/23.
//

import SwiftUI

@main
struct ArgosApp: App {
    var body: some Scene {
        WindowGroup {
            LandingView()
                .withErrorHandling()
        }
    }
}
