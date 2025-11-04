import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required Supabase environment variables');
    console.error('     - SUPABASE_URL');
    console.error('     - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nPlease check your .env file and ensure all required variables are set.');
    process.exit(1);
}

// Create Supabase client
export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        }
    }
);

// Test database connection
async function testConnection() {
    try {
        const { data, error } = await supabase.from('agents').select('count').limit(1);
        if (error) throw error;
        console.log('Database connection successful!');
    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1);
    }
}

// Run connection test
testConnection();