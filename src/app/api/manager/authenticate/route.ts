import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { handleError, logDetailedError } from '@/lib/error-handling';
import { hashPassword, verifyPassword, validatePassword } from '@/lib/auth/password-utils';

export const POST = async (request: NextRequest) => {
  try {
    const { username, password } = await request.json();

    // Validate input
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Validate password format (basic checks only)
    if (password.length < 1 || password.length > 128) {
      return NextResponse.json(
        { error: 'Invalid password format' },
        { status: 400 }
      );
    }

    try {
      // First, get the manager's stored password hash from the database
      
      const { data: manager, error: managerError } = await supabaseServer
        .from('managers')
        .select('id, username, password_hash, email, full_name, role, restaurant_id, is_active, failed_login_attempts, locked_until')
        .eq('username', username.toLowerCase().trim())
        .eq('is_active', true)
        .single();

      if (managerError) {
        return NextResponse.json(
          {
            error: 'Authentication service unavailable',
            timestamp: new Date().toISOString()
          },
          { status: 500 }
        );
      }

      if (!manager) {
        return NextResponse.json(
          {
            error: 'Invalid credentials',
            timestamp: new Date().toISOString()
          },
          { status: 401 }
        );
      }

      // Check if account is locked
      if (manager.locked_until && new Date(manager.locked_until) > new Date()) {
        return NextResponse.json(
          {
            error: 'Account is temporarily locked due to failed login attempts',
            timestamp: new Date().toISOString()
          },
          { status: 401 }
        );
      }

      // Verify password using bcrypt comparison
      const isPasswordValid = await verifyPassword(password, manager.password_hash);

      if (isPasswordValid) {
        // Password is correct - update login info
        const { error: updateError } = await supabaseServer
          .from('managers')
          .update({
            last_login_at: new Date().toISOString(),
            failed_login_attempts: 0,
            locked_until: null
          })
          .eq('id', manager.id);

        if (updateError) {
        }

        // Return success with sanitized manager data
        return NextResponse.json({
          success: true,
          message: 'Manager authenticated successfully',
          manager: {
            id: manager.id,
            username: manager.username,
            email: manager.email,
            fullName: manager.full_name,
            role: manager.role,
            restaurantId: manager.restaurant_id
          },
          timestamp: new Date().toISOString()
        });

      } else {
        // Password is incorrect - increment failed attempts
        const newFailedAttempts = (manager.failed_login_attempts || 0) + 1;
        const shouldLock = newFailedAttempts >= 5;

        const { error: updateError } = await supabaseServer
          .from('managers')
          .update({
            failed_login_attempts: newFailedAttempts,
            locked_until: shouldLock
              ? new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes lock
              : null
          })
          .eq('id', manager.id);

        if (updateError) {
        }

        return NextResponse.json(
          {
            error: shouldLock
              ? 'Too many failed attempts. Account locked for 15 minutes.'
              : 'Invalid credentials',
            timestamp: new Date().toISOString()
          },
          { status: 401 }
        );
      }


    } catch (hashError) {
      logDetailedError('Manager authentication hashing error', hashError);
      return NextResponse.json(
        { error: 'Authentication processing failed' },
        { status: 500 }
      );
    }

  } catch (error) {
    logDetailedError('Manager authentication exception', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
};
