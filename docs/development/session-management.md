# Session Management Guide

This guide covers the implementation of user session management.


## Validation Implementation

# 🔍 Session Validation Implementation Guide

## Overview

This guide documents the comprehensive session validation system that checks all requirements before attempting session creation, including table existence validation and other critical checks.

## 🎯 **IMPLEMENTATION COMPLETE**

**Date:** $(date)  
**Status:** ✅ **COMPLETE** - All session validation functionality implemented and tested

---

## 🔧 **Core Validation Functions**

### **1. Table Existence Validation (`validateTableExists`)**

Validates that a table exists and is accessible.

```typescript
import { validateTableExists } from '@/lib/error-handling'

const tableInfo = await validateTableExists('123e4567-e89b-12d3-a456-426614174000')
// Returns: { id, number, is_active, is_occupied, owner_id, is_public, current_session_id }
```

**Features:**
- ✅ Checks table existence in database
- ✅ Returns comprehensive table information
- ✅ Handles database errors gracefully
- ✅ Provides detailed error messages

### **2. Table Activity Validation (`validateTableActive`)**

Validates that a table is active and available for use.

```typescript
import { validateTableActive } from '@/lib/error-handling'

await validateTableActive(tableInfo)
// Throws error if table is not active
```

**Features:**
- ✅ Checks `is_active` flag
- ✅ Provides clear error messages
- ✅ Integrates with table existence validation

### **3. Table Availability Validation (`validateTableAvailable`)**

Validates that a table is not currently occupied.

```typescript
import { validateTableAvailable } from '@/lib/error-handling'

await validateTableAvailable(tableInfo)
// Throws error if table is occupied
```

**Features:**
- ✅ Checks `is_occupied` flag
- ✅ Identifies current session if occupied
- ✅ Prevents double-booking

### **4. User Authentication Validation (`validateUserAuthentication`)**

Validates that a user is properly authenticated.

```typescript
import { validateUserAuthentication } from '@/lib/error-handling'

const userInfo = await validateUserAuthentication()
// Returns: { id, email, role }
```

**Features:**
- ✅ Checks Supabase authentication status
- ✅ Returns user information
- ✅ Handles authentication errors
- ✅ Validates session validity

### **5a. Table Permissions Validation (`validateTablePermissions`)**

Validates that a user has specific permission to create sessions for a table via the `table_permissions` table.

```typescript
import { validateTablePermissions } from '@/lib/error-handling'

await validateTablePermissions(userId, tableId)
// Throws error if user lacks can_create_sessions permission
```

**Features:**
- ✅ Checks `table_permissions` table for specific permissions
- ✅ Validates `can_create_sessions` flag
- ✅ Provides detailed permission error messages
- ✅ Handles database errors gracefully

### **5b. User Permissions Validation (`validateUserPermissions`)**

Validates that a user has permission to create sessions for a specific table using comprehensive permission checks.

```typescript
import { validateUserPermissions } from '@/lib/error-handling'

await validateUserPermissions(userInfo, tableInfo, {
  allowPublicTables: true,
  requireTableOwnership: false,
  checkTablePermissions: true
})
```

**Features:**
- ✅ Checks specific table permissions first (if enabled)
- ✅ Falls back to table ownership checks
- ✅ Validates public table access
- ✅ Configurable permission requirements
- ✅ Detailed permission error messages

### **6. Session Data Validation (`validateSessionData`)**

Validates that session data meets all requirements.

```typescript
import { validateSessionData } from '@/lib/error-handling'

const sessionData = {
  table_id: '123e4567-e89b-12d3-a456-426614174000',
  started_by_name: 'John Doe',
  status: 'active',
  started_at: new Date().toISOString()
}

await validateSessionData(sessionData)
```

**Features:**
- ✅ Validates required fields
- ✅ Checks data format and constraints
- ✅ Validates UUID format for table_id
- ✅ Checks string length limits
- ✅ Validates status values
- ✅ Validates date formats

### **7. Existing Sessions Validation (`validateNoExistingActiveSessions`)**

Validates that no active sessions exist for the table.

```typescript
import { validateNoExistingActiveSessions } from '@/lib/error-handling'

await validateNoExistingActiveSessions(tableId)
// Throws error if active session exists
```

