export enum DataTypeEnum {
  DRIVER = 'Driver',
  LOCATION = 'Location',
  VIEWERS = 'Viewers',

  // Special Latency info sent by Scylla
  LATENCY = 'Old_Latency',
  NEW_LATENCY = 'Latency',

  //Fake Data Points
  MOTOR_USAGE = 'Motor Usage',
  COOL_USAGE = 'Cooling Usage',
  STEERING_ANGLE = 'Steering Angle',
  TORQUE = 'Torque',
  BRAKE_PRESSURE = 'Brake Pressure',
  ACCELERATION = 'Acceleration',
  XYZAccel = 'XYZAcceleration',

  // MPU
  SPEED = 'MPU/State/Speed',
  MOTOR_CONTROLLER = 'MPU/Current/Motor_Controller',
  BATTBOX_FANS = 'MPU/Current/Battbox_Fans',
  PUMPS = 'MPU/Current/Pumps',
  LV_BOARDS = 'MPU/Current/LV_Boards',

  // DTI
  MOTOR_TEMP = 'DTI/Temps/Motor_Temperature',

  // TPU
  CPUUsage = 'TPU/OnBoard/CpuUsage',
  CPUTemp = 'TPU/OnBoard/CpuTemp',
  RAMUsage = 'TPU/OnBoard/MemAvailable',
  WIFIRSSI = 'TPU/HaLow/RSSI',
  MCS = 'TPU/HaLow/ApMCS',
  POINTS = 'TPU/GPS/Location',

  // BMS
  PACK_TEMP = 'BMS/Status/Temp_Average',
  STATE_OF_CHARGE = 'BMS/Pack/SOC',
  CURRENT = 'BMS/Charging/Current',
  CHARGE_CURRENT_LIMIT = 'BMS/Pack/CCL',
  DISCHARGE_CURRENT_LIMIT = 'BMS/Pack/DCL',
  STATUS_BALANCING = 'BMS/Status/Balancing',
  BMS_MODE = 'BMS/Status/State',
  CHARGING = 'BMS/Charging/Control',
  PACK_VOLTAGE = 'BMS/Pack/Voltage',
  CELL_UNDERVOLTAGE = 'BMS/Status/F/Cell_Undervoltage',
  CELL_OVERVOLTAGE = 'BMS/Status/F/Cell_Overvoltage',
  CELLS_NOT_BALANCING = 'BMS/Status/F/Cells_Not_Balancing',

  // Charger Faults
  COMM_TIMEOUT_FAULT = 'Charger/Box/F_CommTimeout',
  HARDWARE_FAILURE_FAULT = 'Charger/Box/F_HardwareFailure',
  OVER_TEMP_FAULT = 'Charger/Box/F_OverTemp',
  OVER_VOLTAGE_FAULT = 'Charger/Box/F_OverVoltage',
  WRONG_BAT_CONNECT_FAULT = 'Charger/Box/F_WrongBatConnect',

  // BMS Faults
  OPEN_WIRE = 'BMS/Status/F/Open_Wire',
  CHARGER_LIMIT_ENFORCEMENT_FAULT = 'BMS/Status/F/CCL_Enforce',
  CHARGER_CAN_FAULT = 'BMS/Status/F/Charger_Can',
  BATTERY_THERMISTOR = 'BMS/Status/F/Battery_Therm',
  CHARGER_SAFETY_RELAY = 'BMS/Status/F/Charger_Safety',
  DISCHARGE_LIMIT_ENFORCEMENT_FAULT = 'BMS/Status/F/DCL_Enforce',
  EXTERNAL_CAN_FAULT = 'BMS/Status/F/External_Can',
  WEAK_PACK_FAULT = 'BMS/Status/F/Weak_Pack',
  LOW_CELL_VOLTAGE = 'BMS/Status/F/Low_Cell_Volts',
  CHARGE_READING_MISMATCH = 'BMS/Status/F/Charge_Reading',
  CURRENT_SENSOR_FAULT = 'BMS/Status/F/Current_Sense',
  INTERNAL_CELL_COMM_FAULT = 'BMS/Status/F/IC_Comm',
  INTERNAL_THERMAL_ERROR = 'BMS/Status/F/Thermal_Err',
  INTERNAL_SOFTWARE_FAULT = 'BMS/Status/F/Software',
  PACK_OVERHEAT = 'BMS/Status/F/Pack_Overheat',

