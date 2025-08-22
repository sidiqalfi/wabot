/**
 * Command Delay System
 * Controls execution delays for all commands
 */

class CommandDelay {
  constructor() {
    this.isEnabled = false;
    this.delaySeconds = 5;
    this.lastCommandTime = new Map(); // userJid -> timestamp
    this.ownerOnly = true;
  }

  /**
   * Check if command should be delayed
   * @param {string} userJid - User's JID
   * @param {Array} botSupportNumbers - Bot support/owner numbers
   * @returns {Object} Delay check result
   */
  checkDelay(userJid, botSupportNumbers) {
    // If delay is disabled, allow command
    if (!this.isEnabled) {
      return { shouldDelay: false, message: null };
    }

    // If owner-only mode and user is owner, no delay
    const isOwner = botSupportNumbers.some(owner => userJid.includes(owner));
    if (this.ownerOnly && isOwner) {
      return { shouldDelay: false, message: null };
    }

    const now = Date.now();
    const lastTime = this.lastCommandTime.get(userJid) || 0;
    const timeSinceLastCommand = now - lastTime;
    const requiredDelay = this.delaySeconds * 1000;

    if (timeSinceLastCommand < requiredDelay) {
      const remainingTime = Math.ceil((requiredDelay - timeSinceLastCommand) / 1000);
      return {
        shouldDelay: true,
        message: `⏳ Harap tunggu ${remainingTime} detik lagi sebelum menggunakan command berikutnya.\n\nDelay saat ini: ${this.delaySeconds} detik ${this.ownerOnly ? '(untuk non-owner)' : '(untuk semua user)'}`
      };
    }

    return { shouldDelay: false, message: null };
  }

  /**
   * Update last command time for user
   * @param {string} userJid - User's JID
   */
  updateLastCommandTime(userJid) {
    this.lastCommandTime.set(userJid, Date.now());
  }

  /**
   * Enable delay system
   */
  enable() {
    this.isEnabled = true;
  }

  /**
   * Disable delay system
   */
  disable() {
    this.isEnabled = false;
  }

  /**
   * Set delay duration
   * @param {number} seconds - Delay in seconds
   */
  setDelay(seconds) {
    if (seconds >= 0) {
      this.delaySeconds = seconds;
    }
  }

  /**
   * Set owner-only mode
   * @param {boolean} ownerOnly - Whether delay only applies to non-owners
   */
  setOwnerOnly(ownerOnly) {
    this.ownerOnly = ownerOnly;
  }

  /**
   * Get current delay settings
   * @returns {Object} Current settings
   */
  getSettings() {
    return {
      enabled: this.isEnabled,
      delaySeconds: this.delaySeconds,
      ownerOnly: this.ownerOnly
    };
  }

  /**
   * Clear user delay history
   * @param {string} userJid - User's JID (optional, if not provided clears all)
   */
  clearUserHistory(userJid = null) {
    if (userJid) {
      this.lastCommandTime.delete(userJid);
    } else {
      this.lastCommandTime.clear();
    }
  }
}

// Export singleton instance
module.exports = new CommandDelay();