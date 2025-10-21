#!/bin/bash
# Apply RLS policies to Supabase database

# Source environment variables
source .env.local

# Apply the migration
npx supabase db push