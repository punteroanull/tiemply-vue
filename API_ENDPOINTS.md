# Tiemply API - Documentación de Endpoints

## Información General

### Base URL
```
http://localhost:8000/api
```

### Headers Requeridos

#### Para endpoints autenticados
```
Authorization: Bearer {token}
Accept: application/json
Content-Type: application/json
Accept-Language: es|en (opcional, por defecto: es)
```

#### Para endpoints públicos
```
Accept: application/json
Content-Type: application/json
```

### Formato Estándar de Respuesta

Todas las respuestas de la API siguen el formato definido en el trait `ApiResponse`:

#### Respuesta Exitosa
```json
{
  "success": true,
  "message": "Mensaje opcional",
  "data": {
    // Datos de la respuesta
  }
}
```

#### Respuesta de Error
```json
{
  "success": false,
  "message": "Mensaje de error",
  "errors": {
    // Detalles de los errores (opcional)
  }
}
```

### Códigos de Estado HTTP

- `200` - OK (éxito en operaciones GET, PUT, DELETE)
- `201` - Created (recurso creado exitosamente)
- `400` - Bad Request
- `401` - Unauthorized (no autenticado)
- `403` - Forbidden (sin permisos)
- `404` - Not Found
- `409` - Conflict (conflicto de recursos)
- `410` - Gone (recurso expirado)
- `422` - Unprocessable Entity (error de validación)
- `500` - Internal Server Error

---

## 1. Autenticación (Auth)

### 1.1 Registro de Usuario

**Endpoint:** `POST /register`
**Autenticación:** No requerida
**Controlador:** `AuthController@register`

#### Request Body
```json
{
  "name": "string (requerido, max:255)",
  "email": "string (requerido, email, unique, max:255)",
  "password": "string (requerido, min:8)",
  "password_confirmation": "string (requerido, debe coincidir con password)",
  "identification_number": "string (opcional, max:20)",
  "birth_date": "date (opcional, formato: YYYY-MM-DD)",
  "phone": "string (opcional, max:20)",
  "address": "string (opcional, max:255)",
  "role_id": "uuid (opcional, exists:roles,id)"
}
```

#### Response (201)
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "data": {
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "identification_number": "string",
      "birth_date": "date",
      "phone": "string",
      "address": "string",
      "role_id": "uuid",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  }
}
```

---

### 1.2 Login

**Endpoint:** `POST /login`
**Autenticación:** No requerida
**Controlador:** `AuthController@login`

#### Request Body
```json
{
  "email": "string (requerido, email)",
  "password": "string (requerido)",
  "device_name": "string (opcional, para identificar el dispositivo)"
}
```

#### Response (200)
```json
{
  "success": true,
  "data": {
    "token": "string (plaintext Sanctum token)",
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "identification_number": "string",
      "birth_date": "date",
      "phone": "string",
      "address": "string",
      "role": {
        "id": "uuid",
        "name": "string",
        "description": "string"
      },
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  }
}
```

#### Response de Error (422)
```json
{
  "success": false,
  "message": "Las credenciales son incorrectas",
  "errors": {
    "email": ["Las credenciales son incorrectas"]
  }
}
```

---

### 1.3 Logout

**Endpoint:** `POST /logout`
**Autenticación:** Requerida
**Controlador:** `AuthController@logout`

#### Response (200)
```json
{
  "success": true,
  "message": "Sesión cerrada exitosamente"
}
```

---

### 1.4 Usuario Autenticado

**Endpoint:** `GET /me`
**Autenticación:** Requerida
**Controlador:** `AuthController@me`

#### Response (200)
```json
{
  "id": "uuid",
  "name": "string",
  "email": "string",
  "identification_number": "string",
  "birth_date": "date",
  "phone": "string",
  "address": "string",
  "role": {
    "id": "uuid",
    "name": "string",
    "description": "string"
  },
  "employeeRecords": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "user_id": "uuid",
      "contract_start_time": "time",
      "contract_end_time": "time",
      "remaining_vacation_days": "integer",
      "active": "boolean",
      "company": {
        "id": "uuid",
        "name": "string",
        "tax_id": "string",
        "contact_email": "string"
      }
    }
  ],
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

## 2. Configuración de Idioma del Usuario (User Locale)

### 2.1 Obtener Idioma del Usuario

**Endpoint:** `GET /user/locale`
**Autenticación:** Requerida
**Controlador:** `UserLocaleController@show`

#### Response (200)
```json
{
  "success": true,
  "data": {
    "locale": "es|en"
  }
}
```

---

### 2.2 Actualizar Idioma del Usuario

**Endpoint:** `PUT /user/locale`
**Autenticación:** Requerida
**Controlador:** `UserLocaleController@update`

#### Request Body
```json
{
  "locale": "string (requerido, valores: es|en)"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Idioma actualizado exitosamente",
  "data": {
    "locale": "es",
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "locale": "es"
    }
  }
}
```

---

## 3. Usuarios (Users)

### 3.1 Listar Usuarios

**Endpoint:** `GET /users`
**Autenticación:** Requerida
**Permisos:** Requiere policy `viewAny`
**Controlador:** `UserController@index`

#### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "identification_number": "string",
      "birth_date": "date",
      "phone": "string",
      "address": "string",
      "role": {
        "id": "uuid",
        "name": "string"
      },
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ]
}
```

---

### 3.2 Crear Usuario

**Endpoint:** `POST /users`
**Autenticación:** Requerida
**Permisos:** Requiere policy `create`
**Controlador:** `UserController@store`

#### Request Body
```json
{
  "name": "string (requerido, max:255)",
  "email": "string (requerido, email, unique, max:255)",
  "password": "string (requerido, min:8)",
  "identification_number": "string (opcional, max:20)",
  "birth_date": "date (opcional)",
  "phone": "string (opcional, max:20)",
  "address": "string (opcional, max:255)",
  "role_id": "uuid (opcional, exists:roles,id)"
}
```

#### Response (201)
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": {
      "id": "uuid",
      "name": "string"
    }
  }
}
```

---

### 3.3 Ver Usuario

**Endpoint:** `GET /users/{user}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view`
**Controlador:** `UserController@show`

#### Response (200)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "identification_number": "string",
    "birth_date": "date",
    "phone": "string",
    "address": "string",
    "role": {
      "id": "uuid",
      "name": "string"
    },
    "created_at": "datetime",
    "updated_at": "datetime"
  }
}
```

---

### 3.4 Actualizar Usuario

**Endpoint:** `PUT /users/{user}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `update`
**Controlador:** `UserController@update`