  // BMS Debug
  Segment_Temp_1 = 'BMS/Segment_Temp/1',
  Segment_Temp_2 = 'BMS/Segment_Temp/2',
  Segment_Temp_3 = 'BMS/Segment_Temp/3',
  Segment_Temp_4 = 'BMS/Segment_Temp/4',
  Segment_Temp_5 = 'BMS/Segment_Temp/5',

  // Segment Voltage
  Segment_Voltage_1 = 'BMS/Segment_Voltage/1',
  Segment_Voltage_2 = 'BMS/Segment_Voltage/2',
  Segment_Voltage_3 = 'BMS/Segment_Voltage/3',
  Segment_Voltage_4 = 'BMS/Segment_Voltage/4',
  Segment_Voltage_5 = 'BMS/Segment_Voltage/5',

  // BMS Per Cell
  // Alpha
  PER_CELL_ALPHA_DIE_TEMP_0 = 'BMS/PerCell/Alpha/0/DieTemp',
  PER_CELL_ALPHA_DIE_TEMP_1 = 'BMS/PerCell/Alpha/1/DieTemp',
  PER_CELL_ALPHA_DIE_TEMP_2 = 'BMS/PerCell/Alpha/2/DieTemp',
  PER_CELL_ALPHA_DIE_TEMP_3 = 'BMS/PerCell/Alpha/3/DieTemp',
  PER_CELL_ALPHA_DIE_TEMP_4 = 'BMS/PerCell/Alpha/4/DieTemp',

  // Beta
  PER_CELL_BETA_DIE_TEMP_0 = 'BMS/PerCell/Beta/0/DieTemp',
  PER_CELL_BETA_DIE_TEMP_1 = 'BMS/PerCell/Beta/1/DieTemp',
  PER_CELL_BETA_DIE_TEMP_2 = 'BMS/PerCell/Beta/2/DieTemp',
  PER_CELL_BETA_DIE_TEMP_3 = 'BMS/PerCell/Beta/3/DieTemp',
  PER_CELL_BETA_DIE_TEMP_4 = 'BMS/PerCell/Beta/4/DieTemp',

  // Overflow and CRC
  PER_CELL_OVERFLOWID = 'BMS/PerCell/OverflowID',
  PER_CELL_CRC = 'BMS/PerCell/PECErrorChip',

  // VCU eFUSES
  // Dashboard eFuse:
  VCU_EFUSE_DASHBOARD_ADC = 'VCU/eFuses/Dashboard/ADC',
  VCU_EFUSE_DASHBOARD_VOLTAGE = 'VCU/eFuses/Dashboard/Voltage',
  VCU_EFUSE_DASHBOARD_CURRENT = 'VCU/eFuses/Dashboard/Current',
  VCU_EFUSE_DASHBOARD_FAULTED = 'VCU/eFuses/Dashboard/Faulted?',
  VCU_EFUSE_DASHBOARD_ENABLED = 'VCU/eFuses/Dashboard/Enabled?',
  
  // Brake eFuse:
  VCU_EFUSE_BRAKE_ADC = 'VCU/eFuses/Brake/ADC',
  VCU_EFUSE_BRAKE_VOLTAGE = 'VCU/eFuses/Brake/Voltage',
  VCU_EFUSE_BRAKE_CURRENT = 'VCU/eFuses/Brake/Current',
  VCU_EFUSE_BRAKE_FAULTED = 'VCU/eFuses/Brake/Faulted?',
  VCU_EFUSE_BRAKE_ENABLED = 'VCU/eFuses/Brake/Enabled?',
  
  // Shutdown eFuse:
  VCU_EFUSE_SHUTDOWN_ADC = 'VCU/eFuses/Shutdown/ADC',
  VCU_EFUSE_SHUTDOWN_VOLTAGE = 'VCU/eFuses/Shutdown/Voltage',
  VCU_EFUSE_SHUTDOWN_CURRENT = 'VCU/eFuses/Shutdown/Current',
  VCU_EFUSE_SHUTDOWN_FAULTED = 'VCU/eFuses/Shutdown/Faulted?',
  VCU_EFUSE_SHUTDOWN_ENABLED = 'VCU/eFuses/Shutdown/Enabled?',
  
