# BszIA - Asistente Virtual con Generación de Imágenes

> **BszIA** es un asistente inteligente creado por **AvaStrOficial**. Permite chatear con una IA, generar imágenes por IA, reconocer código en las conversaciones y gestionar límites de uso por usuario con sistema de login y días extras.

## 📋 Tabla de Contenidos

| Sección | Descripción |
|---------|-------------|
| [🧠 ¿Cómo funciona la IA?](#-cómo-funciona-la-ia) | Explicación del motor y flujo de trabajo |
| [🔧 Modificaciones](#-cómo-se-puede-modificar) | Guía para personalizar la IA |
| [🌐 APIs utilizadas](#-para-qué-sirven-las-apis-que-se-usan) | Propósito de cada API |
| [🔌 Motor de IA](#-qué-apis-usas-y-que-motor-de-ia-es) | Detalles técnicos del motor |
| [📁 Estructura del código](#-estructura-del-código-principal) | Organización del código |
| [🚀 Instalación](#-instalación) | Cómo ponerlo en marcha |
| [⚠️ Seguridad](#️-notas-de-seguridad) | Consideraciones importantes |

---

## 🧠 ¿Cómo funciona la IA?

La inteligencia artificial de BszIA se basa en **tres componentes principales**:

| Componente | Tecnología | Función |
|------------|------------|---------|
| **Motor de lenguaje (LLM)** | llama-3.3-70b-versatile (Groq) | Entiende y genera texto de forma rápida |
| **Generación de imágenes** | Pollinations.ai + flux | Crea imágenes a partir de descripciones |
| **Seguridad y control** | Sistema propio + Supabase | Filtra preguntas prohibidas y limita uso |

### 📊 Flujo de una conversación típica

| Paso | Acción | Tecnología involucrada |
|------|--------|------------------------|
| 1 | Usuario escribe un mensaje | Frontend (JavaScript) |
| 2 | Verificación de comando de imagen o pregunta prohibida | Sistema de seguridad |
| 3 | Si es imagen → llama a Pollinations.ai | API de imágenes |
| 4 | Si es texto → envía historial a Groq | API de lenguaje |
| 5 | Respuesta formateada (detecta código automáticamente) | Formateador HTML/CSS |

---

## 🔧 ¿Cómo se puede modificar?

### 1. Cambiar el modelo de IA

| Ubicación | Código actual | Opciones disponibles |
|-----------|---------------|---------------------|
| Función callGroq() | model: 'llama-3.3-70b-versatile' | mixtral-8x7b-32768, gemma2-9b-it, llama3-8b-8192 |

**Línea a modificar:**
body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: messages, temperature: 0.85 })

### 2. Modificar el límite de mensajes

| Variable | Valor por defecto | Ejemplo de cambio |
|----------|-------------------|-------------------|
| LIMIT | 50 | const LIMIT = 100; |

### 3. Ajustar la generación de imágenes

| Parámetro | Valor actual | Opciones |
|-----------|--------------|----------|
| width | 1024 | 512, 768, 1024 |
| height | 1024 | 512, 768, 1024 |
| model | flux | turbo, sd, flux |

**Línea a modificar:**
const imageUrl = `https://image.pollinations.ai/prompt/${cleanPrompt}?width=1024&height=1024&model=flux&nologo=true`;

### 4. Personalizar respuestas prohibidas

| Array/Método | Ubicación | Función |
|--------------|-----------|---------|
| forbiddenPatterns | Línea ~80 | Patrones regex a bloquear |
| getForbiddenResponse() | Línea ~120 | Mensaje de respuesta |

### 5. Agregar más códigos de días extras

**Línea a modificar en redeemExtraDays():**
const validKeys = {
  'AVASTRO2024': 7,   // 7 días extras
  'EXTRA50': 5,       // 5 días extras
  'BSZIA2025': 10,    // 10 días extras
  'NUEVOCODIGO': 10   // ← Agrega el tuyo aquí
};

---

## 🌐 ¿Para qué sirven las APIs que se usan?

| API | Propósito | Endpoint | Autenticación |
|-----|-----------|----------|---------------|
| **Groq API** | Procesa lenguaje natural y genera respuestas | api.groq.com/openai/v1/chat/completions | Bearer token |
| **Pollinations.ai** | Genera imágenes a partir de texto | image.pollinations.ai/prompt/... | Sin autenticación |
| **Supabase** | Autenticación de usuarios (login/registro) | [proyecto].supabase.co | API Key + RPC |

### 🔧 Funciones RPC de Supabase

| Función | Parámetros | Retorno |
|---------|------------|---------|
| verify_login | p_correo, p_password, p_pin | { success, user, vip } |
| register_user | p_user, p_correo, p_password, p_pin | { success, user, vip } |

---

## 🔌 ¿Qué APIs usa y qué motor de IA es?

### APIs utilizadas

| API | Método | Endpoint | Formato |
|-----|--------|----------|---------|
| **Groq Cloud API** | POST | api.groq.com/openai/v1/chat/completions | JSON |
| **Pollinations.ai API** | GET | image.pollinations.ai/prompt/{text} | URL params |
| **Supabase API** | POST (RPC) | [proyecto].supabase.co/rpc/[funcion] | JSON |

### Motor de IA - Especificaciones técnicas

| Componente | Modelo | Proveedor | Especificaciones |
|------------|--------|-----------|------------------|
| **Lenguaje** | llama-3.3-70b-versatile | Meta (vía Groq) | • 70B parámetros<br>• Contexto 8K tokens<br>• LPU ultra-rápida |
| **Imágenes** | flux | Black Forest Labs (vía Pollinations) | • 1024x1024<br>• Sin marca de agua<br>• Generación rápida |

### Comparativa de modelos disponibles en Groq

| Modelo | Parámetros | Contexto | Velocidad | Uso recomendado |
|--------|------------|----------|-----------|-----------------|
| llama-3.3-70b-versatile | 70B | 8K | ⚡⚡⚡ | General, código |
| mixtral-8x7b-32768 | 47B | 32K | ⚡⚡ | Contextos largos |
| gemma2-9b-it | 9B | 8K | ⚡⚡⚡⚡ | Rápido, ligero |
| llama3-8b-8192 | 8B | 8K | ⚡⚡⚡⚡ | Respuestas cortas |

---

## 📁 Estructura del código principal

| Categoría | Funciones | Descripción |
|-----------|-----------|-------------|
| **Configuración** | SB_URL, SB_KEY, GROQ_KEY, GROQ_URL, LIMIT | Constantes globales |
| **Seguridad** | esc(), sanitizeInput(), isForbiddenQuestion() | Sanitización y filtros |
| **Autenticación** | doLogin(), doRegister(), bootApp(), doLogout() | Login/registro de usuarios |
| **Gestión de chats** | createNewChat(), deleteChat(), switchChat() | CRUD de conversaciones |
| **IA - Texto** | callGroq() | Llama a llama-3.3-70b-versatile |
| **IA - Imagen** | generateImage() | Llama a modelo flux |
| **Utilidades** | copyCode(), formatCodeInText(), showToast() | Funciones auxiliares |

### 📂 Estructura de almacenamiento (localStorage)

| Clave | Formato | Descripción |
|-------|---------|-------------|
| bsz_{username}_u | { date, count, extraDays } | Uso diario y días extras |
| bsz_{username}_c | Chat[] | Array de conversaciones |
| bsz_{username}_a | string | ID del chat activo |
| bsz_{username}_used_keys | string[] | Códigos de días extras usados |

---

## 🚀 Instalación

### Requisitos previos

| Requisito | Versión | Notas |
|-----------|---------|-------|
| Navegador | Moderno (Chrome, Firefox, Edge) | ES6+ |
| Supabase | Proyecto activo | Con tablas y RPC |
| API Keys | Groq + Supabase | Válidas y activas |

### Pasos de instalación

| Paso | Acción |
|------|--------|
| 1 | Clonar repositorio: git clone https://github.com/tuusuario/bszia.git |
| 2 | Configurar Supabase (crear tablas users y funciones RPC) |
| 3 | Obtener API key de console.groq.com |
| 4 | Modificar claves: SB_URL, SB_KEY, GROQ_KEY |
| 5 | Desplegar a GitHub Pages o servidor web |

### Ejemplo de configuración mínima

// Configuración necesaria
const SB_URL = "https://tuproyecto.supabase.co";
const SB_KEY = "sb_publishable_tu_clave_aqui";
const GROQ_KEY = "gsk_tu_clave_groq_aqui";

---

## ⚠️ Notas de seguridad

| Riesgo | Nivel | Mitigación |
|--------|-------|-------------|
| APIs expuestas en frontend | 🔴 Alto | Usar variables de entorno en producción |
| Filtro de preguntas prohibidas | 🟡 Medio | Mejorar regex o migrar a backend |
| Datos en localStorage | 🟡 Medio | No guardar información sensible |
| Inyección XSS | 🟢 Bajo | Sanitización implementada |

### 🔒 Mejoras recomendadas para producción

| Área | Acción recomendada |
|------|---------------------|
| **API Keys** | Mover a un backend proxy (Node.js, Cloudflare Worker) |
| **Autenticación** | Implementar JWT con refresh tokens |
| **Base de datos** | Usar Supabase Realtime para sincronización |
| **Rate limiting** | Aplicar desde backend, no solo frontend |

---

## 📝 Ejemplo de uso

### Comandos de imagen

| Entrada del usuario | Resultado |
|---------------------|-----------|
| genera una imagen de un gato | Imagen 1024x1024 de un gato |
| dibuja un paisaje montañoso | Imagen de montañas |
| crea imagen de robot futurista | Imagen de robot estilo futurista |

### Comandos de código

| Entrada del usuario | Lo que hace la IA |
|---------------------|-------------------|
| código html de una calculadora | Genera HTML/CSS/JS completo |
| función en javascript para fibonacci | Código listo para copiar |
| estilos css para botón moderno | CSS listo para copiar |

---

## 📄 Licencia

| Proyecto | Licencia |
|----------|----------|
| BszIA | Uso personal/educativo |
| Modelos de IA | Propiedad de Meta y Black Forest Labs |
| APIs | Sujeto a términos de Groq, Pollinations, Supabase |

---

## 👤 Autor

| Creado por | Contacto |
|------------|----------|
| **AvaStrOficial** | GitHub: @AvaStrOficial |

---

> ⭐ Si te gusta este proyecto, ¡dale una estrella en GitHub!