#### Request Body
```json
{
  "name": "string (opcional, max:255)",
  "email": "string (opcional, email, max:255)",
  "password": "string (opcional, min:8)",
  "identification_number": "string (opcional, max:20)",
  "birth_date": "date (opcional)",
  "phone": "string (opcional, max:20)",
  "address": "string (opcional, max:255)",
  "role_id": "uuid (opcional, exists:roles,id)"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Usuario actualizado exitosamente",
  "data": {
    "id": "uuid",
    "name": "string",
    "email": "string",
    "role": {
      "id": "uuid",
      "name": "string"
    }
  }
}
```

---

### 3.5 Eliminar Usuario

**Endpoint:** `DELETE /users/{user}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `delete`
**Controlador:** `UserController@destroy`

#### Response (200)
```json
{
  "success": true,
  "message": "Usuario eliminado exitosamente"
}
```

#### Response de Error (409)
```json
{
  "success": false,
  "message": "No se puede eliminar un usuario con registros de empleado activos"
}
```

---

## 4. Compañías (Companies)

### 4.1 Listar Compañías

**Endpoint:** `GET /companies`
**Autenticación:** Requerida
**Permisos:** Los administradores ven todas, usuarios normales solo sus compañías
**Controlador:** `CompanyController@index`

#### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "tax_id": "string",
      "contact_email": "string",
      "contact_person": "string",
      "address": "string",
      "phone": "string",
      "vacation_type": "business_days|calendar_days",
      "max_vacation_days": "integer",
      "geolocation_enabled": "boolean",
      "geolocation_required": "boolean",
      "geolocation_radius": "integer",
      "office_latitude": "decimal",
      "office_longitude": "decimal",
      "office_address": "string",
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ]
}
```

---

### 4.2 Crear Compañía

**Endpoint:** `POST /companies`
**Autenticación:** Requerida
**Permisos:** Requiere policy `create`
**Controlador:** `CompanyController@store`

#### Request Body
```json
{
  "name": "string (requerido, max:255)",
  "tax_id": "string (requerido, max:20, unique)",
  "contact_email": "string (requerido, email, max:255)",
  "contact_person": "string (requerido, max:255)",
  "address": "string (requerido, max:255)",
  "phone": "string (requerido, max:20)",
  "vacation_type": "string (requerido, valores: business_days|calendar_days)",
  "max_vacation_days": "integer (requerido, min:1, max:365)"
}
```

#### Response (201)
```json
{
  "success": true,
  "message": "Compañía creada exitosamente",
  "data": {
    "id": "uuid",
    "name": "string",
    "tax_id": "string",
    "contact_email": "string",
    "vacation_type": "business_days",
    "max_vacation_days": 22
  }
}
```

---

### 4.3 Ver Compañía

**Endpoint:** `GET /companies/{company}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view`
**Controlador:** `CompanyController@show`

#### Response (200)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "string",
    "tax_id": "string",
    "contact_email": "string",
    "contact_person": "string",
    "address": "string",
    "phone": "string",
    "vacation_type": "business_days|calendar_days",
    "max_vacation_days": "integer",
    "created_at": "datetime",
    "updated_at": "datetime"
  }
}
```

---

### 4.4 Actualizar Compañía

**Endpoint:** `PUT /companies/{company}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `update`
**Controlador:** `CompanyController@update`

#### Request Body
```json
{
  "name": "string (opcional, max:255)",
  "tax_id": "string (opcional, max:20)",
  "contact_email": "string (opcional, email, max:255)",
  "contact_person": "string (opcional, max:255)",
  "address": "string (opcional, max:255)",
  "phone": "string (opcional, max:20)",
  "vacation_type": "string (opcional, valores: business_days|calendar_days)",
  "max_vacation_days": "integer (opcional, min:1, max:365)"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Compañía actualizada exitosamente",
  "data": {
    "id": "uuid",
    "name": "string",
    "tax_id": "string"
  }
}
```

---

### 4.5 Eliminar Compañía

**Endpoint:** `DELETE /companies/{company}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `delete`
**Controlador:** `CompanyController@destroy`

#### Response (200)
```json
{
  "success": true,
  "message": "Compañía eliminada exitosamente"
}
```

---

### 4.6 Listar Empleados de una Compañía

**Endpoint:** `GET /companies/{company}/employees`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view` en la compañía
**Controlador:** `CompanyController@employees`

#### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "user_id": "uuid",
      "contract_start_time": "time",
      "contract_end_time": "time",
      "remaining_vacation_days": "integer",
      "active": "boolean",
      "user": {
        "id": "uuid",
        "name": "string",
        "email": "string"
      }
    }
  ]
}
```

---

## 5. Empleados (Employees)

### 5.1 Listar Empleados

**Endpoint:** `GET /employees`
**Autenticación:** Requerida
**Permisos:** Depende de si se filtra por compañía
**Controlador:** `EmployeeController@index`

#### Query Parameters
```
company_id: uuid (opcional, filtra empleados por compañía)
```

#### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "user_id": "uuid",
      "contract_start_time": "08:00:00",
      "contract_end_time": "17:00:00",
      "remaining_vacation_days": 22,
      "active": true,
      "user": {
        "id": "uuid",
        "name": "string",
        "email": "string"
      },
      "company": {
        "id": "uuid",
        "name": "string"
      }
    }
  ]
}
```

---

### 5.2 Crear Empleado

**Endpoint:** `POST /employees`
**Autenticación:** Requerida
**Permisos:** Requiere policy `update` en la compañía
**Controlador:** `EmployeeController@store`

#### Request Body
```json
{
  "company_id": "uuid (requerido, exists:companies,id)",
  "user_id": "uuid (requerido, exists:users,id)",
  "contract_start_time": "time (requerido, formato: HH:mm)",
  "contract_end_time": "time (requerido, formato: HH:mm, después de contract_start_time)",
  "remaining_vacation_days": "integer (requerido, min:0)",
  "active": "boolean (opcional, por defecto: true)"
}
```

#### Response (201)
```json
{
  "success": true,
  "message": "Empleado creado exitosamente",
  "data": {
    "id": "uuid",
    "company_id": "uuid",
    "user_id": "uuid",
    "contract_start_time": "08:00:00",
    "contract_end_time": "17:00:00",
    "remaining_vacation_days": 22,
    "active": true,
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string"
    },
    "company": {
      "id": "uuid",
      "name": "string"
    }
  }
}
```

#### Response de Error (422)
```json
{
  "success": false,
  "message": "El empleado ya existe"
}
```

---

### 5.3 Ver Empleado

**Endpoint:** `GET /employees/{employee}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view`
**Controlador:** `EmployeeController@show`

#### Response (200)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "company_id": "uuid",
    "user_id": "uuid",
    "contract_start_time": "08:00:00",
    "contract_end_time": "17:00:00",
    "remaining_vacation_days": 22,
    "active": true,
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string"
    },
    "company": {
      "id": "uuid",
      "name": "string"
    }
  }
}
```

---

### 5.4 Actualizar Empleado

**Endpoint:** `PUT /employees/{employee}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `update`
**Controlador:** `EmployeeController@update`

