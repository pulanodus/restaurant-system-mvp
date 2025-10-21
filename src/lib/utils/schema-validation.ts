// lib/utils/schema-validation.ts

import { supabase } from '@/lib/supabase'
import { logDetailedError } from '@/lib/error-handling'

// Types for schema validation
export interface ColumnDefinition {
  name: string
  type: string
  nullable: boolean
  defaultValue?: string | null
  isPrimaryKey?: boolean
  isForeignKey?: boolean
  references?: {
    table: string
    column: string
  }
}

export interface TableDefinition {
  name: string
  columns: ColumnDefinition[]
  indexes?: string[]
  constraints?: string[]
}

export interface SchemaValidationResult {
  isValid: boolean
  errors: SchemaError[]
  warnings: SchemaWarning[]
  summary: {
    totalTables: number
    validTables: number
    totalColumns: number
    validColumns: number
  }
}

export interface SchemaError {
  type: 'MISSING_TABLE' | 'MISSING_COLUMN' | 'TYPE_MISMATCH' | 'CONSTRAINT_MISSING' | 'INDEX_MISSING'
  severity: 'error' | 'warning'
  table?: string
  column?: string
  message: string
  expected?: string
  actual?: string
  suggestion?: string
}

export interface SchemaWarning {
  type: 'EXTRA_COLUMN' | 'EXTRA_TABLE' | 'TYPE_DIFFERENCE'
  table?: string
  column?: string
  message: string
  suggestion?: string
}