**Features:**
- ✅ Checks for existing active sessions
- ✅ Prevents session conflicts
- ✅ Provides session details if conflict exists

---

## 🚀 **Comprehensive Validation**

### **8. Complete Session Validation (`validateSessionCreation`)**

Performs all validation checks in a single function.

```typescript
import { validateSessionCreation } from '@/lib/error-handling'

const result = await validateSessionCreation(sessionData, {
  checkTableExists: true,
  checkTableActive: true,
  checkTableAvailable: true,
  checkUserAuth: true,
  checkUserPermissions: true,
  checkSessionData: true,
  checkExistingSessions: true,
  allowPublicTables: true,
  requireTableOwnership: false
})

if (result.isValid) {
  console.log('✅ All validations passed')
  console.log('Table info:', result.tableInfo)
  console.log('User info:', result.userInfo)
} else {
  console.log('❌ Validation failed:', result.errors)
}
```

**Features:**
- ✅ Configurable validation options
- ✅ Comprehensive error collection
- ✅ Returns detailed validation results
- ✅ Includes table and user information
- ✅ Supports partial validation

### **9. Quick Validation (`quickValidateSessionCreation`)**

Performs essential validation checks quickly.

```typescript
import { quickValidateSessionCreation } from '@/lib/error-handling'

const isValid = await quickValidateSessionCreation(sessionData, userId)
// Returns: boolean
```

**Features:**
- ✅ Fast validation for common scenarios
- ✅ Essential checks only
- ✅ Simple boolean return
- ✅ Optimized for performance

### **10. Validation with Details (`validateSessionCreationWithDetails`)**

Provides detailed validation results with error information.

```typescript
import { validateSessionCreationWithDetails } from '@/lib/error-handling'

const { isValid, result, error } = await validateSessionCreationWithDetails(sessionData, options)

if (!isValid) {
  console.log('Validation failed:', error?.message)
  console.log('Errors:', result.errors)
  console.log('Warnings:', result.warnings)
}
```

**Features:**
- ✅ Detailed validation results
- ✅ Structured error information
- ✅ Warning collection
- ✅ Complete validation context

### **11. Comprehensive Validation (Streamlined) (`validateSessionCreationComprehensive`)**

Performs essential validation checks in a streamlined, single-function approach.

```typescript
import { validateSessionCreationComprehensive } from '@/lib/error-handling'

const { user, tableId, tableInfo } = await validateSessionCreationComprehensive(tableId)
console.log('User:', user.id)
console.log('Table:', tableInfo.number)
```

**Features:**
- ✅ Streamlined validation process
- ✅ Returns user, table ID, and table info
- ✅ Essential checks only (auth, table exists, permissions)
- ✅ Simple return structure
- ✅ Optimized for performance

### **12. Enhanced Comprehensive Validation (`validateSessionCreationEnhanced`)**

Provides comprehensive validation with detailed tracking and configurable options.

```typescript
import { validateSessionCreationEnhanced } from '@/lib/error-handling'

const { user, tableId, tableInfo, validationDetails } = await validateSessionCreationEnhanced(tableId, {
  checkTableActive: true,
  checkTableAvailable: true,
  checkTablePermissions: true,
  allowPublicTables: true,
  requireTableOwnership: false
})

console.log('Validation details:', validationDetails)
```

**Features:**
- ✅ Comprehensive validation with options
- ✅ Detailed validation tracking
- ✅ Configurable validation steps
- ✅ Complete validation context
- ✅ Step-by-step validation details

---

## ⚙️ **Configuration Options**

### **Validation Options Interface**

```typescript
interface ValidationOptions {
  checkTableExists?: boolean      // Check if table exists (default: true)
  checkTableActive?: boolean      // Check if table is active (default: true)
  checkTableAvailable?: boolean   // Check if table is available (default: true)
  checkUserAuth?: boolean         // Check user authentication (default: true)
  checkUserPermissions?: boolean  // Check user permissions (default: true)
  checkTablePermissions?: boolean // Check specific table permissions (default: true)
  checkSessionData?: boolean      // Check session data validity (default: true)
  checkExistingSessions?: boolean // Check for existing sessions (default: true)
  allowPublicTables?: boolean     // Allow public table access (default: true)
  requireTableOwnership?: boolean // Require table ownership (default: false)
}
```

