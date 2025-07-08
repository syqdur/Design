// User registry to track used device IDs and prevent conflicts
class UserRegistry {
  private static instance: UserRegistry;
  private usedDeviceIds: Set<string> = new Set();

  private constructor() {}

  static getInstance(): UserRegistry {
    if (!UserRegistry.instance) {
      UserRegistry.instance = new UserRegistry();
    }
    return UserRegistry.instance;
  }

  // Check if device ID is already in use
  isDeviceIdInUse(deviceId: string): boolean {
    return this.usedDeviceIds.has(deviceId);
  }

  // Register a device ID as used
  registerDeviceId(deviceId: string): void {
    this.usedDeviceIds.add(deviceId);
    console.log(`📝 Registered device ID: ${deviceId.substring(0, 8)}...`);
  }

  // Remove a device ID from registry (when user is deleted)
  unregisterDeviceId(deviceId: string): void {
    this.usedDeviceIds.delete(deviceId);
    console.log(`🗑️ Unregistered device ID: ${deviceId.substring(0, 8)}...`);
  }

  // Get all registered device IDs for debugging
  getAllDeviceIds(): string[] {
    return Array.from(this.usedDeviceIds);
  }

  // Clear all registered device IDs
  clearRegistry(): void {
    this.usedDeviceIds.clear();
    console.log(`🧹 Cleared device ID registry`);
  }
}

export const userRegistry = UserRegistry.getInstance();