// Expected schema definition based on your application requirements
const EXPECTED_SCHEMA: TableDefinition[] = [
  {
    name: 'tables',
    columns: [
      {
        name: 'id',
        type: 'uuid',
        nullable: false,
        isPrimaryKey: true
      },
      {
        name: 'table_number',
        type: 'text',
        nullable: false
      },
      {
        name: 'restaurant_id',
        type: 'uuid',
        nullable: false,
        isForeignKey: true,
        references: {
          table: 'restaurants',
          column: 'id'
        }
      },
      {
        name: 'qr_code_url',
        type: 'text',
        nullable: true
      },
      {
        name: 'occupied',
        type: 'boolean',
        nullable: false,
        defaultValue: 'false'
      },
      {
        name: 'is_active',
        type: 'boolean',
        nullable: false,
        defaultValue: 'true'
      },
      {
        name: 'current_pin',
        type: 'text',
        nullable: true
      },
      {
        name: 'current_session_id',
        type: 'uuid',
        nullable: true,
        isForeignKey: true,
        references: {
          table: 'sessions',
          column: 'id'
        }
      },
      {
        name: 'created_at',
        type: 'timestamptz',
        nullable: false,
        defaultValue: 'now()'
      },
      {
        name: 'updated_at',
        type: 'timestamptz',
        nullable: false,
        defaultValue: 'now()'
      }
    ],
    indexes: ['idx_tables_table_number', 'idx_tables_restaurant_id', 'idx_tables_occupied'],
    constraints: ['tables_pkey']
  },
  {
    name: 'sessions',
    columns: [
      {
        name: 'id',
        type: 'uuid',
        nullable: false,
        isPrimaryKey: true
      },
      {
        name: 'table_id',
        type: 'uuid',
        nullable: false,
        isForeignKey: true,
        references: {
          table: 'tables',
          column: 'id'
        }
      },
      {
        name: 'started_by_name',
        type: 'text',
        nullable: false
      },
      {
        name: 'status',
        type: 'text',
        nullable: false,
        defaultValue: "'active'"
      },
      {
        name: 'started_at',
        type: 'timestamptz',
        nullable: false,
        defaultValue: 'now()'
      },
      {
        name: 'ended_at',
        type: 'timestamptz',
        nullable: true
      },
      {
        name: 'created_by',
        type: 'uuid',
        nullable: true,
        isForeignKey: true,
        references: {
          table: 'auth.users',
          column: 'id'
        }
      },
      {
        name: 'created_at',
        type: 'timestamptz',
        nullable: false,
        defaultValue: 'now()'
      },
      {
        name: 'updated_at',
        type: 'timestamptz',
        nullable: false,
        defaultValue: 'now()'
      }
    ],
    indexes: ['idx_sessions_table_id', 'idx_sessions_status', 'idx_sessions_created_by'],
    constraints: ['sessions_pkey', 'fk_sessions_table_id', 'fk_sessions_created_by']
  },
  {
    name: 'menu_items',
    columns: [
      {
        name: 'id',
        type: 'uuid',
        nullable: false,
        isPrimaryKey: true
      },
      {
        name: 'name',
        type: 'text',
        nullable: false
      },
      {
        name: 'description',
        type: 'text',
        nullable: true
      },
      {
        name: 'price',
        type: 'numeric',
        nullable: false
      },
      {
        name: 'category',
        type: 'text',
        nullable: true
      },
      {
        name: 'is_available',
        type: 'boolean',
        nullable: false,
        defaultValue: 'true'
      },
      {
        name: 'created_at',
        type: 'timestamptz',
        nullable: false,
        defaultValue: 'now()'
      },
      {
        name: 'updated_at',
        type: 'timestamptz',
        nullable: false,
        defaultValue: 'now()'
      }
    ],
    indexes: ['idx_menu_items_category', 'idx_menu_items_is_available'],
    constraints: ['menu_items_pkey']
  },
  {
    name: 'orders',
    columns: [
      {
        name: 'id',
        type: 'uuid',
        nullable: false,
        isPrimaryKey: true
      },
      {
        name: 'session_id',
        type: 'uuid',
        nullable: false,
        isForeignKey: true,
        references: {
          table: 'sessions',
          column: 'id'
        }
      },
      {
        name: 'menu_item_id',
        type: 'uuid',
        nullable: false,
        isForeignKey: true,
        references: {
          table: 'menu_items',
          column: 'id'
        }
      },
      {
        name: 'quantity',
        type: 'integer',
        nullable: false,
        defaultValue: '1'
      },
      {
        name: 'status',
        type: 'text',
        nullable: false,
        defaultValue: "'pending'"
      },
      {
        name: 'created_at',
        type: 'timestamptz',
        nullable: false,
        defaultValue: 'now()'
      },
      {
        name: 'updated_at',
        type: 'timestamptz',
        nullable: false,
        defaultValue: 'now()'
      }
    ],
    indexes: ['idx_orders_session_id', 'idx_orders_menu_item_id', 'idx_orders_status'],
    constraints: ['orders_pkey', 'fk_orders_session_id', 'fk_orders_menu_item_id']
  }
]

