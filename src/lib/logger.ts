/**
 * Structured Logger Helper
 * Standardizes error logging across the application with detailed contextual data.
 * Prevents [object Object] output in console logs.
 */

export interface LogContext {
  file?: string;
  functionName?: string;
  table?: string;
  query?: string;
  statusCode?: number | string;
  error?: any;
  message?: string;
}

export const logError = (context: LogContext) => {
  const errObj = context.error;
  const status = context.statusCode || errObj?.status || errObj?.code || 'UNKNOWN_STATUS';
  const errMessage =
    context.message ||
    errObj?.message ||
    errObj?.error_description ||
    errObj?.details ||
    (typeof errObj === 'string' ? errObj : JSON.stringify(errObj || {}));

  console.error(
    `[AUDIT_ERROR] ${context.file || 'UnknownFile'}::${context.functionName || 'UnknownFn'} | Table: ${context.table || 'N/A'} | Status: ${status} | Message: ${errMessage}`,
    {
      statusCode: status,
      table: context.table,
      query: context.query,
      file: context.file,
      functionName: context.functionName,
      errorDetails: errObj,
    }
  );
};