### **Default Configuration**

```typescript
const DEFAULT_VALIDATION_OPTIONS: ValidationOptions = {
  checkTableExists: true,
  checkTableActive: true,
  checkTableAvailable: true,
  checkUserAuth: true,
  checkUserPermissions: true,
  checkTablePermissions: true,
  checkSessionData: true,
  checkExistingSessions: true,
  allowPublicTables: true,
  requireTableOwnership: false
}
```

---

## 📋 **Validation Flow**

### **Complete Validation Process**

1. **Session Data Validation**
   - Check required fields
   - Validate data formats
   - Check constraints

2. **User Authentication**
   - Verify user session
   - Get user information
   - Check authentication status

3. **Table Existence**
   - Query table from database
   - Verify table exists
   - Get table information

4. **Table Activity**
   - Check `is_active` flag
   - Verify table is operational

5. **Table Availability**
   - Check `is_occupied` flag
   - Verify no current session

6. **User Permissions**
   - Check table ownership
   - Validate public access
   - Apply permission rules

6a. **Table Permissions**
   - Check specific table permissions
   - Validate `can_create_sessions` flag
   - Fall back to other permission checks

7. **Existing Sessions**
   - Query for active sessions
   - Prevent conflicts
   - Check session status

8. **Result Compilation**
   - Collect all errors
   - Generate warnings
   - Return validation result

---

## 🎯 **Usage Examples**

### **Basic Session Validation**

```typescript
import { validateSessionCreation } from '@/lib/error-handling'

const sessionData = {
  table_id: '123e4567-e89b-12d3-a456-426614174000',
  started_by_name: 'John Doe',
  status: 'active'
}

const result = await validateSessionCreation(sessionData)

if (result.isValid) {
  // Proceed with session creation
  const { data, error } = await supabase.from('sessions').insert(sessionData)
  if (error) throw error
  console.log('Session created:', data)
} else {
  console.log('Validation failed:', result.errors)
}
```

### **Custom Validation Options**

```typescript
import { validateSessionCreation } from '@/lib/error-handling'

const result = await validateSessionCreation(sessionData, {
  checkTableExists: true,
  checkTableActive: false, // Skip table active check
  checkTableAvailable: false, // Skip table available check
  checkUserAuth: true,
  checkUserPermissions: false, // Skip general permissions check
  checkTablePermissions: true, // Keep specific table permissions check
  checkSessionData: true,
  checkExistingSessions: false, // Skip existing sessions check
  allowPublicTables: true,
  requireTableOwnership: false
})
```

### **Table Permissions Only**

```typescript
import { validateTablePermissions } from '@/lib/error-handling'

// Check only specific table permissions
try {
  await validateTablePermissions(userId, tableId)
  console.log('User has permission to create sessions for this table')
} catch (error) {
  console.log('User lacks permission:', error.message)
}
```

### **Streamlined Comprehensive Validation**

```typescript
import { validateSessionCreationComprehensive } from '@/lib/error-handling'

// Simple, streamlined validation
try {
  const { user, tableId, tableInfo } = await validateSessionCreationComprehensive(tableId)
  
  // Proceed with session creation
  const sessionData = {
    table_id: tableId,
    started_by_name: user.email || 'Unknown User',
    status: 'active'
  }
  
  const { data, error } = await supabase.from('sessions').insert(sessionData)
  if (error) throw error
  
  console.log('Session created successfully:', data)
} catch (error) {
  console.log('Validation or creation failed:', error.message)
}
```

### **Enhanced Comprehensive Validation**

```typescript
import { validateSessionCreationEnhanced } from '@/lib/error-handling'

// Enhanced validation with detailed tracking
try {
  const { user, tableId, tableInfo, validationDetails } = await validateSessionCreationEnhanced(tableId, {
    checkTableActive: true,
    checkTableAvailable: true,
    checkTablePermissions: true,
    allowPublicTables: true,
    requireTableOwnership: false
  })
  
  console.log('All validations passed:', validationDetails)
  
  // Proceed with session creation
  const sessionData = {
    table_id: tableId,
    started_by_name: user.email || 'Unknown User',
    status: 'active'
  }
  
  const { data, error } = await supabase.from('sessions').insert(sessionData)
  if (error) throw error
  
  console.log('Session created successfully:', data)
} catch (error) {
  console.log('Validation or creation failed:', error.message)
}
```