  // LV eFuse:
  VCU_EFUSE_LV_ADC = 'VCU/eFuses/LV/ADC',
  VCU_EFUSE_LV_VOLTAGE = 'VCU/eFuses/LV/Voltage',
  VCU_EFUSE_LV_CURRENT = 'VCU/eFuses/LV/Current',
  VCU_EFUSE_LV_FAULTED = 'VCU/eFuses/LV/Faulted?',
  VCU_EFUSE_LV_ENABLED = 'VCU/eFuses/LV/Enabled?',
  
  // Radfan eFuse:
  VCU_EFUSE_RADFAN_ADC = 'VCU/eFuses/Radfan/ADC',
  VCU_EFUSE_RADFAN_VOLTAGE = 'VCU/eFuses/Radfan/Voltage',
  VCU_EFUSE_RADFAN_CURRENT = 'VCU/eFuses/Radfan/Current',
  VCU_EFUSE_RADFAN_FAULTED = 'VCU/eFuses/Radfan/Faulted?',
  VCU_EFUSE_RADFAN_ENABLED = 'VCU/eFuses/Radfan/Enabled?',
  
  // Fanbatt eFuse:
  VCU_EFUSE_FANBATT_ADC = 'VCU/eFuses/Fanbatt/ADC',
  VCU_EFUSE_FANBATT_VOLTAGE = 'VCU/eFuses/Fanbatt/Voltage',
  VCU_EFUSE_FANBATT_CURRENT = 'VCU/eFuses/Fanbatt/Current',
  VCU_EFUSE_FANBATT_FAULTED = 'VCU/eFuses/Fanbatt/Faulted?',
  VCU_EFUSE_FANBATT_ENABLED = 'VCU/eFuses/Fanbatt/Enabled?',
  
  // PumpOne eFuse:
  VCU_EFUSE_PUMPONE_ADC = 'VCU/eFuses/PumpOne/ADC',
  VCU_EFUSE_PUMPONE_VOLTAGE = 'VCU/eFuses/PumpOne/Voltage',
  VCU_EFUSE_PUMPONE_CURRENT = 'VCU/eFuses/PumpOne/Current',
  VCU_EFUSE_PUMPONE_FAULTED = 'VCU/eFuses/PumpOne/Faulted?',
  VCU_EFUSE_PUMPONE_ENABLED = 'VCU/eFuses/PumpOne/Enabled?',
  
  // PumpTwo eFuse:
  VCU_EFUSE_PUMPTWO_ADC = 'VCU/eFuses/PumpTwo/ADC',
  VCU_EFUSE_PUMPTWO_VOLTAGE = 'VCU/eFuses/PumpTwo/Voltage',
  VCU_EFUSE_PUMPTWO_CURRENT = 'VCU/eFuses/PumpTwo/Current',
  VCU_EFUSE_PUMPTWO_FAULTED = 'VCU/eFuses/PumpTwo/Faulted?',
  VCU_EFUSE_PUMPTWO_ENABLED = 'VCU/eFuses/PumpTwo/Enabled?',
  
  // Battbox eFuse:
  VCU_EFUSE_BATTBOX_ADC = 'VCU/eFuses/Battbox/ADC',
  VCU_EFUSE_BATTBOX_VOLTAGE = 'VCU/eFuses/Battbox/Voltage',
  VCU_EFUSE_BATTBOX_CURRENT = 'VCU/eFuses/Battbox/Current',
  VCU_EFUSE_BATTBOX_FAULTED = 'VCU/eFuses/Battbox/Faulted?',
  VCU_EFUSE_BATTBOX_ENABLED = 'VCU/eFuses/Battbox/Enabled?',
  
  // MC eFuse:
  VCU_EFUSE_MC_ADC = 'VCU/eFuses/MC/ADC',
  VCU_EFUSE_MC_VOLTAGE = 'VCU/eFuses/MC/Voltage',
  VCU_EFUSE_MC_CURRENT = 'VCU/eFuses/MC/Current',
  VCU_EFUSE_MC_FAULTED = 'VCU/eFuses/MC/Faulted?',
  VCU_EFUSE_MC_ENABLED = 'VCU/eFuses/MC/Enabled?',

}
