// Formatter function for VCU/eFuses/... topics.
const _FORMAT_EFUSE_TOPICS = (eFuse: string) =>
  ({
    ADC: `VCU/eFuses/${eFuse}/ADC`,
    Voltage: `VCU/eFuses/${eFuse}/Voltage`,
    Current: `VCU/eFuses/${eFuse}/Current`,
    Faulted: `VCU/eFuses/${eFuse}/Faulted?`,
    Enabled: `VCU/eFuses/${eFuse}/Enabled?`,
    Control_State: `VCU/eFuses/${eFuse}/Control_State`
  }) as const;

export const EFUSE_TOPICS = {
  // VCU Topics (i.e., data being sent out by VCU).
  VCU: {
    // Echo Messages
    Echo: {
      Motor_Temp: 'VCU/Echo/Motor_Temp',
      Controller_Temp: 'VCU/Echo/Controller_Temp',
      Battbox_Temp: 'VCU/Echo/Battbox_Temp',
      Brake_State: 'VCU/Echo/Brake_State'
    },

    // RTDS Messages
    RTDS: {
      Pin_State: 'VCU/RTDS/Pin_State',
      Sounding_State: 'VCU/RTDS/Sounding_State',
      Reverse_State: 'VCU/RTDS/Reverse_State',
      Error_State: 'VCU/RTDS/Error_State'
    },

    // eFuse Data Messages
    eFuses: {
      Dashboard: _FORMAT_EFUSE_TOPICS('Dashboard'),
      Brake: _FORMAT_EFUSE_TOPICS('Brake'),
      Shutdown: _FORMAT_EFUSE_TOPICS('Shutdown'),
      LV: _FORMAT_EFUSE_TOPICS('LV'),
      Radfan: _FORMAT_EFUSE_TOPICS('Radfan'),
      Fanbatt: _FORMAT_EFUSE_TOPICS('Fanbatt'),
      PumpOne: _FORMAT_EFUSE_TOPICS('PumpOne'),
      PumpTwo: _FORMAT_EFUSE_TOPICS('PumpTwo'),
      Spare: _FORMAT_EFUSE_TOPICS('Spare'),
      Battbox: _FORMAT_EFUSE_TOPICS('Battbox'),
      MC: _FORMAT_EFUSE_TOPICS('MC')
    }
  },

  // Calypso eFuse state commands (i.e., commands sent to VCU by Calypso).
  Calypso: {
    eFuse_Commands: {
      Dashboard: 'Calypso/Bidir/State/eFuses/Dashboard',
      Brake: 'Calypso/Bidir/State/eFuses/Brake',
      Shutdown: 'Calypso/Bidir/State/eFuses/Shutdown',
      LV: 'Calypso/Bidir/State/eFuses/LV',
      Radfan: 'Calypso/Bidir/State/eFuses/Radfan',
      Fanbatt: 'Calypso/Bidir/State/eFuses/Fanbatt',
      PumpOne: 'Calypso/Bidir/State/eFuses/PumpOne',
      PumpTwo: 'Calypso/Bidir/State/eFuses/PumpTwo',
      Spare: 'Calypso/Bidir/State/eFuses/Spare',
      Battbox: 'Calypso/Bidir/State/eFuses/Battbox',
      MC: 'Calypso/Bidir/State/eFuses/MC'
    }
  }
} as const;
