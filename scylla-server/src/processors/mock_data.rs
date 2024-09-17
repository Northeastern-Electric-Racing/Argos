use super::mock_processor::{MockData, MockStringData};

pub const BASE_MOCK_DATA: [MockData; 17] = [
    MockData {
        name: "Status-Temp_Average",
        unit: "C",
        num_of_vals: 1,
        min: -20.0,
        max: 54.0,
    },
    MockData {
        name: "Temps-Motor_Temperature",
        unit: "C",
        num_of_vals: 1,
        min: -20.0,
        max: 54.0,
    },
    MockData {
        name: "Pack-SOC",
        unit: "%",
        num_of_vals: 1,
        min: 0.0,
        max: 100.0,
    },
    MockData {
        name: "Sense-Accel",
        unit: "G",
        num_of_vals: 3,
        min: -6.0,
        max: 6.0,
    },
    MockData {
        name: "GPS-Location",
        unit: "coordinates",
        num_of_vals: 2,
        min: -90.0,
        max: 90.0,
    },
    MockData {
        name: "Sense-SteeringAngle",
        unit: "degrees",
        num_of_vals: 1,
        min: 0.0,
        max: 360.0,
    },
    MockData {
        name: "Pack-Voltage",
        unit: "V",
        num_of_vals: 1,
        min: 0.0,
        max: 5.0,
    },
    MockData {
        name: "OnBoard-CpuUsage",
        unit: "%",
        num_of_vals: 1,
        min: 0.0,
        max: 100.0,
    },
    MockData {
        name: "OnBoard-CpuTemp",
        unit: "C",
        num_of_vals: 1,
        min: 0.0,
        max: 100.0,
    },
    MockData {
        name: "OnBoard-MemAvailable",
        unit: "mb",
        num_of_vals: 1,
        min: 0.0,
        max: 8000.0,
    },
    MockData {
        name: "HaLow-RSSI",
        unit: "dbm",
        num_of_vals: 1,
        min: -150.0,
        max: 80.0,
    },
    MockData {
        name: "HaLow-StaMCS",
        unit: "",
        num_of_vals: 1,
        min: 0.0,
        max: 10.0,
    },
    MockData {
        name: "Status/MPH",
        unit: "mph",
        num_of_vals: 1,
        min: 0.0,
        max: 88.0,
    },
    MockData {
        name: "Pack-CCL",
        unit: "A",
        num_of_vals: 1,
        min: -35.0,
        max: 0.0,
    },
    MockData {
        name: "Pack-DCL",
        unit: "A",
        num_of_vals: 1,
        min: 0.0,
        max: 550.0,
    },
    MockData {
        name: "Pedals-Brake1",
        unit: "",
        num_of_vals: 1,
        min: 0.0,
        max: 3000.0,
    },
    MockData {
        name: "Power-AC_Current",
        unit: "A",
        num_of_vals: 1,
        min: 0.0,
        max: 600.0,
    },
];

pub const BASE_MOCK_STRING_DATA: [MockStringData; 2] = [
    MockStringData {
        name: "Driver",
        unit: "String",
        vals: "Fergus",
    },
    MockStringData {
        name: "Location",
        unit: "String",
        vals: "Max",
    },
];