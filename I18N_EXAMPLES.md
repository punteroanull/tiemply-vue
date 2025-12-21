# Ejemplos Prácticos de Internacionalización

Este documento proporciona ejemplos prácticos de cómo usar el sistema de internacionalización en diferentes escenarios.

## Ejemplos de Peticiones HTTP

### 1. Login con Idioma Español

```bash
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: es" \
  -d '{
    "email": "admin@example.com",
    "password": "wrong-password"
  }'
```

**Respuesta en Español:**
```json
{
  "success": false,
  "message": "Error de validación.",
  "errors": {
    "email": ["Las credenciales proporcionadas son incorrectas."]
  }
}
```

### 2. Login con Idioma Inglés

```bash
curl -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Accept-Language: en" \
  -d '{
    "email": "admin@example.com",
    "password": "wrong-password"
  }'
```

**Respuesta en Inglés:**
```json
{
  "success": false,
  "message": "Validation error.",
  "errors": {
    "email": ["The provided credentials are incorrect."]
  }
}
```

### 3. Registro con Parámetro de Locale

```bash
curl -X POST http://localhost/api/auth/register?locale=es \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Juan Pérez",
    "email": "juan@example.com",
    "password": "password123",
    "password_confirmation": "password123"
  }'
```

**Respuesta en Español:**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente.",
  "data": {
    "user": {
      "id": 1,
      "name": "Juan Pérez",
      "email": "juan@example.com",
      "created_at": "2025-12-20T10:00:00.000000Z",
      "updated_at": "2025-12-20T10:00:00.000000Z"
    }
  }
}
```

### 4. Errores de Validación en Español

```bash
curl -X POST http://localhost/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Accept-Language: es" \
  -d '{
    "name": "",
    "email": "invalid-email",
    "password": "123"
  }'
```

**Respuesta:**
```json
{
  "success": false,
  "message": "Error de validación.",
  "errors": {
    "name": ["El campo nombre es obligatorio."],
    "email": ["El campo correo electrónico debe ser una dirección de correo válida."],
    "password": ["El campo contraseña debe tener al menos 8 caracteres."],
    "password_confirmation": ["El campo confirmación de contraseña es obligatorio."]
  }
}
```

### 5. Crear Tipo de Ausencia (Español)

```bash
curl -X POST http://localhost/api/absence-types \
  -H "Content-Type: application/json" \
  -H "Accept-Language: es" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "name": "Vacaciones",
    "code": "VAC",
    "description": "Vacaciones anuales"
  }'
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Tipo de ausencia creado exitosamente.",
  "data": {
    "id": 1,
    "name": "Vacaciones",
    "code": "VAC",
    "description": "Vacaciones anuales",
    "created_at": "2025-12-20T10:00:00.000000Z",
    "updated_at": "2025-12-20T10:00:00.000000Z"
  }
}
```

### 6. Error al Eliminar Tipo de Ausencia (Español)

```bash
curl -X DELETE http://localhost/api/absence-types/1 \
  -H "Accept-Language: es" \
  -H "Authorization: Bearer {token}"
```

**Respuesta (si está en uso):**
```json
{
  "success": false,
  "message": "No se puede eliminar el tipo de ausencia porque tiene ausencias o solicitudes asociadas."
}
```

### 7. Header Accept-Language Complejo

```bash
curl -X GET http://localhost/api/auth/me \
  -H "Accept-Language: es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7" \
  -H "Authorization: Bearer {token}"
```

El middleware detectará automáticamente "es" como el idioma preferido.

## Ejemplos en Código PHP

### Ejemplo 1: Controlador Básico

```php
<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    use ApiResponse;

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:companies',
        ]);

        $company = Company::create($validated);

        // Retorna mensaje traducido automáticamente
        return $this->createdResponse($company, 'company');
    }

    public function destroy(Company $company)
    {
        if ($company->employees()->exists()) {
            // Mensaje de error traducido
            return $this->errorResponse(
                __('messages.company.has_employees'),
                409
            );
        }

        $company->delete();

        // Mensaje de éxito traducido
        return $this->deletedResponse('company');
    }
}
```

### Ejemplo 2: Mensajes Personalizados

```php
public function processRequest(Request $request)
{
    $validated = $request->validate([
        'status' => 'required|in:approved,rejected',
    ]);

    if ($validated['status'] === 'approved') {
        // Mensaje personalizado con parámetros
        return $this->successResponse(
            $data,
            __('messages.absence_request.approved')
        );
    }

    return $this->successResponse(
        $data,
        __('messages.absence_request.rejected')
    );
}
```

### Ejemplo 3: Respuestas de Error con Detalles

```php
public function update(Request $request, WorkLog $workLog)
{
    // Validación con mensajes traducidos automáticamente
    $validated = $request->validate([
        'start_time' => 'required|date',
        'end_time' => 'required|date|after:start_time',
    ]);

    // Verificar solapamiento
    if ($this->hasOverlap($workLog, $validated)) {
        return $this->errorResponse(
            __('messages.work_log.overlapping'),
            422
        );
    }

    $workLog->update($validated);

    return $this->updatedResponse($workLog, 'work_log');
}
```

### Ejemplo 4: Manejo de Excepciones

```php
use Illuminate\Database\Eloquent\ModelNotFoundException;

