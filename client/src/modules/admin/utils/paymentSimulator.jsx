/**
 * Payment Simulation Utility
 * 
 * Provides simulated payment functionality for testing
 * without real transactions or bank integrations
 * All payments stay in pending state until admin approval
 */

class PaymentSimulator {
  constructor() {
    this.paymentMethods = {
      SIMULATED_CARD: {
        id: 'card',
        name: 'Simulated Card (Test)',
        displayName: '💳 Debit/Credit Card',
        description: 'Simulated card payment - Admin approval required',
        icon: '💳',
        fee: 2.5, // 2.5% fee
        processingTime: 'Instant (Admin approval required)'
      },
      SIMULATED_UPI: {
        id: 'upi',
        name: 'Simulated UPI (Test)',
        displayName: '📱 UPI',
        description: 'Simulated UPI payment - Admin approval required',
        icon: '📱',
        fee: 0, // No fees for UPI
        processingTime: 'Instant (Admin approval required)'
      },
      SIMULATED_WALLET: {
        id: 'wallet',
        name: 'Simulated Wallet (Test)',
        displayName: '👛 Digital Wallet',
        description: 'Simulated wallet payment - Admin approval required',
        icon: '👛',
        fee: 1, // 1% fee
        processingTime: 'Instant (Admin approval required)'
      },
      SIMULATED_BANK: {
        id: 'bank',
        name: 'Simulated Bank Transfer (Test)',
        displayName: '🏦 Bank Transfer',
        description: 'Simulated bank transfer - Admin approval required',
        icon: '🏦',
        fee: 0, // No fees for bank transfer
        processingTime: 'Instant (Admin approval required)'
      }
    };

    this.statuses = {
      PENDING: 'pending',
      APPROVED: 'approved',
      REJECTED: 'rejected',
      REFUNDED: 'refunded',
      FAILED: 'failed'
    };

    this.statusColors = {
      pending: 'yellow',
      approved: 'green',
      rejected: 'red',
      refunded: 'orange',
      failed: 'red'
    };
  }

  /**
   * Initialize a simulated payment
   * Creates a transaction ID and marks as pending admin approval
   */
  initializePayment(orderId, amount, paymentMethod) {
    if (!this.paymentMethods[paymentMethod]) {
      return {
        success: false,
        error: 'Invalid payment method'
      };
    }

    const transactionId = this.generateMockTransactionId();
    const methodDetails = this.paymentMethods[paymentMethod];
    const fee = (amount * methodDetails.fee) / 100;
    const netAmount = amount - fee;

    return {
      success: true,
      transaction: {
        transactionId,
        orderId,
        amount: amount,
        fee: fee,
        netAmount: netAmount,
        paymentMethod: paymentMethod,
        paymentMethodDetails: methodDetails,
        status: this.statuses.PENDING,
        statusLabel: 'Awaiting Admin Approval',
        createdAt: new Date().toISOString(),
        approvedAt: null,
        rejectionReason: null,
        refundedAt: null,
        metadata: {
          isSimulated: true,
          type: 'MOCK_TRANSACTION',
          requiresApproval: true
        }
      }
    };
  }

  /**
   * Approve a pending simulated payment
   * Admin approves and payment is marked as successful
   */
  approvePayment(transactionId, adminId, notes = '') {
    return {
      success: true,
      transaction: {
        transactionId,
        status: this.statuses.APPROVED,
        statusLabel: 'Payment Approved',
        approvedAt: new Date().toISOString(),
        approvedBy: adminId,
        approvalNotes: notes,
        isSimulated: true
      }
    };
  }

  /**
   * Reject a pending simulated payment
   * Admin rejects and payment is marked as failed
   * Customer can try again or get refund
   */
  rejectPayment(transactionId, adminId, reason) {
    if (!reason || reason.trim().length === 0) {
      return {
        success: false,
        error: 'Rejection reason is required'
      };
    }

    return {
      success: true,
      transaction: {
        transactionId,
        status: this.statuses.REJECTED,
        statusLabel: 'Payment Rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: adminId,
        rejectionReason: reason,
        isSimulated: true
      }
    };
  }

  /**
   * Refund a previously approved payment
   * Marks transaction as refunded (simulated refund)
   */
  refundPayment(transactionId, adminId, reason = '') {
    return {
      success: true,
      transaction: {
        transactionId,
        status: this.statuses.REFUNDED,
        statusLabel: 'Refunded',
        refundedAt: new Date().toISOString(),
        refundedBy: adminId,
        refundReason: reason,
        isSimulated: true
      }
    };
  }