### **React Component Integration**

```typescript
import { validateSessionCreation } from '@/lib/error-handling'

function SessionForm() {
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  
  const createSession = async (sessionData: any) => {
    setLoading(true)
    setErrors([])
    
    try {
      // Validate before creating
      const validation = await validateSessionCreation(sessionData)
      
      if (!validation.isValid) {
        setErrors(validation.errors)
        return
      }
      
      // Create session
      const { data, error } = await supabase.from('sessions').insert(sessionData)
      if (error) throw error
      
      console.log('Session created:', data)
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to create session'])
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div>
      {errors.length > 0 && (
        <div className="error">
          {errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}
      {/* Form content */}
    </div>
  )
}
```

### **API Route Integration**

```typescript
import { validateSessionCreation } from '@/lib/error-handling'

export async function POST(request: NextRequest) {
  try {
    const sessionData = await request.json()
    
    // Validate session data
    const validation = await validateSessionCreation(sessionData)
    
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }
    
    // Create session
    const { data, error } = await supabase.from('sessions').insert(sessionData)
    if (error) throw error
    
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    )
  }
}
```

### **Custom Hook Integration**

```typescript
import { validateSessionCreation } from '@/lib/error-handling'

export function useSessionCreation() {
  const createSession = useCallback(async (sessionData: any) => {
    // Validate session data
    const validation = await validateSessionCreation(sessionData)
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }
    
    // Create session
    const { data, error } = await supabase.from('sessions').insert(sessionData)
    if (error) throw error
    
    return data
  }, [])
  
  return { createSession }
}
```

---

## 🧪 **Testing**

### **Test Page**

Visit `/test-session-validation` to test all validation functionality:

- ✅ Table existence validation
- ✅ Table activity validation
- ✅ Table availability validation
- ✅ User authentication validation
- ✅ User permissions validation
- ✅ Table permissions validation
- ✅ Session data validation
- ✅ Existing sessions validation
- ✅ Comprehensive validation (original)
- ✅ Quick validation
- ✅ Validation with details
- ✅ Invalid data testing
- ✅ Custom options testing
- ✅ Comprehensive validation (streamlined)
- ✅ Enhanced validation (full)
- ✅ Enhanced validation (minimal)

### **Manual Testing**

```typescript
import { 
  validateTableExists, 
  validateTablePermissions,
  validateSessionCreationComprehensive,
  validateSessionCreationEnhanced
} from '@/lib/error-handling'

// Test table existence
try {
  const tableInfo = await validateTableExists('valid-table-id')
  console.log('Table found:', tableInfo)
} catch (error) {
  console.log('Table not found:', error.message)
}

// Test table permissions
try {
  await validateTablePermissions('user-id', 'table-id')
  console.log('User has permission to create sessions')
} catch (error) {
  console.log('User lacks permission:', error.message)
}

// Test streamlined comprehensive validation
try {
  const { user, tableId, tableInfo } = await validateSessionCreationComprehensive('table-id')
  console.log('Comprehensive validation passed:', { user: user.id, table: tableInfo.number })
} catch (error) {
  console.log('Comprehensive validation failed:', error.message)
}

// Test enhanced comprehensive validation
try {
  const { user, tableId, tableInfo, validationDetails } = await validateSessionCreationEnhanced('table-id')
  console.log('Enhanced validation passed:', validationDetails)
} catch (error) {
  console.log('Enhanced validation failed:', error.message)
}
```

---

## 📊 **Validation Results**

### **Validation Result Interface**

```typescript
interface ValidationResult {
  isValid: boolean           // Overall validation status
  errors: string[]          // List of validation errors
  warnings: string[]        // List of validation warnings
  tableInfo?: TableInfo     // Table information (if available)
  userInfo?: UserInfo       // User information (if available)
}
```

