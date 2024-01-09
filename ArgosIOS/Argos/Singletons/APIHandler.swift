//
//  APIHandler.swift
//  Argos
//
//  Created by Peyton McKee on 12/18/23.
//

import Foundation
import SwiftUI

class APIHandler {
    static let shared = APIHandler()

    /**
     * Generic Query Function for Retrieving data from the backend
     * @param urlEndpoint The route endpoint to ping for data
     * @param completion The completion handler to call when the data is retrieved
     */
     private func queryData <T : Codable>(route: Route, completion: @escaping (Result<T, Error>) -> Void) {
         let request = route.url
        URLSession.shared.dataTask(with: request, completionHandler: {
            data, response, error in
            guard let data = data, error == nil else {
                completion(.failure(error!))
                return
            }
            
            let decoder = JSONDecoder()
            do {
                let item = try decoder.decode(T.self, from: data)
                completion(.success(item))
            } catch {
                completion(.failure(error))
            }
        }).resume()
    }
    
    /**
     * Mutates values in the backend by calling a post endpoint and passing in the requeired data
     * @param route The route that the request will be pinging
     * @param data The data you are encoding into the request body
     * @param completion The result of the request, either a success message or an error
     */
    private func mutateData <T : Codable>(route: String, data: T, completion: @escaping (Result<String, Error>) -> Void) {
        let url = URL(string: route)!
        
        let encoder = JSONEncoder()
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? encoder.encode(data)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            guard let _ = data, error == nil else {
                completion(.failure(error!))
                return
            }
            completion(.success("Successfully Updated Object"))
        }.resume()
    }
    
    /**
     * API call to get all the nodes from the server
     * @param completion The completion handler for the result of the call, either a list of nodes or an error
     */
    public func getAllNodes (completion: @escaping (Result<[Node], Error>) -> Void) {
        self.queryData(route: .allNodes, completion: {
            result in
            do {
                let nodes: [Node] = try result.get()
                completion(.success(nodes))
            } catch {
                completion(.failure(error))
            }
        })
    }
    
    /**
     * API Call to get a run by the given id
     * @param id The id of the run to fetch
     * @param completion The completion handler for the result of the call, either the fetched run or an error
     */
    public func getRunById (id: Int, completion: @escaping (Result<Run, Error>) -> Void) {
        self.queryData(route: .runById(id: id), completion: {
            result in
            do {
                let run: Run = try result.get()
                completion(.success(run))
            } catch {
                completion(.failure(error))
            }
        })
    }
    
    /**
     * API Call to get all the runs from the database
     * @param completion The completion handler for the result of the call, either the fetched run or an error
     */
    public func getAllRuns(completion: @escaping (Result<[Run], Error>) -> Void) {
        self.queryData(route: .allRuns, completion: {
            result in
            do {
                let runs : [Run] = try result.get()
                completion(.success(runs))
            } catch {
                completion(.failure(error))
            }
        })
    }
    
    /**
     * API Call to get the data related to the data type name in the database
     * @param name the name of the data type to get the data for
     * @param completion the completion handler tfor the result of the call, either the fetched data or an error
     */
    public func getDataByDataType(name: String, completion: @escaping (Result<[Data], Error>) -> Void) {
        self.queryData(route: .dataByDataType(name: name), completion: {
            result in
            do {
                let data: [Data] = try result.get()
                completion(.success(data))
            } catch {
                completion(.failure(error))
            }
        })
    }
}
