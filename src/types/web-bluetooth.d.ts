// Web Bluetooth API type declarations
interface BluetoothDevice {
  id: string
  name?: string
  gatt?: BluetoothRemoteGATTServer
}

interface BluetoothRemoteGATTServer {
  connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>
}

interface BluetoothRemoteGATTService {
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>
}

interface BluetoothRemoteGATTCharacteristic {
  value: DataView | null
  writeValue(value: BufferSource): Promise<void>
  readValue(): Promise<DataView>
}

interface BluetoothRequestDeviceFilter {
  services?: string[]
  name?: string
  namePrefix?: string
}

interface RequestDeviceOptions {
  filters?: BluetoothRequestDeviceFilter[]
  optionalServices?: string[]
  acceptAllDevices?: boolean
}

interface Bluetooth {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>
}

interface Navigator {
  bluetooth: Bluetooth
}
