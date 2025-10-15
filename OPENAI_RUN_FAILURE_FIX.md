# OpenAI Run Failure - Enhanced Error Handling

## Problem

When analyzing custom declarations with existing files, the OpenAI run was failing with a generic error message:

```
Error: Analysis run failed with status: failed
```

This error message provided no details about **why** the run failed, making it impossible to diagnose and fix the issue.

## Root Cause

The code was only checking if the run status was "failed" but not capturing or logging the detailed error information that OpenAI provides in the `runStatus.last_error` object.

## Solution

Enhanced error handling in two key areas:

### 1. Enhanced `waitForRunCompletion` Method

Added detailed error logging when a run fails:

```javascript
// Log detailed error information if run failed
if (runStatus.status === "failed") {
  console.error("❌ Run failed with detailed error information:");
  console.error("Last error:", JSON.stringify(runStatus.last_error, null, 2));
  console.error("Full run status:", JSON.stringify(runStatus, null, 2));
}
```

### 2. Enhanced Error Messages

Updated error messages to include the specific error details:

```javascript
if (runStatus.status !== "completed") {
  const errorDetails = runStatus.last_error
    ? `${runStatus.last_error.code}: ${runStatus.last_error.message}`
    : "No error details available";
  throw new Error(
    `Analysis run failed with status: ${runStatus.status}. Details: ${errorDetails}`
  );
}
```

## Impact

Now when a run fails, you will see:

1. **Detailed console logs** showing the exact error from OpenAI
2. **Enhanced error message** with the error code and message
3. **Full run status** for complete debugging context

## Common OpenAI Run Failure Causes

Based on OpenAI documentation, runs can fail due to:

1. **File Access Issues**: Files that were deleted or have expired
2. **Invalid File Format**: Unsupported or corrupted files
3. **Rate Limits**: Too many requests in a short time
4. **Token Limits**: Request exceeds token limits for the model
5. **Assistant Configuration**: Issues with the assistant setup
6. **Invalid Instructions**: Malformed or excessive instruction text

## Next Steps

When you encounter the error again:

1. Check the console logs for the detailed error information
2. Look for the error code and message in `runStatus.last_error`
3. Address the specific issue based on the error details

## Files Modified

- `services/openai-service.js`
  - Updated `waitForRunCompletion()` method (lines 237-241)
  - Updated `analyzeCustomDeclarationDocumentWithExistingFiles()` method (lines 1253-1258)
  - Updated `analyzeCourierReceiptWithContentData()` method (lines 1524-1529)