#### Request Body
```json
{
  "contract_start_time": "time (opcional, formato: HH:mm)",
  "contract_end_time": "time (opcional, formato: HH:mm, después de contract_start_time)",
  "remaining_vacation_days": "integer (opcional, min:0)",
  "active": "boolean (opcional)"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Empleado actualizado exitosamente",
  "data": {
    "id": "uuid",
    "contract_start_time": "08:00:00",
    "contract_end_time": "17:00:00",
    "remaining_vacation_days": 20
  }
}
```

---

### 5.5 Eliminar Empleado

**Endpoint:** `DELETE /employees/{employee}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `delete`
**Controlador:** `EmployeeController@destroy`

#### Response (200)
```json
{
  "success": true,
  "message": "Empleado eliminado exitosamente"
}
```

---

### 5.6 Listar Work Logs de un Empleado

**Endpoint:** `GET /employees/{employee}/work-logs`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view`
**Controlador:** `EmployeeController@workLogs`

#### Query Parameters
```
start_date: date (opcional, formato: YYYY-MM-DD)
end_date: date (opcional, formato: YYYY-MM-DD, >= start_date)
```

#### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "date": "2025-01-15",
      "time": "08:00:00",
      "type": "check_in|check_out",
      "category": "shift_start|shift_end|break_start|break_end|offsite_start|offsite_end",
      "ip_address": "string",
      "location": "json",
      "notes": "string",
      "paired_log_id": "uuid"
    }
  ]
}
```

---

### 5.7 Listar Ausencias de un Empleado

**Endpoint:** `GET /employees/{employee}/absences`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view`
**Controlador:** `EmployeeController@absences`

#### Query Parameters
```
start_date: date (opcional, formato: YYYY-MM-DD)
end_date: date (opcional, formato: YYYY-MM-DD, >= start_date)
type: string (opcional, código del tipo de ausencia)
```

#### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "absence_type_id": "uuid",
      "request_id": "uuid",
      "date": "2025-01-20",
      "is_partial": false,
      "start_time": null,
      "end_time": null,
      "notes": "string",
      "absenceType": {
        "id": "uuid",
        "name": "Vacaciones",
        "code": "vacation"
      }
    }
  ]
}
```

---

### 5.8 Listar Solicitudes de Ausencia de un Empleado

**Endpoint:** `GET /employees/{employee}/absence-requests`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view`
**Controlador:** `EmployeeController@absenceRequests`

#### Query Parameters
```
status: string (opcional, valores: pending|approved|rejected)
```

#### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "absence_type_id": "uuid",
      "start_date": "2025-02-01",
      "end_date": "2025-02-05",
      "is_partial": false,
      "start_time": null,
      "end_time": null,
      "status": "pending|approved|rejected",
      "notes": "string",
      "reviewed_by": "uuid",
      "reviewed_at": "datetime",
      "rejection_reason": "string",
      "absenceType": {
        "id": "uuid",
        "name": "Vacaciones",
        "code": "vacation"
      }
    }
  ]
}
```

---

### 5.9 Obtener Configuración de Compañía del Empleado

**Endpoint:** `GET /employees/{employee}/company-settings`
**Autenticación:** Requerida
**Permisos:** Solo el usuario propietario del empleado puede acceder
**Controlador:** `EmployeeController@getCompanySettings`

#### Response (200)
```json
{
  "success": true,
  "data": {
    "geolocation_enabled": true,
    "geolocation_required": false,
    "geolocation_radius": 100,
    "office_latitude": "40.416775",
    "office_longitude": "-3.703790",
    "office_address": "Calle Ejemplo 123, Madrid"
  }
}
```

#### Response de Error (403)
```json
{
  "success": false,
  "message": "No tiene permiso para realizar esta acción"
}
```

---

## 6. Registros de Trabajo (WorkLogs)

### 6.1 Ver Work Log

**Endpoint:** `GET /worklogs/{worklog}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view`
**Controlador:** `WorkLogController@show`

#### Response (200)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employee_id": "uuid",
    "date": "2025-01-15",
    "time": "08:00:00",
    "type": "check_in",
    "category": "shift_start",
    "ip_address": "192.168.1.1",
    "location": {
      "latitude": "40.416775",
      "longitude": "-3.703790"
    },
    "notes": "string",
    "paired_log_id": "uuid"
  }
}
```

---

### 6.2 Actualizar Work Log

**Endpoint:** `PUT /worklogs/{worklog}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `update`
**Controlador:** `WorkLogController@update`

#### Request Body
```json
{
  "date": "date (opcional)",
  "time": "time (opcional, formato: HH:mm:ss)",
  "notes": "string (opcional, max:500)"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Registro de trabajo actualizado exitosamente",
  "data": {
    "id": "uuid",
    "date": "2025-01-15",
    "time": "08:05:00",
    "notes": "Actualizado"
  }
}
```

---

### 6.3 Eliminar Work Log

**Endpoint:** `DELETE /worklogs/{worklog}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `delete`
**Controlador:** `WorkLogController@destroy`

#### Response (200)
```json
{
  "success": true,
  "message": "Registro de trabajo eliminado exitosamente"
}
```

---

### 6.4 Check-In

**Endpoint:** `POST /worklogs/check-in`
**Autenticación:** Requerida
**Controlador:** `WorkLogController@checkIn`

#### Request Body
```json
{
  "employee_id": "uuid (requerido, exists:employees,id)",
  "category": "string (opcional, valores: shift_start|break_end|offsite_end, por defecto: shift_start)",
  "notes": "string (opcional, max:500)",
  "location": "json (opcional, si geolocalización está habilitada)"
}
```

#### Formato de Location
```json
{
  "latitude": "40.416775",
  "longitude": "-3.703790"
}
```

#### Response (201)
```json
{
  "success": true,
  "message": "Registro de trabajo creado exitosamente",
  "data": {
    "id": "uuid",
    "employee_id": "uuid",
    "date": "2025-01-15",
    "time": "08:00:00",
    "type": "check_in",
    "category": "shift_start",
    "ip_address": "192.168.1.1",
    "location": {
      "latitude": "40.416775",
      "longitude": "-3.703790"
    },
    "notes": null,
    "paired_log_id": null
  }
}
```

#### Errores Posibles
- `422` - Ya existe un check-in sin check-out
- `422` - No hay break check-out previo (para break_end)
- `422` - No hay offsite check-out previo (para offsite_end)
- `422` - Localización requerida pero no proporcionada
- `422` - Fuera del radio de la oficina

---

### 6.5 Check-Out

**Endpoint:** `POST /worklogs/check-out`
**Autenticación:** Requerida
**Controlador:** `WorkLogController@checkOut`

#### Request Body
```json
{
  "employee_id": "uuid (requerido, exists:employees,id)",
  "category": "string (opcional, valores: shift_end|break_start|offsite_start, por defecto: shift_end)",
  "notes": "string (opcional, max:500)",
  "location": "json (opcional)"
}
```

