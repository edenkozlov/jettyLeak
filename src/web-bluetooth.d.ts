// Web Bluetooth API type declarations
interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  readonly service: BluetoothRemoteGATTService
  readonly uuid: string
  readonly value: DataView | null
  readValue(): Promise<DataView>
  writeValue(value: BufferSource): Promise<void>
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
  addEventListener(type: 'characteristicvaluechanged', listener: EventListener): void
  removeEventListener(type: 'characteristicvaluechanged', listener: EventListener): void
}

interface BluetoothRemoteGATTService {
  readonly device: BluetoothDevice
  readonly uuid: string
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>
}

interface BluetoothRemoteGATTServer {
  readonly device: BluetoothDevice
  readonly connected: boolean
  connect(): Promise<BluetoothRemoteGATTServer>
  disconnect(): void
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>
}

interface BluetoothDevice extends EventTarget {
  readonly id: string
  readonly name?: string
  readonly gatt?: BluetoothRemoteGATTServer
  addEventListener(type: 'gattserverdisconnected', listener: EventListener): void
  removeEventListener(type: 'gattserverdisconnected', listener: EventListener): void
}

interface RequestDeviceOptions {
  filters?: Array<{
    services?: string[]
    name?: string
    namePrefix?: string
  }>
  optionalServices?: string[]
  acceptAllDevices?: boolean
}

interface Bluetooth {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>
  getAvailability(): Promise<boolean>
}

interface Navigator {
  bluetooth: Bluetooth
}
