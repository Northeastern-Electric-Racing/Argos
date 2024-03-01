//
//  Run.swift
//  Argos
//
//  Created by Peyton McKee on 12/20/23.
//

import Foundation

/**
 * Format of a run 
 */
struct Run: Codable {
    var id: Int
    var locationName: String?
    var driverName: String?
    var systemName: String?
    var time: String
    var dateTime: Date {
        let dateFormatter = DateFormatter()

        // Set the date format to match your string
        dateFormatter.dateFormat = "EEE MMM dd yyyy HH:mm:ss 'GMT'Z (zzz)"

        // Set the locale to English (United States) to ensure the month and day names are parsed correctly
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        
        
        return dateFormatter.date(from: self.time) ?? Date()
    }
}