#### Response (201)
```json
{
  "success": true,
  "message": "Registro de trabajo creado exitosamente",
  "data": {
    "id": "uuid",
    "employee_id": "uuid",
    "date": "2025-01-15",
    "time": "17:00:00",
    "type": "check_out",
    "category": "shift_end",
    "ip_address": "192.168.1.1",
    "location": null,
    "notes": null,
    "paired_log_id": "uuid"
  }
}
```

#### Errores Posibles
- `422` - No hay check-in previo
- `422` - Debe volver de break/offsite antes de hacer shift_end
- `422` - Ya está en break
- `422` - Ya está offsite

---

### 6.6 Estado Actual del Empleado

**Endpoint:** `GET /worklogs/status/{employeeId}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view` en el empleado
**Controlador:** `WorkLogController@getEmployeeStatus`

#### Response (200)
```json
{
  "success": true,
  "data": {
    "employee": {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "name": "string",
        "email": "string"
      }
    },
    "status": "in|out",
    "category": "shift_start|shift_end|break_start|break_end|offsite_start|offsite_end",
    "last_activity": {
      "time": "08:00:00",
      "notes": "string"
    }
  }
}
```

---

### 6.7 Reporte Diario

**Endpoint:** `GET /worklogs/daily-report/{employeeId}/{period?}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view` en el empleado
**Controlador:** `WorkLogController@dailyReport`

#### Parámetros de Ruta
- `employeeId`: UUID del empleado
- `period`: Fecha opcional (formato: YYYY-MM-DD, por defecto: hoy)

#### Response (200)
```json
{
  "success": true,
  "data": {
    "date": "2025-01-15",
    "employee": {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "name": "string",
        "email": "string"
      }
    },
    "status": "completed|in_progress|absent|future",
    "shift": {
      "start": {
        "id": "uuid",
        "time": "08:00:00",
        "type": "check_in",
        "category": "shift_start"
      },
      "end": {
        "id": "uuid",
        "time": "17:00:00",
        "type": "check_out",
        "category": "shift_end"
      },
      "total_minutes": 540
    },
    "work_sessions": [
      {
        "start_log": {},
        "end_log": {},
        "duration_minutes": 240,
        "duration_formatted": "04:00",
        "type": "work|break|offsite"
      }
    ],
    "break_time": {
      "minutes": 60,
      "formatted": "01:00"
    },
    "offsite_time": {
      "minutes": 0,
      "formatted": "00:00"
    },
    "total_work_time": {
      "minutes": 480,
      "formatted": "08:00"
    },
    "contract_work_time": {
      "minutes": 480,
      "formatted": "08:00"
    },
    "time_variance": {
      "minutes": 0,
      "formatted": "+00:00"
    },
    "statistics": {
      "total_absences": 0,
      "absence_types": [],
      "hours_worked": 8.0,
      "hours_expected": 8.0,
      "hours_absent": 0,
      "late_arrivals": 0,
      "early_departures": 0,
      "total_impunctuality": 0,
      "punctuality_rate": 100
    },
    "in_progress": false,
    "all_logs": []
  }
}
```

---

### 6.8 Reporte Semanal

**Endpoint:** `GET /worklogs/weekly-report/{employeeId}/{period?}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view` en el empleado
**Controlador:** `WorkLogController@weeklyReport`

#### Parámetros de Ruta
- `employeeId`: UUID del empleado
- `period`: Fecha opcional (formato: YYYY-MM-DD, por defecto: hoy)

#### Response (200)
```json
{
  "success": true,
  "data": {
    "week_start": "2025-01-13",
    "week_end": "2025-01-19",
    "employee": {
      "id": "uuid",
      "user": {
        "name": "string"
      }
    },
    "days": [
      {
        "date": "2025-01-13",
        "day_name": "Monday",
        "is_weekend": false,
        "status": "completed|incomplete|absent|weekend|upcoming",
        "shift": {
          "started": true,
          "completed": true,
          "start_time": "08:00:00",
          "end_time": "17:00:00"
        },
        "work_time": {
          "minutes": 480,
          "formatted": "08:00"
        },
        "break_time": {
          "minutes": 60,
          "formatted": "01:00"
        },
        "offsite_time": {
          "minutes": 0,
          "formatted": "00:00"
        },
        "sessions": [],
        "absence": null,
        "log_count": 4
      }
    ],
    "summary": {
      "work_time": {
        "minutes": 2400,
        "hours": 40.0,
        "formatted": "40:00"
      },
      "break_time": {
        "minutes": 300,
        "hours": 5.0,
        "formatted": "05:00"
      },
      "offsite_time": {
        "minutes": 0,
        "hours": 0,
        "formatted": "00:00"
      },
      "expected_work_time": {
        "minutes": 2400,
        "hours": 40.0,
        "formatted": "40:00"
      },
      "time_variance": {
        "minutes": 0,
        "hours": 0,
        "formatted": "+00:00"
      },
      "days_worked": 5,
      "days_absent": 0,
      "days_incomplete": 0,
      "productivity": 100
    },
    "statistics": {
      "total_absences": 0,
      "absence_types": [],
      "hours_worked": 40.0,
      "hours_expected": 40.0,
      "hours_absent": 0,
      "late_arrivals": 0,
      "early_departures": 0,
      "total_impunctuality": 0,
      "punctuality_rate": 100
    }
  }
}
```

---

### 6.9 Reporte Mensual

**Endpoint:** `GET /worklogs/monthly-report/{employeeId}/{year?}/{month?}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view` en el empleado
**Controlador:** `WorkLogController@monthlyReport`

#### Parámetros de Ruta
- `employeeId`: UUID del empleado
- `year`: Año opcional (por defecto: año actual)
- `month`: Mes opcional (por defecto: mes actual)

