//
//  APIHandler.swift
//  Argos
//
//  Created by Peyton McKee on 12/18/23.
//

import Foundation
import SwiftUI

class APIHandler {
    /**
     * Validates the status code from the server
     - parameter response: The URLResponse from the server
     - parameter data: The data received from the server
     */
    private static func validateResponse(response: URLResponse, data: Data) throws {
        let httpResponse = (response as! HTTPURLResponse)
        let statusCode = httpResponse.statusCode
        
        guard statusCode == 200 else {
            let error = try JSONDecoder().decode(HttpError.self, from: data)
            throw error
        }
    }
    
    /**
     * Generic Query Function for Retrieving data from the backend
     * @param urlEndpoint The route endpoint to ping for data
     * @param completion The completion handler to call when the data is retrieved
     */
    private static func queryData<T: Codable>(route: Route) async throws -> T {
        let request = route.url
        let (data, response) = try await URLSession.shared.data(from: request)
        
        try Self.validateResponse(response: response, data: data)
        
        let decoder = JSONDecoder()
        let item = try decoder.decode(T.self, from: data)
        return item
    }
    
    /**
     * Mutates values in the backend by calling a post endpoint and passing in the requeired data
     - parameter route: The route that the request will be pinging
     - parameter data: The data you are encoding into the request body
     - returns string containing the success statement
     */
    private static func mutateData<T: Codable>(route: Route, data: T) async throws -> String {
        let url = route.url
        
        let encoder = JSONEncoder()
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? encoder.encode(data)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        try Self.validateResponse(response: response, data: data)
        return "Successfully Updated Object"
    }
    
    /**
     * API call to get all the nodes from the server
     */
    public static func getAllNodes() async throws -> [Node] {
        let nodes: [Node] = try await Self.queryData(route: .allNodes)
        return nodes
    }
    
    /**
     * API Call to get a run by the given id
     - parameter id: The id of the run to fetch
     */
    public static func getRunById(id: Int) async throws -> Run {
        let run: Run = try await Self.queryData(route: .runById(id: id))
        return run
    }
    
    /**
     * API Call to get all the runs from the database
     */
    public static func getAllRuns() async throws -> [Run] {
        let runs: [Run] = try await Self.queryData(route: .allRuns)
        return runs
    }
    
    /**
     * API Call to get the data related to the data type name in the database
     - parameter name: the name of the data type to get the data for
     */
    public static func getDataByDataTypeAndRunId(name: String, runId: Int) async throws -> [ArgosData] {
        let data: [ArgosData] = try await Self.queryData(route: .dataByDataTypeAndRunId(name: name, runId: runId))
        return data
    }
}
