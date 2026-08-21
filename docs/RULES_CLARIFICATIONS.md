# Crónicas FCG — Rules Clarifications

**Estado:** registro de rulings confirmados  
**Fecha de creación:** 2026-08-20

## 1. Propósito

Este documento registra aclaraciones, rulings y decisiones posteriores que complementan o corrigen la documentación base de Crónicas FCG.

Está pensado especialmente para aclaraciones entregadas directamente por los desarrolladores mediante canales como:

- WhatsApp;
- Discord;
- correo;
- conversación directa;
- publicación oficial posterior.

No registrar aquí interpretaciones personales.

---

# 2. Regla de inclusión

Una entrada puede agregarse cuando exista una aclaración suficientemente confiable atribuible al equipo de Crónicas FCG.

Cada ruling debe conservar:

- identificador;
- fecha;
- pregunta o situación;
- decisión;
- fuente;
- estado;
- reglas o componentes afectados;
- impacto potencial en el simulador.

---

# 3. Estados

Usar uno de:

```text
CONFIRMED
SUPERSEDED
PENDING_VERIFICATION
```

## CONFIRMED

Aclaración confirmada por una fuente autorizada.

## SUPERSEDED

La aclaración fue reemplazada posteriormente.

Debe conservarse para trazabilidad, pero no utilizarse como regla vigente.

## PENDING_VERIFICATION

Existe información plausible, pero todavía no debe utilizarse para implementar lógica.

---

# 4. Precedencia

Cuando una aclaración `CONFIRMED` contradice una regla anterior documentada en `CRONICAS_RULES.md`, la aclaración más reciente prevalece para el proyecto hasta que la documentación principal sea actualizada.

No modificar silenciosamente código basándose en mensajes informales no registrados.

---

# 5. Plantilla

Copiar esta sección para cada nuevo ruling:

```markdown
## RULING-YYYY-NNN — Título breve

**Fecha:** YYYY-MM-DD  
**Estado:** CONFIRMED | SUPERSEDED | PENDING_VERIFICATION  
**Fuente:** descripción de la fuente  
**Confirmado por:** nombre/rol si corresponde

### Situación

Descripción breve del caso o pregunta.

### Ruling

Descripción precisa de cómo se resuelve.

### Reglas relacionadas

- CRONICAS_RULES.md — sección X
- otra referencia si corresponde

### Impacto en el simulador

NONE | DOCUMENTATION | DOMAIN | UI | GAME_ACTION | RULES_ENGINE

Descripción del cambio necesario, si existe.

### Notas

Contexto adicional opcional.
```

---

# 6. Registro actual

No existen todavía rulings externos registrados formalmente en este archivo.

Las aclaraciones conocidas de manera informal deben incorporarse aquí solo cuando decidamos utilizarlas como fuente del proyecto.

---

# 7. Principio de implementación

Un ruling registrado no implica automáticamente que deba ser automatizado.

Debe comprobarse también:

```text
MVP_SCOPE.md
```

Si la funcionalidad está fuera del alcance actual, la aclaración sirve únicamente como conocimiento de dominio.

---

# 8. Regla final

> **Preferimos una interacción manual correcta a una automatización basada en un ruling dudoso o incompleto.**