#### Response (200)
```json
{
  "success": true,
  "data": {
    "year": 2025,
    "month": 1,
    "month_name": "January",
    "employee": {
      "id": "uuid",
      "user": {
        "name": "string"
      }
    },
    "days": [
      {
        "date": "2025-01-01",
        "day": 1,
        "day_name": "Wednesday",
        "is_weekend": false,
        "status": "completed|incomplete|absent|weekend|upcoming",
        "shift": {
          "started": true,
          "completed": true,
          "start_time": "08:00:00",
          "end_time": "17:00:00"
        },
        "work_minutes": 480,
        "break_minutes": 60,
        "offsite_minutes": 0,
        "absence": null
      }
    ],
    "summary": {
      "business_days": 22,
      "days_worked": 20,
      "days_absent": 2,
      "days_incomplete": 0,
      "absence_types": [
        {
          "code": "vacation",
          "name": "Vacaciones",
          "count": 2,
          "is_paid": true
        }
      ],
      "work_time": {
        "minutes": 9600,
        "hours": 160.0,
        "formatted": "160:00"
      },
      "break_time": {
        "minutes": 1200,
        "hours": 20.0,
        "formatted": "20:00"
      },
      "offsite_time": {
        "minutes": 0,
        "hours": 0,
        "formatted": "00:00"
      },
      "expected_work_time": {
        "minutes": 10560,
        "hours": 176.0,
        "formatted": "176:00"
      },
      "time_variance": {
        "minutes": -960,
        "hours": -16.0,
        "formatted": "-16:00"
      },
      "attendance_rate": 91,
      "completion_rate": 100
    },
    "statistics": {
      "total_absences": 2,
      "absence_types": [
        {
          "code": "vacation",
          "name": "Vacaciones",
          "count": 2
        }
      ],
      "hours_worked": 160.0,
      "hours_expected": 176.0,
      "hours_absent": 16.0,
      "late_arrivals": 0,
      "early_departures": 0,
      "total_impunctuality": 0,
      "punctuality_rate": 100
    }
  }
}
```

---

### 6.10 Reporte Diario (PDF)

**Endpoint:** `GET /worklogs/daily-report/{employeeId}/{period?}/pdf`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view` en el empleado
**Controlador:** `WorkLogController@dailyReportPdf`

#### Parámetros de Ruta
- `employeeId`: UUID del empleado
- `period`: Fecha opcional (formato: YYYY-MM-DD, por defecto: hoy)

#### Response
Descarga un archivo PDF con el reporte diario.

**Nombre del archivo:** `reporte_diario_{nombre_empleado}_{fecha}.pdf`

---

### 6.11 Reporte Semanal (PDF)

**Endpoint:** `GET /worklogs/weekly-report/{employeeId}/{period?}/pdf`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view` en el empleado
**Controlador:** `WorkLogController@weeklyReportPdf`

#### Parámetros de Ruta
- `employeeId`: UUID del empleado
- `period`: Fecha opcional (formato: YYYY-MM-DD, por defecto: hoy)

#### Response
Descarga un archivo PDF con el reporte semanal.

**Nombre del archivo:** `reporte_semanal_{nombre_empleado}_{fecha_inicio}.pdf`

---

### 6.12 Reporte Mensual (PDF)

**Endpoint:** `GET /worklogs/monthly-report/{employeeId}/{year?}/{month?}/pdf`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view` en el empleado
**Controlador:** `WorkLogController@monthlyReportPdf`

#### Parámetros de Ruta
- `employeeId`: UUID del empleado
- `year`: Año opcional (por defecto: año actual)
- `month`: Mes opcional (por defecto: mes actual)

#### Response
Descarga un archivo PDF con el reporte mensual.

**Nombre del archivo:** `reporte_mensual_{nombre_empleado}_{mes}_{año}.pdf`

---

## 7. Tipos de Ausencia (Absence Types)

### 7.1 Listar Tipos de Ausencia

**Endpoint:** `GET /absence-types`
**Autenticación:** Requerida
**Controlador:** `AbsenceTypeController@index`

#### Response (200)
```json
[
  {
    "id": "uuid",
    "name": "Vacaciones",
    "code": "vacation",
    "description": "Días de vacaciones anuales",
    "requires_approval": true,
    "affects_vacation_balance": true,
    "is_paid": true,
    "created_at": "datetime",
    "updated_at": "datetime"
  }
]
```

---

### 7.2 Crear Tipo de Ausencia

**Endpoint:** `POST /absence-types`
**Autenticación:** Requerida
**Permisos:** Requiere policy `create`
**Controlador:** `AbsenceTypeController@store`

#### Request Body
```json
{
  "name": "string (requerido, max:255)",
  "code": "string (requerido, max:50, unique)",
  "description": "string (opcional)",
  "requires_approval": "boolean (opcional, por defecto: false)",
  "affects_vacation_balance": "boolean (opcional, por defecto: false)",
  "is_paid": "boolean (opcional, por defecto: true)"
}
```

#### Response (201)
```json
{
  "success": true,
  "message": "Tipo de ausencia creado exitosamente",
  "data": {
    "id": "uuid",
    "name": "Vacaciones",
    "code": "vacation",
    "description": "Días de vacaciones anuales",
    "requires_approval": true,
    "affects_vacation_balance": true,
    "is_paid": true
  }
}
```

---

### 7.3 Ver Tipo de Ausencia

**Endpoint:** `GET /absence-types/{absenceType}`
**Autenticación:** Requerida
**Controlador:** `AbsenceTypeController@show`

#### Response (200)
```json
{
  "id": "uuid",
  "name": "Vacaciones",
  "code": "vacation",
  "description": "Días de vacaciones anuales",
  "requires_approval": true,
  "affects_vacation_balance": true,
  "is_paid": true,
  "created_at": "datetime",
  "updated_at": "datetime"
}
```

---

### 7.4 Actualizar Tipo de Ausencia

**Endpoint:** `PUT /absence-types/{absenceType}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `update`
**Controlador:** `AbsenceTypeController@update`

#### Request Body
```json
{
  "name": "string (opcional, max:255)",
  "code": "string (opcional, max:50)",
  "description": "string (opcional)",
  "requires_approval": "boolean (opcional)",
  "affects_vacation_balance": "boolean (opcional)",
  "is_paid": "boolean (opcional)"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Tipo de ausencia actualizado exitosamente",
  "data": {
    "id": "uuid",
    "name": "Vacaciones",
    "code": "vacation"
  }
}
```

---

### 7.5 Eliminar Tipo de Ausencia

**Endpoint:** `DELETE /absence-types/{absenceType}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `delete`
**Controlador:** `AbsenceTypeController@destroy`

#### Response (200)
```json
{
  "success": true,
  "message": "Tipo de ausencia eliminado exitosamente"
}
```

#### Response de Error (409)
```json
{
  "success": false,
  "message": "El tipo de ausencia está en uso y no se puede eliminar"
}
```

---

## 8. Ausencias (Absences)

### 8.1 Listar Ausencias

**Endpoint:** `GET /absences`
**Autenticación:** Requerida
**Permisos:** Depende de los filtros aplicados
**Controlador:** `AbsenceController@index`

#### Query Parameters
```
employee_id: uuid (opcional, filtra por empleado)
company_id: uuid (opcional, filtra por compañía)
start_date: date (opcional, formato: YYYY-MM-DD)
end_date: date (opcional, formato: YYYY-MM-DD, >= start_date)
absence_type_id: uuid (opcional, filtra por tipo de ausencia)
```

#### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "absence_type_id": "uuid",
      "request_id": "uuid",
      "date": "2025-01-20",
      "is_partial": false,
      "start_time": null,
      "end_time": null,
      "notes": "string",
      "employee": {
        "id": "uuid",
        "user": {
          "id": "uuid",
          "name": "string",
          "email": "string"
        }
      },
      "absenceType": {
        "id": "uuid",
        "name": "Vacaciones",
        "code": "vacation",
        "is_paid": true
      },
      "request": {
        "id": "uuid",
        "status": "approved"
      }
    }
  ]
}
```