// Helper function to get actual table information from Supabase
async function getActualTableInfo(tableName: string): Promise<{
  exists: boolean
  columns?: any[]
  indexes?: any[]
  constraints?: any[]
  error?: string
}> {
  try {
    // Check if table exists by trying to query it
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('does not exist')) {
        return { exists: false }
      }
      return { exists: false, error: error.message }
    }

    // Get column information using information_schema
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: tableName })

    if (columnsError) {
      console.warn(`Could not get column info for ${tableName}:`, columnsError.message)
    }

    // Get index information
    const { data: indexes, error: indexesError } = await supabase
      .rpc('get_table_indexes', { table_name: tableName })

    if (indexesError) {
      console.warn(`Could not get index info for ${tableName}:`, indexesError.message)
    }

    // Get constraint information
    const { data: constraints, error: constraintsError } = await supabase
      .rpc('get_table_constraints', { table_name: tableName })

    if (constraintsError) {
      console.warn(`Could not get constraint info for ${tableName}:`, constraintsError.message)
    }

    return {
      exists: true,
      columns: columns || [],
      indexes: indexes || [],
      constraints: constraints || []
    }
  } catch (error) {
    logDetailedError(`Error getting table info for ${tableName}`, error)
    return { exists: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Helper function to normalize column types for comparison
function normalizeColumnType(type: string): string {
  const normalized = type.toLowerCase()
    .replace(/\(\d+\)/g, '') // Remove precision/scale
    .replace(/\[\]/g, '') // Remove array notation
    .trim()

  // Map common PostgreSQL types to expected types
  const typeMap: Record<string, string> = {
    'character varying': 'text',
    'varchar': 'text',
    'character': 'text',
    'char': 'text',
    'timestamp with time zone': 'timestamptz',
    'timestamp without time zone': 'timestamp',
    'double precision': 'numeric',
    'real': 'numeric',
    'serial': 'integer',
    'bigserial': 'bigint',
    'smallserial': 'smallint'
  }

  return typeMap[normalized] || normalized
}

// Main schema validation function
export async function validateSchema(): Promise<SchemaValidationResult> {
  // Debug logging removed for production security
  
  const errors: SchemaError[] = []
  const warnings: SchemaWarning[] = []
  let totalTables = 0
  let validTables = 0
  let totalColumns = 0
  let validColumns = 0

  for (const expectedTable of EXPECTED_SCHEMA) {
    totalTables++
    // Debug logging removed for production security
    
    const actualTable = await getActualTableInfo(expectedTable.name)
    
    if (!actualTable.exists) {
      errors.push({
        type: 'MISSING_TABLE',
        severity: 'error',
        table: expectedTable.name,
        message: `Table '${expectedTable.name}' does not exist in the database`,
        suggestion: `Create the table with the required columns: ${expectedTable.columns.map(c => c.name).join(', ')}`
      })
      continue
    }

    validTables++
    // Debug logging removed for production security

    // Validate columns
    const actualColumns = actualTable.columns || []
    const actualColumnMap = new Map(actualColumns.map((col: any) => [col.column_name, col]))

    for (const expectedColumn of expectedTable.columns) {
      totalColumns++
      const actualColumn = actualColumnMap.get(expectedColumn.name)

      if (!actualColumn) {
        errors.push({
          type: 'MISSING_COLUMN',
          severity: 'error',
          table: expectedTable.name,
          column: expectedColumn.name,
          message: `Column '${expectedColumn.name}' is missing from table '${expectedTable.name}'`,
          expected: expectedColumn.type,
          suggestion: `Add column: ALTER TABLE ${expectedTable.name} ADD COLUMN ${expectedColumn.name} ${expectedColumn.type}${expectedColumn.nullable ? '' : ' NOT NULL'}${expectedColumn.defaultValue ? ` DEFAULT ${expectedColumn.defaultValue}` : ''}`
        })
        continue
      }

      // Check column type
      const expectedType = normalizeColumnType(expectedColumn.type)
      const actualType = normalizeColumnType(actualColumn.data_type)

      if (expectedType !== actualType) {
        errors.push({
          type: 'TYPE_MISMATCH',
          severity: 'error',
          table: expectedTable.name,
          column: expectedColumn.name,
          message: `Column '${expectedColumn.name}' has incorrect type in table '${expectedTable.name}'`,
          expected: expectedType,
          actual: actualType,
          suggestion: `Alter column type: ALTER TABLE ${expectedTable.name} ALTER COLUMN ${expectedColumn.name} TYPE ${expectedColumn.type}`
        })
        continue
      }

      // Check nullable constraint
      if (expectedColumn.nullable !== actualColumn.is_nullable) {
        errors.push({
          type: 'CONSTRAINT_MISSING',
          severity: 'warning',
          table: expectedTable.name,
          column: expectedColumn.name,
          message: `Column '${expectedColumn.name}' nullable constraint mismatch in table '${expectedTable.name}'`,
          expected: expectedColumn.nullable ? 'nullable' : 'not null',
          actual: actualColumn.is_nullable ? 'nullable' : 'not null',
          suggestion: `Fix nullable constraint: ALTER TABLE ${expectedTable.name} ALTER COLUMN ${expectedColumn.name} ${expectedColumn.nullable ? 'DROP NOT NULL' : 'SET NOT NULL'}`
        })
      }

      validColumns++
      // Debug logging removed for production security
    }

    // Check for extra columns
    for (const actualColumn of actualColumns) {
      const expectedColumn = expectedTable.columns.find(col => col.name === actualColumn.column_name)
      if (!expectedColumn) {
        warnings.push({
          type: 'EXTRA_COLUMN',
          table: expectedTable.name,
          column: actualColumn.column_name,
          message: `Extra column '${actualColumn.column_name}' found in table '${expectedTable.name}'`,
          suggestion: `Consider if this column is needed or remove it: ALTER TABLE ${expectedTable.name} DROP COLUMN ${actualColumn.column_name}`
        })
      }
    }

    // Validate indexes (if available)
    if (expectedTable.indexes && actualTable.indexes) {
      const actualIndexNames = actualTable.indexes.map((idx: any) => idx.indexname)
      for (const expectedIndex of expectedTable.indexes) {
        if (!actualIndexNames.includes(expectedIndex)) {
          errors.push({
            type: 'INDEX_MISSING',
            severity: 'warning',
            table: expectedTable.name,
            message: `Index '${expectedIndex}' is missing from table '${expectedTable.name}'`,
            suggestion: `Create index: CREATE INDEX ${expectedIndex} ON ${expectedTable.name} (column_name)`
          })
        }
      }
    }

    // Validate constraints (if available)
    if (expectedTable.constraints && actualTable.constraints) {
      const actualConstraintNames = actualTable.constraints.map((con: any) => con.constraint_name)
      for (const expectedConstraint of expectedTable.constraints) {
        if (!actualConstraintNames.includes(expectedConstraint)) {
          errors.push({
            type: 'CONSTRAINT_MISSING',
            severity: 'warning',
            table: expectedTable.name,
            message: `Constraint '${expectedConstraint}' is missing from table '${expectedTable.name}'`,
            suggestion: `Add constraint based on the expected schema definition`
          })
        }
      }
    }
  }

  const isValid = errors.filter(e => e.severity === 'error').length === 0

  const result: SchemaValidationResult = {
    isValid,
    errors,
    warnings,
    summary: {
      totalTables,
      validTables,
      totalColumns,
      validColumns
    }
  }

  // Debug logging removed for production security

  return result
}

// Helper function to print detailed validation results
export function printValidationResults(result: SchemaValidationResult): void {
  // Debug logging removed for production security

  // Summary
  // Debug logging removed for production security

  // Errors
  if (result.errors.length > 0) {
    // Debug logging removed for production security
    result.errors.forEach((error, index) => {
      // Debug logging removed for production security
      if (error.expected && error.actual) {
        // Debug logging removed for production security
      }
      if (error.suggestion) {
        // Debug logging removed for production security
      }
    })
  }

  // Warnings
  if (result.warnings.length > 0) {
    // Debug logging removed for production security
    result.warnings.forEach((warning, index) => {
      // Debug logging removed for production security
      if (warning.suggestion) {
        // Debug logging removed for production security
      }
    })
  }

  // Debug logging removed for production security
}

// CLI function for running validation from command line
export async function runSchemaValidation(): Promise<void> {
  try {
    // Debug logging removed for production security

    const result = await validateSchema()
    printValidationResults(result)

    if (!result.isValid) {
      // Debug logging removed for production security
      process.exit(1)
    } else {
      // Debug logging removed for production security
      process.exit(0)
    }
  } catch (error) {
    logDetailedError('Schema validation failed', error)
    // Debug logging removed for production security
    process.exit(1)
  }
}

// Export for use in other modules
export { EXPECTED_SCHEMA }
