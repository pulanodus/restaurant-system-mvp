// types/database.ts
// Centralized database type definitions for the application

// ============================================================================
// TABLE INTERFACES
// ============================================================================

/**
 * Main Table interface matching the current Supabase schema
 */
export interface Table {
  id: string // uuid
  table_number: string // text
  restaurant_id: string // uuid
  qr_code_url: string | null // text | null
  occupied: boolean // boolean
  is_active: boolean // boolean
  current_pin: string | null // text | null
  current_session_id?: string | null // uuid (for backward compatibility)
  owner_id?: string | null // uuid (for backward compatibility)
  created_at?: string // timestamptz
  updated_at?: string // timestamptz
}

/**
 * Session interface
 */
export interface Session {
  id: string // uuid
  table_id: string // uuid
  started_by_name: string // text
  status: 'active' | 'inactive' | 'completed' | 'cancelled' // text
  started_at: string // timestamptz
  ended_at?: string | null // timestamptz
  created_by?: string | null // uuid
  created_at?: string // timestamptz
  updated_at?: string // timestamptz
}

/**
 * Menu Item interface
 */
export interface MenuItem {
  id: string // uuid
  name: string // text
  description?: string | null // text
  price: number // numeric
  category?: string | null // text
  is_available: boolean // boolean
  created_at?: string // timestamptz
  updated_at?: string // timestamptz
}

/**
 * Order interface
 */
export interface Order {
  id: string // uuid
  session_id: string // uuid
  menu_item_id: string // uuid
  quantity: number // integer
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'cancelled' // text
  created_at?: string // timestamptz
  updated_at?: string // timestamptz
}

// ============================================================================
// USER INTERFACES
// ============================================================================

/**
 * User information interface
 */
export interface User {
  id: string // uuid
  email?: string // text
  role?: string // text
  created_at?: string // timestamptz
  updated_at?: string // timestamptz
}

// ============================================================================
// VALIDATION INTERFACES
// ============================================================================

/**
 * Table validation result
 */
export interface TableValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  tableInfo?: Table | undefined
  userInfo?: User | undefined
}

/**
 * Session validation options
 */
export interface SessionValidationOptions {
  checkTableExists?: boolean
  checkTableActive?: boolean
  checkTableAvailable?: boolean
  checkUserAuth?: boolean
  checkUserPermissions?: boolean
  checkTablePermissions?: boolean
  checkSessionData?: boolean
  checkExistingSessions?: boolean
  allowPublicTables?: boolean
  requireTableOwnership?: boolean
}

// ============================================================================
// API RESPONSE INTERFACES
// ============================================================================

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T = any> {
  data?: T
  error?: string
  success?: boolean
}

/**
 * Table API response
 */
export interface TableApiResponse extends ApiResponse<Table> {}

/**
 * Tables list API response
 */
export interface TablesApiResponse extends ApiResponse<Table[]> {}

/**
 * Session API response
 */
export interface SessionApiResponse extends ApiResponse<Session> {}

/**
 * Sessions list API response
 */
export interface SessionsApiResponse extends ApiResponse<Session[]> {}

// ============================================================================
// COMPONENT PROP INTERFACES
// ============================================================================

/**
 * Table options component props
 */
export interface TableOptionsProps {
  tableId: string
  sessionId?: string
  isNew?: boolean
  tableNumber?: string
  startedByName?: string
}

/**
 * Table display component props
 */
export interface TableDisplayProps {
  table: Table
  onTableSelect?: (table: Table) => void
  showStatus?: boolean
  showQRCode?: boolean
}

// ============================================================================
// DATABASE QUERY INTERFACES
// ============================================================================

/**
 * Table query options
 */
export interface TableQueryOptions {
  includeInactive?: boolean
  includeOccupied?: boolean
  restaurantId?: string
  orderBy?: 'table_number' | 'created_at' | 'updated_at'
  orderDirection?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

/**
 * Session query options
 */
export interface SessionQueryOptions {
  tableId?: string
  status?: Session['status']
  createdBy?: string
  dateFrom?: string
  dateTo?: string
  orderBy?: 'started_at' | 'created_at' | 'updated_at'
  orderDirection?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Partial table for updates
 */
export type TableUpdate = Partial<Pick<Table, 'table_number' | 'restaurant_id' | 'qr_code_url' | 'occupied' | 'is_active' | 'current_pin'>>

/**
 * Partial session for updates
 */
export type SessionUpdate = Partial<Pick<Session, 'status' | 'ended_at' | 'started_by_name'>>

/**
 * Table creation data
 */
export type TableCreate = Pick<Table, 'table_number' | 'restaurant_id'> & Partial<Pick<Table, 'qr_code_url' | 'occupied' | 'is_active' | 'current_pin'>>

/**
 * Session creation data
 */
export type SessionCreate = Pick<Session, 'table_id' | 'started_by_name'> & Partial<Pick<Session, 'status' | 'created_by'>>

// ============================================================================
// LEGACY INTERFACES (for backward compatibility during migration)
// ============================================================================

/**
 * @deprecated Use Table interface instead
 * Legacy table info interface for backward compatibility
 */
export interface TableInfo extends Table {}

/**
 * @deprecated Use Table interface instead
 * Legacy server table info interface for backward compatibility
 */
export interface ServerTableInfo extends Table {}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if an object is a valid Table
 */
export function isTable(obj: any): obj is Table {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.table_number === 'string' &&
    typeof obj.restaurant_id === 'string' &&
    (obj.qr_code_url === null || typeof obj.qr_code_url === 'string') &&
    typeof obj.occupied === 'boolean' &&
    typeof obj.is_active === 'boolean' &&
    (obj.current_pin === null || typeof obj.current_pin === 'string')
  )
}

/**
 * Type guard to check if an object is a valid Session
 */
export function isSession(obj: any): obj is Session {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.table_id === 'string' &&
    typeof obj.started_by_name === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.started_at === 'string'
  )
}

/**
 * Type guard to check if an object is a valid User
 */
export function isUser(obj: any): obj is User {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string'
  )
}