---

### 8.2 Crear Ausencia

**Endpoint:** `POST /absences`
**Autenticación:** Requerida
**Permisos:** Requiere policy `create`
**Controlador:** `AbsenceController@store`

#### Request Body
```json
{
  "employee_id": "uuid (requerido, exists:employees,id)",
  "absence_type_id": "uuid (requerido, exists:absence_types,id)",
  "request_id": "uuid (opcional, exists:absence_requests,id)",
  "date": "date (requerido, formato: YYYY-MM-DD)",
  "is_partial": "boolean (opcional, por defecto: false)",
  "start_time": "time (requerido si is_partial=true, formato: HH:mm)",
  "end_time": "time (requerido si is_partial=true, formato: HH:mm, después de start_time)",
  "notes": "string (opcional, max:500)"
}
```

#### Response (201)
```json
{
  "success": true,
  "message": "Ausencia creada exitosamente",
  "data": {
    "id": "uuid",
    "employee_id": "uuid",
    "absence_type_id": "uuid",
    "date": "2025-01-20",
    "is_partial": false,
    "employee": {
      "user": {
        "name": "string"
      }
    },
    "absenceType": {
      "name": "Vacaciones",
      "code": "vacation"
    }
  }
}
```

---

### 8.3 Ver Ausencia

**Endpoint:** `GET /absences/{absence}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view`
**Controlador:** `AbsenceController@show`

#### Response (200)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employee_id": "uuid",
    "absence_type_id": "uuid",
    "request_id": "uuid",
    "date": "2025-01-20",
    "is_partial": false,
    "start_time": null,
    "end_time": null,
    "notes": "string",
    "employee": {
      "id": "uuid",
      "user": {
        "name": "string"
      }
    },
    "absenceType": {
      "id": "uuid",
      "name": "Vacaciones",
      "code": "vacation"
    },
    "request": {
      "id": "uuid",
      "status": "approved"
    }
  }
}
```

---

### 8.4 Actualizar Ausencia

**Endpoint:** `PUT /absences/{absence}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `update`
**Controlador:** `AbsenceController@update`

**Nota:** No se pueden actualizar ausencias vinculadas a una solicitud aprobada.

#### Request Body
```json
{
  "date": "date (opcional, formato: YYYY-MM-DD)",
  "is_partial": "boolean (opcional)",
  "start_time": "time (requerido si is_partial=true, formato: HH:mm)",
  "end_time": "time (requerido si is_partial=true, formato: HH:mm, después de start_time)",
  "notes": "string (opcional, max:500)"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Ausencia actualizada exitosamente",
  "data": {
    "id": "uuid",
    "date": "2025-01-21"
  }
}
```

#### Response de Error (422)
```json
{
  "success": false,
  "message": "No se puede actualizar una ausencia vinculada a una solicitud"
}
```

---

### 8.5 Eliminar Ausencia

**Endpoint:** `DELETE /absences/{absence}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `delete`
**Controlador:** `AbsenceController@destroy`

**Nota:** No se pueden eliminar ausencias vinculadas a una solicitud aprobada.

#### Response (200)
```json
{
  "success": true,
  "message": "Ausencia eliminada exitosamente"
}
```

#### Response de Error (422)
```json
{
  "success": false,
  "message": "No se puede eliminar una ausencia vinculada a una solicitud"
}
```

---

### 8.6 Ausencias por Empleado

**Endpoint:** `GET /absences/employee/{employee}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view` en el empleado
**Controlador:** `AbsenceController@byEmployee`

#### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "date": "2025-01-20",
      "is_partial": false,
      "absenceType": {
        "name": "Vacaciones",
        "code": "vacation"
      },
      "request": {
        "id": "uuid",
        "status": "approved"
      }
    }
  ]
}
```

---

### 8.7 Ausencias por Empleado y Tipo

**Endpoint:** `GET /absences/employee/{employee}/type/{type}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view` en el empleado
**Controlador:** `AbsenceController@byEmployeeAndType`

#### Parámetros de Ruta
- `employee`: UUID del empleado
- `type`: Código del tipo de ausencia (ej: "vacation", "sick_leave")

#### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "date": "2025-01-20",
      "absenceType": {
        "name": "Vacaciones",
        "code": "vacation"
      }
    }
  ]
}
```

---

### 8.8 Ausencias por Empleado y Período

**Endpoint:** `GET /absences/employee/{employee}/period/{start}/{end}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view` en el empleado
**Controlador:** `AbsenceController@byEmployeeAndPeriod`

#### Parámetros de Ruta
- `employee`: UUID del empleado
- `start`: Fecha de inicio (formato: YYYY-MM-DD)
- `end`: Fecha de fin (formato: YYYY-MM-DD)

#### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "date": "2025-01-20",
      "absenceType": {
        "name": "Vacaciones",
        "code": "vacation"
      },
      "request": {
        "id": "uuid",
        "status": "approved"
      }
    }
  ]
}
```

---

## 9. Solicitudes de Ausencia (Absence Requests)

### 9.1 Listar Solicitudes de Ausencia

**Endpoint:** `GET /requests`
**Autenticación:** Requerida
**Permisos:** Requiere policy `viewAny`
**Controlador:** `AbsenceRequestController@index`

#### Query Parameters
```
status: string (opcional, valores: pending|approved|rejected)
employee_id: uuid (opcional, filtra por empleado)
company_id: uuid (opcional, filtra por compañía)
```

#### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "employee_id": "uuid",
      "absence_type_id": "uuid",
      "start_date": "2025-02-01",
      "end_date": "2025-02-05",
      "is_partial": false,
      "start_time": null,
      "end_time": null,
      "status": "pending",
      "notes": "string",
      "reviewed_by": null,
      "reviewed_at": null,
      "rejection_reason": null,
      "employee": {
        "id": "uuid",
        "user": {
          "name": "string",
          "email": "string"
        }
      },
      "absenceType": {
        "id": "uuid",
        "name": "Vacaciones",
        "code": "vacation"
      },
      "reviewer": null,
      "created_at": "datetime",
      "updated_at": "datetime"
    }
  ]
}
```

---

### 9.2 Crear Solicitud de Ausencia

**Endpoint:** `POST /requests`
**Autenticación:** Requerida
**Controlador:** `AbsenceRequestController@store`

#### Request Body
```json
{
  "employee_id": "uuid (requerido, exists:employees,id)",
  "absence_type_id": "uuid (requerido, exists:absence_types,id)",
  "start_date": "date (requerido, >= today, formato: YYYY-MM-DD)",
  "end_date": "date (requerido, >= start_date, formato: YYYY-MM-DD)",
  "is_partial": "boolean (opcional, por defecto: false)",
  "start_time": "time (requerido si is_partial=true, formato: HH:mm)",
  "end_time": "time (requerido si is_partial=true, formato: HH:mm, después de start_time)",
  "notes": "string (opcional, max:500)"
}
```

#### Response (201)
```json
{
  "success": true,
  "message": "Solicitud de ausencia creada exitosamente",
  "data": {
    "employee_id": "uuid",
    "absence_type_id": "uuid",
    "status": "pending|approved"
  }
}
```

#### Errores Posibles
- `422` - Requiere aviso mínimo de 24 horas
- `422` - No cumple con el requisito de días consecutivos mínimos
- `422` - Días de vacaciones insuficientes

---

### 9.3 Ver Solicitud de Ausencia

**Endpoint:** `GET /requests/{request}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view`
**Controlador:** `AbsenceRequestController@show`

#### Response (200)
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "employee_id": "uuid",
    "absence_type_id": "uuid",
    "start_date": "2025-02-01",
    "end_date": "2025-02-05",
    "is_partial": false,
    "start_time": null,
    "end_time": null,
    "status": "pending",
    "notes": "string",
    "reviewed_by": null,
    "reviewed_at": null,
    "rejection_reason": null,
    "employee": {
      "user": {
        "name": "string"
      }
    },
    "absenceType": {
      "name": "Vacaciones",
      "code": "vacation"
    },
    "reviewer": null
  }
}
```

---

### 9.4 Actualizar Solicitud de Ausencia

**Endpoint:** `PUT /requests/{request}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `update`
**Controlador:** `AbsenceRequestController@update`

**Nota:** Solo se pueden actualizar solicitudes con estado "pending".

#### Request Body
```json
{
  "start_date": "date (opcional, >= today, formato: YYYY-MM-DD)",
  "end_date": "date (opcional, >= start_date, formato: YYYY-MM-DD)",
  "is_partial": "boolean (opcional)",
  "start_time": "time (requerido si is_partial=true, formato: HH:mm)",
  "end_time": "time (requerido si is_partial=true, formato: HH:mm, después de start_time)",
  "notes": "string (opcional, max:500)"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Solicitud de ausencia actualizada exitosamente",
  "data": {
    "id": "uuid",
    "start_date": "2025-02-01",
    "end_date": "2025-02-05"
  }
}
```

#### Response de Error (422)
```json
{
  "success": false,
  "message": "Solo se pueden actualizar solicitudes pendientes"
}
```

---

### 9.5 Aprobar Solicitud de Ausencia

**Endpoint:** `POST /requests/approve`
**Autenticación:** Requerida
**Permisos:** Requiere policy `review`
**Controlador:** `AbsenceRequestController@approve`

#### Request Body
```json
{
  "request_id": "uuid (requerido)"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Solicitud de ausencia revisada",
  "data": {
    "id": "uuid",
    "status": "approved",
    "reviewed_by": "uuid",
    "reviewed_at": "datetime",
    "employee": {
      "user": {
        "name": "string"
      }
    },
    "absenceType": {
      "name": "Vacaciones"
    },
    "reviewer": {
      "id": "uuid",
      "name": "string"
    }
  }
}
```

#### Errores Posibles
- `422` - Solo se pueden revisar solicitudes pendientes
- `422` - Días de vacaciones insuficientes

---

### 9.6 Rechazar Solicitud de Ausencia

**Endpoint:** `POST /requests/reject`
**Autenticación:** Requerida
**Permisos:** Requiere policy `review`
**Controlador:** `AbsenceRequestController@reject`

#### Request Body
```json
{
  "request_id": "uuid (requerido)",
  "rejection_reason": "string (requerido, max:500)"
}
```

#### Response (200)
```json
{
  "success": true,
  "message": "Solicitud de ausencia revisada",
  "data": {
    "id": "uuid",
    "status": "rejected",
    "reviewed_by": "uuid",
    "reviewed_at": "datetime",
    "rejection_reason": "string",
    "employee": {
      "user": {
        "name": "string"
      }
    },
    "absenceType": {
      "name": "Vacaciones"
    },
    "reviewer": {
      "id": "uuid",
      "name": "string"
    }
  }
}
```

---

### 9.7 Eliminar Solicitud de Ausencia

**Endpoint:** `DELETE /requests/{request}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `delete`
**Controlador:** `AbsenceRequestController@destroy`

**Nota:** Solo se pueden eliminar solicitudes con estado "pending".

#### Response (200)
```json
{
  "success": true,
  "message": "Solicitud de ausencia eliminada exitosamente"
}
```

#### Response de Error (422)
```json
{
  "success": false,
  "message": "Solo se pueden eliminar solicitudes pendientes"
}
```

---

### 9.8 Solicitudes por Empleado

**Endpoint:** `GET /requests/employee/{employee}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view` en el empleado
**Controlador:** `AbsenceRequestController@byEmployee`

#### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "start_date": "2025-02-01",
      "end_date": "2025-02-05",
      "status": "pending",
      "absenceType": {
        "name": "Vacaciones"
      },
      "reviewer": null
    }
  ]
}
```

---

### 9.9 Solicitudes Pendientes por Empleado

**Endpoint:** `GET /requests/pending/employee/{employee}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view` en el empleado
**Controlador:** `AbsenceRequestController@pendingByEmployee`

#### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "start_date": "2025-02-01",
      "end_date": "2025-02-05",
      "status": "pending",
      "absenceType": {
        "name": "Vacaciones"
      }
    }
  ]
}
```

---

### 9.10 Solicitudes por Compañía

**Endpoint:** `GET /requests/company/{company}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view` en la compañía
**Controlador:** `AbsenceRequestController@byCompany`

#### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "start_date": "2025-02-01",
      "end_date": "2025-02-05",
      "status": "pending",
      "employee": {
        "user": {
          "name": "string",
          "email": "string"
        }
      },
      "absenceType": {
        "name": "Vacaciones"
      },
      "reviewer": null
    }
  ]
}
```

---

### 9.11 Solicitudes Pendientes por Compañía

**Endpoint:** `GET /requests/pending/company/{company}`
**Autenticación:** Requerida
**Permisos:** Requiere policy `view` en la compañía
**Controlador:** `AbsenceRequestController@pendingByCompany`

#### Response (200)
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "start_date": "2025-02-01",
      "end_date": "2025-02-05",
      "status": "pending",
      "employee": {
        "user": {
          "name": "string",
          "email": "string"
        }
      },
      "absenceType": {
        "name": "Vacaciones"
      }
    }
  ]
}
```

---

## 10. Invitaciones Temporales (Temporary Invitations)

### 10.1 Ver Invitación (Público)

**Endpoint:** `GET /invitations/{token}`
**Autenticación:** No requerida
**Controlador:** `TemporaryInvitationController@show`

