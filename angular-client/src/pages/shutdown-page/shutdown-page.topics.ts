/** Critical VCU faults: each is 0 when clear, non-zero when tripped. Any tripped one opens the CAN latch. */
export const VCU_CRITICAL_FAULT_TOPICS = [
  'VCU/Faults/Critical/CAN_OUTGOING_FAULT',
  'VCU/Faults/Critical/CAN_INCOMING_FAULT',
  'VCU/Faults/Critical/BMS_CAN_MONITOR_FAULT',
  'VCU/Faults/Critical/LIGHTNING_CAN_MONITOR_FAULT',
  'VCU/Faults/Critical/PRECHARGE_FLOATING_FAULT'
] as const;

/**
 * Topics read by the Shutdown Loop page. Each sense value is 1 = closed (24 V present), 0 = open.
 * Definitions: Odyssey-Definitions/can-messages/vcu.json (0x123) and bms.json (0x95).
 */
export const SHUTDOWN_TOPICS = {
  VCU: {
    BMS: 'VCU/Shutdown/BMS_GPIO',
    IMD: 'VCU/Shutdown/IMD_GPIO',
    BSPD: 'VCU/Shutdown/BSPD_GPIO',
    HV_C: 'VCU/Shutdown/HV_C_GPIO',
    BOTS: 'VCU/Shutdown/BOTS_GPIO',
    INERTIA_SW: 'VCU/Shutdown/INERTIA_SW_GPIO',
    CKPT: 'VCU/Shutdown/CKPT_GPIO',
    TSMS: 'VCU/Shutdown/TSMS_GPIO',
    HVD: 'VCU/Shutdown/HVD_GPIO',
    /**
     * Not published by the car: the page derives it from VCU_CRITICAL_FAULT_TOPICS
     * (1 = all clear, 0 = any fault tripped) so the CAN latch reads like the other nodes.
     */
    CAN_LATCH: 'VCU/Faults/Critical'
  },
  BMS: {
    Acc: 'BMS/Shutdown/Acc_Sense',
    TSIP: 'BMS/Shutdown/TSIP_Sense',
    TS_Minus: 'BMS/Shutdown/TS_Minus_Sense',
    TS_Plus: 'BMS/Shutdown/TS_Plus_Sense',
    /** Inverted vs. the sense bits: 0 = TS ON, 1 = TS OFF. */
    State: 'BMS/Shutdown/State'
  }
} as const;