### **Error Types**

| Error Code | Description | Example |
|------------|-------------|---------|
| `TABLE_NOT_FOUND` | Table does not exist | "Table 123 does not exist or is inaccessible" |
| `TABLE_INACTIVE` | Table is not active | "Table 5 is not active" |
| `TABLE_OCCUPIED` | Table is occupied | "Table 3 is already occupied" |
| `AUTHENTICATION_REQUIRED` | User not authenticated | "User must be authenticated to create sessions" |
| `PERMISSION_DENIED` | User lacks permissions | "User does not have permission to create sessions for table 2" |
| `INVALID_SESSION_DATA` | Session data invalid | "Session data validation failed: Table ID is required" |
| `ACTIVE_SESSION_EXISTS` | Active session exists | "Table already has an active session" |

---

## 🎯 **Best Practices**

### **1. Use Appropriate Validation Level**
- Use `validateSessionCreation` for complete validation
- Use `quickValidateSessionCreation` for performance-critical scenarios
- Use individual functions for specific validation needs

### **2. Handle Validation Results**
- Always check `isValid` before proceeding
- Display validation errors to users
- Log validation failures for debugging

### **3. Configure Validation Options**
- Disable unnecessary checks for performance
- Enable strict validation for critical operations
- Use custom options for specific use cases

### **4. Error Handling**
- Provide meaningful error messages
- Handle validation exceptions gracefully
- Log validation failures for monitoring

### **5. Performance Optimization**
- Use quick validation for simple checks
- Cache table information when possible
- Batch validation operations when appropriate

---

## 🚀 **Integration Examples**

### **With Retry Logic**

```typescript
import { 
  validateSessionCreation, 
  withAuthRetry 
} from '@/lib/error-handling'

const createSessionWithValidation = async (sessionData: any) => {
  // Validate first
  const validation = await validateSessionCreation(sessionData)
  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
  }
  
  // Create with retry
  return await withAuthRetry(async () => {
    const { data, error } = await supabase.from('sessions').insert(sessionData)
    if (error) throw error
    return data
  })
}
```

### **With Error Handling**

```typescript
import { 
  validateSessionCreation, 
  handleSupabaseError 
} from '@/lib/error-handling'

const createSession = async (sessionData: any) => {
  try {
    // Validate
    const validation = await validateSessionCreation(sessionData)
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`)
    }
    
    // Create
    const { data, error } = await supabase.from('sessions').insert(sessionData)
    if (error) {
      handleSupabaseError(error, 'session creation')
    }
    
    return data
  } catch (error) {
    console.error('Session creation failed:', error)
    throw error
  }
}
```

---

## 📈 **Performance Considerations**

### **Validation Overhead**
- Individual validations are lightweight
- Comprehensive validation adds minimal overhead
- Database queries are optimized and cached

### **Memory Usage**
- Validation functions are stateless
- No large data structures stored
- Minimal memory footprint

### **Network Impact**
- Validation queries are efficient
- Batch operations when possible
- Connection pooling for performance

---

## 🎉 **Final Status**

### **✅ IMPLEMENTATION COMPLETE**

The comprehensive session validation system has been successfully implemented with:

- **13 Validation Functions** (Individual and comprehensive)
- **Table Permissions Validation** via `table_permissions` table
- **Streamlined Comprehensive Validation** for simple use cases
- **Enhanced Comprehensive Validation** with detailed tracking
- **Complete Error Handling** with detailed error codes
- **Configurable Options** for flexible validation
- **Type Safety** with proper TypeScript interfaces
- **Comprehensive Testing** with test page
- **Performance Optimization** with quick validation
- **Production-Ready** implementation

**Status: ✅ COMPLETE** 🎉

The session validation system is now ready for production use and provides robust validation of all session creation requirements with comprehensive error handling and detailed validation results.

## React Hook Usage

# 🎣 useSessionManagement Hook Enhancement Guide

## Overview

This guide documents the enhanced `useSessionManagement` hook that properly handles errors and authentication using the comprehensive validation functions we've created.

## 🎯 **IMPLEMENTATION COMPLETE**

**Date:** $(date)  
**Status:** ✅ **COMPLETE** - Enhanced hook with proper error handling and authentication

---

## 🔧 **Enhanced Hook Features**

### **1. Streamlined State Management**

```typescript
interface SessionState {
  isLoading: boolean
  error: string | null
  session: unknown | null
}
```

**Features:**
- ✅ **Simplified State** - Clean, focused state structure
- ✅ **Loading Management** - Proper loading state handling
- ✅ **Error Handling** - Comprehensive error state management
- ✅ **Session Tracking** - Current session state tracking

### **2. Comprehensive Validation Integration**

```typescript
// Uses the comprehensive validation function
const { user, tableInfo } = await validateSessionCreationComprehensive(tableId)
```

**Features:**
- ✅ **Pre-validation** - Validates everything before database operations
- ✅ **Authentication Check** - Ensures user is properly authenticated
- ✅ **Table Validation** - Verifies table exists and is accessible
- ✅ **Permission Check** - Validates user permissions for table
- ✅ **Error Prevention** - Prevents invalid operations

### **3. Enhanced Error Handling**

```typescript
if (error) {
  throw new AppError({
    message: handleSupabaseError(error, 'session creation'),
    code: 'SESSION_CREATION_ERROR',
    originalError: error
  })
}
```

**Features:**
- ✅ **Structured Errors** - Uses AppError for consistent error handling
- ✅ **Detailed Messages** - Provides specific error messages
- ✅ **Error Context** - Includes operation context in errors
- ✅ **Original Error Preservation** - Maintains original error information

### **4. Proper Authentication Handling**

```typescript
// Creates session with proper user context
const { data: session, error } = await supabase
  .from('sessions')
  .insert({
    table_id: tableId,
    created_by: user.id,  // Proper user context
    status: 'active',
    started_at: new Date().toISOString(),
    started_by_name: user.email || 'Unknown User'
  })
