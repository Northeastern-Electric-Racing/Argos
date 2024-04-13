import { Component, OnInit } from "@angular/core";
import Storage from "src/services/storage.service";

@Component({
   selector: "transmission-display",
   templateUrl: "./transmission-display.component.html",
   styleUrls: ["./transmission-display.component.css"]
})
export default class TransmissionDisplay implements OnInit {
   transmission: string = "N/A";

   constructor(private storage: Storage) {}

   ngOnInit() {
      console.log("TransmissionDisplay initialized");
   }
}