#### Response (200)
```json
{
  "success": true,
  "data": {
    "invitation": {
      "first_name": "string",
      "last_name": "string",
      "email": "string",
      "company": {
        "id": "uuid",
        "name": "string"
      },
      "expires_at": "datetime",
      "token": "string"
    }
  }
}
```

#### Response de Error (410)
```json
{
  "success": false,
  "message": "La invitación ya ha sido utilizada"
}
```

```json
{
  "success": false,
  "message": "La invitación ha expirado"
}
```

---

### 10.2 Completar Registro (Público)

**Endpoint:** `POST /invitations/{token}/complete`
**Autenticación:** No requerida
**Controlador:** `TemporaryInvitationController@complete`

#### Request Body
```json
{
  "password": "string (requerido, confirmación requerida)",
  "password_confirmation": "string (requerido)",
  "identification_number": "string (opcional, max:20)",
  "birth_date": "date (opcional, antes de hoy)",
  "phone": "string (opcional, max:20)",
  "address": "string (opcional, max:255)"
}
```

#### Response (201)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string",
      "role": "Employee"
    },
    "employee": {
      "id": "uuid",
      "company": "string"
    },
    "token": "string"
  }
}
```

#### Response de Error (410)
```json
{
  "success": false,
  "message": "La invitación es inválida o ha expirado"
}
```

---

### 10.3 Reenviar Invitación (Público)

**Endpoint:** `POST /invitations/{token}/resend`
**Autenticación:** No requerida
**Controlador:** `TemporaryInvitationController@resend`

#### Response (200)
```json
{
  "success": true,
  "message": "Invitación reenviada",
  "data": {
    "new_token": "string",
    "expires_at": "datetime"
  }
}
```

#### Response de Error (410)
```json
{
  "success": false,
  "message": "La invitación ya ha sido utilizada"
}
```

---

## 11. Gestión de Invitaciones (Autenticado)

### 11.1 Listar Invitaciones

**Endpoint:** `GET /temporary-invitations`
**Autenticación:** Requerida
**Controlador:** `TemporaryInvitationController@index`

**Nota:** El controlador no tiene implementado este método actualmente.

---

### 11.2 Crear Invitación

**Endpoint:** `POST /temporary-invitations`
**Autenticación:** Requerida
**Controlador:** `TemporaryInvitationController@store`

**Nota:** El controlador no tiene implementado este método actualmente.

---

### 11.3 Ver Invitación

**Endpoint:** `GET /temporary-invitations/{invitation}`
**Autenticación:** Requerida
**Controlador:** `TemporaryInvitationController@show`

**Nota:** Este endpoint está duplicado con el público. El comportamiento es el mismo.

---

### 11.4 Actualizar Invitación

**Endpoint:** `PUT /temporary-invitations/{invitation}`
**Autenticación:** Requerida
**Controlador:** `TemporaryInvitationController@update`

**Nota:** El controlador no tiene implementado este método actualmente.

---

### 11.5 Eliminar Invitación

**Endpoint:** `DELETE /temporary-invitations/{invitation}`
**Autenticación:** Requerida
**Controlador:** `TemporaryInvitationController@destroy`

**Nota:** El controlador no tiene implementado este método actualmente.

---

## Notas Adicionales

### Geolocalización

Algunos endpoints de WorkLog requieren o pueden incluir información de geolocalización si está habilitada en la compañía:

- La geolocalización se valida en los métodos `checkIn` y `checkOut`
- Si `geolocation_required` es `true` en la compañía, el campo `location` es obligatorio
- Si se proporciona `location`, se valida que esté dentro del radio de la oficina

### Políticas de Autorización

La API utiliza el sistema de políticas (Policies) de Laravel para la autorización:

- `viewAny`: Ver lista de recursos
- `view`: Ver un recurso específico
- `create`: Crear un nuevo recurso
- `update`: Actualizar un recurso
- `delete`: Eliminar un recurso
- `createFor`: Crear un recurso para otro usuario/empleado
- `review`: Revisar solicitudes (aprobar/rechazar)

### Validación de Solicitudes de Ausencia

Las solicitudes de ausencia tienen validaciones especiales:

1. **Aviso mínimo**: Algunas ausencias requieren solicitarse con 24 horas de antelación
2. **Días consecutivos**: Algunos tipos de ausencia requieren un mínimo de días consecutivos
3. **Balance de vacaciones**: Si el tipo de ausencia afecta el balance de vacaciones, se verifica que haya días suficientes
4. **Aprobación automática**: Si el tipo de ausencia no requiere aprobación, se aprueba automáticamente y se crean los registros de ausencia

### Días Laborables vs Días Calendario

Las compañías pueden configurar si las vacaciones se cuentan en:

- `business_days`: Solo días laborables (excluye fines de semana)
- `calendar_days`: Días calendario (incluye fines de semana)

Esta configuración afecta cómo se cuentan los días de ausencia y cómo se crean los registros.

### Roles

La API tiene el concepto de roles de usuario, aunque el controlador `RoleController` no está implementado. Los roles más comunes son:

- `Administrator`: Acceso completo
- `Company Admin`: Gestión de su compañía
- `Employee`: Acceso básico a sus propios datos

### Suscripciones y Facturación

La gestión de suscripciones, planes, facturas y códigos de descuento se realiza a través del **Panel de Administración Filament** y no está expuesta a través de la API REST pública. Los recursos disponibles en el panel de administración incluyen:

- **Planes de Suscripción** (`SubscriptionPlan`): Gestión de planes con integración Stripe
- **Suscripciones** (`Subscription`): Visualización de suscripciones activas
- **Facturas** (`Invoice`): Generación y consulta de facturas
- **Códigos de Descuento** (`DiscountCode`): Creación y gestión de promociones
- **Configuración del Sistema** (`SystemSetting`): Parámetros de facturación y empresa

La integración con Stripe se realiza mediante Laravel Cashier, y los webhooks de Stripe manejan automáticamente:
- Creación de facturas en pagos exitosos
- Actualización de estado de suscripciones
- Gestión de cancelaciones

### Campos de Empresa Relacionados con Billing

El modelo `Company` incluye campos adicionales para la gestión de facturación:

| Campo | Descripción |
|-------|-------------|
| stripe_id | ID de cliente en Stripe |
| pm_type | Tipo de método de pago |
| pm_last_four | Últimos 4 dígitos del método de pago |
| trial_ends_at | Fecha de fin del período de prueba |
| billing_name | Nombre para facturación |
| billing_address | Dirección de facturación |
| billing_city | Ciudad de facturación |
| billing_postal_code | Código postal de facturación |
| billing_country | País de facturación (ISO 2 chars) |
| logo_path | Ruta del logo de la empresa |

---

**Versión de la API:** 1.1
**Última actualización:** 2025-12-21