  /**
   * Simulate a payment timeout
   * Marks payment as failed after timeout period
   */
  simulateTimeout(transactionId) {
    return {
      success: true,
      transaction: {
        transactionId,
        status: this.statuses.FAILED,
        statusLabel: 'Payment Timeout',
        failureReason: 'Payment processing timeout',
        failedAt: new Date().toISOString(),
        isSimulated: true
      }
    };
  }

  /**
   * Get all available payment methods for customer selection
   */
  getPaymentMethods() {
    return Object.values(this.paymentMethods).map(method => ({
      id: method.id,
      name: method.displayName,
      description: method.description,
      icon: method.icon,
      fee: method.fee,
      processingTime: method.processingTime
    }));
  }

  /**
   * Calculate total amount including fees
   */
  calculateTotal(baseAmount, paymentMethodKey) {
    const method = this.paymentMethods[paymentMethodKey];
    if (!method) return null;

    const fee = (baseAmount * method.fee) / 100;
    return {
      baseAmount,
      fee,
      total: baseAmount + fee,
      feePercentage: method.fee
    };
  }

  /**
   * Generate a mock transaction ID
   * Format: MOCK_TXN_[TIMESTAMP]_[RANDOM]
   */
  generateMockTransactionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MOCK_TXN_${timestamp}_${random}`;
  }

  /**
   * Format transaction for display
   */
  formatTransaction(transaction) {
    return {
      ...transaction,
      amountFormatted: `₹${transaction.amount.toFixed(2)}`,
      feeFormatted: `₹${transaction.fee.toFixed(2)}`,
      netAmountFormatted: `₹${transaction.netAmount.toFixed(2)}`,
      statusColor: this.statusColors[transaction.status] || 'gray',
      createdDate: new Date(transaction.createdAt).toLocaleDateString(),
      createdTime: new Date(transaction.createdAt).toLocaleTimeString()
    };
  }

  /**
   * Get payment status details
   */
  getStatusDetails(status) {
    const statusMap = {
      [this.statuses.PENDING]: {
        label: 'Pending Approval',
        icon: '⏳',
        color: 'yellow',
        description: 'Awaiting admin approval',
        canApprove: true,
        canReject: true,
        canRefund: false
      },
      [this.statuses.APPROVED]: {
        label: 'Approved',
        icon: '✓',
        color: 'green',
        description: 'Payment successful',
        canApprove: false,
        canReject: false,
        canRefund: true
      },
      [this.statuses.REJECTED]: {
        label: 'Rejected',
        icon: '✗',
        color: 'red',
        description: 'Payment rejected by admin',
        canApprove: false,
        canReject: false,
        canRefund: false
      },
      [this.statuses.REFUNDED]: {
        label: 'Refunded',
        icon: '↩️',
        color: 'orange',
        description: 'Payment refunded to customer',
        canApprove: false,
        canReject: false,
        canRefund: false
      },
      [this.statuses.FAILED]: {
        label: 'Failed',
        icon: '❌',
        color: 'red',
        description: 'Payment processing failed',
        canApprove: false,
        canReject: false,
        canRefund: false
      }
    };

    return statusMap[status] || statusMap[this.statuses.PENDING];
  }

  /**
   * Validate payment data
   */
  validatePayment(orderId, amount, paymentMethod) {
    const errors = [];

    if (!orderId || orderId.trim() === '') {
      errors.push('Order ID is required');
    }

    if (!amount || amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (!paymentMethod || !this.paymentMethods[paymentMethod]) {
      errors.push('Invalid payment method');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get mock test transaction for demo purposes
   */
  getMockTransaction() {
    const transactionId = this.generateMockTransactionId();
    return {
      transactionId,
      orderId: 'ORD-TEST-001',
      amount: 5000,
      fee: 125,
      netAmount: 4875,
      paymentMethod: 'SIMULATED_CARD',
      paymentMethodDetails: this.paymentMethods.SIMULATED_CARD,
      status: this.statuses.PENDING,
      statusLabel: 'Awaiting Admin Approval',
      createdAt: new Date().toISOString(),
      approvedAt: null,
      rejectionReason: null,
      refundedAt: null,
      metadata: {
        isSimulated: true,
        type: 'MOCK_TRANSACTION',
        requiresApproval: true,
        isDemo: true
      }
    };
  }
}

// Export singleton instance
export const paymentSimulator = new PaymentSimulator();
export default PaymentSimulator;