public function show($id)
{
    try {
        $user = User::findOrFail($id);
        return $this->successResponse($user);
    } catch (ModelNotFoundException $e) {
        return $this->notFoundResponse('user');
    }
}
```

## Ejemplos de Traducciones Personalizadas

### Añadir Nuevos Mensajes

**lang/es/messages.php:**
```php
return [
    // ... mensajes existentes

    'custom_module' => [
        'action_completed' => 'La acción se completó correctamente.',
        'item_already_exists' => 'El elemento :name ya existe.',
        'limit_reached' => 'Has alcanzado el límite de :limit elementos.',
    ],
];
```

**lang/en/messages.php:**
```php
return [
    // ... existing messages

    'custom_module' => [
        'action_completed' => 'Action completed successfully.',
        'item_already_exists' => 'The item :name already exists.',
        'limit_reached' => 'You have reached the limit of :limit items.',
    ],
];
```

**Uso:**
```php
// Mensaje simple
__('messages.custom_module.action_completed')

// Mensaje con parámetros
__('messages.custom_module.item_already_exists', ['name' => 'Documento'])

// Mensaje con múltiples parámetros
__('messages.custom_module.limit_reached', ['limit' => 10])
```

## Pruebas con PHPUnit

### Ejemplo de Test con Locales

```php
<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;

class AuthControllerTest extends TestCase
{
    public function test_login_error_message_in_spanish()
    {
        $response = $this->withHeaders([
            'Accept-Language' => 'es',
        ])->postJson('/api/auth/login', [
            'email' => 'wrong@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'errors' => [
                    'email' => ['Las credenciales proporcionadas son incorrectas.']
                ]
            ]);
    }

    public function test_login_error_message_in_english()
    {
        $response = $this->withHeaders([
            'Accept-Language' => 'en',
        ])->postJson('/api/auth/login', [
            'email' => 'wrong@example.com',
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'errors' => [
                    'email' => ['The provided credentials are incorrect.']
                ]
            ]);
    }

    public function test_registration_success_in_spanish()
    {
        $response = $this->withHeaders([
            'Accept-Language' => 'es',
        ])->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'message' => 'Usuario registrado exitosamente.',
            ]);
    }
}
```

## JavaScript/Frontend Examples

### Axios con Accept-Language

```javascript
import axios from 'axios';

// Configurar locale globalmente
axios.defaults.headers.common['Accept-Language'] = 'es';

// O por petición
axios.post('/api/auth/login', {
  email: 'user@example.com',
  password: 'password'
}, {
  headers: {
    'Accept-Language': 'es'
  }
})
.then(response => {
  console.log(response.data.message); // Mensaje en español
})
.catch(error => {
  console.log(error.response.data.message); // Error en español
});
```

### Fetch API con Accept-Language

```javascript
// Obtener idioma del navegador
const userLanguage = navigator.language.split('-')[0]; // 'es' o 'en'

fetch('/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept-Language': userLanguage,
  },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password'
  })
})
.then(response => response.json())
.then(data => {
  console.log(data.message); // Mensaje en idioma del usuario
});
```

### React Hook Personalizado

```javascript
import { useState, useEffect } from 'react';
import axios from 'axios';

function useLocale() {
  const [locale, setLocale] = useState('en');

  useEffect(() => {
    // Establecer locale en axios
    axios.defaults.headers.common['Accept-Language'] = locale;
  }, [locale]);

  return [locale, setLocale];
}

// Uso
function App() {
  const [locale, setLocale] = useLocale();

  const handleChangeLanguage = (newLocale) => {
    setLocale(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  return (
    <div>
      <button onClick={() => handleChangeLanguage('es')}>Español</button>
      <button onClick={() => handleChangeLanguage('en')}>English</button>
    </div>
  );
}
```

## Mejores Prácticas

1. **Siempre envía el header Accept-Language** desde el frontend
2. **Maneja el locale en el estado global** de tu aplicación
3. **Almacena la preferencia del usuario** en localStorage o en el backend
4. **Usa el trait ApiResponse** en todos los controladores
5. **Mantén consistencia** en los nombres de recursos entre idiomas
6. **Agrega tests** para verificar las traducciones
7. **Documenta** los nuevos mensajes de traducción

## Recursos Adicionales

- Documentación completa: `INTERNATIONALIZATION.md`
- Archivos de traducción: `lang/es/` y `lang/en/`
- Middleware: `app/Http/Middleware/SetLocale.php`
- Trait: `app/Traits/ApiResponse.php`
