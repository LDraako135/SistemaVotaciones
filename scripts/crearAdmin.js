import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import 'dotenv/config';

// Initialize Supabase client with the project URL and secret key from environment variables or fallback key
const supabaseUrl = 'https://vatnummomqccownwenzi.supabase.co';
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdnVubW1vbXFjY293bndlbnppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODExOTUsImV4cCI6MjA2NDA1NzE5NX0.6UK08hYY4zYT7Quy1si-dLgjK3iv6f0OYjSYWLjUO-4';

const supabase = createClient(supabaseUrl, supabaseSecretKey);

// Function to hash passwords using SHA-256 algorithm
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Async function to create an admin user in the 'users' table
async function crearUsuarioAdmin() {
  // Define the admin user credentials
  const username = 'admin5';
  const identification = '12345678';
  const passwordPlano = '1234';
  const role = 'ADMIN';

  try {
    // Check if a user with the same username already exists in the database
    const { data: existe, error: errorBusqueda } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    // If there is an error different from "no rows found", log it and exit
    if (errorBusqueda && errorBusqueda.code !== 'PGRST116') {
      console.error('❌ Error buscando usuario existente:', errorBusqueda.message);
      return;
    }

    // If the user already exists, log a warning and exit the function
    if (existe) {
      console.log('⚠️ Ya existe un usuario con ese nombre de usuario.');
      return;
    }
  } catch (error) {
    // If no user is found, supabase throws an error which is ignored here (no action needed)
  }

  // Hash the plain text password before saving
  const passwordHash = hashPassword(passwordPlano);

  // Insert the new admin user into the 'users' table
  const { error } = await supabase.from('users').insert([
    {
      identification,
      username,
      password_hash: passwordHash,
      role,
    },
  ]);

  // Handle errors during insertion or confirm success
  if (error) {
    console.error('❌ Error creando el usuario:', error.message);
  } else {
    console.log('✅ Usuario ADMIN creado exitosamente.');
  }
}

// Execute the function to create the admin user
crearUsuarioAdmin();
