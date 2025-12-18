/**
 * Enhanced error handler for API responses
 * Provides detailed, user-friendly error messages based on HTTP status codes and response data
 */

export const handleApiError = (error, context = 'operation') => {
  console.error(`Error in ${context}:`, error);

  // Default error structure
  const errorResponse = {
    title: 'Error',
    message: 'An unexpected error occurred',
    type: 'error',
    details: null,
    statusCode: null,
    canRetry: false
  };

  if (error.response) {
    // Server responded with error status
    const { status, data, statusText } = error.response;
    errorResponse.statusCode = status;

    switch (status) {
      case 400:
        errorResponse.title = 'Invalid Request';
        errorResponse.message = data.error || data.message || 'The request contains invalid data. Please check your input and try again.';
        errorResponse.details = data.details || null;
        break;

      case 401:
        errorResponse.title = 'Authentication Required';
        errorResponse.message = 'Your session has expired. Please log in again.';
        errorResponse.canRetry = false;
        break;

      case 403:
        errorResponse.title = 'Access Denied';
        errorResponse.message = data.error || 'You do not have permission to perform this action.';
        break;

      case 404:
        errorResponse.title = 'Not Found';
        errorResponse.message = data.error || 'The requested resource was not found.';
        break;

      case 409:
        errorResponse.title = 'Conflict';
        errorResponse.type = 'warning';
        
        // Handle specific conflict scenarios
        if (data.error) {
          if (data.error.includes('pending customer verification')) {
            errorResponse.title = 'Payment Pending';
            errorResponse.message = 'Your payment is waiting for customer verification. Please wait for the customer to approve or reject your payment amount.';
          } else if (data.error.includes('approved and verified')) {
            errorResponse.title = 'Payment Already Processed';
            errorResponse.message = 'Payment has already been approved for this errand. You cannot submit a new payment amount.';
          } else if (data.error.includes('pending balance payment')) {
            errorResponse.title = 'Payment Already Pending';
            errorResponse.message = 'You already have a pending balance payment. Please wait for admin approval before submitting another payment.';
          } else {
            errorResponse.message = data.error;
          }
        } else {
          errorResponse.message = 'A conflict occurred. The resource may already exist or be in use.';
        }
        break;

      case 422:
        errorResponse.title = 'Validation Error';
        
        if (data.errors) {
          // Laravel validation errors
          const validationErrors = Object.entries(data.errors)
            .map(([field, messages]) => `${field}: ${messages.join(', ')}`)
            .join('\n');
          errorResponse.message = validationErrors;
          errorResponse.details = data.errors;
        } else if (data.details) {
          // Custom validation errors
          const detailErrors = Object.entries(data.details)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          errorResponse.message = detailErrors;
          errorResponse.details = data.details;
        } else {
          errorResponse.message = data.error || data.message || 'Please check your input data and try again.';
        }
        break;

      case 429:
        errorResponse.title = 'Too Many Requests';
        errorResponse.message = 'You are making too many requests. Please wait a moment and try again.';
        errorResponse.canRetry = true;
        break;

      case 500:
        errorResponse.title = 'Server Error';
        errorResponse.message = data.error || 'A server error occurred. Please try again later.';
        errorResponse.canRetry = true;
        
        // Handle specific server errors
        if (data.error) {
          if (data.error.includes('SQLSTATE')) {
            errorResponse.message = 'A database error occurred. Please contact support if this persists.';
          } else if (data.error.includes('Connection')) {
            errorResponse.message = 'Database connection error. Please try again in a moment.';
          } else if (data.error.includes('payload') || data.error.includes('size')) {
            errorResponse.message = 'File too large. Please choose a smaller image (under 10MB) and try again.';
          }
        }
        break;

      case 502:
        errorResponse.title = 'Service Unavailable';
        errorResponse.message = 'The service is temporarily unavailable. Please try again later.';
        errorResponse.canRetry = true;
        break;

      case 503:
        errorResponse.title = 'Service Maintenance';
        errorResponse.message = 'The service is under maintenance. Please try again later.';
        errorResponse.canRetry = true;
        break;

      default:
        errorResponse.title = `Server Error (${status})`;
        errorResponse.message = data.error || data.message || statusText || 'An unexpected server error occurred.';
        errorResponse.canRetry = status >= 500;
    }
  } else if (error.request) {
    // Network error - no response received
    errorResponse.title = 'Network Error';
    errorResponse.message = 'Unable to connect to the server. Please check your internet connection and try again.';
    errorResponse.canRetry = true;
  } else {
    // Other error (e.g., request setup error)
    errorResponse.title = 'Request Error';
    errorResponse.message = error.message || 'An error occurred while preparing the request.';
  }

  return errorResponse;
};

/**
 * Handle payment-specific errors with more context
 */
export const handlePaymentError = (error) => {
  const baseError = handleApiError(error, 'payment submission');
  
  // Add payment-specific context
  if (baseError.statusCode === 409) {
    baseError.type = 'warning';
  } else if (baseError.statusCode === 422) {
    baseError.title = 'Payment Validation Error';
    
    // Common payment validation issues
    if (baseError.message.includes('original_amount')) {
      baseError.message = 'Please enter a valid payment amount (minimum ₱1, maximum ₱50,000).';
    } else if (baseError.message.includes('proof_of_purchase')) {
      baseError.message = 'Please provide proof of purchase (receipt, screenshot, etc.). Make sure the file is under 10MB.';
    }
  } else if (baseError.statusCode === 500) {
    // Handle server errors that might be related to file uploads
    baseError.title = 'Upload Error';
    if (!baseError.message.includes('File too large')) {
      baseError.message = 'Failed to process your payment. This might be due to a large file size. Please try with a smaller image (under 10MB).';
    }
  }
  
  return baseError;
};

/**
 * Handle balance-related errors
 */
export const handleBalanceError = (error) => {
  const baseError = handleApiError(error, 'balance operation');
  
  if (baseError.statusCode === 400) {
    if (baseError.message.includes('No outstanding balance')) {
      baseError.title = 'No Balance Due';
      baseError.type = 'info';
      baseError.message = 'You currently have no outstanding balance to pay.';
    }
  }
  
  return baseError;
};

/**
 * Format error for display in alerts
 */
export const formatErrorForAlert = (error) => {
  const errorInfo = handleApiError(error);
  
  return {
    type: errorInfo.type,
    title: errorInfo.title,
    message: errorInfo.message,
    canRetry: errorInfo.canRetry,
    details: errorInfo.details
  };
}; 