```

**Features:**
- ✅ **User Context** - Includes authenticated user information
- ✅ **Proper Attribution** - Links session to creating user
- ✅ **Fallback Values** - Handles missing user information gracefully
- ✅ **Timestamp Management** - Proper session timing

---

## 🚀 **Usage Examples**

### **Basic Session Creation**

```typescript
import { useSessionManagement } from '@/hooks/useSessionManagement'

function SessionComponent() {
  const { isLoading, error, session, createSession, clearError } = useSessionManagement()
  
  const handleCreateSession = async (tableId: string) => {
    try {
      const newSession = await createSession(tableId)
      console.log('Session created:', newSession)
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }
  
  return (
    <div>
      {isLoading && <div>Creating session...</div>}
      {error && (
        <div>
          <p>Error: {error}</p>
          <button onClick={clearError}>Clear Error</button>
        </div>
      )}
      {session && <div>Session: {JSON.stringify(session)}</div>}
      <button onClick={() => handleCreateSession('table-123')}>
        Create Session
      </button>
    </div>
  )
}
```

### **Session Joining**

```typescript
function JoinSessionComponent() {
  const { isLoading, error, joinSession, clearError } = useSessionManagement()
  
  const handleJoinSession = async (sessionId: string) => {
    try {
      await joinSession(sessionId)
      console.log('Joined session successfully')
    } catch (error) {
      console.error('Failed to join session:', error)
    }
  }
  
  return (
    <div>
      {isLoading && <div>Joining session...</div>}
      {error && (
        <div>
          <p>Error: {error}</p>
          <button onClick={clearError}>Clear Error</button>
        </div>
      )}
      <button onClick={() => handleJoinSession('session-456')}>
        Join Session
      </button>
    </div>
  )
}
```

### **Complete Session Management**

```typescript
function CompleteSessionManager() {
  const { 
    isLoading, 
    error, 
    session, 
    createSession, 
    joinSession, 
    clearError 
  } = useSessionManagement()
  
  const [tableId, setTableId] = useState('')
  const [sessionId, setSessionId] = useState('')
  
  const handleCreate = async () => {
    if (!tableId) return
    try {
      await createSession(tableId)
    } catch (error) {
      // Error is handled by the hook
    }
  }
  
  const handleJoin = async () => {
    if (!sessionId) return
    try {
      await joinSession(sessionId)
    } catch (error) {
      // Error is handled by the hook
    }
  }
  
  return (
    <div className="session-manager">
      <h2>Session Management</h2>
      
      {/* Create Session */}
      <div className="create-section">
        <h3>Create New Session</h3>
        <input
          type="text"
          value={tableId}
          onChange={(e) => setTableId(e.target.value)}
          placeholder="Enter table ID"
        />
        <button onClick={handleCreate} disabled={isLoading || !tableId}>
          {isLoading ? 'Creating...' : 'Create Session'}
        </button>
      </div>
      
      {/* Join Session */}
      <div className="join-section">
        <h3>Join Existing Session</h3>
        <input
          type="text"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
          placeholder="Enter session ID"
        />
        <button onClick={handleJoin} disabled={isLoading || !sessionId}>
          {isLoading ? 'Joining...' : 'Join Session'}
        </button>
      </div>
      
      {/* Status Display */}
      {error && (
        <div className="error-section">
          <h3>Error</h3>
          <p className="error-message">{error}</p>
          <button onClick={clearError}>Clear Error</button>
        </div>
      )}
      
      {session && (
        <div className="session-section">
          <h3>Current Session</h3>
          <pre>{JSON.stringify(session, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
```

---

## ⚙️ **Hook API Reference**

### **Return Values**

| Property | Type | Description |
|----------|------|-------------|
| `isLoading` | `boolean` | Whether an operation is in progress |
| `error` | `string \| null` | Current error message, if any |
| `session` | `unknown \| null` | Current session data, if any |
| `createSession` | `(tableId: string) => Promise<unknown>` | Creates a new session |
| `joinSession` | `(sessionId: string) => Promise<void>` | Joins an existing session |
| `clearError` | `() => void` | Clears the current error |

### **createSession Function**

```typescript
createSession(tableId: string): Promise<unknown>
```

**Parameters:**
- `tableId` (string): The ID of the table to create a session for

**Returns:**
- `Promise<unknown>`: The created session data

**Features:**
- ✅ **Comprehensive Validation** - Validates authentication, table, and permissions
- ✅ **Error Handling** - Proper error handling with detailed messages
- ✅ **Navigation** - Automatically navigates to menu page on success
- ✅ **State Management** - Updates loading and error states

**Error Codes:**
- `SESSION_CREATION_ERROR` - General session creation error
- `INVALID_SESSION_RESPONSE` - Invalid response from database
- `ROUTER_ERROR` - Navigation error

### **joinSession Function**

```typescript
joinSession(sessionId: string): Promise<void>
```

**Parameters:**
- `sessionId` (string): The ID of the session to join

**Returns:**
- `Promise<void>`: Resolves when session is joined successfully

**Features:**
- ✅ **Session Validation** - Validates session exists and is active
- ✅ **Error Handling** - Proper error handling with detailed messages
- ✅ **Navigation** - Automatically navigates to menu page on success
- ✅ **State Management** - Updates loading and error states

**Error Codes:**
- `SESSION_JOIN_ERROR` - General session join error
- `SESSION_NOT_FOUND` - Session does not exist
- `SESSION_INACTIVE` - Session is no longer active
- `ROUTER_ERROR` - Navigation error

---

## 🔍 **Validation Flow**

### **Session Creation Validation**

1. **Authentication Check**
   - Verifies user is authenticated
   - Gets user information

2. **Table Validation**
   - Checks table exists
   - Verifies table is accessible
   - Validates table permissions

3. **Session Creation**
   - Creates session with proper user context
   - Handles database errors
   - Updates state

4. **Navigation**
   - Navigates to menu page
   - Handles navigation errors

### **Session Join Validation**

1. **Session Lookup**
   - Queries session by ID
   - Handles database errors

2. **Session Validation**
   - Checks session exists
   - Verifies session is active

3. **Navigation**
   - Navigates to menu page
   - Handles navigation errors

---

## 🛡️ **Error Handling**

### **Error Types**

| Error Code | Description | Example |
|------------|-------------|---------|
| `SESSION_CREATION_ERROR` | General session creation error | Database constraint violation |
| `INVALID_SESSION_RESPONSE` | Invalid response from database | Missing session data |
| `SESSION_JOIN_ERROR` | General session join error | Database connection error |
| `SESSION_NOT_FOUND` | Session does not exist | Invalid session ID |
| `SESSION_INACTIVE` | Session is no longer active | Session completed |
| `ROUTER_ERROR` | Navigation error | Route not found |

### **Error Handling Best Practices**

```typescript
// 1. Always handle errors in try-catch blocks
try {
  await createSession(tableId)
} catch (error) {
  // Error is already handled by the hook
  console.error('Session creation failed:', error)
}

// 2. Check error state in UI
{error && (
  <div className="error">
    <p>{error}</p>
    <button onClick={clearError}>Clear Error</button>
  </div>
)}

// 3. Disable actions during loading
<button disabled={isLoading} onClick={handleCreate}>
  {isLoading ? 'Creating...' : 'Create Session'}
</button>
```

---

## 🧪 **Testing**

### **Unit Testing**

```typescript
import { renderHook, act } from '@testing-library/react'
import { useSessionManagement } from '@/hooks/useSessionManagement'

describe('useSessionManagement', () => {
  it('should create session successfully', async () => {
    const { result } = renderHook(() => useSessionManagement())
    
    await act(async () => {
      await result.current.createSession('table-123')
    })
    
    expect(result.current.session).toBeDefined()
    expect(result.current.error).toBeNull()
  })
  
  it('should handle session creation errors', async () => {
    const { result } = renderHook(() => useSessionManagement())
    
    await act(async () => {
      try {
        await result.current.createSession('invalid-table')
      } catch (error) {
        // Error is handled by the hook
      }
    })
    
    expect(result.current.error).toBeDefined()
    expect(result.current.session).toBeNull()
  })
})
```

### **Integration Testing**

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { SessionComponent } from './SessionComponent'

describe('SessionComponent Integration', () => {
  it('should create and display session', async () => {
    render(<SessionComponent />)
    
    const tableInput = screen.getByPlaceholderText('Enter table ID')
    const createButton = screen.getByText('Create Session')
    
    fireEvent.change(tableInput, { target: { value: 'table-123' } })
    fireEvent.click(createButton)
    
    await waitFor(() => {
      expect(screen.getByText('Session created successfully')).toBeInTheDocument()
    })
  })
})
```

---

## 🎯 **Best Practices**

### **1. Error Handling**

```typescript
// ✅ Good: Handle errors properly
try {
  await createSession(tableId)
} catch (error) {
  // Error is handled by the hook
  console.error('Session creation failed:', error)
}

// ❌ Bad: Ignore errors
createSession(tableId) // No error handling
```

### **2. Loading States**

```typescript
// ✅ Good: Show loading state
<button disabled={isLoading} onClick={handleCreate}>
  {isLoading ? 'Creating...' : 'Create Session'}
</button>

// ❌ Bad: No loading indication
<button onClick={handleCreate}>Create Session</button>
```

### **3. Error Display**

```typescript
// ✅ Good: Show errors with clear action
{error && (
  <div className="error">
    <p>{error}</p>
    <button onClick={clearError}>Clear Error</button>
  </div>
)}

// ❌ Bad: No error handling
{error && <p>{error}</p>}
```

### **4. State Management**

```typescript
// ✅ Good: Use hook state
const { isLoading, error, session } = useSessionManagement()

// ❌ Bad: Duplicate state management
const [loading, setLoading] = useState(false)
const [error, setError] = useState(null)
```

---

## 🎉 **Final Status**

### **✅ IMPLEMENTATION COMPLETE**

The enhanced `useSessionManagement` hook has been successfully implemented with:

- **Streamlined State Management** with clean, focused state structure
- **Comprehensive Validation Integration** using the validation functions
- **Enhanced Error Handling** with structured error management
- **Proper Authentication Handling** with user context
- **Navigation Management** with error handling
- **Type Safety** with proper TypeScript interfaces
- **Production-Ready** implementation

**Status: ✅ COMPLETE** 🎉

The enhanced hook is now ready for production use and provides robust session management with comprehensive error handling, proper authentication, and streamlined state management.
