import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import 'dotenv/config';

const supabaseUrl = 'https://vatnummomqccownwenzi.supabase.co';
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhdG51bW1vbXFjY293bndlbnppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0ODExOTUsImV4cCI6MjA2NDA1NzE5NX0.6UK08hYY4zYT7Quy1si-dLgjK3iv6f0OYjSYWLjUO-4';

const supabase = createClient(supabaseUrl, supabaseSecretKey);

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function crearUsuarioAdmin() {
  const username = 'admin5';
  const identification = '12345678';
  const passwordPlano = '1234';
  const role = 'ADMIN';

  try {
    const { data: existe, error: errorBusqueda } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .single();

    if (errorBusqueda && errorBusqueda.code !== 'PGRST116') {
      console.error('❌ Error buscando usuario existente:', errorBusqueda.message);
      return;
    }

    if (existe) {
      console.log('⚠️ Ya existe un usuario con ese nombre de usuario.');
      return;
    }
  } catch (error) {
    // Si no existe usuario, supabase lanza error, se ignora
  }

  const passwordHash = hashPassword(passwordPlano);

  const { error } = await supabase.from('users').insert([
    {
      identification,
      username,
      password_hash: passwordHash,
      role,
    },
  ]);

  if (error) {
    console.error('❌ Error creando el usuario:', error.message);
  } else {
    console.log('✅ Usuario ADMIN creado exitosamente.');
  }
}

crearUsuarioAdmin();
